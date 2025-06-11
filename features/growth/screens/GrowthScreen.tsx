// features/growth/GrowthScreen.tsx

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Vibration, Alert, useWindowDimensions } from 'react-native';
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
import GlobalOverlayManager from '@/components/GlobalOverlayManager';
import { useOverlay, type OverlayType } from '@/context/OverlayContext';

// 状態管理を単一のenum型に統一
type FocusModeStatus = 'idle' | 'running' | 'paused';
type ViewMode = 'normal' | 'picker' | 'timer';

// 状態遷移の明示的定義
const VALID_TRANSITIONS: Record<ViewMode, ViewMode[]> = {
  normal: ['picker'],
  picker: ['normal', 'timer'],
  timer: ['normal', 'picker']
};

// ViewModeからOverlayTypeへのマッピング
const VIEW_MODE_TO_OVERLAY: Record<ViewMode, OverlayType> = {
  normal: 'none',
  picker: 'picker',
  timer: 'timer'
};

// 状態遷移の検証
const isValidTransition = (from: ViewMode, to: ViewMode): boolean => {
  return VALID_TRANSITIONS[from].includes(to);
};

export default function GrowthScreen() {
  const { colorScheme, subColor } = useAppTheme();
  const isDark = colorScheme === 'dark';
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const router = useRouter();
  const { view } = useLocalSearchParams<{ view?: string }>();
  const isViewMode = view === 'true';
  
  // グローバルオーバーレイ管理（単一状態変数）
  const { overlayType, setOverlayType } = useOverlay();

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
  
  // 統合されたビューモード管理（単一状態変数）
  const [viewMode, setViewMode] = useState<ViewMode>('normal');
  
  // エッジケース対応：連打防止フラグ
  const isTransitioningRef = useRef(false);
  const lastTransitionTimeRef = useRef(0);
  
  // 状態変更の追跡ログ
  useEffect(() => {
    console.log(`[GrowthScreen] 🎯 ViewMode changed to: ${viewMode}`);
  }, [viewMode]);
  
  useEffect(() => {
    console.log(`[GrowthScreen] 🌫️ OverlayType changed to: ${overlayType}`);
  }, [overlayType]);
  
  const timerIntervalRef = useRef<number | null>(null);
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

  // 画面遷移関数（エッジケース対応・連打防止強化）
  const transitionToView = useCallback((to: ViewMode, callback?: () => void) => {
    const from = viewMode;
    const timestamp = Date.now();
    const MIN_TRANSITION_INTERVAL = 100; // 100ms以内の連続遷移を防止
    
    console.log(`[GrowthScreen] 🔄 Transition START: ${from} -> ${to} (${timestamp})`);
    
    // エッジケース対応：連打防止
    if (isTransitioningRef.current) {
      console.warn(`[GrowthScreen] 🚫 Transition blocked: Already transitioning`);
      return;
    }
    
    // エッジケース対応：素早い操作防止
    if (timestamp - lastTransitionTimeRef.current < MIN_TRANSITION_INTERVAL) {
      console.warn(`[GrowthScreen] ⚡ Transition blocked: Too fast (${timestamp - lastTransitionTimeRef.current}ms)`);
      return;
    }
    
    if (!isValidTransition(from, to)) {
      console.warn(`[GrowthScreen] ❌ Invalid transition: ${from} -> ${to}`);
      return;
    }
    
    console.log(`[GrowthScreen] ✅ Valid transition validated: ${from} -> ${to}`);
    
    // 遷移開始フラグ設定
    isTransitioningRef.current = true;
    lastTransitionTimeRef.current = timestamp;
    
    // React 18の自動バッチング活用でstate更新を同期
    React.startTransition(() => {
      console.log(`[GrowthScreen] 📝 Setting viewMode: ${to}`);
      setViewMode(to);
      
      console.log(`[GrowthScreen] 🌫️ Setting overlayType: ${VIEW_MODE_TO_OVERLAY[to]}`);
      setOverlayType(VIEW_MODE_TO_OVERLAY[to]);
      
      // コールバックも同じトランジション内で実行
      if (callback) {
        console.log(`[GrowthScreen] 🔧 Executing callback for transition: ${from} -> ${to}`);
        try {
          callback();
        } catch (error) {
          console.error(`[GrowthScreen] ❌ Callback error:`, error);
        }
      }
      
      // 遷移完了フラグ解除（少し遅延させて確実に完了を待つ）
      setTimeout(() => {
        isTransitioningRef.current = false;
        console.log(`[GrowthScreen] ✨ Transition COMPLETE: ${from} -> ${to} (${Date.now() - timestamp}ms)`);
      }, 50);
    });
  }, [viewMode, setOverlayType]);

  // GrowthScreenにフォーカスされた時にタスクを再読み込み
  useFocusEffect(
    useCallback(() => {
      reloadTasks();
      
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
              transitionToView('normal');
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
  }, [focusModeStatus, handleFocusModeCompletion, transitionToView]);

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
    transitionToView('timer');
    setFocusModeStatus('running');
    setTimeRemaining(focusSec);
  }, [focusDurationSec, t, transitionToView]);

  const showDurationPicker = useCallback(() => {
    // ピッカー表示前に現在の設定値を同期、秒数は0にリセット
    const hours = Math.floor(focusDurationSec / 3600);
    const minutes = Math.floor((focusDurationSec % 3600) / 60);
    setTempHours(hours);
    setTempMinutes(minutes);
    setTempSeconds(0);
    
    // 即座遷移
    transitionToView('picker');
  }, [focusDurationSec, transitionToView]);

  const confirmDurationPicker = useCallback(() => {
    const totalSec = tempHours * 3600 + tempMinutes * 60; // 秒数は含めない
    
    if (totalSec < 60) {
      Alert.alert(
        t('common.error'),
        t('growth.min_duration_error', { minutes: 1 }),
        [{ text: t('common.ok') }]
      );
      return;
    }
    
    // 即座に状態更新
    setFocusDurationSec(totalSec);
    setTimeRemaining(totalSec);
    setFocusModeStatus('running');
    
    // 即座遷移
    transitionToView('timer', () => {
      // 非同期処理を実行
      startTimeRef.current = Date.now();
      if (notificationIdRef.current) {
        Notifications.cancelScheduledNotificationAsync(notificationIdRef.current).catch(() => {});
        notificationIdRef.current = null;
      }
      
      // 通知スケジュール
      Notifications.scheduleNotificationAsync({
        content: {
          title: t('growth.focus_mode_completed_title'),
          body: t('growth.focus_mode_completed_message', {
            minutes: Math.ceil(totalSec / 60),
          }),
        },
        trigger: { seconds: totalSec, repeats: false },
      }).then((id) => { 
        notificationIdRef.current = id; 
      }).catch(error => {
        console.error('Failed to schedule notification:', error);
      });
    });
  }, [tempHours, tempMinutes, t, transitionToView]);

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
  }, [timeRemaining, t]);

  const cancelTimer = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (notificationIdRef.current) {
      Notifications.cancelScheduledNotificationAsync(notificationIdRef.current).catch(() => {});
      notificationIdRef.current = null;
    }
    
    // 即座に通常画面に戻る
    transitionToView('normal', () => {
      setFocusModeStatus('idle');
      setTimeRemaining(focusDurationSec);
      
      // ピッカーの値も元に戻し、秒数は0にリセット
      const hours = Math.floor(focusDurationSec / 3600);
      const minutes = Math.floor((focusDurationSec % 3600) / 60);
      setTempHours(hours);
      setTempMinutes(minutes);
      setTempSeconds(0);
    });
  }, [focusDurationSec, transitionToView]);

  const goBackToPicker = useCallback(() => {
    // タイマー停止
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    setFocusModeStatus('idle');
    
    // 即座遷移
    transitionToView('picker', () => {
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
  }, [focusDurationSec, transitionToView]);

  const toggleMute = useCallback(() => {
    setMuted(prev => !prev);
  }, []);

  const stopFocusMode = useCallback(() => {
    // タイマー停止
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    setFocusModeStatus('idle');
    setTimeRemaining(focusDurationSec);
    
    // 即座遷移
    transitionToView('normal', () => {
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
  }, [focusDurationSec, transitionToView]);

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const hoursStr = hours > 0 ? `${hours}:` : '';
    const minutesStr = `${hours > 0 && minutes < 10 ? '0' : ''}${minutes}`;
    const secondsStr = `${seconds < 10 ? '0' : ''}${seconds}`;
    return `${hoursStr}${minutesStr}:${secondsStr}`;
  };

  // GrowthDisplay用のpropsを安定化（Hooks順序を保つため条件分岐前に配置）
  const PLACEHOLDER_IMAGE_FALLBACK = require('@/assets/images/growth/placeholder.png');
  const stableAsset = useMemo(() => {
    return currentThemeAsset || { image: PLACEHOLDER_IMAGE_FALLBACK };
  }, [currentThemeAsset]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      {/* グローバルオーバーレイマネージャー */}
      <GlobalOverlayManager />
      
      <View style={styles.animatedContainer}>
        <GrowthDisplay
          theme={currentTheme}
          asset={stableAsset}
        />

        <FocusModeOverlay
          visible={viewMode === 'timer'}
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

        {viewMode === 'normal' && (
          <View style={styles.bottomActions}>
            <TouchableOpacity 
              onPress={toggleMute} 
              style={[
                styles.iconButton,
                { opacity: isTransitioningRef.current ? 0.5 : 1 }
              ]}
              disabled={isTransitioningRef.current}
              activeOpacity={0.7}
            >
              <Ionicons name={isMuted ? 'volume-mute' : 'volume-high'} size={24} color={tabIconColor} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={showDurationPicker}
              style={[
                styles.focusModeButton,
                { opacity: isTransitioningRef.current ? 0.5 : 1 }
              ]}
              disabled={isTransitioningRef.current}
              activeOpacity={0.7}
            >
              <Text style={[styles.focusModeToggleText, { color: '#333' }]}> 
                {t('growth.focus_mode_button_start')} 
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/growth/dictionary')}
              style={[
                styles.iconButton,
                { opacity: isTransitioningRef.current ? 0.5 : 1 }
              ]}
              disabled={isTransitioningRef.current}
              activeOpacity={0.7}
            >
              <Ionicons name="book" size={24} color={tabIconColor} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* ピッカーモーダル（グローバルオーバーレイの上に表示） */}
      <DurationPickerModal
        visible={viewMode === 'picker'}
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
});