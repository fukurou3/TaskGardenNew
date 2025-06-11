import { Platform } from 'react-native';
import AndroidSystemBars from 'react-native-system-bars';

export class SystemUIManager {
  // フルスクリーンモードを有効にする
  static async enableFullScreenMode(): Promise<void> {
    if (Platform.OS !== 'android') return;
    
    try {
      AndroidSystemBars.enableFullScreenMode('immersive', true);
      console.log('Full screen mode enabled with react-native-system-bars');
    } catch (error) {
      console.error('Failed to enable full screen mode:', error);
    }
  }
  
  // 通常モードに戻す
  static async disableFullScreenMode(): Promise<void> {
    if (Platform.OS !== 'android') return;
    
    try {
      AndroidSystemBars.clearFlags();
      console.log('Full screen mode disabled');
    } catch (error) {
      console.error('Failed to disable full screen mode:', error);
    }
  }
  
  // モーダル表示時の特別な設定（Immersive Mode）
  static async enableModalFullScreen(): Promise<void> {
    if (Platform.OS !== 'android') return;
    
    try {
      // 没入モードでシステムバーを完全に隠す（sticky-immersiveでより確実に）
      AndroidSystemBars.enableFullScreenMode('sticky-immersive', true);
      console.log('Modal immersive mode enabled');
    } catch (error) {
      console.error('Failed to enable modal full screen:', error);
      // フォールバック: より基本的な方法を試す
      try {
        AndroidSystemBars.hideStatusAndNavigationBars();
        console.log('Fallback: hideStatusAndNavigationBars used');
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
      }
    }
  }
  
  // モーダル終了時の復元
  static async disableModalFullScreen(): Promise<void> {
    if (Platform.OS !== 'android') return;
    
    try {
      // システムバーを表示に戻す
      AndroidSystemBars.clearFlags();
      console.log('Modal immersive mode disabled');
    } catch (error) {
      console.error('Failed to disable modal full screen:', error);
    }
  }
}