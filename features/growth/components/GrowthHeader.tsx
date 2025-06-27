import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAppTheme } from '@/hooks/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import { useCurrency } from '../hooks/useCurrency';

interface GrowthHeaderProps {
  showAddButton?: boolean;
  onAddPress?: () => void;
}

export default function GrowthHeader({ showAddButton = false, onAddPress }: GrowthHeaderProps) {
  const { colorScheme } = useAppTheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const pathname = usePathname();
  const { amount, formatAmount } = useCurrency();

  const isActive = (path: string) => {
    return pathname.includes(path);
  };

  const getPageTitle = () => {
    if (pathname.includes('/gacha')) return 'ガチャ';
    if (pathname.includes('/store')) return 'ストア';
    return '世界図鑑';
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5' }]}>
      <View style={styles.topRow}>
        <Text style={[styles.title, { color: isDark ? '#fff' : '#000' }]}>
          {getPageTitle()}
        </Text>
        
        <View style={[styles.currencyContainer, { 
          backgroundColor: isDark 
            ? 'rgba(33, 150, 243, 0.9)'
            : 'rgba(33, 150, 243, 0.95)'
        }]}>
          <View style={styles.currencyInfo}>
            <Text style={styles.currencyIcon}>💎</Text>
            <Text style={styles.currencyAmount}>{formatAmount(amount)}</Text>
          </View>
          
          {showAddButton && onAddPress && (
            <TouchableOpacity
              style={styles.addButton}
              onPress={onAddPress}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={16} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      <View style={styles.tabsContainer}>
        <TouchableOpacity 
          style={[
            styles.tabButton, 
            { 
              backgroundColor: pathname.includes('/dictionary') || pathname === '/(tabs)/growth'
                ? (isDark ? '#4CAF50' : '#2E7D32')
                : (isDark ? '#333' : '#e0e0e0')
            }
          ]}
          onPress={() => router.push('/(tabs)/growth/dictionary')}
        >
          <Ionicons 
            name="library" 
            size={18} 
            color={pathname.includes('/dictionary') || pathname === '/(tabs)/growth' ? '#fff' : (isDark ? '#fff' : '#000')} 
          />
          <Text style={[
            styles.tabButtonText, 
            { 
              color: pathname.includes('/dictionary') || pathname === '/(tabs)/growth' ? '#fff' : (isDark ? '#fff' : '#000') 
            }
          ]}>
            世界図鑑
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.tabButton, 
            { 
              backgroundColor: isActive('/gacha') 
                ? (isDark ? '#4CAF50' : '#2E7D32')
                : (isDark ? '#333' : '#e0e0e0')
            }
          ]}
          onPress={() => router.push('/(tabs)/growth/gacha')}
        >
          <Ionicons 
            name="gift" 
            size={18} 
            color={isActive('/gacha') ? '#fff' : (isDark ? '#fff' : '#000')} 
          />
          <Text style={[
            styles.tabButtonText, 
            { 
              color: isActive('/gacha') ? '#fff' : (isDark ? '#fff' : '#000') 
            }
          ]}>
            ガチャ
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.tabButton, 
            { 
              backgroundColor: isActive('/store') 
                ? (isDark ? '#4CAF50' : '#2E7D32')
                : (isDark ? '#333' : '#e0e0e0')
            }
          ]}
          onPress={() => router.push('/(tabs)/growth/store')}
        >
          <Ionicons 
            name="storefront" 
            size={18} 
            color={isActive('/store') ? '#fff' : (isDark ? '#fff' : '#000')} 
          />
          <Text style={[
            styles.tabButtonText, 
            { 
              color: isActive('/store') ? '#fff' : (isDark ? '#fff' : '#000') 
            }
          ]}>
            ストア
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  currencyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    minWidth: 80,
  },
  currencyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  currencyIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  currencyAmount: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  addButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  tabsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    flex: 1,
    justifyContent: 'center',
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
});