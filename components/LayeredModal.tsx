import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePortal } from '@/context/PortalContext';

interface LayeredModalProps {
  visible: boolean;
  modalId: string;
  children: React.ReactNode;
  overlayOpacity?: number;
  zIndex?: number;
  onShow?: () => void;
  onHide?: () => void;
}

export default function LayeredModal({
  visible,
  modalId,
  children,
  overlayOpacity = 0.75,
  zIndex = 1000,
  onShow,
  onHide,
}: LayeredModalProps) {
  const portal = usePortal();
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const prevVisible = useRef(visible);

  useEffect(() => {
    if (visible !== prevVisible.current) {
      if (visible) {
        // オーバーレイ表示
        portal.showOverlay(overlayOpacity);
        
        // モーダルコンテンツを直接作成
        const modalContent = (
          <Animated.View
            style={[
              styles.modalContainer,
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
        );
        
        // モーダルコンテンツ表示
        portal.showModal(modalId, modalContent, zIndex);
        
        // アニメーション開始
        fadeAnim.setValue(0);
        scaleAnim.setValue(0.9);
        
        Animated.parallel([
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
        ]).start(() => {
          onShow?.();
        });
        
      } else {
        // 非表示アニメーション
        Animated.parallel([
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
        ]).start(() => {
          portal.hideModal(modalId);
          portal.hideOverlay();
          onHide?.();
        });
      }
      
      prevVisible.current = visible;
    }
  }, [visible, modalId, overlayOpacity, zIndex]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (visible) {
        portal.hideModal(modalId);
        portal.hideOverlay();
      }
    };
  }, [portal, modalId, visible]);

  return null; // このコンポーネント自体は何も描画しない
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentWrapper: {
    backgroundColor: 'transparent',
    borderRadius: 0,
    padding: 0,
    width: '100%',
    alignItems: 'center',
  },
});