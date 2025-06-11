import { useState, useCallback, useEffect } from 'react';
import SystemOverlay from '@/lib/SystemOverlay';

interface UseSystemOverlayOptions {
  defaultOpacity?: number;
  autoHide?: boolean;
  checkPermissionOnMount?: boolean;
}

interface UseSystemOverlayReturn {
  isVisible: boolean;
  hasPermission: boolean | null;
  isLoading: boolean;
  opacity: number;
  showOverlay: (customOpacity?: number) => Promise<boolean>;
  hideOverlay: () => Promise<boolean>;
  toggleOverlay: (customOpacity?: number) => Promise<boolean>;
  updateOpacity: (newOpacity: number) => Promise<boolean>;
  checkPermission: () => Promise<boolean>;
  requestPermission: () => Promise<boolean>;
}

export function useSystemOverlay(options: UseSystemOverlayOptions = {}): UseSystemOverlayReturn {
  const {
    defaultOpacity = 0.75,
    autoHide = false,
    checkPermissionOnMount = true,
  } = options;

  const [isVisible, setIsVisible] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [opacity, setOpacity] = useState(defaultOpacity);

  const checkPermission = useCallback(async (): Promise<boolean> => {
    if (!SystemOverlay) {
      console.warn('SystemOverlay module not available');
      return false;
    }

    try {
      const permission = await SystemOverlay.checkPermission();
      setHasPermission(permission);
      return permission;
    } catch (error) {
      console.error('Failed to check overlay permission:', error);
      setHasPermission(false);
      return false;
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!SystemOverlay) {
      console.warn('SystemOverlay module not available');
      return false;
    }

    try {
      setIsLoading(true);
      const granted = await SystemOverlay.requestPermission();
      setHasPermission(granted);
      return granted;
    } catch (error) {
      console.error('Failed to request overlay permission:', error);
      setHasPermission(false);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const showOverlay = useCallback(async (customOpacity?: number): Promise<boolean> => {
    if (!SystemOverlay) {
      console.warn('SystemOverlay module not available, falling back to standard overlay');
      return false;
    }

    try {
      setIsLoading(true);
      const targetOpacity = customOpacity ?? opacity;
      const success = await SystemOverlay.showOverlay(targetOpacity);
      
      if (success) {
        setIsVisible(true);
        setOpacity(targetOpacity);
        console.log(`System overlay shown with opacity: ${targetOpacity}`);
      } else {
        console.warn('Failed to show system overlay');
      }
      
      return success;
    } catch (error) {
      console.error('Failed to show system overlay:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [opacity]);

  const hideOverlay = useCallback(async (): Promise<boolean> => {
    if (!SystemOverlay) {
      console.warn('SystemOverlay module not available');
      return false;
    }

    try {
      setIsLoading(true);
      const success = await SystemOverlay.hideOverlay();
      
      if (success) {
        setIsVisible(false);
        console.log('System overlay hidden');
      } else {
        console.warn('Failed to hide system overlay');
      }
      
      return success;
    } catch (error) {
      console.error('Failed to hide system overlay:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const toggleOverlay = useCallback(async (customOpacity?: number): Promise<boolean> => {
    if (isVisible) {
      return await hideOverlay();
    } else {
      return await showOverlay(customOpacity);
    }
  }, [isVisible, hideOverlay, showOverlay]);

  const updateOpacity = useCallback(async (newOpacity: number): Promise<boolean> => {
    if (!SystemOverlay) {
      console.warn('SystemOverlay module not available');
      return false;
    }

    try {
      setIsLoading(true);
      const success = await SystemOverlay.updateOpacity(newOpacity);
      
      if (success) {
        setOpacity(newOpacity);
        console.log(`System overlay opacity updated to: ${newOpacity}`);
      } else {
        console.warn('Failed to update system overlay opacity');
      }
      
      return success;
    } catch (error) {
      console.error('Failed to update system overlay opacity:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Check permission on mount
  useEffect(() => {
    if (checkPermissionOnMount) {
      checkPermission();
    }
  }, [checkPermission, checkPermissionOnMount]);

  // Auto hide overlay on unmount
  useEffect(() => {
    return () => {
      if (autoHide && isVisible) {
        hideOverlay().catch(console.error);
      }
    };
  }, [autoHide, isVisible, hideOverlay]);

  return {
    isVisible,
    hasPermission,
    isLoading,
    opacity,
    showOverlay,
    hideOverlay,
    toggleOverlay,
    updateOpacity,
    checkPermission,
    requestPermission,
  };
}