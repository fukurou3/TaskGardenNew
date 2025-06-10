// features/growth/GrowthScreen.tsx

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Vibration, Alert, useWindowDimensions, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '@/hooks/ThemeContext';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useGrowth } from '../hooks/useGrowth';
import { Theme } from '../themes/types';
import { useFocusEffect, useRouter, useLocalSearchParams } from 'expo-router';
// Expo Go (SDK 53+) no longer supports remote notifications. Use a dev build.
import * as Notifications from 'expo-notifications';
import GrowthDisplay from '../components/GrowthDisplay';
import ThemeSelectionModal from '../components/ThemeSelectionModal';
import MenuModal from '../components/MenuModal';
import DurationPickerModal from '../components/DurationPickerModal';
import FocusModeOverlay from '../components/FocusModeOverlay';
import TimerSoundManager from '@/lib/TimerSoundManager';


type FocusModeStatus = 'idle' | 'running' | 'paused';

export default function GrowthScreen() {
  const { colorScheme, subColor } = useAppTheme();
  const isDark = colorScheme === 'dark';
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const router = useRouter();
  const { view } = useLocalSearchParams<{ view?: string }>();
  const isViewMode = view === 'true';

  const {
    loading,
    themes,
    selectedThemeId,
    changeSelectedTheme,
    currentTheme,
    currentThemeAsset,
    reloadTasks, // タスク再読み込み関数
  } = useGrowth();

  const tabIconColor = '#333';

  const [isThemeSelectionModalVisible, setThemeSelectionModalVisible] = useState(false);
  const [isFocusModeActive, setFocusModeActive] = useState(false);
  const [focusModeStatus, setFocusModeStatus] = useState<FocusModeStatus>('idle');
  const INITIAL_DURATION_SEC = 60 * 60;
  const [focusDurationSec, setFocusDurationSec] = useState(INITIAL_DURATION_SEC);
  const [timeRemaining, setTimeRemaining] = useState(INITIAL_DURATION_SEC);
  const [isMenuVisible, setMenuVisible] = useState(false);
  const [isDurationPickerVisible, setDurationPickerVisible] = useState(false);
  const [tempHours, setTempHours] = useState(1);
  const [tempMinutes, setTempMinutes] = useState(0);
  const [tempSeconds, setTempSeconds] = useState(0);
  const [isMuted, setMuted] = useState(false);
  
  // 遷移状態管理
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // ここを修正: NodeJS.Timeoutの代わりに ReturnType<typeof setInterval> を使用
  const timerIntervalRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const notificationIdRef = useRef<string | null>(null);

  // スムーズな画面遷移関数
  const smoothTransition = useCallback((callback: () => void, delay: number = 150) => {
    setIsTransitioning(true);
    setTimeout(() => {
      callback();
      setTimeout(() => {
        setIsTransitioning(false);
      }, 50);
    }, delay);
  }, []);

  // 音声初期化
  useEffect(() => {
    const initializeAudio = async () => {
      try {
        const soundManager = TimerSoundManager.getInstance();
        await soundManager.initializeAudio();
      } catch (error) {
        console.error('Failed to initialize audio:', error);
      }
    };
    initializeAudio();
  }, []);

  // GrowthScreenにフォーカスされた時にタスクを再読み込み
  useFocusEffect(
    useCallback(() => {
      reloadTasks(); // タスクデータが更新されることを期待
    }, [reloadTasks])
  );


  const handleFocusModeCompletion = useCallback(async () => {
    if (notificationIdRef.current) {
      Notifications.cancelScheduledNotificationAsync(notificationIdRef.current).catch(() => {});
      notificationIdRef.current = null;
    }
    
    try {
      if (!isMuted) {
        const soundManager = TimerSoundManager.getInstance();
        await soundManager.playTimerSound();
      }
    } catch (error) {
      console.error('Failed to play timer sound:', error);
      // 音声再生失敗時はサイレントに続行
    }
    
    if (!isMuted) {
      Vibration.vibrate();
    }
    Alert.alert(
      t('growth.focus_mode_completed_title'),
      t('growth.focus_mode_completed_message', { minutes: Math.ceil(focusDurationSec / 60) }),
      [{ text: t('common.ok') }]
    );
  }, [focusDurationSec, isMuted, t]);

  // 集中モード関連のロジック
  useEffect(() => {
    if (focusModeStatus === 'running') {
      timerIntervalRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            // タイマー停止を先に実行
            if (timerIntervalRef.current !== null) {
              clearInterval(timerIntervalRef.current);
              timerIntervalRef.current = null;
            }
            // 状態変更を次のレンダリングサイクルで実行
            setTimeout(() => {
              setFocusModeStatus('idle');
              setFocusModeActive(false);
              handleFocusModeCompletion();
            }, 0);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current !== null) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
    return () => {
      if (timerIntervalRef.current !== null) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [focusModeStatus, handleFocusModeCompletion]);

  const startFocusMode = useCallback((duration?: number) => {
    const focusSec = duration ?? focusDurationSec;
    startTimeRef.current = Date.now();
    if (notificationIdRef.current) {
      Notifications.cancelScheduledNotificationAsync(notificationIdRef.current).catch(() => {});
      notificationIdRef.current = null;
    }
    Notifications.scheduleNotificationAsync({
      content: {
        title: t('growth.focus_mode_completed_title'),
        body: t('growth.focus_mode_completed_message', {
          minutes: Math.ceil(focusSec / 60),
        }),
      },
      trigger: { seconds: focusSec, repeats: false },
    }).then((id) => {
      notificationIdRef.current = id;
    });
    setFocusModeActive(true);
    setFocusModeStatus('running');
    setTimeRemaining(focusSec);
  }, [focusDurationSec, t]);

  const showDurationPicker = useCallback(() => {
    const hours = Math.floor(focusDurationSec / 3600);
    const minutes = Math.floor((focusDurationSec % 3600) / 60);
    const seconds = focusDurationSec % 60;
    setTempHours(hours);
    setTempMinutes(minutes);
    setTempSeconds(seconds);
    
    smoothTransition(() => {
      setDurationPickerVisible(true);
    });
  }, [focusDurationSec, smoothTransition]);

  const confirmDurationPicker = useCallback(() => {
    const totalSec = tempHours * 3600 + tempMinutes * 60 + tempSeconds;
    
    // 最小時間チェック（1分）
    if (totalSec < 60) {
      Alert.alert(
        t('common.error'),
        t('growth.min_duration_error', { minutes: 1 }),
        [{ text: t('common.ok') }]
      );
      return;
    }
    
    // 一回のバッチで全状態を更新
    setFocusDurationSec(totalSec);
    setTimeRemaining(totalSec);
    
    smoothTransition(() => {
      setDurationPickerVisible(false);
      setFocusModeActive(true);
      setFocusModeStatus('running');
    }, 100);
    
    // タイマー開始
    startTimeRef.current = Date.now();
    if (notificationIdRef.current) {
      Notifications.cancelScheduledNotificationAsync(notificationIdRef.current).catch(() => {});
      notificationIdRef.current = null;
    }
    Notifications.scheduleNotificationAsync({
      content: {
        title: t('growth.focus_mode_completed_title'),
        body: t('growth.focus_mode_completed_message', {
          minutes: Math.ceil(totalSec / 60),
        }),
      },
      trigger: { seconds: totalSec, repeats: false },
    }).then((id) => { notificationIdRef.current = id; });
  }, [tempHours, tempMinutes, tempSeconds, smoothTransition, t]);

  const pauseFocusMode = useCallback(() => {
    if (timerIntervalRef.current !== null) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (notificationIdRef.current) {
      Notifications.cancelScheduledNotificationAsync(notificationIdRef.current).catch(() => {});
      notificationIdRef.current = null;
    }
    setFocusModeStatus('paused');
  }, []);

  const resumeFocusMode = useCallback(() => {
    startTimeRef.current = Date.now();
    if (notificationIdRef.current) {
      Notifications.cancelScheduledNotificationAsync(notificationIdRef.current).catch(() => {});
      notificationIdRef.current = null;
    }
    Notifications.scheduleNotificationAsync({
      content: {
        title: t('growth.focus_mode_completed_title'),
        body: t('growth.focus_mode_completed_message', {
          minutes: Math.ceil(timeRemaining / 60),
        }),
      },
      trigger: { seconds: timeRemaining, repeats: false },
    }).then((id) => { notificationIdRef.current = id; });
    setFocusModeStatus('running');
  }, [timeRemaining, focusDurationSec, t]);

  const cancelTimer = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (notificationIdRef.current) {
      Notifications.cancelScheduledNotificationAsync(notificationIdRef.current).catch(() => {});
      notificationIdRef.current = null;
    }
    setFocusModeStatus('idle');
    setFocusModeActive(false);
    setDurationPickerVisible(false);
    setTimeRemaining(focusDurationSec);
  }, [focusDurationSec]);

  const goBackToPicker = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (notificationIdRef.current) {
      Notifications.cancelScheduledNotificationAsync(notificationIdRef.current).catch(() => {});
      notificationIdRef.current = null;
    }
    
    // 現在の残り時間からピッカーの値を設定
    const hours = Math.floor(timeRemaining / 3600);
    const minutes = Math.floor((timeRemaining % 3600) / 60);
    const seconds = timeRemaining % 60;
    setTempHours(hours);
    setTempMinutes(minutes);
    setTempSeconds(seconds);
    
    smoothTransition(() => {
      setFocusModeStatus('idle');
      setFocusModeActive(false);
      setDurationPickerVisible(true);
    });
  }, [timeRemaining, smoothTransition]);

  const toggleMute = useCallback(() => {
    setMuted(prev => !prev);
  }, []);

  const stopFocusMode = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (notificationIdRef.current) {
      Notifications.cancelScheduledNotificationAsync(notificationIdRef.current).catch(() => {});
      notificationIdRef.current = null;
    }
    
    smoothTransition(() => {
      setFocusModeStatus('idle');
      setFocusModeActive(false);
      setDurationPickerVisible(false);
      setTimeRemaining(focusDurationSec);
    });
  }, [focusDurationSec, smoothTransition]);

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const hoursStr = hours > 0 ? `${hours}:` : '';
    const minutesStr = `${hours > 0 && minutes < 10 ? '0' : ''}${minutes}`;
    const secondsStr = `${seconds < 10 ? '0' : ''}${seconds}`;
    return `${hoursStr}${minutesStr}:${secondsStr}`;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </SafeAreaView>
    );
  }

  // 画像アセットへの参照は `@` エイリアスを利用
  const PLACEHOLDER_IMAGE_FALLBACK = require('@/assets/images/growth/placeholder.png');

  return (
    <View style={styles.container}>
      {/* 成長表示エリア */}
      <GrowthDisplay
        theme={currentTheme}
        asset={currentThemeAsset || { image: PLACEHOLDER_IMAGE_FALLBACK }}
      />





      <FocusModeOverlay
        visible={isFocusModeActive && !isDurationPickerVisible}
        width={width}
        subColor={subColor}
        isDark={isDark}
        isMuted={isMuted}
        focusModeStatus={focusModeStatus}
        timeRemaining={timeRemaining}
        focusDurationSec={focusDurationSec}
        formatTime={formatTime}
        onStart={startFocusMode}
        onPause={pauseFocusMode}
        onResume={resumeFocusMode}
        onStop={stopFocusMode}
        onToggleMute={toggleMute}
        onRestart={goBackToPicker}
      />

      <ThemeSelectionModal
        visible={isThemeSelectionModalVisible}
        themes={themes}
        selectedId={selectedThemeId}
        onSelect={changeSelectedTheme}
        onClose={() => setThemeSelectionModalVisible(false)}
      />

      <MenuModal
        visible={isMenuVisible}
        onSelectTheme={() => { setMenuVisible(false); setThemeSelectionModalVisible(true); }}
        onSelectDictionary={() => { setMenuVisible(false); router.push('/(tabs)/growth/dictionary'); }}
        onSelectGacha={() => { setMenuVisible(false); router.push('/(tabs)/growth/gacha'); }}
        onSelectStore={() => { setMenuVisible(false); router.push('/(tabs)/growth/store'); }}
        onClose={() => setMenuVisible(false)}
      />

      <DurationPickerModal
        visible={isDurationPickerVisible}
        hours={tempHours}
        minutes={tempMinutes}
        seconds={tempSeconds}
        onChangeHours={setTempHours}
        onChangeMinutes={setTempMinutes}
        onChangeSeconds={setTempSeconds}
        onConfirm={confirmDurationPicker}
        onClose={stopFocusMode}
        textColor="#fff"
      />

      {!isDurationPickerVisible && !isFocusModeActive && (
        <View style={styles.bottomActions}>
          <TouchableOpacity 
            onPress={toggleMute} 
            style={styles.iconButton}
            disabled={isTransitioning}
          >
            <Ionicons name={isMuted ? 'volume-mute' : 'volume-high'} size={24} color={tabIconColor} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={isFocusModeActive ? stopFocusMode : showDurationPicker}
            style={[styles.focusModeButton, isTransitioning && styles.buttonDisabled]}
            disabled={isTransitioning}
          >
            <Text style={[styles.focusModeToggleText, { color: '#333' }]}> 
              {isFocusModeActive ? t('growth.focus_mode_button_stop') : t('growth.focus_mode_button_start')} 
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/growth/dictionary')}
            style={styles.iconButton}
            disabled={isFocusModeActive || isTransitioning}
          >
            <Ionicons name="book" size={24} color={tabIconColor} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0', // ライトモードの背景色
  },
  loadingText: {
    flex: 1,
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 15,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  bottomActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 40,
    paddingBottom: 30,
  },
  iconButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  focusModeButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 120,
    minHeight: 60,
  },
  focusModeToggleText: {
    fontWeight: 'bold',
    fontSize: 18,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});