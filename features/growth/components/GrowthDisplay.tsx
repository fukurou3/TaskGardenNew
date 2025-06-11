import React, { useMemo, useRef, useCallback } from 'react';
import { View, Text, Image, StyleSheet, useWindowDimensions, StatusBar } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Theme } from '../themes/types';
import { useAppTheme } from '@/hooks/ThemeContext';

interface Props {
  theme: Theme | undefined;
  asset: { image: any } | undefined;
}

// コンポーネント全体をメモ化して不要な再レンダリングを防ぐ
const GrowthDisplay = React.memo(function GrowthDisplay({ theme, asset }: Props) {
  // 前回の画像ソースとサイズを保持してちらつきを完全に防ぐ
  const previousImageRef = useRef<any>(null);
  const previousSizeRef = useRef<{ width: number; height: number } | null>(null);
  
  const { width, height } = useWindowDimensions();
  
  // サイズが変更された場合のみ更新
  const stableSize = useMemo(() => {
    if (!previousSizeRef.current || 
        previousSizeRef.current.width !== width || 
        previousSizeRef.current.height !== height) {
      previousSizeRef.current = { width, height };
    }
    return previousSizeRef.current;
  }, [width, height]);
  
  // 画像をメモ化してちらつきを防ぐ - より厳密な比較
  const currentThemeImage = useMemo(() => {
    const PLACEHOLDER_IMAGE_FALLBACK = require('@/assets/images/growth/placeholder.png');
    const newImage = asset?.image || PLACEHOLDER_IMAGE_FALLBACK;
    
    // 画像が実際に変更された場合のみ更新
    if (newImage !== previousImageRef.current) {
      previousImageRef.current = newImage;
    }
    
    return previousImageRef.current;
  }, [asset?.image]);

  // スタイルをメモ化 - より安定した参照を作成
  const imageStyle = useMemo(() => ({
    ...styles.image,
    width: stableSize.width,
    height: stableSize.height,
  }), [stableSize.width, stableSize.height]);

  const containerStyle = useMemo(() => ({
    ...styles.container,
    width: stableSize.width,
    height: stableSize.height,
  }), [stableSize.width, stableSize.height]);

  return (
    <View style={containerStyle}>
      <View style={styles.imageContainer}>
        {/* 背景画像（ちらつき防止最適化強化） */}
        <Image 
          key={`growth-bg-${currentThemeImage}`}
          source={currentThemeImage} 
          style={imageStyle} 
          resizeMode="cover"
          fadeDuration={0}
          // より強力なキャッシュ設定
          cache="force-cache"
          blurRadius={0}
          // アニメーション無効化でちらつき防止
          defaultSource={currentThemeImage}
          // ネイティブドライバー使用でパフォーマンス向上
          nativeID="growth-background-image"
          // レイアウト変更を防ぐ
          onLayout={() => {}} // 空関数でレイアウトイベントを消費
        />
      </View>
    </View>
  );
});

export default GrowthDisplay;

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#e8e8e8' 
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  image: { 
    flex: 1,
    // ちらつき防止のための最適化
    backgroundColor: 'transparent',
  },
});
