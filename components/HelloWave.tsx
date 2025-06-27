import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { Text } from 'react-native';
// Temporarily disabled reanimated
// import Animated, { useSharedValue, useAnimatedStyle, withTiming, withRepeat, withSequence } from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';

export function HelloWave() {
  // Simplified without animation
  return (
    <ThemedText style={styles.text}>👋</ThemedText>
  );
}

const styles = StyleSheet.create({
  text: {
    fontSize: 28,
    lineHeight: 32,
    marginTop: -6,
  },
});
