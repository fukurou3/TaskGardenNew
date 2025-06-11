import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '@/hooks/ThemeContext';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { FontSizeContext } from '@/context/FontSizeContext';
import { fontSizes } from '@/constants/fontSizes';
import { Ionicons } from '@expo/vector-icons';
import { getItem, setItem } from '@/lib/Storage';
import { Audio } from 'expo-av';
import TimerSoundManager, { BUILT_IN_SOUNDS, SoundOption } from '@/lib/TimerSoundManager';

const TIMER_SOUND_KEY = '@timer_sound_selection';

export default function TimerSoundScreen() {
  const { colorScheme, subColor } = useAppTheme();
  const { fontSizeKey } = useContext(FontSizeContext);
  const { t } = useTranslation();
  const router = useRouter();
  const isDark = colorScheme === 'dark';

  const [selectedSoundId, setSelectedSoundId] = useState<string>('default');
  const [availableSounds, setAvailableSounds] = useState<SoundOption[]>(BUILT_IN_SOUNDS);
  const soundManager = TimerSoundManager.getInstance();

  useEffect(() => {
    loadSavedSound();
    initializeAudio();
  }, []);

  const initializeAudio = async () => {
    try {
      await soundManager.initializeAudio();
    } catch (error) {
      console.error('Failed to initialize audio:', error);
    }
  };

  const loadSavedSound = async () => {
    try {
      const savedId = await soundManager.getSavedSoundId();
      setSelectedSoundId(savedId);
    } catch (error) {
      console.error('Failed to load saved sound:', error);
    }
  };

  const saveSoundSelection = async (soundId: string) => {
    try {
      await soundManager.saveSoundId(soundId);
      setSelectedSoundId(soundId);
    } catch (error) {
      console.error('Failed to save sound selection:', error);
      Alert.alert('エラー', '音声設定の保存に失敗しました');
    }
  };

  const playSound = async (sound: SoundOption) => {
    try {
      await soundManager.playSound(sound);
    } catch (error) {
      console.error('Failed to play sound:', error);
      Alert.alert('エラー', '音声の再生に失敗しました');
    }
  };

  const handleSoundSelection = async (sound: SoundOption) => {
    await saveSoundSelection(sound.id);
    await playSound(sound);
  };

  const styles = createStyles(isDark, subColor, fontSizeKey);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.appBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.replace('/(tabs)/settings')}
        >
          <Ionicons
            name="chevron-back"
            size={24}
            color={isDark ? '#EFEFF0' : '#1C1C1E'}
          />
        </TouchableOpacity>
        <Text style={styles.appBarTitle}>タイマー音設定</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>タイマー音を選択</Text>
          <Text style={styles.description}>
            集中モード終了時に再生される音声を選択してください。
            音声名をタップするとプレビューが再生されます。
          </Text>

          {availableSounds.map((sound) => (
            <TouchableOpacity
              key={sound.id}
              style={styles.soundOption}
              onPress={() => handleSoundSelection(sound)}
            >
              <View style={styles.soundInfo}>
                <View
                  style={[
                    styles.radio,
                    selectedSoundId === sound.id && styles.radioSelected,
                  ]}
                />
                <View style={styles.soundDetails}>
                  <Text style={styles.soundName}>{sound.name}</Text>
                  {sound.isSystemSound && (
                    <Text style={styles.systemLabel}>システム音</Text>
                  )}
                </View>
              </View>
              <TouchableOpacity
                style={styles.playButton}
                onPress={() => playSound(sound)}
              >
                <Ionicons
                  name="play"
                  size={fontSizes[fontSizeKey] + 4}
                  color={subColor}
                />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons
              name="information-circle"
              size={20}
              color={subColor}
            />
            <Text style={styles.infoTitle}>ヒント</Text>
          </View>
          <Text style={styles.infoText}>
            • 選択した音声は集中モードのタイマー終了時に自動再生されます{'\n'}
            • 音量はデバイスの通知音量設定に従います{'\n'}
            • プレビュー再生で音声を事前に確認できます
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (
  isDark: boolean,
  subColor: string,
  fsKey: keyof typeof fontSizes
) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? '#0C0C0C' : '#f2f2f4',
    },
    appBar: {
      height: 56,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: isDark ? '#3A3A3C' : '#C6C6C8',
    },
    backButton: {
      padding: 8,
      marginLeft: -8,
    },
    appBarTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: isDark ? '#EFEFF0' : '#1C1C1E',
    },
    placeholder: {
      width: 40,
    },
    scrollContent: {
      padding: 16,
    },
    card: {
      backgroundColor: isDark ? '#1f1f21' : '#FFFFFF',
      borderRadius: Platform.OS === 'ios' ? 10 : 8,
      padding: 16,
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: fontSizes[fsKey] + 2,
      fontWeight: 'bold',
      color: isDark ? '#EFEFF0' : '#1C1C1E',
      marginBottom: 8,
    },
    description: {
      fontSize: fontSizes[fsKey],
      color: isDark ? '#8E8E93' : '#6D6D72',
      marginBottom: 20,
      lineHeight: fontSizes[fsKey] * 1.4,
    },
    soundOption: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderColor: isDark ? '#3A3A3C' : '#E0E0E0',
    },
    soundInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    radio: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: isDark ? '#5A5A5E' : '#AEAEB2',
      marginRight: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    radioSelected: {
      borderColor: subColor,
      backgroundColor: subColor,
    },
    soundDetails: {
      flex: 1,
    },
    soundName: {
      fontSize: fontSizes[fsKey] + 1,
      color: isDark ? '#EFEFF0' : '#1C1C1E',
      fontWeight: '500',
    },
    systemLabel: {
      fontSize: fontSizes[fsKey] - 2,
      color: isDark ? '#8E8E93' : '#6D6D72',
      marginTop: 2,
    },
    playButton: {
      padding: 8,
      borderRadius: 20,
      backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7',
    },
    infoCard: {
      backgroundColor: isDark ? '#1f1f21' : '#FFFFFF',
      borderRadius: Platform.OS === 'ios' ? 10 : 8,
      padding: 16,
    },
    infoHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    infoTitle: {
      fontSize: fontSizes[fsKey] + 1,
      fontWeight: '600',
      color: isDark ? '#EFEFF0' : '#1C1C1E',
      marginLeft: 8,
    },
    infoText: {
      fontSize: fontSizes[fsKey],
      color: isDark ? '#8E8E93' : '#6D6D72',
      lineHeight: fontSizes[fsKey] * 1.4,
    },
  });