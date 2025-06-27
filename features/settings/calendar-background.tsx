import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '@/hooks/ThemeContext';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { FontSizeContext } from '@/context/FontSizeContext';
import { fontSizes } from '@/constants/fontSizes';
import { Ionicons } from '@expo/vector-icons';
import { getItem, setItem } from '@/lib/Storage';
import { BACKGROUND_IMAGES } from '@/constants/CalendarBackgrounds';

const CALENDAR_BG_KEY = '@calendar_background_id';

export default function CalendarBackgroundScreen() {
  const { colorScheme, subColor } = useAppTheme();
  const { fontSizeKey } = useContext(FontSizeContext);
  const { t } = useTranslation();
  const router = useRouter();
  const isDark = colorScheme === 'dark';

  const [selectedBgId, setSelectedBgId] = useState<string>(BACKGROUND_IMAGES[0].id);

  useEffect(() => {
    loadSavedBackground();
  }, []);

  const loadSavedBackground = async () => {
    try {
      const savedId = await getItem(CALENDAR_BG_KEY);
      setSelectedBgId(savedId || BACKGROUND_IMAGES[0].id);
    } catch (error) {
      console.error('Failed to load saved background:', error);
    }
  };

  const saveBackground = async (bgId: string) => {
    try {
      await setItem(CALENDAR_BG_KEY, bgId);
      setSelectedBgId(bgId);
    } catch (error) {
      console.error('Failed to save background selection:', error);
    }
  };

  const handleBackgroundSelection = async (background: typeof BACKGROUND_IMAGES[0]) => {
    await saveBackground(background.id);
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
        <Text style={styles.appBarTitle}>カレンダー背景設定</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>カレンダー背景を選択</Text>
          <Text style={styles.description}>
            カレンダー画面の背景を選択してください。
          </Text>

          <View style={styles.backgroundGrid}>
            {BACKGROUND_IMAGES.map((background) => (
              <TouchableOpacity
                key={background.id}
                style={[
                  styles.backgroundCard,
                  selectedBgId === background.id && styles.backgroundCardSelected,
                ]}
                onPress={() => handleBackgroundSelection(background)}
                activeOpacity={0.8}
              >
                <View style={styles.backgroundImageContainer}>
                  {background.preview ? (
                    <Image 
                      source={background.preview} 
                      style={styles.backgroundImage} 
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.noBackgroundPlaceholder, { backgroundColor: isDark ? '#333' : '#f0f0f0' }]}>
                      <Text style={[styles.noBackgroundText, { color: isDark ? '#888' : '#999' }]}>なし</Text>
                    </View>
                  )}
                  {selectedBgId === background.id && (
                    <View style={styles.selectedOverlay}>
                      <View style={styles.selectedBadge}>
                        <Text style={styles.checkmark}>✓</Text>
                      </View>
                    </View>
                  )}
                </View>
                
                <View style={styles.backgroundInfo}>
                  <Text style={styles.backgroundName} numberOfLines={1}>
                    {background.name}
                  </Text>
                  {background.id === 'none' && (
                    <Text style={styles.systemLabel}>デフォルト</Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
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
            • 選択した背景はカレンダー画面に適用されます{'\n'}
            • 背景画像は今後のアップデートで追加される予定です{'\n'}
            • 現在は「なし」のみ選択可能です
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
    backgroundGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      justifyContent: 'space-between',
    },
    backgroundCard: {
      width: '47%',
      borderRadius: 16,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 6,
      marginBottom: 8,
      backgroundColor: isDark ? '#2a2a2a' : '#fff',
    },
    backgroundCardSelected: {
      borderColor: subColor,
      borderWidth: 2,
    },
    backgroundImageContainer: {
      width: '100%',
      height: 120,
      position: 'relative',
    },
    backgroundImage: {
      width: '100%',
      height: '100%',
    },
    noBackgroundPlaceholder: {
      width: '100%',
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
    },
    noBackgroundText: {
      fontSize: 16,
      fontWeight: '500',
    },
    selectedOverlay: {
      position: 'absolute',
      top: 0,
      right: 0,
      left: 0,
      bottom: 0,
      backgroundColor: 'rgba(76, 175, 80, 0.2)',
      justifyContent: 'flex-start',
      alignItems: 'flex-end',
    },
    selectedBadge: {
      backgroundColor: subColor,
      borderRadius: 12,
      margin: 8,
      padding: 4,
      minWidth: 24,
      minHeight: 24,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 4,
    },
    checkmark: {
      color: '#fff',
      fontSize: 14,
      fontWeight: 'bold',
    },
    backgroundInfo: {
      padding: 12,
      minHeight: 50,
      justifyContent: 'center',
    },
    backgroundName: {
      fontSize: fontSizes[fsKey],
      color: isDark ? '#EFEFF0' : '#1C1C1E',
      fontWeight: '600',
      textAlign: 'center',
    },
    systemLabel: {
      fontSize: fontSizes[fsKey] - 2,
      color: isDark ? '#8E8E93' : '#6D6D72',
      marginTop: 2,
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