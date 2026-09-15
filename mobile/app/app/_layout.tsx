import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, Manrope_700Bold } from '@expo-google-fonts/manrope';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useEffect } from 'react';

import { LanguageProvider } from '@/contexts/language-context';

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
