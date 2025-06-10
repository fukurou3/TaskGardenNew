import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, useWindowDimensions, Platform } from 'react-native';
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

const HOURS_OPTIONS = Array.from({ length: 24 }, (_, i) => `${i}`);
const MINUTE_SECOND_OPTIONS = Array.from({ length: 60 }, (_, i) => `${i}`);

const STORAGE_KEY = '@growth_duration_picker';

export default function DurationPickerModal({
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
  const { width } = useWindowDimensions();
  const pickerWidth = 90;
  
  const [internalHours, setInternalHours] = useState(hours);
  const [internalMinutes, setInternalMinutes] = useState(minutes);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // 初期化処理（アプリ起動時に一度だけ実行）
  useEffect(() => {
    const initializeDuration = async () => {
      if (!isInitialized) {
        try {
          const saved = await AsyncStorage.getItem(STORAGE_KEY);
          if (saved) {
            const { hours: savedHours, minutes: savedMinutes } = JSON.parse(saved);
            setInternalHours(savedHours);
            setInternalMinutes(savedMinutes);
            onChangeHours(savedHours);
            onChangeMinutes(savedMinutes);
          }
        } catch (error) {
          console.error('Failed to load saved duration:', error);
        }
        setIsInitialized(true);
      }
    };
    
    initializeDuration();
  }, [isInitialized, onChangeHours, onChangeMinutes]);
  
  // 外部からの値変更を反映
  useEffect(() => {
    if (visible) {
      setInternalHours(hours);
      setInternalMinutes(minutes);
    }
  }, [visible, hours, minutes]);
  
  // 値変更時の処理
  const handleHoursChange = (val: number) => {
    setInternalHours(val);
    onChangeHours(val);
  };
  
  const handleMinutesChange = (val: number) => {
    setInternalMinutes(val);
    onChangeMinutes(val);
  };
  
  // 確定時に値を保存
  const handleConfirm = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
        hours: internalHours,
        minutes: internalMinutes
      }));
    } catch (error) {
      console.error('Failed to save duration:', error);
    }
    // 変更が確実に親に反映されるよう、最新の値を通知
    onChangeHours(internalHours);
    onChangeMinutes(internalMinutes);
    onConfirm();
  };

  // react-native-modalを使わず、直接条件付きレンダリング
  if (!visible) return null;

  return (
    <>
      {/* 薄暗いオーバーレイ */}
      <View style={styles.dimOverlay} />
      
      {/* 背景のオーバーレイ */}
      <Pressable 
        style={styles.backdrop} 
        onPress={onClose}
      />
      
      {/* ピッカーコンテンツ */}
      <View style={styles.modalContainer}>
        <View style={styles.container}>
          <View style={styles.row}>
            <View style={styles.pickerGroup}>
              <View style={styles.pickerContainer}>
                <WheelPicker
                  key={`hours-${internalHours}`}
                  options={HOURS_OPTIONS}
                  selectedIndex={internalHours}
                  onChange={handleHoursChange}
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
                  key={`minutes-${internalMinutes}`}
                  options={MINUTE_SECOND_OPTIONS}
                  selectedIndex={internalMinutes}
                  onChange={handleMinutesChange}
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
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  dimOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    zIndex: 998,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    zIndex: 999,
  },
  modalContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  container: { 
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginLeft: -30,
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