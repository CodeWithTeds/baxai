import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, Manrope_700Bold } from '@expo-google-fonts/manrope';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useEffect } from 'react';
import { LogBox } from 'react-native';

import { LanguageProvider } from '@/contexts/language-context';

// Silence noisy but harmless warnings:
// - Reanimated opacity layout conflict (FadeIn + opacity style)
// - THREE WebGL1 deprecation (expo-gl only provides WebGL1, three@0.160 warns but still works)
// - Metro three exports warning already fixed via metro.config.js, also ignored here for device logs
LogBox.ignoreLogs([
  'Property "opacity" of AnimatedComponent',
  'THREE.WebGLRenderer: WebGL 1 support was deprecated',
  'contains an invalid package.json configuration',
]);

// Patch console.warn to fully suppress the WebGL1 spam (LogBox ignore still prints LOG on iOS)
if (__DEV__) {
  const _warn = console.warn;
  console.warn = (...args: any[]) => {
    const msg = typeof args[0] === 'string' ? args[0] : '';
    if (msg.includes('WebGL 1 support was deprecated') || msg.includes('invalid package.json configuration')) return;
    // @ts-ignore
    _warn(...args);
  };
}

SplashScreen.preventAutoHideAsync().catch(() => {});

export const unstable_settings = {
  // Language selection is the entry screen; anchor must NOT be '(tabs)' so "/" shows index first
  anchor: 'index',
};

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Manrope_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false, animation: 'fade' }} />
          <Stack.Screen name="welcome" options={{ headerShown: false, animation: 'fade' }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="order/[id]" options={{ headerShown: false, animation: 'slide_from_right' }} />
          <Stack.Screen name="mug-3d" options={{ headerShown: false, animation: 'slide_from_right' }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style="auto" />
      </LanguageProvider>
    </SafeAreaProvider>
  );
}
