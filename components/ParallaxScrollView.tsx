import type { PropsWithChildren, ReactElement } from 'react'
import { StyleSheet, useWindowDimensions } from 'react-native'
import { ScrollView, View } from 'react-native';
// Temporarily disabled reanimated
// import Animated, { interpolate, useAnimatedRef, useAnimatedStyle, useScrollViewOffset } from 'react-native-reanimated'

import { ThemedView } from '@/components/ThemedView'
import { useBottomTabOverflow } from '@/components/ui/TabBarBackground'
import { useColorScheme } from '@/hooks/useColorScheme'

const HEADER_HEIGHT = 250

type Props = PropsWithChildren<{
  headerImage: ReactElement
  headerBackgroundColor: { dark: string; light: string }
}>

export default function ParallaxScrollView({
  children,
  headerImage,
  headerBackgroundColor,
}: Props) {
  const colorScheme = useColorScheme() ?? 'light'
  const bottom = useBottomTabOverflow()
  const { width } = useWindowDimensions()
  const isTablet = width >= 768

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        scrollEventThrottle={16}
        scrollIndicatorInsets={{ bottom }}
        contentContainerStyle={{ paddingBottom: bottom }}
      >
        <View
          style={[
            styles.header,
            { backgroundColor: headerBackgroundColor[colorScheme] },
          ]}
        >
          {headerImage}
        </View>

        <ThemedView
          style={[
            styles.content,
            { paddingHorizontal: isTablet ? 0 : 32 },
          ]}
        >
          {children}
        </ThemedView>
      </ScrollView>
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: HEADER_HEIGHT,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    paddingVertical: 32, // ✅ 上下の余白は維持
    gap: 16,
    overflow: 'hidden',
  },
})
