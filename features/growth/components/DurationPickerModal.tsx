import React, { useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Modal } from 'react-native';
import WheelPicker from 'react-native-wheely';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Props {
  visible: boolean;
  hours: number;
  minutes: number;
  seconds: number;
  onChangeHours: (val: number) => void;
  onChangeMinutes: (val: number) => void;
  onChangeSeconds: (val: number) => void;
  onConfirm: () => void;
  onClose: () => void;
  textColor: string;
}

const STORAGE_KEY = '@growth_duration_picker';

const DurationPickerModal = React.memo(function DurationPickerModal({
  visible,
  hours,
  minutes,
  seconds,
  onChangeHours,
  onChangeMinutes,
  onChangeSeconds,
  onConfirm,
  onClose,
  textColor,
}: Props) {
  const { t } = useTranslation();
  const pickerWidth = 90;
  
  // 表示状態の追跡ログ（visible=trueの時のみ）
  useEffect(() => {
    if (visible) {
      console.log(`[DurationPickerModal] 🎛️ Picker modal shown`);
    }
  }, [visible]);
  
  // オプション配列をメモ化
  const hoursOptions = useMemo(() => Array.from({ length: 24 }, (_, i) => `${i}`), []);
  const minuteOptions = useMemo(() => Array.from({ length: 60 }, (_, i) => `${i}`), []);

  // 初期化処理（初回のみ実行）
  useEffect(() => {
    let isMounted = true;
    
    const initializeDuration = async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved && isMounted) {
          const { hours: savedHours, minutes: savedMinutes } = JSON.parse(saved);
          onChangeHours(savedHours);
          onChangeMinutes(savedMinutes);
        }
      } catch (error) {
        console.error('Failed to load saved duration:', error);
      }
    };
    
    initializeDuration();
    
    return () => {
      isMounted = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  
  // 確定時に値を保存
  const handleConfirm = useCallback(async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
        hours,
        minutes
      }));
    } catch (error) {
      console.error('Failed to save duration:', error);
    }
    onConfirm();
  }, [hours, minutes, onConfirm]);

  // 点滅防止：visibleがfalseの場合は完全に非表示
  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      supportedOrientations={['portrait']}
      onRequestClose={() => {}}
      presentationStyle="overFullScreen"
      hardwareAccelerated={true}
      hideModalContentWhileAnimating={false}
    >
      <View style={styles.container}>
        <View style={styles.row}>
          <View style={styles.pickerGroup}>
            <View style={styles.pickerContainer}>
              <WheelPicker
                key={visible ? 'hours-visible' : 'hours-hidden'}
                options={hoursOptions}
                selectedIndex={hours}
                onChange={onChangeHours}
                itemHeight={60}
                visibleRest={1}
                containerStyle={{ 
                  backgroundColor: 'transparent',
                  width: pickerWidth,
                }}
                itemTextStyle={{ 
                  color: textColor, 
                  fontSize: 48, 
                  fontWeight: '300',
                  letterSpacing: 1.5,
                  fontFamily: 'System',
                }}
                selectedIndicatorStyle={{
                  backgroundColor: 'transparent',
                }}
                decelerationRate="fast"
                scrollEventThrottle={16}
                showsVerticalScrollIndicator={false}
                bounces={true}
                bouncesZoom={false}
              />
              <Text style={[styles.overlayLabel, { color: textColor }]}>{t('common.hours_label')}</Text>
            </View>
          </View>
          <View style={styles.pickerGroup}>
            <View style={styles.pickerContainer}>
              <WheelPicker
                key={visible ? 'minutes-visible' : 'minutes-hidden'}
                options={minuteOptions}
                selectedIndex={minutes}
                onChange={onChangeMinutes}
                itemHeight={60}
                visibleRest={1}
                containerStyle={{ 
                  backgroundColor: 'transparent',
                  width: pickerWidth,
                }}
                itemTextStyle={{ 
                  color: textColor, 
                  fontSize: 48, 
                  fontWeight: '300',
                  letterSpacing: 1.5,
                  fontFamily: 'System',
                }}
                selectedIndicatorStyle={{
                  backgroundColor: 'transparent',
                }}
                decelerationRate="fast"
                snapToAlignment="center"
                scrollEventThrottle={16}
                showsVerticalScrollIndicator={false}
                bounces={true}
                bouncesZoom={false}
              />
              <Text style={[styles.overlayLabel, { color: textColor }]}>{t('common.minutes_label')}</Text>
            </View>
          </View>
        </View>
        <View style={styles.buttonRow}>
          <Pressable style={styles.cancelButton} onPress={onClose}>
            <Text style={[styles.cancelButtonText, { color: textColor }]}>終了</Text>
          </Pressable>
          <Pressable style={styles.startButton} onPress={handleConfirm}>
            <Text style={[styles.startButtonText, { color: textColor }]}>開始</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
});

export default DurationPickerModal;

const styles = StyleSheet.create({
  container: { 
    backgroundColor: 'transparent', // 透明背景 - GlobalOverlayManagerが背景を提供
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
    padding: 40,
    zIndex: 6000, // GlobalOverlayManagerより前面に表示
    elevation: 6000,
  },
  row: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center',
    gap: 60,
  },
  pickerGroup: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayLabel: { 
    position: 'absolute',
    right: -30,
    top: '50%',
    marginTop: -12,
    fontSize: 20, 
    fontWeight: '300',
    letterSpacing: 0.5,
    opacity: 0.8,
    fontFamily: 'System',
  },
  pickerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  buttonRow: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    gap: 48, 
    marginTop: 40,
  },
  startButton: { 
    paddingVertical: 16, 
    paddingHorizontal: 32, 
    alignItems: 'center',
    justifyContent: 'center',
  },
  startButtonText: {
    fontSize: 22,
    fontWeight: '500',
    letterSpacing: 1.2,
    fontFamily: 'System',
    opacity: 1.0,
  },
  cancelButton: { 
    paddingVertical: 16, 
    paddingHorizontal: 32, 
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 22,
    fontWeight: '400',
    letterSpacing: 1.2,
    fontFamily: 'System',
    opacity: 0.9,
  },
});