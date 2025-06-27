import React, { useState, useRef } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, StyleSheet, View, Alert, TouchableOpacity, Image, ImageBackground, Dimensions, FlatList } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppTheme } from '@/hooks/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import GrowthHeader from '../components/GrowthHeader';
import { useCurrency } from '../hooks/useCurrency';
import { GACHA_BOXES, getSpecialGachaBoxes, getNormalGachaBoxes, GachaBox } from '../config/gachaConfig';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function GachaScreen() {
  const { colorScheme } = useAppTheme();
  const { t } = useTranslation();
  const isDark = colorScheme === 'dark';
  const params = useLocalSearchParams();
  const { canAfford, spendCurrency, addCurrency } = useCurrency();
  
  const [currentGachaIndex, setCurrentGachaIndex] = useState(0);
  const [isPulling, setIsPulling] = useState<boolean>(false);
  const flatListRef = useRef<FlatList>(null);

  const allGachaBoxes = [...getSpecialGachaBoxes(), ...getNormalGachaBoxes()];

  const handlePull = async (box: GachaBox) => {
    if (!canAfford(box.cost)) {
      Alert.alert('通貨不足', '必要な通貨が不足しています。');
      return;
    }

    setIsPulling(true);
    
    // ガチャ演出のシミュレーション
    setTimeout(() => {
      spendCurrency(box.cost);
      
      // 簡単な抽選ロジック
      const randomItem = box.items[Math.floor(Math.random() * box.items.length)];
      
      Alert.alert(
        'ガチャ結果',
        `${randomItem.name} (${randomItem.rarity}) を獲得しました！`,
        [{ text: 'OK' }]
      );
      
      setIsPulling(false);
    }, 2000);
  };

  const handleAddCurrency = () => {
    // 実際のアプリでは課金システムや広告視聴など
    addCurrency(100);
    Alert.alert('通貨獲得', 'ジェムを100個獲得しました！');
  };

  const renderBackgroundSlide = ({ item, index }: { item: GachaBox; index: number }) => {
    return (
      <View style={[styles.slideContainer, { width: screenWidth }]}>
        <ImageBackground
          source={item.backgroundImage || { uri: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=800&h=600&fit=crop' }}
          style={styles.backgroundImage}
          imageStyle={styles.backgroundImageStyle}
        >
          {/* Overlay gradient */}
          <LinearGradient
            colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)']}
            style={styles.overlay}
          />
          
          {/* Special badge */}
          {item.isSpecial && (
            <View style={styles.specialBadge}>
              <Text style={styles.specialBadgeText}>限定</Text>
            </View>
          )}
          
          {/* Title content only */}
          <View style={styles.titleSection}>
            <Text style={styles.gachaTitle}>{item.name}</Text>
            <Text style={styles.gachaDescription}>{item.description}</Text>
          </View>
        </ImageBackground>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <GrowthHeader showAddButton onAddPress={handleAddCurrency} />
      
      <View style={styles.content}>
        {/* Background slider */}
        <FlatList
          ref={flatListRef}
          data={allGachaBoxes}
          renderItem={renderBackgroundSlide}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(event) => {
            const index = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
            setCurrentGachaIndex(index);
          }}
          style={styles.flatList}
        />
        
        {/* Fixed UI overlay */}
        <View style={styles.fixedUIOverlay}>
          <View style={styles.bottomSection}>
            {/* Slide indicators */}
            <View style={styles.slideIndicators}>
              {allGachaBoxes.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.indicator,
                    { backgroundColor: i === currentGachaIndex ? '#fff' : 'rgba(255,255,255,0.4)' }
                  ]}
                />
              ))}
            </View>
            
            {/* Action buttons */}
            <View style={styles.actionButtons}>
              <View style={styles.costDisplay}>
                <Text style={styles.costIcon}>💎</Text>
                <Text style={styles.costText}>{allGachaBoxes[currentGachaIndex]?.cost}</Text>
              </View>
              
              <TouchableOpacity
                style={[
                  styles.pullButton,
                  {
                    backgroundColor: canAfford(allGachaBoxes[currentGachaIndex]?.cost || 0)
                      ? (allGachaBoxes[currentGachaIndex]?.isSpecial ? '#FF6B6B' : '#4CAF50')
                      : 'rgba(255,255,255,0.3)',
                    opacity: canAfford(allGachaBoxes[currentGachaIndex]?.cost || 0) ? 1 : 0.6
                  }
                ]}
                onPress={() => handlePull(allGachaBoxes[currentGachaIndex])}
                disabled={!canAfford(allGachaBoxes[currentGachaIndex]?.cost || 0) || isPulling}
                activeOpacity={0.8}
              >
                <Ionicons 
                  name={allGachaBoxes[currentGachaIndex]?.pullType === 'multi' ? 'gift' : 'sparkles'} 
                  size={20} 
                  color="#fff" 
                />
                <Text style={styles.pullButtonText}>
                  {allGachaBoxes[currentGachaIndex]?.pullType === 'multi' ? '10連ガチャ' : '1回ガチャ'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      {isPulling && (
        <View style={styles.pullingOverlay}>
          <View style={styles.pullingContent}>
            <View style={styles.pullingIcon}>
              <Ionicons name="sparkles" size={48} color="#4CAF50" />
            </View>
            <Text style={styles.pullingText}>
              ガチャ中...
            </Text>
            <Text style={styles.pullingSubtext}>
              素敵なアイテムが出ますように！
            </Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
  },
  flatList: {
    flex: 1,
  },
  slideContainer: {
    flex: 1,
    height: screenHeight - 200, // Account for header
  },
  backgroundImage: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backgroundImageStyle: {
    resizeMode: 'cover',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  specialBadge: {
    position: 'absolute',
    top: 40,
    right: 20,
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  specialBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  contentOverlay: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 20,
  },
  titleSection: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  fixedUIOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  gachaTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  gachaDescription: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    opacity: 0.9,
    lineHeight: 22,
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  bottomSection: {
    paddingBottom: 40,
  },
  slideIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    gap: 8,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  costDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  costIcon: {
    fontSize: 18,
    marginRight: 6,
  },
  costText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  pullButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  pullButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  pullingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  pullingContent: {
    padding: 40,
    borderRadius: 20,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  pullingIcon: {
    marginBottom: 20,
  },
  pullingText: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    color: '#000',
  },
  pullingSubtext: {
    fontSize: 16,
    opacity: 0.8,
    color: '#666',
  },
});
