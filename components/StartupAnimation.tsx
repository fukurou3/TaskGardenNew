import React, { useEffect } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface StartupAnimationProps {
  onAnimationEnd?: () => void;
}

export default function StartupAnimation({ onAnimationEnd }: StartupAnimationProps) {
  // Simplified - no animation, just immediately call onAnimationEnd
  
  useEffect(() => {
    // Immediately call onAnimationEnd to skip animation
    const timer = setTimeout(() => {
      onAnimationEnd?.();
    }, 100);
    return () => clearTimeout(timer);
  }, [onAnimationEnd]);
  
  return (
    <View style={styles.container}>
      {/* Simplified startup screen - no animations */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});