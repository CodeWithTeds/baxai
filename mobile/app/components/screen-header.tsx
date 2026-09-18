import { Ionicons } from '@expo/vector-icons';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';

import { BrandColors } from '@/constants/theme';

// ─── Props ────────────────────────────────────────────────────────────────────

interface ScreenHeaderProps {
  /** Center brand/page title */
  title?: string;
  /** Hide the search bar entirely */
  hideSearch?: boolean;
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
  hideSearch = false,
  searchPlaceholder = 'Search...',
  searchValue,
  onSearchChange,
  onFilterPress,
  onMenuPress,
  onAvatarPress,
}: ScreenHeaderProps) {
  return (
    <>
      {/* ── Top bar ──────────────────────────────────────────── */}
      <SafeAreaView edges={['top']} style={styles.topSafe}>
        <View style={styles.topBar}>
          <Pressable hitSlop={8} style={styles.iconBtn} onPress={onMenuPress}>
            <Ionicons name="menu" size={26} color={BrandColors.primary} />
          </Pressable>

          <Text style={styles.brandName}>{title}</Text>

          <Pressable hitSlop={8} style={styles.avatarBtn} onPress={onAvatarPress}>
            <Ionicons name="person-circle-outline" size={32} color="#9CA3AF" />
          </Pressable>
        </View>
      </SafeAreaView>

      {/* ── Search bar (optional) ────────────────────────────── */}
      {!hideSearch && (
        <Animated.View entering={FadeIn.duration(400)} style={styles.searchWrap}>
          <Ionicons name="search-outline" size={18} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            placeholder={searchPlaceholder}
            placeholderTextColor="#9CA3AF"
            style={styles.searchInput}
            returnKeyType="search"
            value={searchValue}
            onChangeText={onSearchChange}
          />
          <Pressable hitSlop={8} style={styles.filterBtn} onPress={onFilterPress}>
            <Ionicons name="options-outline" size={20} color={BrandColors.primary} />
          </Pressable>
        </Animated.View>
      )}
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  topSafe: {
    backgroundColor: '#FFFFFF',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
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
