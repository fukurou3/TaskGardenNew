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
            itemHeight={60}
            visibleRest={1}
            containerStyle={{ backgroundColor: 'transparent' }}
            itemTextStyle={{ color: textColor, fontSize: 32, fontWeight: 'bold' }}
          />
          <Text style={[styles.label, { color: textColor }]}>{t('common.hours_label')}</Text>
          <WheelPicker
            options={MINUTE_SECOND_OPTIONS}
            selectedIndex={minutes}
            onChange={onChangeMinutes}
            itemHeight={60}
            visibleRest={1}
            containerStyle={{ backgroundColor: 'transparent' }}
            itemTextStyle={{ color: textColor, fontSize: 32, fontWeight: 'bold' }}
          />
          <Text style={[styles.label, { color: textColor }]}>{t('common.minutes_label')}</Text>
          <WheelPicker
            options={MINUTE_SECOND_OPTIONS}
            selectedIndex={seconds}
            onChange={onChangeSeconds}
            itemHeight={60}
            visibleRest={1}
            containerStyle={{ backgroundColor: 'transparent' }}
            itemTextStyle={{ color: textColor, fontSize: 32, fontWeight: 'bold' }}
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
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  container: { padding: 0, backgroundColor: 'transparent' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly', marginVertical: 10 },
  label: { marginHorizontal: 5, fontSize: 24, fontWeight: 'bold' },
  buttonRow: { flexDirection: 'row', justifyContent: 'center', gap: 40, marginTop: 10 },
  button: { paddingVertical: 12, paddingHorizontal: 20, alignItems: 'center' },
});
