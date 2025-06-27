// app/_layout.tsx
import 'react-native-gesture-handler';
import { DarkTheme, DefaultTheme, ThemeProvider as NavThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
// React Native Reanimated disabled due to technical constraints
import i18n, { initI18n } from '@/lib/i18n';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import TasksDatabase from '@/lib/TaskDatabase';
import dayjs from 'dayjs';

// Ensure dayjs is properly initialized
if (typeof dayjs !== 'function') {
  console.error('dayjs is not properly imported');
}

import { ThemeProvider, useAppTheme } from '@/hooks/ThemeContext';
import { FontSizeProvider } from '@/context/FontSizeContext';
import { GoogleCalendarProvider } from '@/context/GoogleCalendarContext';
import { OverlayProvider } from '@/context/OverlayContext';
import { PortalProvider } from '@/context/PortalContext';
import Toast from 'react-native-toast-message';
import StartupAnimation from '@/components/StartupAnimation';
import GlobalOverlay from '@/components/GlobalOverlay';

import * as NavigationBar from 'expo-navigation-bar';
import { Platform } from 'react-native';

SplashScreen.preventAutoHideAsync();

function InnerLayout() {
  const { colorScheme } = useAppTheme();
  const isDark = colorScheme === 'dark';
  const rootBackgroundColor = isDark ? '#000000' : '#ffffff';

  useEffect(() => {
    if (Platform.OS === 'android') {
      NavigationBar.setButtonStyleAsync(isDark ? 'light' : 'dark');
      // edgeToEdge有効時はナビゲーションバー設定はapp.jsonで管理
    }
  }, [isDark]);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: rootBackgroundColor }}>
      <NavThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" />
        </Stack>
        <StatusBar style={isDark ? 'light' : 'dark'} translucent />
        <Toast />
      </NavThemeProvider>
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const [animationDone, setAnimationDone] = useState(false);
  const [i18nReady, setI18nReady] = useState(false);

  useEffect(() => {
    const initializeApp = async () => {
      await Promise.all([
        initI18n(),
        TasksDatabase.initialize()
      ]);
      setI18nReady(true);
    };
    initializeApp();
  }, []);

  useEffect(() => {
    if (loaded && i18nReady) SplashScreen.hideAsync();
  }, [loaded, i18nReady]);

  if (!loaded || !i18nReady) return null;

  return (
    <ThemeProvider>
      <FontSizeProvider>
        <GoogleCalendarProvider>
          <OverlayProvider>
            <PortalProvider>
              <InnerLayout />
              {!animationDone && (
                <StartupAnimation onAnimationEnd={() => setAnimationDone(true)} />
              )}
              <GlobalOverlay />
            </PortalProvider>
          </OverlayProvider>
        </GoogleCalendarProvider>
      </FontSizeProvider>
    </ThemeProvider>
  );
}