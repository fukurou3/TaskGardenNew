import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ImageBackground,
  Animated,
} from 'react-native';
import { useAppTheme } from '@/hooks/ThemeContext';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { PickupConfig, getActivePickups } from '../config/pickupConfig';

const { width: screenWidth } = Dimensions.get('window');
const SLIDE_WIDTH = screenWidth - 40;
const SLIDE_HEIGHT = 180;

export default function PickupSlideshow() {
  const { colorScheme } = useAppTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const isDark = colorScheme === 'dark';
  
  const [pickups, setPickups] = useState<PickupConfig[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const autoScrollTimer = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const activePickups = getActivePickups();
    setPickups(activePickups);
  }, []);

  useEffect(() => {
    if (pickups.length <= 1) return;

    const startAutoScroll = () => {
      autoScrollTimer.current = setInterval(() => {
        setCurrentIndex((prevIndex) => {
          const nextIndex = (prevIndex + 1) % pickups.length;
          scrollViewRef.current?.scrollTo({
            x: nextIndex * SLIDE_WIDTH,
            animated: true,
          });
          return nextIndex;
        });
      }, 4000);
    };

    startAutoScroll();

    return () => {
      if (autoScrollTimer.current) {
        clearInterval(autoScrollTimer.current);
      }
    };
  }, [pickups.length]);

  const handleScroll = (event: any) => {
    const contentOffset = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffset / SLIDE_WIDTH);
    setCurrentIndex(index);
  };

  const handlePickupPress = (pickup: PickupConfig) => {
    switch (pickup.actionType) {
      case 'gacha':
        router.push({
          pathname: '/(tabs)/growth/gacha',
          params: pickup.actionParams || {}
        });
        break;
      case 'store':
        router.push({
          pathname: '/(tabs)/growth/store',
          params: pickup.actionParams || {}
        });
        break;
      case 'theme':
        // テーマの詳細画面への遷移（将来的に実装）
        break;
    }
  };

  const getActionButtonText = (actionType: string) => {
    switch (actionType) {
      case 'gacha':
        return 'ガチャを引く';
      case 'store':
        return 'ストアを見る';
      case 'theme':
        return '詳細を見る';
      default:
        return '詳細を見る';
    }
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'gacha':
        return 'gift';
      case 'store':
        return 'storefront';
      case 'theme':
        return 'eye';
      default:
        return 'arrow-forward';
    }
  };

  if (pickups.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        contentContainerStyle={styles.scrollContainer}
        style={styles.scrollView}
      >
        {pickups.map((pickup, index) => (
          <TouchableOpacity
            key={pickup.id}
            style={styles.slide}
            onPress={() => handlePickupPress(pickup)}
            activeOpacity={0.9}
          >
            <View style={[styles.slideGradient, { 
              backgroundColor: pickup.gradientColors ? pickup.gradientColors[0] : '#2196F3'
            }]}>
              <View style={styles.slideContent}>
                <View style={styles.textContainer}>
                  {pickup.subtitle && (
                    <View style={styles.subtitleBadge}>
                      <Text style={styles.subtitleText}>{pickup.subtitle}</Text>
                    </View>
                  )}
                  <Text style={styles.titleText}>{pickup.title}</Text>
                  <Text style={styles.descriptionText} numberOfLines={2}>
                    {pickup.description}
                  </Text>
                </View>
                
                <View style={styles.actionContainer}>
                  <View style={styles.actionButton}>
                    <Ionicons 
                      name={getActionIcon(pickup.actionType) as any} 
                      size={16} 
                      color="#fff" 
                    />
                    <Text style={styles.actionButtonText}>
                      {getActionButtonText(pickup.actionType)}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {pickups.length > 1 && (
        <View style={styles.pagination}>
          {pickups.map((_, index) => (
            <View
              key={index}
              style={[
                styles.paginationDot,
                {
                  backgroundColor: index === currentIndex 
                    ? (isDark ? '#fff' : '#333') 
                    : (isDark ? '#666' : '#ccc'),
                  width: index === currentIndex ? 20 : 8,
                }
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  scrollView: {
    height: SLIDE_HEIGHT,
  },
  scrollContainer: {
    paddingHorizontal: 20,
  },
  slide: {
    width: SLIDE_WIDTH,
    height: SLIDE_HEIGHT,
    marginRight: 0,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  slideGradient: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  slideContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  textContainer: {
    flex: 1,
  },
  subtitleBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  subtitleText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  titleText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  descriptionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    opacity: 0.9,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  actionContainer: {
    alignItems: 'flex-end',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    gap: 6,
  },
  paginationDot: {
    height: 8,
    borderRadius: 4,
    transition: 'all 0.3s ease',
  },
});