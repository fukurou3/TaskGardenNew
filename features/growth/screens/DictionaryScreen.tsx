import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useAppTheme } from '@/hooks/ThemeContext';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useGrowth } from '../hooks/useGrowth';

export default function DictionaryScreen() {
  const { colorScheme } = useAppTheme();
  const { t } = useTranslation();
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const { themes, userProgress, selectedThemeId, changeSelectedTheme, loading } = useGrowth();

  const getThemeProgress = (themeId: string) => {
    return (userProgress || []).find(p => p.themeId === themeId);
  };

  const isThemeUnlocked = (themeId: string) => {
    const theme = (themes || []).find(t => t.id === themeId);
    return !theme?.locked;
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5' }]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: isDark ? '#fff' : '#000' }]}>
            {t('common.loading')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5' }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: isDark ? '#fff' : '#000' }]}>世界図鑑 (World Dex)</Text>
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: isDark ? '#333' : '#e0e0e0' }]}
            onPress={() => router.push('/(tabs)/growth/gacha')}
          >
            <Ionicons name="gift" size={20} color={isDark ? '#fff' : '#000'} />
            <Text style={[styles.actionButtonText, { color: isDark ? '#fff' : '#000' }]}>ガチャ</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: isDark ? '#333' : '#e0e0e0' }]}
            onPress={() => router.push('/(tabs)/growth/store')}
          >
            <Ionicons name="storefront" size={20} color={isDark ? '#fff' : '#000'} />
            <Text style={[styles.actionButtonText, { color: isDark ? '#fff' : '#000' }]}>ストア</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Text style={[styles.sectionTitle, { color: isDark ? '#ccc' : '#666' }]}>コレクション</Text>
        
        <View style={styles.themeGrid}>
          {(themes || []).map((theme) => {
            const progress = getThemeProgress(theme.id);
            const isUnlocked = isThemeUnlocked(theme.id);
            const isSelected = selectedThemeId === theme.id;
            
            return (
              <TouchableOpacity
                key={theme.id}
                style={[
                  styles.themeCard,
                  { 
                    backgroundColor: isDark ? '#2a2a2a' : '#fff',
                    borderColor: isSelected ? '#4CAF50' : (isDark ? '#444' : '#ddd'),
                    borderWidth: isSelected ? 2 : 1,
                    opacity: isUnlocked ? 1 : 0.5
                  }
                ]}
                onPress={() => isUnlocked && changeSelectedTheme(theme.id)}
                disabled={!isUnlocked}
              >
                <View style={styles.themeImageContainer}>
                  {isUnlocked ? (
                    <Image 
                      source={theme.growthStages[progress?.currentGrowthStage || 'seed'].image} 
                      style={styles.themeImage} 
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.lockedTheme, { backgroundColor: isDark ? '#333' : '#f0f0f0' }]}>
                      <Ionicons name="lock-closed" size={24} color={isDark ? '#666' : '#999'} />
                    </View>
                  )}
                </View>
                
                <View style={styles.themeInfo}>
                  <Text style={[styles.themeName, { color: isDark ? '#fff' : '#000' }]}>
                    {isUnlocked ? theme.name : '???'}
                  </Text>
                  {isUnlocked && progress && (
                    <View style={styles.progressInfo}>
                      <Text style={[styles.stageText, { color: isDark ? '#ccc' : '#666' }]}>
                        {t(`growth.stage_${progress.currentGrowthStage}`)}
                      </Text>
                      <Text style={[styles.pointsText, { color: isDark ? '#aaa' : '#888' }]}>
                        {progress.totalGrowthPoints} pts
                      </Text>
                    </View>
                  )}
                  {isSelected && (
                    <View style={styles.selectedBadge}>
                      <Text style={styles.selectedText}>選択中</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1,
  },
  header: {
    padding: 20,
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
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  contentContainer: {
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
  },
  themeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
    justifyContent: 'space-between',
  },
  themeCard: {
    width: '47%',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  themeImageContainer: {
    width: '100%',
    height: 120,
    position: 'relative',
  },
  themeImage: {
    width: '100%',
    height: '100%',
  },
  lockedTheme: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  themeInfo: {
    padding: 12,
  },
  themeName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  stageText: {
    fontSize: 12,
    fontWeight: '500',
  },
  pointsText: {
    fontSize: 11,
  },
  selectedBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  selectedText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
});
