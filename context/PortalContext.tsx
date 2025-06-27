import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { View, StyleSheet, Animated, Easing, Dimensions } from 'react-native';

interface PortalItem {
  id: string;
  element: ReactNode;
  layer: 'overlay' | 'content';
  zIndex: number;
}

interface PortalContextValue {
  showOverlay: (opacity: number) => void;
  hideOverlay: () => void;
  showModal: (id: string, element: ReactNode, zIndex?: number) => void;
  hideModal: (id: string) => void;
  hideAllModals: () => void;
}

const PortalContext = createContext<PortalContextValue>({
  showOverlay: () => {},
  hideOverlay: () => {},
  showModal: () => {},
  hideModal: () => {},
  hideAllModals: () => {},
});

export function PortalProvider({ children }: { children: ReactNode }) {
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [overlayOpacity, setOverlayOpacity] = useState(0.75);
  const [modals, setModals] = useState<PortalItem[]>([]);
  
  const overlayAnim = React.useRef(new Animated.Value(0)).current;

  const showOverlay = useCallback((opacity: number = 0.75) => {
    setOverlayOpacity(opacity);
    setOverlayVisible(true);
    
    Animated.timing(overlayAnim, {
      toValue: 1,
      duration: 1000,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [overlayAnim]);

  const hideOverlay = useCallback(() => {
    Animated.timing(overlayAnim, {
      toValue: 0,
      duration: 250,
      easing: Easing.in(Easing.quad),
      useNativeDriver: false,
    }).start(() => {
      setOverlayVisible(false);
    });
  }, [overlayAnim]);

  const showModal = useCallback((id: string, element: ReactNode, zIndex: number = 1000) => {
    setModals(prev => {
      // 同じIDのモーダルがあれば置換、なければ追加
      const existingIndex = prev.findIndex(modal => modal.id === id);
      const newModal: PortalItem = {
        id,
        element,
        layer: 'content',
        zIndex,
      };
      
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = newModal;
        return updated;
      }
      return [...prev, newModal];
    });
  }, []);

  const hideModal = useCallback((id: string) => {
    setModals(prev => prev.filter(modal => modal.id !== id));
  }, []);

  const hideAllModals = useCallback(() => {
    setModals([]);
  }, []);

  const screenData = Dimensions.get('screen');

  return (
    <PortalContext.Provider value={{
      showOverlay,
      hideOverlay,
      showModal,
      hideModal,
      hideAllModals,
    }}>
      {children}
      
      {/* オーバーレイ層 - 最背面 */}
      {overlayVisible && (
        <Animated.View
          style={[
            styles.overlayLayer,
            {
              opacity: overlayAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, overlayOpacity],
              }),
              height: screenData.height,
              width: screenData.width,
            }
          ]}
          pointerEvents="none"
        >
          <View style={styles.dimBackground} />
        </Animated.View>
      )}
      
      {/* モーダルコンテンツ層 - 前面 */}
      {modals.map((modal) => (
        <View
          key={modal.id}
          style={[
            styles.contentLayer,
            { zIndex: modal.zIndex }
          ]}
        >
          {modal.element}
        </View>
      ))}
    </PortalContext.Provider>
  );
}

export function usePortal() {
  return useContext(PortalContext);
}

const styles = StyleSheet.create({
  overlayLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 100, // 背景層
    elevation: 100,
  },
  dimBackground: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 1)', // 完全に不透明、opacityで制御
  },
  contentLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    elevation: 1000, // 前面層
  },
});