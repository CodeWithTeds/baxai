import { Ionicons } from '@expo/vector-icons';
import { Tabs, useRouter, useSegments } from 'expo-router';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import BubbleTabBar, { TabConfig } from '@/components/bubble-tab-bar';
import { useLanguage } from '@/contexts/language-context';
import { IconColors } from '@/constants/theme';

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
      { name: 'index',    label: t.navHome,     icon: 'home-outline',     color: IconColors.home,     activeColor: IconColors.home },
      { name: 'services', label: t.navServices, icon: 'print-outline',    color: IconColors.services, activeColor: IconColors.services },
      { name: 'orders',   label: t.navOrders,   icon: 'cube-outline',     color: IconColors.orders,   activeColor: IconColors.orders },
      { name: 'ai-hub',   label: t.navAiHub,    icon: 'sparkles-outline', color: IconColors.ai,       activeColor: IconColors.ai },
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
