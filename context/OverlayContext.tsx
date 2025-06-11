// 成長画面のグローバルオーバーレイ管理（アニメーション廃止・簡素化版）
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

// 単一のenum型で状態管理
export type OverlayType = 'none' | 'picker' | 'timer';

interface OverlayContextValue {
  overlayType: OverlayType;
  setOverlayType: (type: OverlayType) => void;
}

const OverlayContext = createContext<OverlayContextValue>({
  overlayType: 'none',
  setOverlayType: () => {},
});

export function OverlayProvider({ children }: { children: ReactNode }) {
  const [overlayType, setOverlayType] = useState<OverlayType>('none');

  const handleSetOverlayType = useCallback((type: OverlayType) => {
    setOverlayType(type);
  }, []);

  return (
    <OverlayContext.Provider
      value={{ 
        overlayType, 
        setOverlayType: handleSetOverlayType
      }}
    >
      {children}
    </OverlayContext.Provider>
  );
}

export function useOverlay() {
  return useContext(OverlayContext);
}