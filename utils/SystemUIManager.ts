import { Platform, NativeModules } from 'react-native';
import * as NavigationBar from 'expo-navigation-bar';

export class SystemUIManager {
  // フルスクリーンモードを有効にする
  static async enableFullScreenMode(): Promise<void> {
    if (Platform.OS !== 'android') return;
    
    try {
      // expo-navigation-barを使った設定
      await NavigationBar.setBackgroundColorAsync('transparent');
      await NavigationBar.setPositionAsync('absolute');
      await NavigationBar.setBehaviorAsync('overlay-swipe');
      await NavigationBar.setVisibilityAsync('hidden');
      
      // ナビゲーションバーを完全に非表示にする
      if (Platform.Version >= 30) { // Android 11+
        // 新しいAPI使用 (MainActivity側で処理)
        console.log('Using Android 11+ full screen mode');
      } else {
        // 古いシステムUI フラグを使用
        console.log('Using legacy system UI flags');
      }
    } catch (error) {
      console.error('Failed to enable full screen mode:', error);
    }
  }
  
  // 通常モードに戻す
  static async disableFullScreenMode(): Promise<void> {
    if (Platform.OS !== 'android') return;
    
    try {
      await NavigationBar.setBackgroundColorAsync('#ffffff');
      await NavigationBar.setPositionAsync('relative');
      await NavigationBar.setBehaviorAsync('inset-swipe');
      await NavigationBar.setVisibilityAsync('visible');
    } catch (error) {
      console.error('Failed to disable full screen mode:', error);
    }
  }
  
  // モーダル表示時の特別な設定
  static async enableModalFullScreen(): Promise<void> {
    if (Platform.OS !== 'android') return;
    
    try {
      // モーダル専用の完全フルスクリーン設定
      await NavigationBar.setBackgroundColorAsync('rgba(0, 0, 0, 0.01)'); // 完全透明ではなく微小値
      await NavigationBar.setPositionAsync('absolute');
      await NavigationBar.setBehaviorAsync('overlay-swipe');
      await NavigationBar.setVisibilityAsync('hidden');
      
      // ナビゲーションバーボタンを隠す（Android 11+）
      if (Platform.Version >= 30) {
        // ネイティブ側でWindowInsetsControllerを使用
        console.log('Enabling modal full screen for Android 11+');
      }
    } catch (error) {
      console.error('Failed to enable modal full screen:', error);
    }
  }
}