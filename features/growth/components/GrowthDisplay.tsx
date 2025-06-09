import React from 'react';
import { View, Text, Image, StyleSheet, useWindowDimensions, StatusBar } from 'react-native';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
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
  
  const statusBarHeight = StatusBar.currentHeight || 0;
  const gradientColors = isDark 
    ? ['rgba(0, 0, 0, 0.6)', 'transparent']
    : ['rgba(255, 255, 255, 0.6)', 'transparent'];

  return (
    <View style={[styles.container, { width, height }]}>
      <View style={styles.imageContainer}>
        {currentThemeImage && (
          <Image 
            source={currentThemeImage} 
            style={[styles.image, { width, height }]} 
            resizeMode="cover" 
          />
        )}
        <LinearGradient
          colors={gradientColors}
          style={[styles.topGradient, { width, height: statusBarHeight + 80 }]}
          locations={[0, 1]}
        />
        <LinearGradient
          colors={[...gradientColors].reverse()}
          style={[styles.bottomGradient, { width, height: 120 }]}
          locations={[0, 1]}
        />
      </View>
    </View>
  );
}

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
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  image: { 
    flex: 1,
  },
});
