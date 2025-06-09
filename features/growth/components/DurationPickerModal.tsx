import React from 'react';
import { View, Text, StyleSheet, Pressable, useWindowDimensions } from 'react-native';
import WheelPicker from 'react-native-wheely';
import { Ionicons } from '@expo/vector-icons';
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
  const rowWidth = width * 0.7;
  if (!visible) return null;
  return (
    <Pressable style={styles.overlay} onPress={onClose}>
      <Pressable style={styles.container} onPress={(e) => e.stopPropagation()}>
        <View style={[styles.row, { width: rowWidth }]}>
          <WheelPicker
            options={HOURS_OPTIONS}
            selectedIndex={hours}
            onChange={onChangeHours}
            itemHeight={64}
            visibleRest={2}
            containerStyle={{ 
              backgroundColor: 'transparent',
              borderRadius: 12,
            }}
            itemTextStyle={{ 
              color: textColor, 
              fontSize: 28, 
              fontWeight: '300',
              letterSpacing: 0.5,
            }}
            selectedIndicatorStyle={{
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              borderRadius: 8,
              marginHorizontal: 4,
            }}
          />
          <Text style={[styles.label, { color: textColor }]}>{t('common.hours_label')}</Text>
          <WheelPicker
            options={MINUTE_SECOND_OPTIONS}
            selectedIndex={minutes}
            onChange={onChangeMinutes}
            itemHeight={64}
            visibleRest={2}
            containerStyle={{ 
              backgroundColor: 'transparent',
              borderRadius: 12,
            }}
            itemTextStyle={{ 
              color: textColor, 
              fontSize: 28, 
              fontWeight: '300',
              letterSpacing: 0.5,
            }}
            selectedIndicatorStyle={{
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              borderRadius: 8,
              marginHorizontal: 4,
            }}
          />
          <Text style={[styles.label, { color: textColor }]}>{t('common.minutes_label')}</Text>
          <WheelPicker
            options={MINUTE_SECOND_OPTIONS}
            selectedIndex={seconds}
            onChange={onChangeSeconds}
            itemHeight={64}
            visibleRest={2}
            containerStyle={{ 
              backgroundColor: 'transparent',
              borderRadius: 12,
            }}
            itemTextStyle={{ 
              color: textColor, 
              fontSize: 28, 
              fontWeight: '300',
              letterSpacing: 0.5,
            }}
            selectedIndicatorStyle={{
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              borderRadius: 8,
              marginHorizontal: 4,
            }}
          />
          <Text style={[styles.label, { color: textColor }]}>{t('common.seconds_label')}</Text>
        </View>
        <View style={styles.buttonRow}>
          <Pressable style={styles.button} onPress={onConfirm}>
            <Ionicons name="play" size={36} color={textColor} />
          </Pressable>
          <Pressable style={styles.button} onPress={onClose}>
            <Ionicons name="reload" size={36} color={textColor} />
          </Pressable>
        </View>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: { 
    ...StyleSheet.absoluteFillObject, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: 'rgba(0,0,0,0.75)' 
  },
  container: { 
    padding: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    backdropFilter: 'blur(20px)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  row: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-evenly', 
    marginVertical: 20,
    paddingHorizontal: 16,
  },
  label: { 
    marginHorizontal: 8, 
    fontSize: 18, 
    fontWeight: '300',
    letterSpacing: 0.5,
    opacity: 0.85,
  },
  buttonRow: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    gap: 24, 
    marginTop: 32,
    paddingHorizontal: 16,
  },
  button: { 
    paddingVertical: 16, 
    paddingHorizontal: 24, 
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    minWidth: 64,
    minHeight: 64,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
});
