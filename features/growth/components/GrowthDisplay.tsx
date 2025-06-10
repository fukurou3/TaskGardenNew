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
      <View style={styles.imageContainer}>
        {currentThemeImage && (
          <Image 
            source={currentThemeImage} 
            style={[styles.image, { width, height }]} 
            resizeMode="cover" 
          />
        )}
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
  image: { 
    flex: 1,
  },
});
