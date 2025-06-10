import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Canvas, Circle, RoundedRect, LinearGradient, vec, useSharedValueEffect } from '@shopify/react-native-skia';
import Animated, { useSharedValue, withTiming, withSequence, withDelay, Easing, useAnimatedStyle, runOnJS, interpolate, useDerivedValue } from 'react-native-reanimated';

interface StartupAnimationProps {
  onAnimationEnd?: () => void;
}

export default function StartupAnimation({ onAnimationEnd }: StartupAnimationProps) {
  const progress = useSharedValue(0);
  const circleProgress = useSharedValue(0);
  const rectProgress = useSharedValue(0);
  
  const animatedOpacity = useDerivedValue(() => 
    interpolate(progress.value, [0, 0.3, 0.7, 1], [0, 1, 1, 0])
  );
  
  const animatedScale = useDerivedValue(() => 
    interpolate(progress.value, [0, 0.5, 1], [0.3, 1.2, 1])
  );

  useEffect(() => {
    circleProgress.value = withDelay(200, withTiming(1, { duration: 800, easing: Easing.out(Easing.cubic) }));
    rectProgress.value = withDelay(400, withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) }));
    
    progress.value = withSequence(
      withTiming(0.7, { duration: 1200, easing: Easing.out(Easing.cubic) }),
      withDelay(300, withTiming(1, { duration: 400, easing: Easing.in(Easing.cubic) }))
    );

    const timeout = setTimeout(() => {
      if (onAnimationEnd) {
        onAnimationEnd();
      }
    }, 2000);

    return () => clearTimeout(timeout);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: animatedOpacity.value,
    transform: [{ scale: animatedScale.value }],
  }));

  return (
    <View style={[StyleSheet.absoluteFill, styles.container]} pointerEvents="box-none">
      <Animated.View style={[styles.center, animatedStyle]}>
        <Canvas style={{ width: 200, height: 200 }}>
          <LinearGradient
            start={vec(0, 0)}
            end={vec(200, 200)}
            colors={['#4A90E2', '#7B68EE', '#9370DB']}
          />
          
          <Circle
            cx={100}
            cy={100}
            r={circleProgress}
            color="rgba(255, 255, 255, 0.3)"
            style="stroke"
            strokeWidth={3}
          />
          
          <Circle
            cx={100}
            cy={100}
            r={circleProgress}
            color="rgba(255, 255, 255, 0.1)"
          />
          
          <RoundedRect
            x={70 + (30 - 30 * rectProgress.value)}
            y={70 + (30 - 30 * rectProgress.value)}
            width={60 * rectProgress.value}
            height={60 * rectProgress.value}
            r={8}
            color="rgba(255, 255, 255, 0.8)"
          />
          
          <Circle
            cx={100}
            cy={100}
            r={20 * circleProgress.value}
            color="rgba(255, 255, 255, 0.9)"
          />
        </Canvas>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(74, 144, 226, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
