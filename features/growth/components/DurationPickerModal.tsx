import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, useWindowDimensions, Platform } from 'react-native';
import Modal from 'react-native-modal';
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
  
  const [internalHours, setInternalHours] = useState(1);
  const [internalMinutes, setInternalMinutes] = useState(0);
  
  // 保存された値を読み込み
  useEffect(() => {
    const loadSavedDuration = async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) {
          const { hours: savedHours, minutes: savedMinutes } = JSON.parse(saved);
          setInternalHours(savedHours);
          setInternalMinutes(savedMinutes);
          onChangeHours(savedHours);
          onChangeMinutes(savedMinutes);
        } else {
          // 初期値: 1時間
          setInternalHours(1);
          setInternalMinutes(0);
          onChangeHours(1);
          onChangeMinutes(0);
        }
      } catch (error) {
        console.error('Failed to load saved duration:', error);
        // エラー時は初期値: 1時間
        setInternalHours(1);
        setInternalMinutes(0);
        onChangeHours(1);
        onChangeMinutes(0);
      }
    };
    
    if (visible) {
      loadSavedDuration();
    }
  }, [visible]);
  
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
    onConfirm();
  };

  return (
    <Modal
      isVisible={visible}
      animationIn="fadeIn"
      animationOut="fadeOut"
      style={styles.modal}
      backdropOpacity={0}
      animationInTiming={300}
      animationOutTiming={300}
      hideModalContentWhileAnimating
      useNativeDriver={Platform.OS === 'android'}
      useNativeDriverForBackdrop
      onBackdropPress={onClose}
      onBackButtonPress={() => { onClose(); return true; }}
    >
      <View style={styles.container}>
        <View style={styles.row}>
          <View style={styles.pickerGroup}>
            <View style={styles.pickerContainer}>
              <WheelPicker
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
                snapToAlignment="center"
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
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: {
    justifyContent: 'center',
    alignItems: 'center',
    margin: 0,
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