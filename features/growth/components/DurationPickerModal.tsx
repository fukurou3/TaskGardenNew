import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, useWindowDimensions, Animated } from 'react-native';
import WheelPicker from 'react-native-wheely';
import { useTranslation } from 'react-i18next';

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
  
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, fadeAnim]);

  if (!visible) return null;
  
  return (
    <Animated.View style={[
      styles.contentContainer, 
      { 
        opacity: fadeAnim,
      }
    ]}>
      <Pressable style={styles.overlayTouchable}>
        <View style={styles.container}>
        <View style={styles.row}>
          <View style={styles.pickerContainer}>
            <WheelPicker
              options={HOURS_OPTIONS}
              selectedIndex={hours}
              onChange={onChangeHours}
              itemHeight={60}
              visibleRest={2}
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
              decelerationRate="normal"
              snapToAlignment="center"
              scrollEventThrottle={1}
              showsVerticalScrollIndicator={false}
              bounces={true}
              bouncesZoom={false}
            />
          </View>
          <Text style={[styles.labelSmall, { color: textColor }]}>{t('common.hours_label')}</Text>
          <View style={styles.spacerLarge} />
          <View style={styles.pickerContainer}>
            <WheelPicker
              options={MINUTE_SECOND_OPTIONS}
              selectedIndex={minutes}
              onChange={onChangeMinutes}
              itemHeight={60}
              visibleRest={2}
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
              decelerationRate="normal"
              snapToAlignment="center"
              scrollEventThrottle={1}
              showsVerticalScrollIndicator={false}
              bounces={true}
              bouncesZoom={false}
            />
          </View>
          <Text style={[styles.labelSmall, { color: textColor }]}>{t('common.minutes_label')}</Text>
        </View>
        <View style={styles.buttonRow}>
          <Pressable style={styles.cancelButton} onPress={onClose}>
            <Text style={[styles.cancelButtonText, { color: textColor }]}>終了</Text>
          </Pressable>
          <Pressable style={styles.startButton} onPress={onConfirm}>
            <Text style={[styles.startButtonText, { color: textColor }]}>開始</Text>
          </Pressable>
        </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  contentContainer: { 
    ...StyleSheet.absoluteFillObject, 
    justifyContent: 'center', 
    alignItems: 'center', 
    zIndex: 10,
  },
  overlayTouchable: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  container: { 
    padding: 40,
  },
  row: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-evenly', 
    marginVertical: 20,
    width: '100%',
    paddingHorizontal: 20,
  },
  pickerGroup: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  labelSmall: { 
    marginBottom: 16,
    fontSize: 24, 
    fontWeight: '400',
    letterSpacing: 0.8,
    opacity: 0.9,
    fontFamily: 'System',
    textAlign: 'center',
  },
  pickerContainer: {
    paddingVertical: 40,
    paddingHorizontal: 30,
    minHeight: 260,
    minWidth: 140,
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
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