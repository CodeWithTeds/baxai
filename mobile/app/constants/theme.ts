/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

export const BrandColors = {
  primary: '#0052CC',
  secondary: '#007AFF',
  tertiary: '#003D9B',
  neutral: '#1A1C1E',
  backgroundBlue: '#0052CC',
  cardBackground: '#FFFFFF',
  divider: '#E5E7EB',
  subtitle: '#6B7280',
  title: '#1A1C1E',
} as const;

export const IconColors = {
  // Brand & AI
  ai: '#7C3AED',         // Vivid Violet
  aiBg: '#EDE9FE',
  sparkle: '#8B5CF6',    // Purple
  sparkleBg: '#F3E8FF',

  // Actions & Navigation
  home: '#4F46E5',       // Indigo
  homeBg: '#EEF2FF',
  services: '#D97706',   // Warm Amber / Print
  servicesBg: '#FEF3C7',
  orders: '#0284C7',     // Sky Blue / Box
  ordersBg: '#E0F2FE',
  cart: '#EA580C',       // Orange / Shopping
  cartBg: '#FFEDD5',

  // Functional Purpose
  tracking: '#0284C7',   // Delivery / Truck / Location
  trackingBg: '#E0F2FE',
  pricing: '#10B981',    // Money / Tags / Pricing
  pricingBg: '#D1FAE5',
  support: '#06B6D4',    // Customer Care / Headset
  supportBg: '#CFFAFE',
  design: '#EC4899',     // Creative / Art / Palette
  designBg: '#FCE7F3',
  security: '#6366F1',   // Shield / Verified / Lock
  securityBg: '#EEF2FF',
  user: '#0EA5E9',       // User / Account
  userBg: '#E0F2FE',
  data: '#F59E0B',       // Server / Data
  dataBg: '#FEF3C7',
  success: '#10B981',    // Emerald Check
  successBg: '#D1FAE5',
  warning: '#F59E0B',    // Amber Alert
  warningBg: '#FEF3C7',
  danger: '#EF4444',     // Crimson Trash / Error / Close
  dangerBg: '#FEE2E2',
  copy: '#0284C7',       // Clipboard / Copy
  copyBg: '#E0F2FE',
  share: '#3B82F6',      // Share
  shareBg: '#DBEAFE',
  search: '#6366F1',     // Search
  searchBg: '#EEF2FF',
} as const;

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
