import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';

import { BrandColors } from '@/constants/theme';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

export type TabConfig = {
  name: string;
  label: string;
  icon: IoniconsName;
};

type Props = {
  tabs: TabConfig[];
  activeIndex: number;
  onPress: (index: number) => void;
};

const BUBBLE_SIZE = 58;
const BAR_HEIGHT = 64;
const LIFT = 28; // how much the bubble floats above the bar

function TabItem({
  config,
  focused,
  onPress,
}: {
  config: TabConfig;
  focused: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(focused ? 1 : 0.85);
  const progress = useSharedValue(focused ? 1 : 0);

  React.useEffect(() => {
    scale.value = withSpring(focused ? 1 : 0.85, { damping: 14, stiffness: 180 });
    progress.value = withTiming(focused ? 1 : 0, { duration: 200 });
  }, [focused]);

  const bubbleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      ['transparent', BrandColors.primary],
    ),
    // border always white, only visible when focused
    borderColor: '#FFFFFF',
    borderWidth: progress.value > 0.5 ? 3 : 0,
  }));

  const labelStyle = useAnimatedStyle(() => ({
    fontWeight: focused ? '700' : '400',
    color: focused ? BrandColors.primary : '#9CA3AF',
  }));

  return (
    <Pressable
      onPress={onPress}
      style={styles.tabItem}
      hitSlop={6}
      android_ripple={{ color: 'transparent' }}>
      {/* Floating bubble */}
      <View style={styles.bubbleAnchor}>
        <Animated.View style={[styles.bubble, bubbleStyle]}>
          <Ionicons
            name={config.icon}
            size={26}
            color={focused ? '#FFFFFF' : '#9CA3AF'}
          />
        </Animated.View>
      </View>

      {/* Label sits inside the bar */}
      <Animated.Text style={[styles.label, labelStyle]}>
        {config.label}
      </Animated.Text>
    </Pressable>
  );
}

export default function BubbleTabBar({ tabs, activeIndex, onPress }: Props) {
  const insets = useSafeAreaInsets();

  const handlePress = async (index: number) => {
    if (Platform.OS !== 'web') {
      try {
        await Haptics.selectionAsync();
      } catch {}
    }
    onPress(index);
  };

  return (
    <View
      style={[
        styles.container,
        { paddingBottom: insets.bottom > 0 ? insets.bottom : 10 },
      ]}>
      {/* The white pill bar */}
      <View style={styles.bar}>
        {tabs.map((tab, i) => (
          <TabItem
            key={tab.name}
            config={tab}
            focused={i === activeIndex}
            onPress={() => handlePress(i)}
          />
        ))}
        {/* iOS home indicator line */}
        <View style={styles.homeIndicator} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    // lift the whole bar up so bubbles have room above
    paddingTop: LIFT,
  },
  bar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    height: BAR_HEIGHT,
    alignItems: 'flex-end',
    paddingBottom: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: -4 },
      },
      android: { elevation: 16 },
    }),
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  // The bubble sits above the bar — positioned relative to the bar top
  bubbleAnchor: {
    position: 'absolute',
    // Move up from bar top by LIFT amount so it floats
    top: -(LIFT + BUBBLE_SIZE / 2 - 4),
    alignSelf: 'center',
  },
  bubble: {
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    borderRadius: BUBBLE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    marginTop: 2,
    textAlign: 'center',
  },
  homeIndicator: {
    position: 'absolute',
    bottom: 4,
    alignSelf: 'center',
    width: 120,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    left: '50%',
    marginLeft: -60,
  },
});
