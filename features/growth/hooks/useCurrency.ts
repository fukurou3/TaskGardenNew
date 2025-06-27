import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CURRENCY_STORAGE_KEY = 'app_currency';
const DEFAULT_CURRENCY_AMOUNT = 1500;

export const useCurrency = () => {
  const [amount, setAmount] = useState<number>(DEFAULT_CURRENCY_AMOUNT);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCurrency();
  }, []);

  const loadCurrency = async () => {
    try {
      const stored = await AsyncStorage.getItem(CURRENCY_STORAGE_KEY);
      if (stored) {
        setAmount(parseInt(stored, 10));
      }
    } catch (error) {
      console.error('Failed to load currency:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveCurrency = async (newAmount: number) => {
    try {
      await AsyncStorage.setItem(CURRENCY_STORAGE_KEY, newAmount.toString());
      setAmount(newAmount);
    } catch (error) {
      console.error('Failed to save currency:', error);
    }
  };

  const spendCurrency = (cost: number): boolean => {
    if (amount < cost) {
      return false;
    }
    const newAmount = Math.max(0, amount - cost);
    saveCurrency(newAmount);
    return true;
  };

  const addCurrency = (addAmount: number) => {
    const newAmount = amount + addAmount;
    saveCurrency(newAmount);
  };

  const canAfford = (cost: number): boolean => {
    return amount >= cost;
  };

  const formatAmount = (value: number): string => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toString();
  };

  return {
    amount,
    loading,
    spendCurrency,
    addCurrency,
    canAfford,
    formatAmount,
  };
};