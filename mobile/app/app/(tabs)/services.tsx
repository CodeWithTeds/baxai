import { Ionicons } from '@expo/vector-icons';
import { Image, type ImageSource } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { useGlobalSearchParams, useLocalSearchParams, useRouter } from 'expo-router';
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
import Animated, { FadeInDown } from 'react-native-reanimated';

import ScreenHeader from '@/components/screen-header';
import { BrandColors } from '@/constants/theme';
import { useLanguage } from '@/contexts/language-context';
import { fetchPrintItems, fetchProducts, getApiBaseUrls, type ApiPrintItem, type ApiProduct } from '@/utils/api';
import { getCategoryForItem, type CategoryId } from '@/utils/category';

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
  paperType?: string;
  printSides?: string;
  colorMode?: string;
  turnaroundTime?: string;
  minQuantity?: number;
  stock?: number;
  sku?: string;
  viewerType?: string;
  customizationAddonPrice?: number | string;
  maxTextLength?: number;
  allowImageUpload?: boolean;
  allowCustomText?: boolean;
  allowColorChange?: boolean;
  availableColors?: string[];
};

export type CategoryCardItem = {
  id: CategoryId;
  name: string;
  description: string;
  image: any;
  badge: string;
  badgeColor: string;
};

// Helper to determine image source based on dynamic product / print item attributes
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

export const CATEGORY_ICONS: Record<CategoryId, keyof typeof Ionicons.glyphMap> = {
  all: 'grid-outline',
  mugs: 'cafe-outline',
  pins: 'pricetag-outline',
  tshirts: 'shirt-outline',
  stickers: 'layers-outline',
  tote_bags: 'bag-outline',
  calendars: 'calendar-outline',
  printing: 'print-outline',
};

const CATEGORY_TABS: {
  id: CategoryId;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  is3D?: boolean;
}[] = [
  { id: 'all', label: 'All', icon: 'grid-outline' },
  { id: 'mugs', label: 'Mugs', icon: 'cafe-outline', is3D: true },
  { id: 'pins', label: 'Pins', icon: 'pricetag-outline', is3D: true },
  { id: 'tshirts', label: 'T-Shirts', icon: 'shirt-outline', is3D: true },
  { id: 'stickers', label: 'Stickers', icon: 'layers-outline' },
  { id: 'tote_bags', label: 'Tote Bags', icon: 'bag-outline' },
  { id: 'calendars', label: 'Calendars', icon: 'calendar-outline' },
  { id: 'printing', label: 'Printing', icon: 'print-outline' },
];

const CUSTOMIZABLE_CATEGORY_CARDS: CategoryCardItem[] = [
  {
    id: 'mugs',
    name: 'Mugs',
    description: 'Custom ceramic mugs, travel mugs & tumblers',
    image: require('@/assets/images/custom-mugs.jpeg'),
    badge: 'Customizable',
    badgeColor: '#0052CC',
  },
  {
    id: 'pins',
    name: 'Pins',
    description: 'Custom button pins in multiple shapes & sizes',
    image: require('@/assets/images/button-pins.jpg'),
    badge: 'Customizable',
    badgeColor: '#0052CC',
  },
  {
    id: 'tshirts',
    name: 'T-Shirts',
    description: 'Custom printed cotton t-shirts & apparel',
    image: require('@/assets/images/custom-thirts.jpg'),
    badge: 'Customizable',
    badgeColor: '#0052CC',
  },
  {
    id: 'stickers',
    name: 'Stickers',
    description: 'Waterproof die-cut vinyl stickers & decals',
    image: require('@/assets/images/custom-stickers.jpg'),
    badge: 'Customizable',
    badgeColor: '#0052CC',
  },
  {
    id: 'tote_bags',
    name: 'Tote Bags',
    description: 'Heavy canvas tote bags with custom prints',
    image: require('@/assets/images/tote-bags.jpg'),
    badge: 'Customizable',
    badgeColor: '#0052CC',
  },
  {
    id: 'calendars',
    name: 'Calendars',
    description: 'Personalized desk & wall calendars',
    image: require('@/assets/images/calendars.jpg'),
    badge: 'Customizable',
    badgeColor: '#0052CC',
  },
  {
    id: 'printing',
    name: 'Printing',
    description: 'General print services & custom promotional items',
    image: require('@/assets/images/custom-mugs.jpeg'),
    badge: 'Customizable',
    badgeColor: '#0052CC',
  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function GridCategoryCard({ item, onPress }: { item: CategoryCardItem; onPress?: () => void }) {
  const iconName = CATEGORY_ICONS[item.id] || 'grid-outline';
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.gridCard, pressed && styles.cardPressed]}>
      {/* Image */}
      <View style={styles.gridImgWrap}>
        <Image
          source={item.image}
          style={styles.gridImg}
          contentFit="cover"
        />
        <View style={styles.catCardIconBadge}>
          <Ionicons name={iconName} size={15} color="#1F2937" />
        </View>
        <View style={[styles.badge, { backgroundColor: item.badgeColor }]}>
          <Text style={styles.badgeText}>{item.badge}</Text>
        </View>
      </View>

      {/* Info */}
      <View style={styles.gridInfo}>
        <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>

        <View style={styles.gridInfoBottom}>
          <Text style={styles.exploreText}>View Category →</Text>
        </View>
      </View>
    </Pressable>
  );
}

function GridServiceCard({ item, onPress }: { item: ServiceItem; onPress?: () => void }) {
  const isMug = item.name.toLowerCase().includes('mug') || item.name.toLowerCase().includes('tumbler');
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
      </View>

      {/* Info */}
      <View style={styles.gridInfo}>
        <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>

        <View style={styles.gridInfoBottom}>
          <Text style={styles.gridPrice}>{item.price}</Text>
          <Pressable
            hitSlop={8}
            onPress={onPress}
            style={({ pressed }) => [styles.cartBtn, pressed && styles.cartBtnPressed]}>
            <Ionicons name="bag-add-outline" size={18} color={BrandColors.primary} />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ServicesScreen() {
  const localParams = useLocalSearchParams<{ category?: string; query?: string }>();
  const globalParams = useGlobalSearchParams<{ category?: string; query?: string }>();
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>('all');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<ServiceItem | null>(null);
  const [quantity, setQuantity] = useState(1);
  const router = useRouter();
  const { t } = useLanguage();

  const activeCategoryParam = localParams.category || globalParams.category;
  const activeQueryParam = localParams.query || globalParams.query;

  useEffect(() => {
    if (activeCategoryParam) {
      const rawCat = activeCategoryParam.toLowerCase().trim();
      let mappedCat: CategoryId = 'all';
      if (rawCat === 'mugs' || rawCat === 'mug') mappedCat = 'mugs';
      else if (rawCat === 'pins' || rawCat === 'pin') mappedCat = 'pins';
      else if (rawCat === 'tshirts' || rawCat === 't-shirt' || rawCat === 'apparel' || rawCat === 'shirt') mappedCat = 'tshirts';
      else if (rawCat === 'stickers' || rawCat === 'sticker') mappedCat = 'stickers';
      else if (rawCat === 'tote_bags' || rawCat === 'totes' || rawCat === 'tote' || rawCat === 'bags' || rawCat === 'bag') mappedCat = 'tote_bags';
      else if (rawCat === 'calendars' || rawCat === 'calendar') mappedCat = 'calendars';
      else if (rawCat === 'printing' || rawCat === 'prints') mappedCat = 'printing';
      else if (CATEGORY_TABS.some((t) => t.id === rawCat as CategoryId)) mappedCat = rawCat as CategoryId;

      setSelectedCategory(mappedCat);
    }
    if (activeQueryParam !== undefined) {
      setQuery(activeQueryParam);
    }
  }, [activeCategoryParam, activeQueryParam]);

  const loadData = async () => {
    try {
      const [apiProducts, apiPrintItems] = await Promise.all([
        fetchProducts(),
        fetchPrintItems(),
      ]);

      const mappedProducts: ServiceItem[] = apiProducts
        .filter((p: ApiProduct) => p.is_customizable !== false) // Filter customizable products only
        .map((p: ApiProduct) => {
          const priceVal = p.base_price ? `₱${p.base_price}` : '₱99.00';
          const vType = p.viewer_type || (p.category === 'mugs' ? 'coffee_cup' : p.category === 'pins' ? 'pin_cloud' : 'shirt');
          
          return {
            id: `prod-${p.id}`,
            name: p.name,
            description: p.short_description || p.description || '',
            price: priceVal,
            stock: p.stock_quantity ?? 30,
            sku: p.sku || '',
            viewerType: vType,
            customizationAddonPrice: p.customization_addon_price,
            maxTextLength: p.max_text_length,
            allowImageUpload: p.allow_image_upload,
            allowCustomText: p.allow_custom_text,
            allowColorChange: p.allow_color_change,
            availableColors: p.available_colors,
            image: getProductImage(p),
            badge: p.badge || (p.stock_quantity !== undefined ? `Stock: ${p.stock_quantity}` : 'Customizable'),
            badgeColor: p.badge ? BrandColors.primary : '#059669',
            featured: true,
            is3D: true,
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
          price: priceVal,
          stock: 50,
          sku: pi.item_code || '',
          viewerType: pi.name.toLowerCase().includes('pin') ? 'pin_cloud' : 'coffee_cup',
          image: getProductImage({ name: pi.name, category: pi.category?.name }),
          badge: pi.category?.name || 'Custom Print',
          badgeColor: '#D97706',
          featured: false,
          is3D: true,
          type: 'print-item',
          category: pi.category?.name,
          paperType: pi.paper_type,
          printSides: pi.print_sides,
          colorMode: pi.color_mode,
          turnaroundTime: pi.turnaround_time,
          minQuantity: pi.min_quantity,
        };
      });

      const combined = [...mappedProducts, ...mappedPrintItems];

      if (combined.length > 0) {
        setServices(combined);
      } else {
        setServices([
          {
            id: '1',
            name: t.prodMug,
            description: t.prodMugDesc,
            price: '₱99.00',
            stock: 30,
            sku: 'MUG-COFFEE',
            viewerType: 'coffee_cup',
            image: require('@/assets/images/custom-mugs.jpeg'),
            badge: 'Customizable',
            badgeColor: BrandColors.primary,
            featured: true,
            is3D: true,
            category: 'mugs',
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
    const vType = (item.viewerType || '').toLowerCase();
    const catLower = (item.category || '').toLowerCase();
    const nameLower = item.name.toLowerCase();

    const isPin = vType.includes('pin') || catLower.includes('pin') || nameLower.includes('pin');
    const isShirt =
      vType.includes('shirt') ||
      catLower.includes('shirt') ||
      catLower.includes('tshirts') ||
      catLower.includes('apparel') ||
      nameLower.includes('shirt') ||
      nameLower.includes('tee');
    const isTote = vType.includes('tote') || catLower.includes('bag') || nameLower.includes('tote');

    const defaultViewerType = isShirt
      ? 'shirt'
      : isPin
      ? 'pin_cloud'
      : isTote
      ? 'tote'
      : 'coffee_cup';

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
        description: item.description || '',
        customization_addon_price: item.customizationAddonPrice !== undefined ? String(item.customizationAddonPrice) : undefined,
        max_text_length: item.maxTextLength !== undefined ? String(item.maxTextLength) : undefined,
      },
    } as any);
  };

  // Category filtering logic
  const filteredServices = services.filter((s) => {
    const itemCategory = getCategoryForItem({ name: s.name, category: s.category });
    const categoryMatch = selectedCategory === 'all' || itemCategory === selectedCategory;
    const searchMatch =
      query.length === 0 ||
      s.name.toLowerCase().includes(query.toLowerCase()) ||
      (s.description && s.description.toLowerCase().includes(query.toLowerCase()));
    return categoryMatch && searchMatch;
  });

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      {/* ── Header + Search ──────────────────────────────────── */}
      <ScreenHeader
        searchValue={query}
        onSearchChange={setQuery}
      />

      {/* ── Category Filter Bar ───────────────────────────────── */}
      <View style={styles.catBarWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catBarScroll}>
          {CATEGORY_TABS.map((tab) => {
            const isSelected = selectedCategory === tab.id;
            return (
              <Pressable
                key={tab.id}
                onPress={() => setSelectedCategory(tab.id)}
                style={({ pressed }) => [
                  styles.catItem,
                  pressed && styles.catItemPressed,
                ]}>
                <View
                  style={[
                    styles.catIconBox,
                    isSelected && styles.catIconBoxActive,
                  ]}>
                  <Ionicons
                    name={tab.icon}
                    size={18}
                    color={isSelected ? BrandColors.primary : '#1F2937'}
                  />
                  {tab.is3D && (
                    <View style={styles.cat3DBadge}>
                      <Text style={styles.cat3DText}>3D</Text>
                    </View>
                  )}
                </View>
                <Text
                  style={[
                    styles.catLabel,
                    isSelected && styles.catLabelActive,
                  ]}
                  numberOfLines={1}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

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
            <Text style={styles.loadingText}>Fetching customizable products...</Text>
          </View>
        ) : (
          <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.gridSection}>
            <View style={styles.categoryHeaderBanner}>
              <View style={styles.categoryBannerTitleGroup}>
                <Ionicons
                  name={CATEGORY_ICONS[selectedCategory] || 'grid-outline'}
                  size={16}
                  color={BrandColors.primary}
                />
                <Text style={styles.categoryBannerTitle}>
                  {CATEGORY_TABS.find((t) => t.id === selectedCategory)?.label || 'All Products'}
                  <Text style={{ fontSize: 13, fontWeight: '500', color: '#6B7280' }}>
                    {' '}({filteredServices.length})
                  </Text>
                </Text>
              </View>
              {selectedCategory !== 'all' && (
                <Pressable
                  onPress={() => { setSelectedCategory('all'); setQuery(''); }}
                  style={styles.backToCatBtn}>
                  <Text style={styles.backToCatText}>Show All</Text>
                </Pressable>
              )}
            </View>

            {filteredServices.length > 0 ? (
              <View style={styles.gridRow}>
                {filteredServices.map((item) => (
                  <GridServiceCard key={item.id} item={item} onPress={() => handlePress(item)} />
                ))}
              </View>
            ) : (
              <View style={styles.emptyWrap}>
                <Ionicons name="search-outline" size={40} color="#D1D5DB" />
                <Text style={styles.emptyText}>
                  No customizable products found in this category.
                </Text>
                <Pressable style={styles.resetFilterBtn} onPress={() => { setSelectedCategory('all'); setQuery(''); }}>
                  <Text style={styles.resetFilterText}>View All Products</Text>
                </Pressable>
              </View>
            )}
          </Animated.View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* ── Product Details Modal ──────────────────────── */}
      {selectedItem && (
        <Modal
          visible={!!selectedItem}
          transparent
          animationType="slide"
          onRequestClose={() => setSelectedItem(null)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              {/* Header */}
              <View style={styles.modalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalCategoryText}>
                    {(selectedItem.category || getCategoryForItem(selectedItem)).toUpperCase()}
                  </Text>
                  <Text style={styles.modalTitle}>{selectedItem.name}</Text>
                </View>
                <Pressable onPress={() => setSelectedItem(null)} style={styles.closeBtn}>
                  <Ionicons name="close" size={20} color="#6B7280" />
                </Pressable>
              </View>

              <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                {/* Product Image */}
                <View style={styles.modalImgWrap}>
                  <Image source={selectedItem.image} style={styles.modalImg} contentFit="cover" />
                  {selectedItem.badge && (
                    <View style={[styles.badge, { backgroundColor: selectedItem.badgeColor || BrandColors.primary }]}>
                      <Text style={styles.badgeText}>{selectedItem.badge}</Text>
                    </View>
                  )}
                </View>

                {/* Price & Description */}
                <View style={styles.modalInfoSection}>
                  <Text style={styles.modalPrice}>{selectedItem.price}</Text>
                  <Text style={styles.modalDesc}>{selectedItem.description}</Text>

                  {/* Specifications */}
                  {(selectedItem.paperType || selectedItem.printSides || selectedItem.colorMode) && (
                    <View style={styles.specBox}>
                      <Text style={styles.specTitle}>Specifications</Text>
                      {selectedItem.paperType && (
                        <View style={styles.specRow}>
                          <Text style={styles.specLabel}>Paper Type:</Text>
                          <Text style={styles.specValue}>{selectedItem.paperType}</Text>
                        </View>
                      )}
                      {selectedItem.printSides && (
                        <View style={styles.specRow}>
                          <Text style={styles.specLabel}>Print Sides:</Text>
                          <Text style={styles.specValue}>{selectedItem.printSides}</Text>
                        </View>
                      )}
                      {selectedItem.colorMode && (
                        <View style={styles.specRow}>
                          <Text style={styles.specLabel}>Color Mode:</Text>
                          <Text style={styles.specValue}>{selectedItem.colorMode}</Text>
                        </View>
                      )}
                      {selectedItem.turnaroundTime && (
                        <View style={styles.specRow}>
                          <Text style={styles.specLabel}>Turnaround:</Text>
                          <Text style={styles.specValue}>{selectedItem.turnaroundTime}</Text>
                        </View>
                      )}
                    </View>
                  )}

                  {/* Quantity selector */}
                  <View style={styles.qtyRow}>
                    <Text style={styles.qtyLabel}>Quantity:</Text>
                    <View style={styles.qtyControls}>
                      <Pressable
                        onPress={() => setQuantity((q) => Math.max(1, q - 1))}
                        style={styles.qtyBtn}>
                        <Ionicons name="remove" size={16} color="#374151" />
                      </Pressable>
                      <Text style={styles.qtyValue}>{quantity}</Text>
                      <Pressable
                        onPress={() => setQuantity((q) => q + 1)}
                        style={styles.qtyBtn}>
                        <Ionicons name="add" size={16} color="#374151" />
                      </Pressable>
                    </View>
                  </View>
                </View>
              </ScrollView>

              {/* Action Buttons */}
              <View style={styles.modalFooter}>
                <Pressable
                  onPress={() => {
                    setSelectedItem(null);
                    alert(`Added ${quantity} x ${selectedItem.name} to order!`);
                  }}
                  style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}>
                  <Ionicons name="cart-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.actionBtnText}>Add to Order</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}
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
  catBarWrap: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingVertical: 8,
  },
  catBarScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  catItem: {
    alignItems: 'center',
    width: 58,
  },
  catItemPressed: {
    opacity: 0.75,
  },
  catIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 3,
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 1 },
      },
      android: { elevation: 1 },
    }),
  },
  catIconBoxActive: {
    borderColor: BrandColors.primary,
    backgroundColor: '#EFF6FF',
  },
  cat3DBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: BrandColors.primary,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 5,
  },
  cat3DText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '800',
    fontFamily: 'Manrope_700Bold',
  },
  catLabel: {
    fontSize: 10,
    color: '#4B5563',
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'center',
  },
  catLabelActive: {
    color: BrandColors.primary,
    fontWeight: '700',
    fontFamily: 'Manrope_700Bold',
  },
  scroll: {
    paddingTop: 16,
    paddingBottom: 24,
  },
  sectionHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    fontFamily: 'Manrope_700Bold',
    marginBottom: 12,
  },
  categoryHeaderBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  categoryBannerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryBannerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    fontFamily: 'Manrope_700Bold',
  },
  backToCatBtn: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  backToCatText: {
    color: BrandColors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  exploreText: {
    fontSize: 12,
    fontWeight: '700',
    color: BrandColors.primary,
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
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...CARD_SHADOW,
  },
  catCardIconBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#FFFFFF',
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 1 },
      },
      android: { elevation: 2 },
    }),
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
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  cardPressed: {
    opacity: 0.85,
  },
  cardName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    fontFamily: 'Manrope_700Bold',
    marginBottom: 2,
  },
  cardDesc: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'Inter_400Regular',
    lineHeight: 16,
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Manrope_700Bold',
  },
  cartBtn: {
    backgroundColor: '#EFF6FF',
    padding: 6,
    borderRadius: 8,
  },
  cartBtnPressed: {
    backgroundColor: '#DBEAFE',
  },

  // ── Empty state ────────────────────────────────────────────
  emptyWrap: {
    alignItems: 'center',
    marginTop: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  resetFilterBtn: {
    backgroundColor: BrandColors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 8,
  },
  resetFilterText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },

  bottomSpacer: {
    height: 16,
  },

  // ── Product Details Modal ──────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalCategoryText: {
    fontSize: 11,
    fontWeight: '700',
    color: BrandColors.primary,
    letterSpacing: 0.5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    fontFamily: 'Manrope_700Bold',
  },
  closeBtn: {
    padding: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
  },
  modalScroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  modalImgWrap: {
    height: 220,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#F9FAFB',
    position: 'relative',
    marginBottom: 16,
  },
  modalImg: {
    width: '100%',
    height: '100%',
  },
  modalInfoSection: {
    gap: 12,
    marginBottom: 20,
  },
  modalPrice: {
    fontSize: 22,
    fontWeight: '800',
    color: BrandColors.primary,
    fontFamily: 'Manrope_700Bold',
  },
  modalDesc: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 22,
    fontFamily: 'Inter_400Regular',
  },
  specBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
    gap: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  specTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 2,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  specLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  specValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  qtyLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  qtyControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  qtyBtn: {
    padding: 6,
  },
  qtyValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    minWidth: 20,
    textAlign: 'center',
  },
  modalFooter: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  actionBtn: {
    backgroundColor: BrandColors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnPressed: {
    opacity: 0.9,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Manrope_700Bold',
  },
});
