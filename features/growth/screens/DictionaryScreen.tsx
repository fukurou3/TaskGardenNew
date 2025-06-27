import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useAppTheme } from '@/hooks/ThemeContext';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useGrowth } from '../hooks/useGrowth';
import PickupSlideshow from '../components/PickupSlideshow';
import GrowthHeader from '../components/GrowthHeader';

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
      <GrowthHeader />

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <PickupSlideshow />
        
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
                    borderColor: isSelected ? '#4CAF50' : 'transparent',
                    borderWidth: isSelected ? 2 : 0,
                    opacity: isUnlocked ? 1 : 0.6
                  }
                ]}
                onPress={() => isUnlocked && changeSelectedTheme(theme.id)}
                disabled={!isUnlocked}
                activeOpacity={0.8}
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
                      <Ionicons name="lock-closed" size={28} color={isDark ? '#666' : '#999'} />
                    </View>
                  )}
                  {isSelected && (
                    <View style={styles.selectedOverlay}>
                      <View style={styles.selectedBadgeTop}>
                        <Ionicons name="checkmark-circle" size={20} color="#fff" />
                      </View>
                    </View>
                  )}
                </View>
                
                <View style={styles.themeInfo}>
                  <Text style={[styles.themeName, { color: isDark ? '#fff' : '#000' }]} numberOfLines={1}>
                    {isUnlocked ? theme.name : '???'}
                  </Text>
                  {isUnlocked && progress && (
                    <View style={styles.progressInfo}>
                      <Text style={[styles.stageText, { color: isDark ? '#aaa' : '#777' }]} numberOfLines={1}>
                        {t(`growth.stage_${progress.currentGrowthStage}`)}
                      </Text>
                      <View style={styles.pointsBadge}>
                        <Text style={[styles.pointsText, { color: isDark ? '#4CAF50' : '#2E7D32' }]}>
                          {progress.totalGrowthPoints}
                        </Text>
                      </View>
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
    gap: 12,
    justifyContent: 'space-between',
  },
  themeCard: {
    width: '47%',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    marginBottom: 8,
  },
  themeImageContainer: {
    width: '100%',
    height: 140,
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
  selectedOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    left: 0,
    bottom: 0,
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  selectedBadgeTop: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    margin: 8,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  themeInfo: {
    padding: 14,
    minHeight: 68,
    justifyContent: 'space-between',
  },
  themeName: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
    lineHeight: 20,
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
    flex: 1,
  },
  pointsBadge: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  pointsText: {
    fontSize: 12,
    fontWeight: '700',
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
