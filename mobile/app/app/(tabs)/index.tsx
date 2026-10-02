import { Ionicons } from '@expo/vector-icons';
import { Image, type ImageSource } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import ProfileModal from '@/components/profile-modal';
import ScreenHeader from '@/components/screen-header';
import { BrandColors } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useLanguage } from '@/contexts/language-context';
import { fetchPrintItems, fetchProducts, getApiBaseUrls, type ApiPrintItem, type ApiProduct } from '@/utils/api';
import { getCategoryForItem } from '@/utils/category';
import { syncCustomerToBackend } from '@/utils/customer-sync';

export interface FeaturedItem {
  id: string;
  image: ImageSource | { uri: string };
  price: string;
  badge: string;
  badgeColor: string;
  name: string;
  rating: string;
  reviews: string;
  is3D?: boolean;
  sku?: string;
  stock?: number;
  viewerType?: string;
  category?: string;
  customizationAddonPrice?: number | string;
  maxTextLength?: number;
}

function getProductImage(item: { thumbnail?: string | null; fallback_image?: string | null; name: string; category?: string }): any {
  const img = item.thumbnail || item.fallback_image;
  if (img) {
    const baseUrl = getApiBaseUrls()[0] ?? '';
    const uri = img.startsWith('http')
      ? img
      : `${baseUrl}${img.startsWith('/') ? '' : '/'}${img}`;
    return { uri };
  }
  const nameLower = item.name.toLowerCase();
  const catLower = (item.category || '').toLowerCase();

  if (nameLower.includes('mug') || nameLower.includes('tumbler') || catLower.includes('mug')) {
    return require('@/assets/images/custom-mugs.jpeg');
  }
  if (nameLower.includes('pin') || catLower.includes('pin')) {
    return require('@/assets/images/button-pins.jpg');
  }
  if (nameLower.includes('sticker') || catLower.includes('sticker')) {
    return require('@/assets/images/custom-stickers.jpg');
  }
  if (nameLower.includes('shirt') || nameLower.includes('t-shirt') || catLower.includes('apparel')) {
    return require('@/assets/images/custom-thirts.jpg');
  }
  if (nameLower.includes('tote') || nameLower.includes('bag')) {
    return require('@/assets/images/tote-bags.jpg');
  }
  if (nameLower.includes('calendar')) {
    return require('@/assets/images/calendars.jpg');
  }
  return require('@/assets/images/custom-mugs.jpeg');
}

export default function HomeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ authSuccess?: string; email?: string }>();
  const { user } = useAuth();
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [featured, setFeatured] = useState<FeaturedItem[]>([]);
  const { t } = useLanguage();

  const activeEmail = params.email || user?.email;

  useEffect(() => {
    if (params.authSuccess === '1') {
      setShowSuccessModal(true);
      if (activeEmail) {
        syncCustomerToBackend(activeEmail);
      }
    }
  }, [params.authSuccess, activeEmail]);

  const loadData = async () => {
    try {
      const [products, printItems] = await Promise.all([
        fetchProducts(),
        fetchPrintItems(),
      ]);

      const items: FeaturedItem[] = [];

      products.forEach((p: ApiProduct) => {
        const is3D = p.has_3d_preview || p.is_customizable || p.name.toLowerCase().includes('mug') || p.name.toLowerCase().includes('pin');
        items.push({
          id: `prod-${p.id}`,
          image: getProductImage(p),
          price: p.base_price ? `₱${p.base_price}` : '₱9.99',
          badge: p.badge || (is3D ? '3D Interactive' : 'Bestseller'),
          badgeColor: BrandColors.primary,
          name: p.name,
          rating: '4.9',
          reviews: '180',
          is3D,
          sku: p.sku,
          stock: p.stock_quantity,
          viewerType: p.viewer_type,
          category: p.category,
          customizationAddonPrice: p.customization_addon_price,
          maxTextLength: p.max_text_length,
        });
      });

      printItems.slice(0, 5).forEach((pi: ApiPrintItem) => {
        const is3D = pi.name.toLowerCase().includes('mug') || pi.name.toLowerCase().includes('pin');
        items.push({
          id: `item-${pi.id}`,
          image: getProductImage({ name: pi.name, category: pi.category?.name }),
          price: pi.base_price ? `₱${pi.base_price}` : '₱3.50',
          badge: pi.category?.name || 'Print Item',
          badgeColor: '#4B5563',
          name: pi.name,
          rating: '4.8',
          reviews: '95',
          is3D,
          sku: pi.item_code,
          stock: 50,
          viewerType: pi.name.toLowerCase().includes('pin') ? 'pin_cloud' : 'coffee_cup',
          category: pi.category?.name,
        });
      });

      if (items.length > 0) {
        setFeatured(items);
      } else {
        setFeatured([
          {
            id: '0',
            image: require('@/assets/images/custom-mugs.jpeg'),
            price: '₱9.99',
            badge: t.bestseller,
            badgeColor: BrandColors.primary,
            name: t.prodMug,
            rating: '4.9',
            reviews: '210',
            is3D: true,
          },
          {
            id: '1',
            image: require('@/assets/images/custom-thirts.jpg'),
            price: '₱15.00',
            badge: t.fastTurnaround,
            badgeColor: '#4B5563',
            name: t.prodTshirt,
            rating: '4.9',
            reviews: '120',
          },
        ]);
      }
    } catch (err) {
      console.warn('[HomeScreen] Failed to load live featured items:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const categories = [
    {
      id: 'mugs',
      label: t.catMugs,
      icon: 'cafe-outline' as const,
      is3D: true,
    },
    {
      id: 'pins',
      label: t.catPins,
      icon: 'pricetag-outline' as const,
      is3D: true,
    },
    {
      id: 'apparel',
      label: t.prodTshirt || 'T-Shirts',
      icon: 'shirt-outline' as const,
      is3D: true,
    },
    {
      id: 'calendars',
      label: t.catCalendars,
      icon: 'calendar-outline' as const,
      is3D: false,
    },
    {
      id: 'totes',
      label: t.catTotes,
      icon: 'bag-outline' as const,
      is3D: false,
    },
  ];

  const wideCategories = [
    {
      id: 'stickers',
      label: t.catStickers,
      sublabel: 'Custom',
      icon: 'layers-outline' as const,
    },
    {
      id: 'printing',
      label: t.catPrinting,
      sublabel: 'General',
      icon: 'print-outline' as const,
    },
  ];

  const handleCategoryPress = (id: string) => {
    if (id === 'mugs') {
      router.push('/mug-3d' as any);
    } else if (id === 'pins') {
      router.push('/pin-3d' as any);
    } else if (id === 'apparel') {
      router.push({
        pathname: '/(tabs)/services',
        params: { category: 'tshirts' },
      } as any);
    } else if (id === 'totes') {
      router.push({
        pathname: '/(tabs)/services',
        params: { category: 'tote_bags' },
      } as any);
    } else {
      router.push({
        pathname: '/(tabs)/services',
        params: { category: id },
      } as any);
    }
  };

  const handleFeaturedPress = (item: FeaturedItem) => {
    const nameLower = item.name.toLowerCase();
    const vType = (item.viewerType || '').toLowerCase();
    const catLower = (item.category || '').toLowerCase();
    const isPin = vType.includes('pin') || catLower.includes('pin') || nameLower.includes('pin');
    const isShirt =
      vType.includes('shirt') ||
      catLower.includes('shirt') ||
      catLower.includes('apparel') ||
      nameLower.includes('shirt') ||
      nameLower.includes('tee');

    const defaultViewerType = isShirt
      ? 'shirt'
      : isPin
      ? 'pin_cloud'
      : 'coffee_cup';

    if (item.is3D || isPin || isShirt || nameLower.includes('mug')) {
      const targetRoute = isPin ? '/pin-3d' : '/mug-3d';
      router.push({
        pathname: targetRoute,
        params: {
          id: item.id,
          name: item.name,
          price: item.price,
          sku: item.sku || '',
          stock: item.stock !== undefined ? String(item.stock) : '30',
          viewer_type: item.viewerType || defaultViewerType,
          category: item.category || (isShirt ? 'apparel' : isPin ? 'pins' : 'mugs'),
          customization_addon_price: item.customizationAddonPrice !== undefined ? String(item.customizationAddonPrice) : undefined,
          max_text_length: item.maxTextLength !== undefined ? String(item.maxTextLength) : undefined,
        },
      } as any);
    } else {
      const cat = getCategoryForItem(item);
      router.push({
        pathname: '/(tabs)/services',
        params: { category: cat, query: item.name },
      } as any);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      {/* ── Header + Search ──────────────────────────────────── */}
      <ScreenHeader onAvatarPress={() => setShowProfileModal(true)} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[BrandColors.primary]} />
        }>

        {/* ── Hero banner ──────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(80).duration(500)} style={styles.heroBanner}>
          <LinearGradient
            colors={['#2979E8', '#0052CC']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />

          {/* Text side */}
          <View style={styles.heroText}>
            <Text style={styles.heroTitle}>{t.heroTitle}</Text>
            <Text style={styles.heroSub}>{t.heroSubtitle}</Text>

            <Pressable
              onPress={() => router.push('/(tabs)/services' as any)}
              style={({ pressed }) => [styles.shopBtn, pressed && styles.shopBtnPressed]}
              android_ripple={{ color: '#003D9B' }}>
              <Ionicons name="bag-outline" size={16} color="#FFFFFF" />
              <Text style={styles.shopBtnText}>{t.getStarted}</Text>
            </Pressable>
          </View>

          {/* Mascot */}
          <View style={styles.heroMascot}>
            <Image
              source={require('@/assets/images/shopping-owl.png')}
              style={styles.heroMascotImg}
              contentFit="contain"
              priority="high"
            />
          </View>
        </Animated.View>

        {/* ── Explore Categories ───────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(160).duration(500)} style={styles.section}>
          <Text style={styles.sectionTitle}>{t.categories}</Text>

          {/* Icon grid row */}
          <View style={styles.catRow}>
            {categories.map((cat) => (
              <Pressable
                key={cat.id}
                onPress={() => handleCategoryPress(cat.id)}
                style={({ pressed }) => [styles.catItem, pressed && styles.catItemPressed]}>
                <View style={styles.catIconBox}>
                  <Ionicons name={cat.icon} size={26} color="#1F2937" />
                  {cat.is3D && (
                    <View style={styles.cat3DBadge}>
                      <Text style={styles.cat3DText}>3D</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.catLabel}>{cat.label}</Text>
              </Pressable>
            ))}
          </View>

          {/* Wide tiles row */}
          <View style={styles.wideCatRow}>
            {wideCategories.map((cat) => (
              <Pressable
                key={cat.id}
                onPress={() =>
                  router.push({
                    pathname: '/(tabs)/services',
                    params: { category: cat.id },
                  } as any)
                }
                style={({ pressed }) => [styles.wideCatItem, pressed && styles.wideCatItemPressed]}>
                <View style={styles.wideCatTextGroup}>
                  <Text style={styles.wideCatSublabel}>{cat.sublabel}</Text>
                  <Text style={styles.wideCatLabel}>{cat.label}</Text>
                </View>
                <View style={styles.wideCatIconBox}>
                  <Ionicons name={cat.icon} size={20} color="#1F2937" />
                </View>
              </Pressable>
            ))}
          </View>
        </Animated.View>

        {/* ── Featured Services ─────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(240).duration(500)} style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t.featuredProducts}</Text>
            <Pressable hitSlop={8} style={styles.seeAllBtn} onPress={() => router.push('/(tabs)/services' as any)}>
              <Text style={styles.seeAllText}>{t.viewAll}</Text>
              <Ionicons name="arrow-forward" size={14} color={BrandColors.primary} />
            </Pressable>
          </View>

          {loading ? (
            <ActivityIndicator size="small" color={BrandColors.primary} style={{ marginVertical: 20 }} />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.featuredScroll}>
              {featured.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => handleFeaturedPress(item)}
                  style={({ pressed }) => [
                    styles.featuredCard,
                    item.is3D && styles.featuredCard3D,
                    pressed && styles.featuredCardPressed,
                  ]}>
                  {/* Product image */}
                  <View style={styles.featuredImgWrap}>
                    <Image
                      source={item.image}
                      style={styles.featuredImg}
                      contentFit="cover"
                    />
                    {/* Wishlist */}
                    <Pressable hitSlop={8} style={styles.wishlistBtn}>
                      <Ionicons name="heart-outline" size={18} color="#6B7280" />
                    </Pressable>
                    {/* Price badge */}
                    <View style={styles.priceBadge}>
                      <Text style={styles.priceText}>{item.price}</Text>
                    </View>
                  </View>

                  {/* Info */}
                  <View style={styles.featuredInfo}>
                    <Text style={[styles.demandBadge, { color: item.badgeColor }]}>
                      {item.badge}
                    </Text>
                    <Text style={styles.featuredName} numberOfLines={1}>{item.name}</Text>
                    <View style={styles.ratingRow}>
                      <Ionicons name="star" size={13} color="#F59E0B" />
                      <Text style={styles.ratingText}>
                        {item.rating}{' '}
                        <Text style={styles.reviewCount}>({item.reviews})</Text>
                      </Text>
                      {item.is3D && (
                        <View style={styles.inline3D}>
                          <Ionicons name="cube-outline" size={11} color={BrandColors.primary} />
                          <Text style={styles.inline3DText}>3D</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </Animated.View>

        {/* Bottom spacing */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Profile Modal */}
      <ProfileModal visible={showProfileModal} onClose={() => setShowProfileModal(false)} />

      {/* Success Modal */}
      <Modal visible={showSuccessModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Ionicons name="checkmark-circle" size={54} color="#10B981" />
            <Text style={styles.modalTitle}>Welcome!</Text>
            <Text style={styles.modalSub}>
              You have successfully logged in as {activeEmail || 'Customer'}.
            </Text>
            <Pressable
              style={styles.modalBtn}
              onPress={() => setShowSuccessModal(false)}>
              <Text style={styles.modalBtnText}>Continue</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  scroll: {
    paddingBottom: 32,
  },
  heroBanner: {
    marginHorizontal: 16,
    marginTop: 12,
    height: 160,
    borderRadius: 20,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    position: 'relative',
  },
  heroText: {
    flex: 1,
    zIndex: 2,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    fontFamily: 'Manrope_800ExtraBold',
    lineHeight: 26,
  },
  heroSub: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    marginTop: 4,
    marginBottom: 14,
  },
  shopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  shopBtnPressed: {
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  shopBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Manrope_700Bold',
  },
  heroMascot: {
    width: 130,
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroMascotImg: {
    width: '100%',
    height: '100%',
  },

  // Categories
  section: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
    fontFamily: 'Manrope_800ExtraBold',
    marginBottom: 12,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  seeAllText: {
    fontSize: 13,
    color: BrandColors.primary,
    fontWeight: '700',
    fontFamily: 'Manrope_700Bold',
  },

  catRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  catItem: {
    alignItems: 'center',
    flex: 1,
  },
  catItemPressed: {
    opacity: 0.75,
  },
  catIconBox: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
      },
      android: { elevation: 1 },
    }),
  },
  catIconBox3D: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  cat3DBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: BrandColors.primary,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  cat3DText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    fontFamily: 'Manrope_800ExtraBold',
  },
  catLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'center',
  },

  wideCatRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  wideCatItem: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.03,
        shadowRadius: 5,
        shadowOffset: { width: 0, height: 1 },
      },
      android: { elevation: 1 },
    }),
  },
  wideCatItemPressed: {
    backgroundColor: '#F9FAFB',
  },
  wideCatTextGroup: {
    gap: 2,
  },
  wideCatSublabel: {
    fontSize: 11,
    color: '#9CA3AF',
    fontFamily: 'Inter_400Regular',
    textTransform: 'uppercase',
  },
  wideCatLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    fontFamily: 'Manrope_700Bold',
  },
  wideCatIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Featured Scroll
  featuredScroll: {
    gap: 14,
    paddingRight: 16,
  },
  featuredCard: {
    width: 170,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
      },
      android: { elevation: 2 },
    }),
  },
  featuredCard3D: {
    borderColor: '#D1D5DB',
  },
  featuredCardPressed: {
    opacity: 0.85,
  },
  featuredImgWrap: {
    height: 120,
    backgroundColor: '#F9FAFB',
    position: 'relative',
  },
  featuredImg: {
    width: '100%',
    height: '100%',
  },
  wishlistBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255,255,255,0.9)',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  priceBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(17,24,39,0.85)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priceText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Manrope_700Bold',
  },

  featuredInfo: {
    padding: 10,
    gap: 4,
  },
  demandBadge: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Manrope_700Bold',
    textTransform: 'uppercase',
  },
  featuredName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    fontFamily: 'Manrope_700Bold',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
    fontFamily: 'Inter_600SemiBold',
  },
  reviewCount: {
    color: '#9CA3AF',
  },
  inline3D: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginLeft: 'auto',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
  },
  inline3DText: {
    fontSize: 9,
    color: BrandColors.primary,
    fontWeight: '800',
    fontFamily: 'Manrope_800ExtraBold',
  },

  bottomSpacer: {
    height: 16,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalBox: {
    backgroundColor: '#FFFFFF',
    width: '100%',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    fontFamily: 'Manrope_800ExtraBold',
  },
  modalSub: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    fontFamily: 'Inter_400Regular',
  },
  modalBtn: {
    backgroundColor: BrandColors.primary,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  modalBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Manrope_700Bold',
  },
});
