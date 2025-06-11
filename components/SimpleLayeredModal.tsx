import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing, Dimensions, StatusBar, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface SimpleLayeredModalProps {
  visible: boolean;
  children: React.ReactNode;
  overlayOpacity?: number;
}

export default function SimpleLayeredModal({
  visible,
  children,
  overlayOpacity = 0.75,
}: SimpleLayeredModalProps) {
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  
  // 真の画面サイズを取得（ステータスバー・ナビゲーションバー含む）
  const screenData = Dimensions.get('screen');
  const windowData = Dimensions.get('window');
  
  // Android edgeToEdge時の実際の画面高さ
  const actualHeight = Platform.OS === 'android' ? screenData.height : windowData.height;
  const actualWidth = Platform.OS === 'android' ? screenData.width : windowData.width;
  
  // デバッグ情報
  React.useEffect(() => {
    if (visible) {
      console.log('SimpleLayeredModal Debug:');
      console.log('Screen dimensions:', screenData);
      console.log('Window dimensions:', windowData);
      console.log('Safe area insets:', insets);
      console.log('Using height:', actualHeight, 'width:', actualWidth);
    }
  }, [visible, screenData, windowData, insets, actualHeight, actualWidth]);

  useEffect(() => {
    if (visible) {
      // 表示アニメーション
      Animated.parallel([
        Animated.timing(overlayAnim, {
          toValue: overlayOpacity,
          duration: 1000,
          easing: Easing.out(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // 非表示アニメーション
      Animated.parallel([
        Animated.timing(overlayAnim, {
          toValue: 0,
          duration: 250,
          easing: Easing.in(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 250,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, overlayOpacity, fadeAnim, scaleAnim, overlayAnim]);

  if (!visible) return null;

  return (
    <>
      {/* オーバーレイ層 - 背景（ナビゲーションエリア含む完全カバー） */}
      <Animated.View
        style={[
          styles.overlayLayer,
          {
            opacity: overlayAnim,
            height: actualHeight,
            width: actualWidth,
            top: Platform.OS === 'android' ? -insets.top : 0, // ステータスバーエリアまでカバー
          }
        ]}
        pointerEvents="none"
      >
        <View style={[styles.dimBackground, { height: actualHeight, width: actualWidth }]} />
      </Animated.View>
      
      {/* コンテンツ層 - 前面 */}
      <Animated.View
        style={[
          styles.contentLayer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
            paddingBottom: insets.bottom,
          }
        ]}
      >
        <View style={styles.contentWrapper}>
          {children}
        </View>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  overlayLayer: {
    position: 'absolute',
    left: 0,
    zIndex: 100,
    elevation: 100,
    // AndroidのedgeToEdge環境での完全カバーリング
    ...(Platform.OS === 'android' && {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    }),
  },
  dimBackground: {
    backgroundColor: 'rgba(0, 0, 0, 1)',
    // Androidでのナビゲーションバーエリアまでカバー
    ...(Platform.OS === 'android' && {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    }),
  },
  contentLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    elevation: 1000,
  },
  contentWrapper: {
    backgroundColor: 'transparent',
    width: '100%',
    alignItems: 'center',
  },
});