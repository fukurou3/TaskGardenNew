// アプリ全体レベルのオーバーレイ（edgeToEdge対応）
import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Animated, Easing, Dimensions } from 'react-native';
import { useOverlay } from '@/context/OverlayContext';

export default function GlobalOverlay() {
  const { overlayType } = useOverlay();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const prevOverlayType = useRef(overlayType);

  // 画面全体のサイズを取得（edgeToEdgeで利用）
  const screenData = Dimensions.get('screen');
  const windowData = Dimensions.get('window');

  useEffect(() => {
    if (overlayType !== prevOverlayType.current) {
      if (overlayType !== 'none') {
        // オーバーレイ表示
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: overlayType === 'picker' ? 1000 : 1000, // 両方とも1000msアニメーション
          easing: Easing.out(Easing.quad),
          useNativeDriver: false, // backgroundColorを変更するためfalse
        }).start();
      } else {
        // オーバーレイ非表示
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          easing: Easing.in(Easing.quad),
          useNativeDriver: false,
        }).start();
      }
      prevOverlayType.current = overlayType;
    }
  }, [overlayType, fadeAnim]);

  if (overlayType === 'none') return null;

  return (
    <Animated.View
      style={[
        styles.overlay,
        {
          opacity: fadeAnim,
          // edgeToEdgeを活用した完全な画面カバー
          height: screenData.height,
          width: screenData.width,
        }
      ]}
      pointerEvents="box-none" // 子要素のタッチイベントは透過、背景はブロック
    >
      {/* 薄暗い背景 */}
      <View style={styles.dimBackground} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 50, // さらに背面に移動
    elevation: 50, // Android用
    // edgeToEdgeで画面全体をカバー
  },
  dimBackground: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
});