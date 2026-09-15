import { Ionicons } from '@expo/vector-icons';
import { Tabs, useRouter, useSegments } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import BubbleTabBar, { TabConfig } from '@/components/bubble-tab-bar';

const TABS: TabConfig[] = [
  { name: 'index',    label: 'Home',     icon: 'home-outline' },
  { name: 'services', label: 'Services', icon: 'print-outline' },
  { name: 'orders',   label: 'Orders',   icon: 'cube-outline' },
  { name: 'ai-hub',   label: 'AI Hub',   icon: 'sparkles-outline' },
];

const ROUTE_TO_INDEX: Record<string, number> = {
  index:    0,
  services: 1,
  orders:   2,
  'ai-hub': 3,
};

export default function TabLayout() {
  const router = useRouter();
  const segments = useSegments();

  // Derive active index from current route segment
  const lastSegment = segments[segments.length - 1] ?? 'index';
  const activeIndex = ROUTE_TO_INDEX[lastSegment] ?? 0;

  const handleTabPress = (index: number) => {
    const tab = TABS[index];
    if (tab.name === 'index') {
      router.push('/(tabs)/');
    } else {
      router.push(`/(tabs)/${tab.name}` as any);
    }
  };

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={() => (
        <BubbleTabBar
          tabs={TABS}
          activeIndex={activeIndex}
          onPress={handleTabPress}
        />
      )}>
      <Tabs.Screen name="index"    options={{ title: 'Home' }} />
      <Tabs.Screen name="services" options={{ title: 'Services' }} />
      <Tabs.Screen name="orders"   options={{ title: 'Orders' }} />
      <Tabs.Screen name="ai-hub"   options={{ title: 'AI Hub' }} />
      {/* Hide legacy tab */}
      <Tabs.Screen name="explore"  options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({});
