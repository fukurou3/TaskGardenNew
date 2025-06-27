import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAppTheme } from '@/hooks/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useCurrency } from '../hooks/useCurrency';

interface CurrencyOverlayProps {
  showAddButton?: boolean;
  onAddPress?: () => void;
}

export default function CurrencyOverlay({ showAddButton = false, onAddPress }: CurrencyOverlayProps) {
  const { colorScheme } = useAppTheme();
  const isDark = colorScheme === 'dark';
  const { amount, formatAmount } = useCurrency();

  return (
    <View style={styles.overlay}>
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
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 1000,
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
});