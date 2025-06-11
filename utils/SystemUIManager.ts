import { Platform, StatusBar } from 'react-native';

// react-native-system-barsの安全なインポート
let AndroidSystemBars: any = null;
try {
  const systemBarsModule = require('react-native-system-bars');
  AndroidSystemBars = systemBarsModule.default || systemBarsModule;
} catch (error) {
  console.warn('react-native-system-bars module not found:', error);
}

export class SystemUIManager {
  // フルスクリーンモードを有効にする
  static async enableFullScreenMode(): Promise<void> {
    if (Platform.OS !== 'android') return;
    
    if (!AndroidSystemBars) {
      console.warn('AndroidSystemBars module not available, using fallback');
      // フォールバック: StatusBarのみ制御
      StatusBar.setHidden(true, 'slide');
      return;
    }
    
    try {
      await AndroidSystemBars.enableFullScreenMode('immersive', true);
      console.log('Full screen mode enabled with react-native-system-bars');
    } catch (error) {
      console.error('Failed to enable full screen mode:', error);
      // フォールバック
      StatusBar.setHidden(true, 'slide');
    }
  }
  
  // 通常モードに戻す
  static async disableFullScreenMode(): Promise<void> {
    if (Platform.OS !== 'android') return;
    
    if (!AndroidSystemBars) {
      console.warn('AndroidSystemBars module not available, using fallback');
      // フォールバック: StatusBarのみ制御
      StatusBar.setHidden(false, 'slide');
      return;
    }
    
    try {
      await AndroidSystemBars.clearFlags();
      console.log('Full screen mode disabled');
    } catch (error) {
      console.error('Failed to disable full screen mode:', error);
      // フォールバック
      StatusBar.setHidden(false, 'slide');
    }
  }
  
  // モーダル表示時の特別な設定（Immersive Mode）
  static async enableModalFullScreen(): Promise<void> {
    if (Platform.OS !== 'android') return;
    
    if (!AndroidSystemBars) {
      console.warn('AndroidSystemBars module not available, using fallback');
      // フォールバック: StatusBarのみ制御
      StatusBar.setHidden(true, 'none');
      return;
    }
    
    try {
      await AndroidSystemBars.enableFullScreenMode('sticky-immersive', true);
      console.log('Modal immersive mode enabled');
    } catch (error) {
      console.error('Failed to enable modal full screen:', error);
      // フォールバック
      try {
        await AndroidSystemBars.hideStatusAndNavigationBars();
        console.log('Fallback: hideStatusAndNavigationBars used');
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
        // 最終フォールバック
        StatusBar.setHidden(true, 'none');
      }
    }
  }
  
  // モーダル終了時の復元
  static async disableModalFullScreen(): Promise<void> {
    if (Platform.OS !== 'android') return;
    
    if (!AndroidSystemBars) {
      console.warn('AndroidSystemBars module not available, using fallback');
      // フォールバック: StatusBarのみ制御
      StatusBar.setHidden(false, 'slide');
      return;
    }
    
    try {
      await AndroidSystemBars.clearFlags();
      console.log('Modal immersive mode disabled');
    } catch (error) {
      console.error('Failed to disable modal full screen:', error);
      // フォールバック
      StatusBar.setHidden(false, 'slide');
    }
  }
}