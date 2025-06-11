import React, { useEffect } from 'react';
import { View, StyleSheet, Platform, Modal } from 'react-native';
import { useOverlay } from '@/context/OverlayContext';
import { SystemUIManager } from '@/utils/SystemUIManager';

// グローバルオーバーレイマネージャー（アニメーション完全廃止版）
// 成長画面のモーダル間での薄暗い効果を管理
export default function GlobalOverlayManager() {
  const { overlayType } = useOverlay();
  const isVisible = overlayType !== 'none';
  
  useEffect(() => {
    console.log(`[GlobalOverlayManager] 🌫️ Overlay state: ${overlayType} (visible: ${isVisible})`);
    
    if (isVisible) {
      console.log(`[GlobalOverlayManager] 📱 Enabling immersive mode (${Platform.OS})`);
      // React Native特有：Android固有の没入処理
      if (Platform.OS === 'android') {
        SystemUIManager.enableModalFullScreen().catch((error) => {
          console.warn(`[GlobalOverlayManager] ⚠️ Failed to enable immersive mode on Android:`, error);
        });
      } else {
        console.log(`[GlobalOverlayManager] 🍎 iOS: No immersive mode setup needed`);
      }
    } else {
      console.log(`[GlobalOverlayManager] 📱 Disabling immersive mode (${Platform.OS})`);
      // React Native特有：Android固有の復元処理
      if (Platform.OS === 'android') {
        SystemUIManager.disableModalFullScreen().catch((error) => {
          console.warn(`[GlobalOverlayManager] ⚠️ Failed to disable immersive mode on Android:`, error);
        });
      } else {
        console.log(`[GlobalOverlayManager] 🍎 iOS: No immersive mode cleanup needed`);
      }
    }
  }, [isVisible, overlayType]);

  if (!isVisible) {
    return null;
  }

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="none"
      statusBarTranslucent
      supportedOrientations={['portrait']}
      onRequestClose={() => {}}
      presentationStyle="overFullScreen"
      hardwareAccelerated={true}
      hideModalContentWhileAnimating={false}
    >
      <View
        style={styles.overlay}
        pointerEvents="none"
      >
        <View style={styles.dimBackground} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5000,
    elevation: 5000,
  },
  dimBackground: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)', // 適切な薄暗い効果
  },
});