import { NativeModules } from 'react-native';

export interface SystemOverlayModule {
  showOverlay(opacity: number): Promise<boolean>;
  hideOverlay(): Promise<boolean>;
  updateOpacity(opacity: number): Promise<boolean>;
  checkPermission(): Promise<boolean>;
  requestPermission(): Promise<boolean>;
}

const { SystemOverlay } = NativeModules;

if (!SystemOverlay) {
  console.warn('SystemOverlay native module not found. Make sure you have rebuilt the app.');
}

export default SystemOverlay as SystemOverlayModule;