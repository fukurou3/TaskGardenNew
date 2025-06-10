import React, { useEffect } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import { Canvas, Circle, RoundedRect, LinearGradient, vec, Path, Skia, Rect } from '@shopify/react-native-skia';
import Animated, { useSharedValue, withTiming, withSequence, withRepeat, withDelay, Easing, useAnimatedStyle, runOnJS, interpolate, useDerivedValue } from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface StartupAnimationProps {
  onAnimationEnd?: () => void;
}

export default function StartupAnimation({ onAnimationEnd }: StartupAnimationProps) {
  const progress = useSharedValue(0);
  const rotation = useSharedValue(0);
  const waveProgress = useSharedValue(0);
  const triangleProgress = useSharedValue(0);
  const hexagonProgress = useSharedValue(0);
  
  const animatedOpacity = useDerivedValue(() => 
    interpolate(progress.value, [0, 0.2, 0.8, 1], [0, 1, 1, 0])
  );

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 3000, easing: Easing.linear }), 
      -1, 
      false
    );
    
    waveProgress.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1000, easing: Easing.bezier(0.4, 0, 0.6, 1) }),
        withTiming(0, { duration: 1000, easing: Easing.bezier(0.4, 0, 0.6, 1) })
      ),
      -1,
      false
    );
    
    triangleProgress.value = withDelay(300, withTiming(1, { duration: 1200, easing: Easing.out(Easing.quad) }));
    hexagonProgress.value = withDelay(600, withTiming(1, { duration: 1000, easing: Easing.out(Easing.quad) }));
    
    progress.value = withSequence(
      withTiming(0.8, { duration: 1500, easing: Easing.out(Easing.quad) }),
      withDelay(800, withTiming(1, { duration: 500, easing: Easing.in(Easing.quad) }))
    );

    const timeout = setTimeout(() => {
      if (onAnimationEnd) {
        onAnimationEnd();
      }
    }, 2800);

    return () => clearTimeout(timeout);
  }, []);

  const createTrianglePath = (centerX: number, centerY: number, size: number) => {
    const path = Skia.Path.Make();
    const height = (size * Math.sqrt(3)) / 2;
    
    path.moveTo(centerX, centerY - height / 2);
    path.lineTo(centerX - size / 2, centerY + height / 2);
    path.lineTo(centerX + size / 2, centerY + height / 2);
    path.close();
    
    return path;
  };

  const createHexagonPath = (centerX: number, centerY: number, radius: number) => {
    const path = Skia.Path.Make();
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      
      if (i === 0) {
        path.moveTo(x, y);
      } else {
        path.lineTo(x, y);
      }
    }
    path.close();
    return path;
  };

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: animatedOpacity.value,
  }));

  return (
    <View style={[StyleSheet.absoluteFill, styles.overlay]} pointerEvents="none">
      <Animated.View style={[StyleSheet.absoluteFill, animatedStyle]}>
        <Canvas style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}>
          <LinearGradient
            start={vec(0, 0)}
            end={vec(SCREEN_WIDTH, SCREEN_HEIGHT)}
            colors={['#1a1a2e', '#16213e', '#0f3460']}
          />
          
          {/* Rotating outer ring */}
          <Circle
            cx={SCREEN_WIDTH / 2}
            cy={SCREEN_HEIGHT / 2}
            r={80 + 20 * waveProgress.value}
            color="rgba(255, 255, 255, 0.1)"
            style="stroke"
            strokeWidth={2}
            transform={[
              { rotate: rotation.value * (Math.PI / 180) },
            ]}
            origin={{ x: SCREEN_WIDTH / 2, y: SCREEN_HEIGHT / 2 }}
          />
          
          {/* Pulsing circles */}
          <Circle
            cx={SCREEN_WIDTH / 2}
            cy={SCREEN_HEIGHT / 2}
            r={40 + 15 * waveProgress.value}
            color={`rgba(138, 43, 226, ${0.3 * (1 - waveProgress.value)})`}
          />
          
          <Circle
            cx={SCREEN_WIDTH / 2}
            cy={SCREEN_HEIGHT / 2}
            r={60 + 25 * waveProgress.value}
            color={`rgba(75, 0, 130, ${0.2 * (1 - waveProgress.value)})`}
          />
          
          {/* Animated triangle */}
          <Path
            path={createTrianglePath(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2, 50 * triangleProgress.value)}
            color="rgba(255, 255, 255, 0.8)"
            transform={[
              { rotate: (rotation.value * 2) * (Math.PI / 180) },
            ]}
            origin={{ x: SCREEN_WIDTH / 2, y: SCREEN_HEIGHT / 2 }}
          />
          
          {/* Animated hexagon */}
          <Path
            path={createHexagonPath(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2, 30 * hexagonProgress.value)}
            color="rgba(255, 255, 255, 0.6)"
            style="stroke"
            strokeWidth={2}
            transform={[
              { rotate: (-rotation.value * 1.5) * (Math.PI / 180) },
            ]}
            origin={{ x: SCREEN_WIDTH / 2, y: SCREEN_HEIGHT / 2 }}
          />
          
          {/* Central glowing dot */}
          <Circle
            cx={SCREEN_WIDTH / 2}
            cy={SCREEN_HEIGHT / 2}
            r={8}
            color="rgba(255, 255, 255, 0.9)"
          />
          
          {/* Floating geometric elements */}
          <RoundedRect
            x={SCREEN_WIDTH / 2 - 100}
            y={SCREEN_HEIGHT / 2 - 100}
            width={20 * triangleProgress.value}
            height={20 * triangleProgress.value}
            r={4}
            color="rgba(255, 255, 255, 0.4)"
            transform={[
              { rotate: rotation.value * (Math.PI / 180) },
            ]}
            origin={{ x: SCREEN_WIDTH / 2 - 90, y: SCREEN_HEIGHT / 2 - 90 }}
          />
          
          <RoundedRect
            x={SCREEN_WIDTH / 2 + 80}
            y={SCREEN_HEIGHT / 2 + 80}
            width={15 * hexagonProgress.value}
            height={15 * hexagonProgress.value}
            r={3}
            color="rgba(255, 255, 255, 0.5)"
            transform={[
              { rotate: (-rotation.value * 1.2) * (Math.PI / 180) },
            ]}
            origin={{ x: SCREEN_WIDTH / 2 + 87.5, y: SCREEN_HEIGHT / 2 + 87.5 }}
          />
        </Canvas>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    zIndex: 9999,
  },
});
