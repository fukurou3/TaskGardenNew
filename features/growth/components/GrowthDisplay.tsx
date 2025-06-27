import React from 'react';
import { View, Text, Image, StyleSheet, useWindowDimensions, StatusBar } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Theme } from '../themes/types';
import { useAppTheme } from '@/hooks/ThemeContext';

interface Props {
  theme: Theme | undefined;
  asset: { image: any } | undefined;
}

export default function GrowthDisplay({ theme, asset }: Props) {
  const { t } = useTranslation();
  const { width, height } = useWindowDimensions();
  const { colorScheme } = useAppTheme();
  const isDark = colorScheme === 'dark';
  const PLACEHOLDER_IMAGE_FALLBACK = require('@/assets/images/growth/placeholder.png');
  const currentThemeImage = asset?.image || PLACEHOLDER_IMAGE_FALLBACK;

  return (
    <View style={[styles.container, { width, height }]}>
      {/* 背景画像は親コンポーネントで管理するため、ここでは透明 */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: 'transparent' 
  },
});
