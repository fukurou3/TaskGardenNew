import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing, Platform, StatusBar, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SystemUIManager } from '@/utils/SystemUIManager';

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
  
  
  useEffect(() => {
    if (visible) {
      // プラットフォーム固有の没入処理
      if (Platform.OS === 'android') {
        // react-native-system-bars を使用したImmersive Mode
        SystemUIManager.enableModalFullScreen().catch((error) => {
          console.warn('Failed to enable immersive mode:', error);
        });
      } else {
        // iOS: ステータスバーのみ非表示
        StatusBar.setHidden(true, 'none'); // アニメーション無効でちらつき防止
      }
      
      // 即座表示（アニメーション完全無効）
      overlayAnim.setValue(overlayOpacity);
      fadeAnim.setValue(1);
      scaleAnim.setValue(1);
    } else {
      // プラットフォーム固有の復元処理
      if (Platform.OS === 'android') {
        // Immersive Mode を無効化
        SystemUIManager.disableModalFullScreen().catch((error) => {
          console.warn('Failed to disable immersive mode:', error);
        });
      } else {
        // iOS: ステータスバーを復元
        StatusBar.setHidden(false, 'none'); // アニメーション無効でちらつき防止
      }
      
      // 即座非表示（アニメーション完全無効）
      overlayAnim.setValue(0);
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.9);
    }
  }, [visible, overlayOpacity, fadeAnim, scaleAnim, overlayAnim]);

  if (!visible) return null;

  return (
    <Modal 
      visible={visible} 
      transparent 
      animationType="none" 
      statusBarTranslucent
      supportedOrientations={['portrait']}
      onRequestClose={() => {}}
      presentationStyle="overFullScreen"
      hardwareAccelerated={true}
    >
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
    </Modal>
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
    backgroundColor: 'rgba(0, 0, 0, 0.75)', // 適切な薄暗い効果
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