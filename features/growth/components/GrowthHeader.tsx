import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAppTheme } from '@/hooks/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import CurrencyOverlay from './CurrencyHeader';

interface GrowthHeaderProps {
  showAddButton?: boolean;
  onAddPress?: () => void;
}

export default function GrowthHeader({ showAddButton = false, onAddPress }: GrowthHeaderProps) {
  const { colorScheme } = useAppTheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const pathname = usePathname();

  const isActive = (path: string) => {
    return pathname.includes(path);
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5' }]}>
      <CurrencyOverlay showAddButton={showAddButton} onAddPress={onAddPress} />
      
      <View style={styles.header}>
        <Text style={[styles.title, { color: isDark ? '#fff' : '#000' }]}>
          世界図鑑 (World Dex)
        </Text>
        
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[
              styles.actionButton, 
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
              size={20} 
              color={isActive('/gacha') ? '#fff' : (isDark ? '#fff' : '#000')} 
            />
            <Text style={[
              styles.actionButtonText, 
              { 
                color: isActive('/gacha') ? '#fff' : (isDark ? '#fff' : '#000') 
              }
            ]}>
              ガチャ
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.actionButton, 
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
              size={20} 
              color={isActive('/store') ? '#fff' : (isDark ? '#fff' : '#000')} 
            />
            <Text style={[
              styles.actionButtonText, 
              { 
                color: isActive('/store') ? '#fff' : (isDark ? '#fff' : '#000') 
              }
            ]}>
              ストア
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  header: {
    padding: 20,
    paddingTop: 60, // CurrencyOverlayのスペースを確保
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
});