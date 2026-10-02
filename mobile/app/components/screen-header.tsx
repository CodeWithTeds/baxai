import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';

import { BrandColors } from '@/constants/theme';
import { useLanguage } from '@/contexts/language-context';
import ProfileModal from '@/components/profile-modal';
import { CartHeaderButton } from '@/components/cart-header-button';

// ─── Props ────────────────────────────────────────────────────────────────────

interface ScreenHeaderProps {
  /** Center brand/page title */
  title?: string;
  /** Force showing brand logo instead of text */
  showLogo?: boolean;
  /** Hide the search bar entirely */
  hideSearch?: boolean;
  /** Hide the cart button */
  hideCart?: boolean;
  /** Placeholder text inside the search input */
  searchPlaceholder?: string;
  /** Current search value */
  searchValue?: string;
  /** Called when the search text changes */
  onSearchChange?: (text: string) => void;
  /** Called when the filter/options button is pressed */
  onFilterPress?: () => void;
  /** Called when the left menu button is pressed */
  onMenuPress?: () => void;
  /** Called when the right avatar button is pressed */
  onAvatarPress?: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ScreenHeader({
  title = 'NUYDA ENTERPRISE',
  showLogo,
  hideSearch = false,
  hideCart = false,
  searchPlaceholder,
  searchValue,
  onSearchChange,
  onFilterPress,
  onMenuPress,
  onAvatarPress,
}: ScreenHeaderProps) {
  const { t } = useLanguage();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const effectivePlaceholder = searchPlaceholder ?? t.searchPlaceholder;
  const isLogo = showLogo ?? (!title || title === 'NUYDA ENTERPRISE' || title === t.brandName);

  const handleAvatarPress = () => {
    if (onAvatarPress) {
      onAvatarPress();
    } else {
      setShowProfileModal(true);
    }
  };

  return (
    <>
      {/* ── Top bar ──────────────────────────────────────────── */}
      <SafeAreaView edges={['top']} style={styles.topSafe}>
        <View style={styles.topBar}>
          <Pressable hitSlop={8} style={styles.iconBtn} onPress={onMenuPress}>
            <Ionicons name="menu" size={26} color={BrandColors.primary} />
          </Pressable>

          {isLogo ? (
            <View style={styles.logoWrap} pointerEvents="none">
              <Image
                source={require('@/assets/images/logo.png')}
                style={styles.brandLogo}
                contentFit="contain"
                priority="high"
              />
            </View>
          ) : (
            <Text style={styles.brandName} numberOfLines={1}>{title}</Text>
          )}

          <View style={styles.rightActions}>
            {!hideCart && <CartHeaderButton tintColor={BrandColors.primary} />}
            <Pressable hitSlop={8} style={styles.avatarBtn} onPress={handleAvatarPress}>
              <Ionicons name="person-circle-outline" size={32} color={BrandColors.primary} />
            </Pressable>
          </View>
        </View>
      </SafeAreaView>

      {/* ── Search bar (optional) ────────────────────────────── */}
      {!hideSearch && (
        <Animated.View entering={FadeIn.duration(400)} style={styles.searchWrap}>
          <Ionicons name="search" size={18} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            placeholder={effectivePlaceholder}
            placeholderTextColor="#9CA3AF"
            style={styles.searchInput}
            returnKeyType="search"
            value={searchValue}
            onChangeText={onSearchChange}
          />
          <Pressable hitSlop={8} style={styles.filterBtn} onPress={onFilterPress}>
            <Ionicons name="options-outline" size={20} color="#4B5563" />
          </Pressable>
        </Animated.View>
      )}

      {/* Profile & Logout Modal */}
      <ProfileModal
        visible={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  topSafe: {
    backgroundColor: '#FFFFFF',
  },
  topBar: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    minHeight: 52,
  },
  logoWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandLogo: {
    width: 52,
    height: 38,
  },
  iconBtn: {
    padding: 4,
  },
  brandName: {
    fontSize: 18,
    fontWeight: '700',
    color: BrandColors.primary,
    fontFamily: 'Manrope_700Bold',
  },
  avatarBtn: {
    padding: 2,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 4,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
      },
      android: { elevation: 2 },
    }),
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1F2937',
    fontFamily: 'Inter_400Regular',
    padding: 0,
  },
  filterBtn: {
    marginLeft: 8,
    padding: 2,
  },
});
