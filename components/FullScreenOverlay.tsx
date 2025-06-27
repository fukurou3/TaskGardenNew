// 代替実装: React Native Edge-to-Edge使用
import React from 'react';
import { View, StyleSheet, Platform, Dimensions } from 'react-native';
// import { EdgeToEdge } from 'react-native-edge-to-edge'; // 必要に応じてインストール

interface Props {
  children: React.ReactNode;
  backgroundColor?: string;
}

export default function FullScreenOverlay({ children, backgroundColor = 'rgba(0, 0, 0, 0.75)' }: Props) {
  const screenData = Dimensions.get('screen');
  const windowData = Dimensions.get('window');
  
  // 画面全体の高さを使用（ナビゲーションバー含む）
  const fullHeight = screenData.height;
  const windowHeight = windowData.height;
  const navigationBarHeight = fullHeight - windowHeight;

  return (
    <View style={[styles.overlay, { 
      backgroundColor,
      height: fullHeight,
      // Android用追加マージン
      marginBottom: Platform.OS === 'android' ? -navigationBarHeight - 50 : 0,
    }]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
});