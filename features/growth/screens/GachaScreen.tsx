import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, StyleSheet, View, Alert, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppTheme } from '@/hooks/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import GrowthHeader from '../components/GrowthHeader';
import { useCurrency } from '../hooks/useCurrency';
import { GACHA_BOXES, getSpecialGachaBoxes, getNormalGachaBoxes, GachaBox } from '../config/gachaConfig';

const { width: screenWidth } = Dimensions.get('window');

export default function GachaScreen() {
  const { colorScheme } = useAppTheme();
  const { t } = useTranslation();
  const isDark = colorScheme === 'dark';
  const params = useLocalSearchParams();
  const { canAfford, spendCurrency, addCurrency } = useCurrency();
  
  const [gachaType, setGachaType] = useState<string>('normal');
  const [isSpecialOffer, setIsSpecialOffer] = useState<boolean>(false);
  const [selectedBox, setSelectedBox] = useState<GachaBox | null>(null);
  const [isPulling, setIsPulling] = useState<boolean>(false);

  useEffect(() => {
    if (params.gachaType) {
      setGachaType(params.gachaType as string);
    }
    if (params.specialOffer) {
      setIsSpecialOffer(params.specialOffer === 'true');
    }
  }, [params]);

  useEffect(() => {
    if (gachaType !== 'normal') {
      const specialBoxes = getSpecialGachaBoxes();
      const targetBox = specialBoxes.find(box => box.id.includes(gachaType));
      if (targetBox) {
        setSelectedBox(targetBox);
      }
    }
  }, [gachaType, isSpecialOffer]);

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

  const renderGachaBox = (box: GachaBox) => (
    <TouchableOpacity
      key={box.id}
      style={styles.gachaBoxContainer}
      onPress={() => handlePull(box)}
      disabled={isPulling}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={box.bgGradient}
        style={styles.gachaBox}
      >
        {box.isSpecial && (
          <View style={styles.specialBadge}>
            <Text style={styles.specialBadgeText}>限定</Text>
          </View>
        )}
        
        <View style={styles.gachaBoxContent}>
          <Text style={styles.gachaBoxTitle}>{box.name}</Text>
          <Text style={styles.gachaBoxDescription}>{box.description}</Text>
          
          <View style={styles.costContainer}>
            <View style={styles.costInfo}>
              <Text style={styles.costIcon}>💎</Text>
              <Text style={styles.costAmount}>{box.cost}</Text>
            </View>
            
            <View style={[styles.pullButton, {
              backgroundColor: canAfford(box.cost) 
                ? 'rgba(255,255,255,0.3)' 
                : 'rgba(255,255,255,0.1)'
            }]}>
              <Ionicons 
                name={box.pullType === 'multi' ? 'gift' : 'sparkles'} 
                size={20} 
                color="#fff" 
              />
              <Text style={styles.pullButtonText}>
                {box.pullType === 'multi' ? '10連' : '1回'}
              </Text>
            </View>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  const specialBoxes = getSpecialGachaBoxes();
  const normalBoxes = getNormalGachaBoxes();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5' }]}>
      <GrowthHeader showAddButton onAddPress={handleAddCurrency} />
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.subtitle, { color: isDark ? '#ccc' : '#666' }]}>
            新しいテーマや装飾を手に入れよう！
          </Text>
        </View>

        {isPulling && (
          <View style={styles.pullingOverlay}>
            <LinearGradient
              colors={['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7']}
              style={styles.pullingContent}
            >
              <Text style={styles.pullingText}>✨ ガチャ中... ✨</Text>
              <Text style={styles.pullingSubtext}>素敵なアイテムが出ますように！</Text>
            </LinearGradient>
          </View>
        )}

        {specialBoxes.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: isDark ? '#fff' : '#000' }]}>🌟 期間限定</Text>
              <View style={styles.limitedBadge}>
                <Text style={styles.limitedBadgeText}>LIMITED</Text>
              </View>
            </View>
            {specialBoxes.map(renderGachaBox)}
          </View>
        )}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#fff' : '#000' }]}>🎁 通常ガチャ</Text>
          {normalBoxes.map(renderGachaBox)}
        </View>
        
        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1,
  },
  content: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
    opacity: 0.8,
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginRight: 8,
  },
  limitedBadge: {
    backgroundColor: '#FF4444',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  limitedBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  gachaBoxContainer: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  gachaBox: {
    padding: 20,
    minHeight: 140,
    position: 'relative',
  },
  specialBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(255, 68, 68, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  specialBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  gachaBoxContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  gachaBoxTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 6,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  gachaBoxDescription: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    opacity: 0.9,
    marginBottom: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  costContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  costInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  costIcon: {
    fontSize: 18,
    marginRight: 6,
  },
  costAmount: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  pullButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    gap: 6,
  },
  pullButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
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
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  pullingContent: {
    padding: 40,
    borderRadius: 20,
    alignItems: 'center',
  },
  pullingText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  pullingSubtext: {
    color: '#fff',
    fontSize: 16,
    opacity: 0.9,
  },
  bottomPadding: {
    height: 20,
  },
});
