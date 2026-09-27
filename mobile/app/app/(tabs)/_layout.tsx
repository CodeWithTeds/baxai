import { Ionicons } from '@expo/vector-icons';
import { Tabs, useRouter, useSegments } from 'expo-router';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import BubbleTabBar, { TabConfig } from '@/components/bubble-tab-bar';
import { useLanguage } from '@/contexts/language-context';

const ROUTE_TO_INDEX: Record<string, number> = {
  index:    0,
  services: 1,
  orders:   2,
  'ai-hub': 3,
};

export default function TabLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { t } = useLanguage();

  const tabs: TabConfig[] = useMemo(
    () => [
      { name: 'index',    label: t.navHome,     icon: 'home-outline' },
      { name: 'services', label: t.navServices, icon: 'print-outline' },
      { name: 'orders',   label: t.navOrders,   icon: 'cube-outline' },
      { name: 'ai-hub',   label: t.navAiHub,    icon: 'sparkles-outline' },
    ],
    [t]
  );

  // Derive active index from current route segment
  const lastSegment = segments[segments.length - 1] ?? 'index';
  const activeIndex = ROUTE_TO_INDEX[lastSegment] ?? 0;

  const handleTabPress = (index: number) => {
    const tab = tabs[index];
    if (tab.name === 'index') {
      router.push('/(tabs)' as any);
    } else {
      router.push(`/(tabs)/${tab.name}` as any);
    }
  };

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={() => (
        <BubbleTabBar
          tabs={tabs}
          activeIndex={activeIndex}
          onPress={handleTabPress}
        />
      )}>
      <Tabs.Screen name="index"    options={{ title: t.navHome }} />
      <Tabs.Screen name="services" options={{ title: t.navServices }} />
      <Tabs.Screen name="orders"   options={{ title: t.navOrders }} />
      <Tabs.Screen name="ai-hub"   options={{ title: t.navAiHub }} />
      {/* Hide legacy tab */}
      <Tabs.Screen name="explore"  options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({});
