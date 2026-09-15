import * as Haptics from 'expo-haptics';
import { Pressable, type PressableProps } from 'react-native';

// SDK 57: expo-router no longer uses @react-navigation. Use plain Pressable to avoid
// EXPO_ROUTER_DISABLE_RN_NAVIGATION_CHECK error.
export function HapticTab(props: PressableProps & { onPressIn?: PressableProps['onPressIn'] }) {
  return (
    <Pressable
      {...(props as any)}
      onPressIn={(ev) => {
        if (process.env.EXPO_OS === 'ios') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        (props as any).onPressIn?.(ev);
      }}
    />
  );
}
