import { Ionicons } from '@expo/vector-icons';
import { Image, type ImageSource } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import ScreenHeader from '@/components/screen-header';
import { BrandColors } from '@/constants/theme';
import { useLanguage } from '@/contexts/language-context';
import { fetchPrintItems, fetchProducts, type ApiPrintItem, type ApiProduct } from '@/utils/api';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ServiceItem = {
  id: string;
  name: string;
  description: string;
  price: string;
  image: ImageSource | { uri: string };
  badge?: string;
  badgeColor?: string;
  featured?: boolean;
  is3D?: boolean;
  type?: 'product' | 'print-item';
  category?: string;
};

// Helper to determine image source based on dynamic product / print item attributes
function getProductImage(item: { thumbnail?: string | null; name: string; category?: string }): any {
  if (item.thumbnail) {
    const uri = item.thumbnail.startsWith('http')
      ? item.thumbnail
      : `http://192.168.1.3:8081${item.thumbnail}`;
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

// ─── Sub-components ───────────────────────────────────────────────────────────

function FeaturedServiceCard({ item, onPress }: { item: ServiceItem; onPress?: () => void }) {
  const isMug = item.name.toLowerCase().includes('mug');
  const isPin = item.name.toLowerCase().includes('pin');
  const is3D = item.is3D || isMug || isPin;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.featuredCard, is3D && styles.card3D, pressed && styles.cardPressed]}>
      {/* Image */}
      <View style={styles.featuredImgWrap}>
        <Image
          source={item.image}
          style={styles.featuredImg}
          contentFit="cover"
        />
        {item.badge && (
          <View style={[styles.badge, { backgroundColor: item.badgeColor || BrandColors.primary }]}>
            <Ionicons name="star" size={11} color="#fff" style={{ marginRight: 3 }} />
            <Text style={styles.badgeText}>{item.badge}</Text>
          </View>
        )}
        {isMug && (
          <View style={styles.view3DBadge}>
            <Ionicons name="cube" size={12} color="#fff" />
            <Text style={styles.view3DText}>3D • Tap to view</Text>
          </View>
        )}
        {isPin && !isMug && (
          <View style={[styles.view3DBadge, { backgroundColor: 'rgba(124,58,237,0.92)' }]}>
            <Ionicons name="pricetag" size={12} color="#fff" />
            <Text style={styles.view3DText}>7 shapes • 3D</Text>
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.featuredInfo}>
        <View style={styles.featuredInfoTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardName}>{item.name}</Text>
            <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
          </View>
        </View>

        <View style={styles.featuredInfoBottom}>
          <Text style={styles.featuredPrice}>{item.price}</Text>
          <Pressable
            hitSlop={8}
            style={({ pressed }) => [styles.cartBtn, pressed && styles.cartBtnPressed]}>
            <Ionicons name="cart-outline" size={20} color={BrandColors.primary} />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

function GridServiceCard({ item, onPress }: { item: ServiceItem; onPress?: () => void }) {
  const isMug = item.name.toLowerCase().includes('mug');
  const isPin = item.name.toLowerCase().includes('pin');
  const is3D = item.is3D || isMug || isPin;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.gridCard, is3D && styles.card3D, pressed && styles.cardPressed]}>
      {/* Image */}
      <View style={styles.gridImgWrap}>
        <Image
          source={item.image}
          style={styles.gridImg}
          contentFit="cover"
        />
        {item.badge && (
          <View style={[styles.badge, { backgroundColor: item.badgeColor || BrandColors.primary }]}>
            <Text style={styles.badgeText}>{item.badge}</Text>
          </View>
        )}
        {isMug && (
          <View style={styles.view3DBadgeSmall}>
            <Ionicons name="cube" size={10} color="#fff" />
            <Text style={styles.view3DTextSmall}>3D</Text>
          </View>
        )}
        {isPin && !isMug && (
          <View style={[styles.view3DBadgeSmall, { backgroundColor: 'rgba(124,58,237,0.88)' }]}>
            <Ionicons name="shapes" size={10} color="#fff" />
            <Text style={styles.view3DTextSmall}>7×</Text>
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.gridInfo}>
        <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>

        <View style={styles.gridInfoBottom}>
          <Text style={styles.gridPrice}>{item.price}</Text>
          <Pressable
            hitSlop={8}
            style={({ pressed }) => [styles.cartBtn, pressed && styles.cartBtnPressed]}>
            <Ionicons name="cart-outline" size={18} color={BrandColors.primary} />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ServicesScreen() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const router = useRouter();
  const { t } = useLanguage();

  const loadData = async () => {
    try {
      const [apiProducts, apiPrintItems] = await Promise.all([
        fetchProducts(),
        fetchPrintItems(),
      ]);

      const mappedProducts: ServiceItem[] = apiProducts.map((p: ApiProduct) => {
        const nameLower = p.name.toLowerCase();
        const priceVal = p.base_price ? `₱${p.base_price}` : '₱9.99';
        const is3D = p.has_3d_preview || p.is_customizable || nameLower.includes('mug') || nameLower.includes('pin');
        
        return {
          id: `prod-${p.id}`,
          name: p.name,
          description: p.short_description || p.description || t.prodMugDesc,
          price: `${t.fromPrice} ${priceVal}`,
          image: getProductImage(p),
          badge: p.badge || (is3D ? '3D Customizable' : undefined),
          badgeColor: p.badge ? BrandColors.primary : '#7C3AED',
          featured: p.is_customizable || p.has_3d_preview || false,
          is3D,
          type: 'product',
          category: p.category,
        };
      });

      const mappedPrintItems: ServiceItem[] = apiPrintItems.map((pi: ApiPrintItem) => {
        const priceVal = pi.base_price ? `₱${pi.base_price}` : '₱3.50';
        return {
          id: `item-${pi.id}`,
          name: pi.name,
          description: pi.description || `${pi.paper_type || 'Custom Print'} • ${pi.color_mode || 'Full Color'}`,
          price: `${t.fromPrice} ${priceVal}`,
          image: getProductImage({ name: pi.name, category: pi.category?.name }),
          badge: pi.category?.name || 'Print Item',
          badgeColor: '#D97706',
          featured: false,
          is3D: pi.name.toLowerCase().includes('mug') || pi.name.toLowerCase().includes('pin'),
          type: 'print-item',
          category: pi.category?.name,
        };
      });

      const combined = [...mappedProducts, ...mappedPrintItems];

      if (combined.length > 0) {
        setServices(combined);
      } else {
        // Fallback default items if API yields 0 items
        setServices([
          {
            id: '1',
            name: t.prodMug,
            description: t.prodMugDesc,
            price: `${t.fromPrice} ₱9.99`,
            image: require('@/assets/images/custom-mugs.jpeg'),
            badge: t.bestseller,
            badgeColor: BrandColors.primary,
            featured: true,
            is3D: true,
          },
          {
            id: '2',
            name: t.prodPins,
            description: t.prodPinsDesc,
            price: `${t.fromPrice} ₱1.50`,
            image: require('@/assets/images/button-pins.jpg'),
            is3D: true,
          },
        ]);
      }
    } catch (err) {
      console.warn('[ServicesScreen] Error loading live API products:', err);
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

  const handlePress = (item: ServiceItem) => {
    const isMug = item.name.toLowerCase().includes('mug') || item.name.toLowerCase().includes('tumbler');
    const isPin = item.name.toLowerCase().includes('pin');
    if (isMug) {
      router.push('/mug-3d' as any);
    } else if (isPin) {
      router.push('/pin-3d' as any);
    } else {
      router.push('/mug-3d' as any);
    }
  };

  const featured = services.filter((s) => s.featured);
  const grid = services.filter((s) => !s.featured).filter((s) =>
    query.length === 0 ? true : s.name.toLowerCase().includes(query.toLowerCase()),
  );
  const filteredFeatured = featured.filter((s) =>
    query.length === 0 ? true : s.name.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      {/* ── Header + Search ──────────────────────────────────── */}
      <ScreenHeader
        searchValue={query}
        onSearchChange={setQuery}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[BrandColors.primary]} />
        }>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={BrandColors.primary} />
            <Text style={styles.loadingText}>Fetching live products from backend...</Text>
          </View>
        ) : (
          <>
            {/* ── Featured (full-width) ─────────────────────────── */}
            {filteredFeatured.length > 0 && (
              <Animated.View entering={FadeInDown.delay(80).duration(500)}>
                {filteredFeatured.map((item) => (
                  <FeaturedServiceCard key={item.id} item={item} onPress={() => handlePress(item)} />
                ))}
              </Animated.View>
            )}

            {/* ── All Services grid ─────────────────────────────── */}
            {grid.length > 0 && (
              <Animated.View entering={FadeInDown.delay(160).duration(500)} style={styles.gridSection}>
                <View style={styles.gridRow}>
                  {grid.map((item) => (
                    <GridServiceCard key={item.id} item={item} onPress={() => handlePress(item)} />
                  ))}
                </View>
              </Animated.View>
            )}

            {/* Empty state */}
            {filteredFeatured.length === 0 && grid.length === 0 && (
              <Animated.View entering={FadeInDown.duration(400)} style={styles.emptyWrap}>
                <Ionicons name="search-outline" size={40} color="#D1D5DB" />
                <Text style={styles.emptyText}>No products found for "{query}"</Text>
              </Animated.View>
            )}
          </>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const CARD_SHADOW = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  android: { elevation: 3 },
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  scroll: {
    paddingTop: 16,
    paddingBottom: 24,
  },
  loadingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: 'Inter_400Regular',
  },

  // ── Featured card ──────────────────────────────────────────
  featuredCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    ...CARD_SHADOW,
  },
  featuredImgWrap: {
    height: 200,
    backgroundColor: '#F9FAFB',
    position: 'relative',
  },
  featuredImg: {
    width: '100%',
    height: '100%',
  },
  featuredInfo: {
    padding: 16,
    gap: 12,
  },
  featuredInfoTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  featuredInfoBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  featuredPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: BrandColors.primary,
    fontFamily: 'Manrope_700Bold',
  },

  // ── Grid ──────────────────────────────────────────────────
  gridSection: {
    paddingHorizontal: 16,
  },
  gridRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridCard: {
    width: '47.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
    ...CARD_SHADOW,
  },
  gridImgWrap: {
    height: 130,
    backgroundColor: '#F9FAFB',
    position: 'relative',
  },
  gridImg: {
    width: '100%',
    height: '100%',
  },
  gridInfo: {
    padding: 10,
    gap: 4,
  },
  gridInfoBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  gridPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: BrandColors.primary,
    fontFamily: 'Manrope_700Bold',
  },

  // ── Shared card pieces ─────────────────────────────────────
  card3D: {
    borderWidth: 1.5,
    borderColor: BrandColors.primary,
  },
  view3DBadge: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(17,24,39,0.92)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  view3DText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Manrope_700Bold',
  },
  view3DBadgeSmall: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(17,24,39,0.88)',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 12,
  },
  view3DTextSmall: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Manrope_700Bold',
  },
  cardPressed: {
    opacity: 0.85,
  },
  cardName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    fontFamily: 'Manrope_700Bold',
    marginBottom: 2,
  },
  cardDesc: {
    fontSize: 13,
    color: '#6B7280',
    fontFamily: 'Inter_400Regular',
    lineHeight: 18,
  },
  badge: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Manrope_700Bold',
  },
  cartBtn: {
    backgroundColor: '#EFF6FF',
    padding: 8,
    borderRadius: 10,
  },
  cartBtnPressed: {
    backgroundColor: '#DBEAFE',
  },

  // ── Empty state ────────────────────────────────────────────
  emptyWrap: {
    alignItems: 'center',
    marginTop: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },

  bottomSpacer: {
    height: 16,
  },
});
