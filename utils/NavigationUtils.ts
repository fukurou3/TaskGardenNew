// ナビゲーションバー検出とフォールバック
import { Platform, Dimensions } from 'react-native';
import * as NavigationBar from 'expo-navigation-bar';

export class NavigationUtils {
  // ジェスチャーナビゲーション検出
  static async isGestureNavigationEnabled(): Promise<boolean> {
    if (Platform.OS !== 'android') return false;
    
    try {
      // Android 10+でのジェスチャーナビゲーション検出
      const screenHeight = Dimensions.get('screen').height;
      const windowHeight = Dimensions.get('window').height;
      const navigationHeight = screenHeight - windowHeight;
      
      // ジェスチャーナビゲーションは通常10-20px、3ボタンは40-50px
      return navigationHeight < 30;
    } catch {
      return false;
    }
  }
  
  // フォールバック設定適用
  static async setupNavigationBarFallback(): Promise<void> {
    if (Platform.OS !== 'android') return;
    
    try {
      // メイン設定
      await NavigationBar.setBackgroundColorAsync('transparent');
      await NavigationBar.setPositionAsync('absolute');
      
      // Android 14+対応
      if (Platform.Version >= 34) {
        await NavigationBar.setBehaviorAsync('overlay-swipe');
      }
    } catch (error) {
      console.warn('NavigationBar setup failed, using fallback:', error);
      
      // フォールバック: CSS的アプローチ
      // この場合はmarginBottomによる強制拡張を使用
    }
  }
  
  // 動的ナビゲーションエリア高さ取得
  static getNavigationAreaHeight(): number {
    const screenHeight = Dimensions.get('screen').height;
    const windowHeight = Dimensions.get('window').height;
    const baseHeight = screenHeight - windowHeight;
    
    // Android 14+ジェスチャーエリア追加考慮
    return Platform.OS === 'android' && Platform.Version >= 34 
      ? baseHeight + 20 // ジェスチャーエリア追加マージン
      : baseHeight;
  }
  
  // 段階的フォールバック戦略
  static async applyFullScreenOverlay(): Promise<'success' | 'fallback' | 'failed'> {
    try {
      // Step 1: expo-navigation-bar使用
      await this.setupNavigationBarFallback();
      return 'success';
    } catch (primaryError) {
      console.warn('Primary overlay method failed:', primaryError);
      
      try {
        // Step 2: 強制マージン使用
        // この場合は呼び出し元でmarginBottom: -100を適用
        return 'fallback';
      } catch (fallbackError) {
        console.error('All overlay methods failed:', fallbackError);
        return 'failed';
      }
    }
  }
  
  // デバイス固有対応チェック
  static getDeviceSpecificAdjustments(): { marginBottom: number; requiresEdgeToEdge: boolean } {
    const screenHeight = Dimensions.get('screen').height;
    const windowHeight = Dimensions.get('window').height;
    const navigationHeight = screenHeight - windowHeight;
    
    // Samsung One UI, MIUI等の検出
    const isCustomUI = navigationHeight > 60; // 通常より高い場合はカスタムUI
    
    return {
      marginBottom: isCustomUI ? -(navigationHeight + 30) : -100,
      requiresEdgeToEdge: Platform.Version >= 35, // Android 15+
    };
  }
}