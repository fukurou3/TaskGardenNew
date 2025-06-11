import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing, Platform, StatusBar, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as NavigationBar from 'expo-navigation-bar';

interface ImmersiveModalProps {
  visible: boolean;
  children: React.ReactNode;
  overlayOpacity?: number;
}

export default function ImmersiveModal({
  visible,
  children,
  overlayOpacity = 0.75,
}: ImmersiveModalProps) {
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  
  // Androidでタブナビゲーションエリアもカバーするための画面サイズ取得
  const screenData = Dimensions.get('screen');
  const windowData = Dimensions.get('window');
  
  useEffect(() => {
    if (visible) {
      // プラットフォーム固有の没入処理
      if (Platform.OS === 'android') {
        // Android: システムUIは非表示にしない（タブナビゲーションエリアにも薄暗い効果を適用するため）
        // NavigationBar.setVisibilityAsync('hidden');
        // StatusBar.setHidden(true, 'fade');
      } else {
        // iOS: ステータスバーのみ非表示
        StatusBar.setHidden(true, 'fade');
      }
      
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
      // プラットフォーム固有の復元処理
      if (Platform.OS === 'android') {
        // Android: システムUIは表示のまま維持
        // NavigationBar.setVisibilityAsync('visible');
        // StatusBar.setHidden(false, 'fade');
      } else {
        // iOS: ステータスバーを復元
        StatusBar.setHidden(false, 'fade');
      }
      
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
      {/* フルスクリーンオーバーレイ */}
      <Animated.View
        style={[
          Platform.OS === 'ios' ? styles.iosOverlay : styles.androidOverlay,
          {
            opacity: overlayAnim,
          }
        ]}
        pointerEvents="none"
      >
        <View style={styles.dimBackground} />
      </Animated.View>
      
      {/* コンテンツ層 */}
      <Animated.View
        style={[
          Platform.OS === 'ios' ? styles.iosContent : styles.androidContent,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
            paddingBottom: Platform.OS === 'ios' ? insets.bottom : 0,
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
  // iOS用オーバーレイ（StyleSheet.absoluteFillObjectベース）
  iosOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },
  
  // Android用オーバーレイ（タブナビゲーションエリアもカバーするため画面全体）
  androidOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    elevation: 9999,
    // タブナビゲーションエリアもカバーするため
    height: '100%',
    width: '100%',
  },
  
  dimBackground: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 1)',
  },
  
  // iOS用コンテンツ
  iosContent: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  
  // Android用コンテンツ
  androidContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10000,
    elevation: 10000,
  },
  
  contentWrapper: {
    backgroundColor: 'transparent',
    width: '100%',
    alignItems: 'center',
  },
});