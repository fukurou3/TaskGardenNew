// features/growth/GrowthScreen.tsx

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Vibration, Alert, useWindowDimensions, Animated, Easing } from 'react-native';
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
import ImmersiveModal from '@/components/ImmersiveModal';
import TimerSoundManager from '@/lib/TimerSoundManager';
import { Image } from 'react-native';


type FocusModeStatus = 'idle' | 'running' | 'paused';
type ViewMode = 'normal' | 'picker' | 'timer';

// 状態遷移の明示的定義
const VALID_TRANSITIONS: Record<ViewMode, ViewMode[]> = {
  normal: ['picker'],
  picker: ['normal', 'timer'],
  timer: ['normal', 'picker']
};

// 状態遷移の検証
const isValidTransition = (from: ViewMode, to: ViewMode): boolean => {
  return VALID_TRANSITIONS[from].includes(to);
};

export default function GrowthScreen() {
  const { colorScheme, subColor } = useAppTheme();
  const isDark = colorScheme === 'dark';
  const { t } = useTranslation();
  const { width, height } = useWindowDimensions();
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
    reloadTasks,
  } = useGrowth();

  const tabIconColor = '#333';

  const [isThemeSelectionModalVisible, setThemeSelectionModalVisible] = useState(false);
  const [focusModeStatus, setFocusModeStatus] = useState<FocusModeStatus>('idle');
  const INITIAL_DURATION_SEC = 60 * 60;
  const [focusDurationSec, setFocusDurationSec] = useState(INITIAL_DURATION_SEC);
  const [timeRemaining, setTimeRemaining] = useState(INITIAL_DURATION_SEC);
  const [isMenuVisible, setMenuVisible] = useState(false);
  const [tempHours, setTempHours] = useState(Math.floor(INITIAL_DURATION_SEC / 3600));
  const [tempMinutes, setTempMinutes] = useState(Math.floor((INITIAL_DURATION_SEC % 3600) / 60));
  const [tempSeconds, setTempSeconds] = useState(0);
  const [isMuted, setMuted] = useState(false);
  
  // 統合されたビューモード管理
  const [viewMode, setViewMode] = useState<ViewMode>('normal');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  
  // アニメーション用のAnimated.Value
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const overlayFadeAnim = useRef(new Animated.Value(0)).current;
  
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const notificationIdRef = useRef<string | null>(null);

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


  // focusDurationSecが変更されたときにtempの値を更新
  useEffect(() => {
    const hours = Math.floor(focusDurationSec / 3600);
    const minutes = Math.floor((focusDurationSec % 3600) / 60);
    setTempHours(hours);
    setTempMinutes(minutes);
    setTempSeconds(0); // 秒数は常に0で初期化
  }, [focusDurationSec]);

  // アニメーション付き画面遷移関数
  const animateTransition = useCallback((from: ViewMode, to: ViewMode, callback?: () => void) => {
    if (isTransitioning) {
      console.log('Transition blocked: already transitioning');
      return;
    }
    if (!isValidTransition(from, to)) {
      console.warn(`Invalid transition: ${from} -> ${to}`);
      return;
    }
    
    console.log(`Animation transition: ${from} -> ${to}`);
    setIsTransitioning(true);
    
    // モーダルの表示/非表示管理
    if (from === 'normal' && (to === 'picker' || to === 'timer')) {
      // normal → picker/timer: モーダル表示
      setModalVisible(true);
      setViewMode(to);
    } else if ((from === 'picker' || from === 'timer') && to === 'normal') {
      // picker/timer → normal: モーダル非表示
      setModalVisible(false);
      setViewMode(to);
    } else {
      // picker ⇔ timer: モーダル内での切り替え
      setViewMode(to);
    }
    
    if (callback) callback();
    console.log(`Transition completed: ${from} -> ${to}`);
    setIsTransitioning(false);
  }, [isTransitioning]);

  // GrowthScreenにフォーカスされた時にタスクを再読み込み
  useFocusEffect(
    useCallback(() => {
      reloadTasks();
      
      // フォーカスが外れた時に一時的ダークモードを解除（一時的に無効化）
      // return () => {
      //   setTemporaryDarkMode(false);
      // };
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
    }
    
    if (!isMuted) {
      Vibration.vibrate();
    }
    Alert.alert(
      t('growth.focus_mode_completed_title'),
      t('growth.focus_mode_completed_message', { minutes: Math.ceil(focusDurationSec / 60) }),
      [{ 
        text: t('common.ok'),
        onPress: () => {
          // アラート後にタイマーを元の設定値にリセット
          setTimeRemaining(focusDurationSec);
        }
      }]
    );
  }, [focusDurationSec, isMuted, t]);

  // 集中モード関連のロジック
  useEffect(() => {
    if (focusModeStatus === 'running') {
      timerIntervalRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            if (timerIntervalRef.current !== null) {
              clearInterval(timerIntervalRef.current);
              timerIntervalRef.current = null;
            }
            setTimeout(() => {
              setFocusModeStatus('idle');
              setViewMode('normal');
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
      trigger: { type: 'timeInterval', seconds: focusSec, repeats: false },
    }).then((id) => {
      notificationIdRef.current = id;
    });
    setViewMode('timer');
    setFocusModeStatus('running');
    setTimeRemaining(focusSec);
  }, [focusDurationSec, t]);

  const showDurationPicker = useCallback(() => {
    if (isTransitioning) return;
    
    // ピッカー表示前に現在の設定値を同期、秒数は0にリセット
    const hours = Math.floor(focusDurationSec / 3600);
    const minutes = Math.floor((focusDurationSec % 3600) / 60);
    setTempHours(hours);
    setTempMinutes(minutes);
    setTempSeconds(0);
    
    // アニメーション開始
    animateTransition('normal', 'picker');
  }, [focusDurationSec, isTransitioning, animateTransition]);

  const confirmDurationPicker = useCallback(() => {
    if (isTransitioning) {
      console.log('confirmDurationPicker blocked: transitioning');
      return;
    }
    
    const totalSec = tempHours * 3600 + tempMinutes * 60; // 秒数は含めない
    
    if (totalSec < 60) {
      Alert.alert(
        t('common.error'),
        t('growth.min_duration_error', { minutes: 1 }),
        [{ text: t('common.ok') }]
      );
      return;
    }
    
    // 即座に状態更新（UI反応性向上）
    setFocusDurationSec(totalSec);
    setTimeRemaining(totalSec);
    setFocusModeStatus('running');
    
    // アニメーション開始
    animateTransition('picker', 'timer', () => {
      // アニメーション完了後に非同期処理実行
      startTimeRef.current = Date.now();
      if (notificationIdRef.current) {
        Notifications.cancelScheduledNotificationAsync(notificationIdRef.current).catch(() => {});
        notificationIdRef.current = null;
      }
      
      // 通知スケジュール（非同期、UI更新と分離）
      Notifications.scheduleNotificationAsync({
        content: {
          title: t('growth.focus_mode_completed_title'),
          body: t('growth.focus_mode_completed_message', {
            minutes: Math.ceil(totalSec / 60),
          }),
        },
        trigger: { type: 'timeInterval', seconds: totalSec, repeats: false },
      }).then((id) => { 
        notificationIdRef.current = id; 
      }).catch(error => {
        console.error('Failed to schedule notification:', error);
      });
    });
  }, [tempHours, tempMinutes, t, isTransitioning, animateTransition]);

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
      trigger: { type: 'timeInterval', seconds: timeRemaining, repeats: false },
    }).then((id) => { notificationIdRef.current = id; });
    setFocusModeStatus('running');
  }, [timeRemaining, t]);

  const cancelTimer = useCallback(() => {
    if (isTransitioning) return;
    
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (notificationIdRef.current) {
      Notifications.cancelScheduledNotificationAsync(notificationIdRef.current).catch(() => {});
      notificationIdRef.current = null;
    }
    
    // ピッカーからの戻りはアニメーション付き
    const currentMode = viewMode;
    animateTransition(currentMode, 'normal', () => {
      setFocusModeStatus('idle');
      setTimeRemaining(focusDurationSec);
      
      // ピッカーの値も元に戻し、秒数は0にリセット
      const hours = Math.floor(focusDurationSec / 3600);
      const minutes = Math.floor((focusDurationSec % 3600) / 60);
      setTempHours(hours);
      setTempMinutes(minutes);
      setTempSeconds(0);
    });
  }, [focusDurationSec, isTransitioning, viewMode, animateTransition]);

  const goBackToPicker = useCallback(() => {
    if (isTransitioning) return;
    
    // 即座にタイマー停止（UI反応性向上）
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    setFocusModeStatus('idle');
    
    // アニメーション開始
    animateTransition('timer', 'picker', () => {
      // アニメーション完了後に非同期処理実行
      if (notificationIdRef.current) {
        Notifications.cancelScheduledNotificationAsync(notificationIdRef.current).catch(() => {});
        notificationIdRef.current = null;
      }
      
      // ピッカーの値設定
      const hours = Math.floor(focusDurationSec / 3600);
      const minutes = Math.floor((focusDurationSec % 3600) / 60);
      setTempHours(hours);
      setTempMinutes(minutes);
      setTempSeconds(0); // 秒数は常に0にリセット
    });
  }, [focusDurationSec, isTransitioning, animateTransition]);

  const toggleMute = useCallback(() => {
    setMuted(prev => !prev);
  }, []);

  const stopFocusMode = useCallback(() => {
    if (isTransitioning) return;
    
    // 即座にタイマー停止（UI反応性向上）
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    setFocusModeStatus('idle');
    setTimeRemaining(focusDurationSec);
    
    // アニメーション開始
    animateTransition('timer', 'normal', () => {
      // アニメーション完了後に非同期処理実行
      if (notificationIdRef.current) {
        Notifications.cancelScheduledNotificationAsync(notificationIdRef.current).catch(() => {});
        notificationIdRef.current = null;
      }
      
      // ピッカーの値リセット
      const hours = Math.floor(focusDurationSec / 3600);
      const minutes = Math.floor((focusDurationSec % 3600) / 60);
      setTempHours(hours);
      setTempMinutes(minutes);
      setTempSeconds(0); // 秒数は常に0にリセット
    });
  }, [focusDurationSec, isTransitioning, animateTransition]);

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

  const PLACEHOLDER_IMAGE_FALLBACK = require('@/assets/images/growth/placeholder.png');

  return (
    <View style={styles.container}>
      {/* 背景画像（固定位置） */}
      <View style={styles.backgroundContainer}>
        <Image 
          source={currentThemeAsset?.image || PLACEHOLDER_IMAGE_FALLBACK} 
          style={[styles.backgroundImage, { width, height }]} 
          resizeMode="cover" 
        />
      </View>
      
      <Animated.View 
        style={[
          styles.animatedContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
            zIndex: 2,
          }
        ]}
      >
        <GrowthDisplay
          theme={currentTheme}
          asset={currentThemeAsset || { image: PLACEHOLDER_IMAGE_FALLBACK }}
        />

        {/* 統合モーダル（ピッカーとタイマーの両方を包含） */}
        <View style={{ zIndex: 10 }}>
          <ImmersiveModal
            visible={modalVisible}
            overlayOpacity={0.75}
          >
          {viewMode === 'timer' && (
            <FocusModeOverlay
              visible={true}
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
          )}
          
          {viewMode === 'picker' && (
            <DurationPickerModal
              visible={true}
              hours={tempHours}
              minutes={tempMinutes}
              seconds={tempSeconds}
              onChangeHours={(val) => setTempHours(val)}
              onChangeMinutes={(val) => setTempMinutes(val)}
              onChangeSeconds={(val) => setTempSeconds(val)}
              onConfirm={confirmDurationPicker}
              onClose={cancelTimer}
              textColor="#fff"
            />
          )}
          </ImmersiveModal>
        </View>

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

        {viewMode === 'normal' && (
          <View style={styles.bottomActions}>
            <TouchableOpacity 
              onPress={toggleMute} 
              style={[styles.iconButton, { opacity: isTransitioning ? 0.5 : 1 }]}
              disabled={isTransitioning}
            >
              <Ionicons name={isMuted ? 'volume-mute' : 'volume-high'} size={24} color={tabIconColor} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={showDurationPicker}
              style={[styles.focusModeButton, { opacity: isTransitioning ? 0.5 : 1 }]}
              disabled={isTransitioning}
            >
              <Text style={[styles.focusModeToggleText, { color: '#333' }]}> 
                {t('growth.focus_mode_button_start')} 
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/growth/dictionary')}
              style={[styles.iconButton, { opacity: isTransitioning ? 0.5 : 1 }]}
              disabled={isTransitioning}
            >
              <Ionicons name="book" size={24} color={tabIconColor} />
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  animatedContainer: {
    flex: 1,
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
    zIndex: 400, // グローバルオーバーレイより前面
    elevation: 400, // Android用
  },
  iconButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.9)', // より不透明に
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  focusModeButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.9)', // より不透明に
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 120,
    minHeight: 60,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  focusModeToggleText: {
    fontWeight: 'bold',
    fontSize: 18,
  },
  backgroundContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
  },
});