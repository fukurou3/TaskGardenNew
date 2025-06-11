// グローバルオーバーレイ管理
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type OverlayType = 'none' | 'picker' | 'timer';

interface OverlayContextValue {
  overlayType: OverlayType;
  showPickerOverlay: () => void;
  showTimerOverlay: () => void;
  hideOverlay: () => void;
}

const OverlayContext = createContext<OverlayContextValue>({
  overlayType: 'none',
  showPickerOverlay: () => {},
  showTimerOverlay: () => {},
  hideOverlay: () => {},
});

export function OverlayProvider({ children }: { children: ReactNode }) {
  const [overlayType, setOverlayType] = useState<OverlayType>('none');

  const showPickerOverlay = useCallback(() => {
    setOverlayType('picker');
  }, []);

  const showTimerOverlay = useCallback(() => {
    setOverlayType('timer');
  }, []);

  const hideOverlay = useCallback(() => {
    setOverlayType('none');
  }, []);

  return (
    <OverlayContext.Provider
      value={{ overlayType, showPickerOverlay, showTimerOverlay, hideOverlay }}
    >
      {children}
    </OverlayContext.Provider>
  );
}

export function useOverlay() {
  return useContext(OverlayContext);
}