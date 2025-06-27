import React, { useContext } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Platform, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Ionicons } from '@expo/vector-icons'
import { changeAppLanguage } from '@/lib/i18n'
import { useAppTheme } from '@/hooks/ThemeContext'
import { FontSizeContext } from '@/context/FontSizeContext'
import { fontSizes } from '@/constants/fontSizes'

export default function LanguageScreen() {
  const { i18n, t } = useTranslation()
  const router = useRouter()
  const currentLang = i18n.language
  const { colorScheme, subColor } = useAppTheme()
  const { fontSizeKey } = useContext(FontSizeContext)
  const isDark = colorScheme === 'dark'
  const styles = createLanguageStyles(isDark, subColor, fontSizeKey)

  const changeLanguage = async (lng: string) => {
    await changeAppLanguage(lng)
    router.replace('/(tabs)/settings')
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.appBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.replace('/(tabs)/settings')}
        >
          <Ionicons
            name="chevron-back"
            size={24}
            color={isDark ? '#EFEFF0' : '#1C1C1E'}
          />
        </TouchableOpacity>
        <Text style={styles.appBarTitle}>{t('settings.select_language')}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('settings.select_language')}</Text>
          <TouchableOpacity style={styles.languageOption} onPress={() => changeLanguage('ja')}>
            <View style={styles.languageInfo}>
              <View
                style={[
                  styles.radio,
                  currentLang.startsWith('ja') && styles.radioSelected,
                ]}
              />
              <Text style={styles.languageName}>{t('settings.language_ja')}</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.languageOption} onPress={() => changeLanguage('en')}>
            <View style={styles.languageInfo}>
              <View
                style={[
                  styles.radio,
                  currentLang.startsWith('en') && styles.radioSelected,
                ]}
              />
              <Text style={styles.languageName}>{t('settings.language_en')}</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.languageOption} onPress={() => changeLanguage('ko')}>
            <View style={styles.languageInfo}>
              <View
                style={[
                  styles.radio,
                  currentLang.startsWith('ko') && styles.radioSelected,
                ]}
              />
              <Text style={styles.languageName}>{t('settings.language_ko')}</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const createLanguageStyles = (
  isDark: boolean,
  subColor: string,
  fsKey: keyof typeof fontSizes
) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? '#0C0C0C' : '#f2f2f4',
    },
    appBar: {
      height: 56,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: isDark ? '#3A3A3C' : '#C6C6C8',
    },
    backButton: {
      padding: 8,
      marginLeft: -8,
    },
    appBarTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: isDark ? '#EFEFF0' : '#1C1C1E',
    },
    placeholder: {
      width: 40,
    },
    scrollContent: {
      padding: 16,
    },
    card: {
      backgroundColor: isDark ? '#1f1f21' : '#FFFFFF',
      borderRadius: Platform.OS === 'ios' ? 10 : 8,
      padding: 16,
    },
    sectionTitle: {
      fontSize: fontSizes[fsKey] + 2,
      fontWeight: 'bold',
      color: isDark ? '#EFEFF0' : '#1C1C1E',
      marginBottom: 20,
    },
    languageOption: {
      paddingVertical: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderColor: isDark ? '#3A3A3C' : '#E0E0E0',
    },
    languageInfo: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    radio: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: isDark ? '#5A5A5E' : '#AEAEB2',
      marginRight: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    radioSelected: {
      borderColor: subColor,
      backgroundColor: subColor,
    },
    languageName: {
      fontSize: fontSizes[fsKey] + 1,
      color: isDark ? '#EFEFF0' : '#1C1C1E',
      fontWeight: '500',
    },
  })
