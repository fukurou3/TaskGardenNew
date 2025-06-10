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
import { STORE_CATEGORIES, getSaleItems, getLimitedItems, getFeaturedItems, StoreItem } from '../config/storeConfig';

const { width: screenWidth } = Dimensions.get('window');

export default function StoreScreen() {
  const { colorScheme } = useAppTheme();
  const { t } = useTranslation();
  const isDark = colorScheme === 'dark';
  const params = useLocalSearchParams();
  const { canAfford, spendCurrency, addCurrency, formatAmount } = useCurrency();
  
  const [selectedCategory, setSelectedCategory] = useState<string>('featured');
  const [isSpecialOffer, setIsSpecialOffer] = useState<boolean>(false);

  useEffect(() => {
    if (params.storeCategory) {
      setSelectedCategory(params.storeCategory as string);
    }
    if (params.specialOffer) {
      setIsSpecialOffer(params.specialOffer === 'true');
    }
  }, [params]);

  const handlePurchase = (item: StoreItem) => {
    const price = item.salePrice || item.originalPrice;
    
    if (!canAfford(price)) {
      Alert.alert('通貨不足', '購入に必要な通貨が不足しています。');
      return;
    }

    Alert.alert(
      '購入確認',
      `${item.name}を購入しますか？\n\n価格: ${price} ジェム`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '購入',
          onPress: () => {
            spendCurrency(price);
            Alert.alert('購入完了', `${item.name}を購入しました！`);
          },
        },
      ]
    );
  };

  const handleAddCurrency = () => {
    addCurrency(100);
    Alert.alert('通貨獲得', 'ジェムを100個獲得しました！');
  };

  const getDisplayItems = (): StoreItem[] => {
    switch (selectedCategory) {
      case 'featured':
        return getFeaturedItems();
      case 'sale':
        return getSaleItems();
      case 'limited':
        return getLimitedItems();
      default:
        const category = STORE_CATEGORIES.find(cat => cat.id === selectedCategory);
        return category ? category.items : [];
    }
  };

  const renderStoreItem = (item: StoreItem) => {
    const price = item.salePrice || item.originalPrice;
    const canPurchase = canAfford(price);
    
    return (
      <TouchableOpacity
        key={item.id}
        style={styles.storeItemContainer}
        onPress={() => handlePurchase(item)}
        disabled={!canPurchase}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={isDark 
            ? ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']
            : ['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.02)']
          }
          style={[styles.storeItem, {
            borderColor: item.rarity === 'legendary' ? '#FF9800' : 
                        item.rarity === 'epic' ? '#9C27B0' : 
                        item.rarity === 'rare' ? '#2196F3' : '#9E9E9E',
            opacity: canPurchase ? 1 : 0.6,
          }]}
        >
          {item.discount && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>-{item.discount}%</Text>
            </View>
          )}
          
          {item.isLimited && (
            <View style={styles.limitedBadge}>
              <Text style={styles.limitedText}>限定</Text>
            </View>
          )}

          <View style={styles.itemContent}>
            <Text style={[styles.itemName, { color: isDark ? '#fff' : '#000' }]}>
              {item.name}
            </Text>
            <Text style={[styles.itemDescription, { color: isDark ? '#ccc' : '#666' }]}>
              {item.description}
            </Text>
            
            <View style={styles.tagsContainer}>
              {item.tags.slice(0, 2).map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>

            <View style={styles.priceContainer}>
              {item.salePrice && (
                <Text style={[styles.originalPrice, { color: isDark ? '#888' : '#999' }]}>
                  {item.originalPrice} 💎
                </Text>
              )}
              <View style={styles.currentPrice}>
                <Text style={styles.priceIcon}>💎</Text>
                <Text style={[styles.priceAmount, { color: isDark ? '#fff' : '#000' }]}>
                  {formatAmount(price)}
                </Text>
              </View>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const categories = [
    { id: 'featured', name: 'おすすめ', icon: '⭐' },
    { id: 'sale', name: 'セール', icon: '🔥' },
    { id: 'limited', name: '限定', icon: '⏰' },
    ...STORE_CATEGORIES.map(cat => ({ id: cat.id, name: cat.name, icon: cat.icon }))
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5' }]}>
      <GrowthHeader showAddButton onAddPress={handleAddCurrency} />
      
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.subtitle, { color: isDark ? '#ccc' : '#666' }]}>
            テーマや通貨をお得に購入しよう！
          </Text>
          {isSpecialOffer && (
            <View style={styles.specialOfferBanner}>
              <Text style={styles.specialOfferText}>🔥 特別セール開催中！</Text>
            </View>
          )}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesContainer}>
          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryButton,
                {
                  backgroundColor: selectedCategory === category.id 
                    ? (isDark ? '#333' : '#e3f2fd')
                    : (isDark ? '#2a2a2a' : '#fff'),
                  borderColor: selectedCategory === category.id 
                    ? '#2196F3' 
                    : (isDark ? '#444' : '#ddd'),
                }
              ]}
              onPress={() => setSelectedCategory(category.id)}
            >
              <Text style={styles.categoryIcon}>{category.icon}</Text>
              <Text style={[
                styles.categoryText,
                {
                  color: selectedCategory === category.id 
                    ? '#2196F3' 
                    : (isDark ? '#fff' : '#000'),
                }
              ]}>
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <ScrollView style={styles.itemsContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.itemsGrid}>
            {getDisplayItems().map(renderStoreItem)}
          </View>
          <View style={styles.bottomPadding} />
        </ScrollView>
      </View>
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
    marginBottom: 12,
  },
  specialOfferBanner: {
    backgroundColor: '#FF4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  specialOfferText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  categoriesContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 12,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
  },
  itemsContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  itemsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  storeItemContainer: {
    width: '47%',
    marginBottom: 16,
  },
  storeItem: {
    borderRadius: 16,
    borderWidth: 2,
    padding: 16,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    minHeight: 180,
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#F44336',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 1,
  },
  discountText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  limitedBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#FF9800',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 1,
  },
  limitedText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  itemContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  itemName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
    lineHeight: 20,
  },
  itemDescription: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
    marginBottom: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 12,
  },
  tag: {
    backgroundColor: 'rgba(33, 150, 243, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  tagText: {
    color: '#2196F3',
    fontSize: 10,
    fontWeight: '600',
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  originalPrice: {
    fontSize: 12,
    textDecorationLine: 'line-through',
    marginBottom: 2,
  },
  currentPrice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priceIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  priceAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  bottomPadding: {
    height: 20,
  },
});
