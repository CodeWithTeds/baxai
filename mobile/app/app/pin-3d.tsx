import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { BrandColors } from '@/constants/theme';
import { PIN_SHAPES, Pin3DViewer, type PinShape } from '@/components/Pin3DViewer';
import { CartHeaderButton } from '@/components/cart-header-button';
import { useCart } from '@/contexts/cart-context';

export default function Pin3DScreen() {
  const router = useRouter();
  const { addItem } = useCart();
  const params = useLocalSearchParams<{
    name?: string;
    price?: string;
    sku?: string;
    stock?: string;
    viewer_type?: string;
    category?: string;
    description?: string;
    customization_addon_price?: string;
    thumbnail?: string;
    fallback_image?: string;
  }>();

  const name = params.name || 'Button Pins';
  const price = params.price || '₱99.00';
  const sku = params.sku || 'PIN-001';
  const stock = params.stock !== undefined ? params.stock : '30';
  const viewerType = (params.viewer_type || 'pin_cloud').toLowerCase();
  const category = params.category || 'pins';
  const description = params.description || 'Durable metal button pin with soft enamel finish.';

  const rawPriceStr = String(price || '99.00').replace(/[^0-9.]/g, '');
  const basePriceNum = parseFloat(rawPriceStr) || 99.00;
  const rawAddonStr = String(params.customization_addon_price || '0').replace(/[^0-9.]/g, '');
  const addonPriceNum = parseFloat(rawAddonStr) || 0;
  const stockNum = parseInt(String(stock), 10) || 30;

  const initialShape: PinShape = viewerType.includes('cloud')
    ? 'rounded'
    : viewerType.includes('diamond')
    ? 'square'
    : viewerType.includes('star')
    ? 'star'
    : viewerType.includes('heart')
    ? 'heart'
    : 'round';

  const [shape, setShape] = useState<PinShape>(initialShape);
  const [loading, setLoading] = useState(true);

  const active = PIN_SHAPES.find((p) => p.id === shape) ?? PIN_SHAPES[0];

  const handleAddToCart = () => {
    if (stockNum <= 0) {
      Alert.alert('Out of Stock', 'Sorry, this pin is currently out of stock.');
      return;
    }

    const unitPrice = Number((basePriceNum + addonPriceNum).toFixed(2));
    addItem({
      productId: sku || name,
      name,
      category,
      sku: sku || undefined,
      bannerImage: params.thumbnail || params.fallback_image || null,
      viewerType: `pin_${shape}`,
      basePrice: basePriceNum,
      addonPrice: addonPriceNum,
      unitPrice,
      quantity: 1,
      totalPrice: unitPrice,
      selectedSize: active.label,
      customization: {
        placement: active.label,
      },
      stockQuantity: stockNum,
    });

    router.push('/cart');
  };

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color="#111827" />
        </Pressable>
        <Text style={styles.headerTitle}>{name}</Text>
        <CartHeaderButton tintColor="#111827" />
      </View>

      {/* 3D Stage */}
      <View style={styles.stageWrap}>
        <Pin3DViewer shape={shape} height={340} onLoad={() => setLoading(false)} />
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={BrandColors.primary} />
            <Text style={styles.loadingText}>Crafting your pin in 3D…</Text>
          </View>
        )}
        {!loading && (
          <View style={styles.hintPill}>
            <Ionicons name="hand-left-outline" size={14} color="#6B7280" />
            <Text style={styles.hintText}>Drag to rotate • flick to spin</Text>
          </View>
        )}
        <View style={styles.pricePill}>
          <Text style={styles.priceText}>{price}</Text>
        </View>
      </View>

      {/* Choose shape */}
      <View style={styles.catBar}>
        <View style={styles.catBarHeader}>
          <Text style={styles.catBarTitle}>Choose Pin Shape</Text>
          <Text style={styles.catBarCount}>{PIN_SHAPES.length} styles</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catScroll}>
          {PIN_SHAPES.map((p) => {
            const isActive = p.id === shape;
            return (
              <Pressable
                key={p.id}
                onPress={() => {
                  setShape(p.id);
                  setLoading(false);
                }}
                style={({ pressed }) => [
                  styles.shapeCard,
                  isActive && styles.shapeCardActive,
                  pressed && { transform: [{ scale: 0.97 }], opacity: 0.9 },
                ]}>
                <View style={[styles.iconBox, isActive && styles.iconBoxActive]}>
                  <Ionicons name={p.icon as any} size={16} color={isActive ? '#fff' : '#374151'} />
                </View>
                <Text style={[styles.shapeLabel, isActive && styles.shapeLabelActive]}>{p.label}</Text>
                <Text style={styles.shapeMeta}>{p.desc.split('•')[0].trim()}</Text>
                {isActive && (
                  <View style={styles.checkDot}>
                    <Ionicons name="checkmark" size={8} color="#fff" />
                  </View>
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Details */}
      <View style={styles.sheet}>
        <View style={styles.notch} />
        <View style={styles.sheetHeader}>
          <View style={{ flex: 1 }}>
            <View style={styles.badgeRow}>
              <View style={[styles.badge, { backgroundColor: BrandColors.primary }]}>
                <Ionicons name="sparkles" size={10} color="#fff" />
                <Text style={styles.badgeText}>{category.toUpperCase()}</Text>
              </View>
              {sku ? (
                <View style={[styles.badge, { backgroundColor: '#4B5563' }]}>
                  <Text style={styles.badgeText}>SKU: {sku}</Text>
                </View>
              ) : null}
              <View style={[styles.badge, { backgroundColor: Number(stock) > 0 ? '#059669' : '#DC2626' }]}>
                <Text style={styles.badgeText}>Stock: {stock}</Text>
              </View>
            </View>
            <Text style={styles.title}>{name}</Text>
            <Text style={styles.subtitle} numberOfLines={2}>{description}</Text>
          </View>
        </View>

        <Pressable
          onPress={handleAddToCart}
          style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryBtnPressed]}
        >
          <Ionicons name="bag-add-outline" size={22} color="#fff" />
          <Text style={styles.primaryText}>Add to Cart</Text>
          <Text style={styles.primaryPrice}>{price}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F3F4F6' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 52 : 16,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#111827', fontFamily: 'Manrope_700Bold' },
  headerCart: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
  stageWrap: { height: 320, backgroundColor: '#F3F4F6', position: 'relative', overflow: 'hidden' },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(243,244,246,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: { fontSize: 13, color: '#6B7280', fontFamily: 'Inter_400Regular' },
  hintPill: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignItems: 'center',
  },
  hintText: { fontSize: 12, color: '#4B5563' },
  pricePill: {
    position: 'absolute',
    top: 12,
    right: 16,
    backgroundColor: BrandColors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  priceText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  webFallback: { flex: 1, position: 'relative' },
  webImg: { width: '100%', height: '100%' },
  webBadge: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 6,
    backgroundColor: 'rgba(17,24,39,0.85)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    alignItems: 'center',
  },
  webBadgeText: { color: '#fff', fontSize: 11, fontFamily: 'Inter_500Medium' },
  catBar: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginHorizontal: 12,
    marginTop: 10,
    marginBottom: 10,
    borderRadius: 12,
    paddingTop: 8,
    paddingBottom: 8,
    gap: 6,
    overflow: 'hidden',
  },
  catBarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  catBarTitle: { fontSize: 10, fontWeight: '700', color: '#6B7280', fontFamily: 'Manrope_700Bold', letterSpacing: 0.5, textTransform: 'uppercase' },
  catBarCount: { fontSize: 9, color: '#9CA3AF', fontFamily: 'Inter_500Medium', backgroundColor: '#F3F4F6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, overflow: 'hidden' },
  catScroll: { paddingHorizontal: 10, gap: 6, flexDirection: 'row', paddingTop: 4, paddingBottom: 2 },
  shapeCard: {
    width: 62,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderWidth: 1.2,
    borderColor: '#D1D5DB',
    gap: 3,
    position: 'relative',
  },
  shapeCardActive: {
    borderColor: BrandColors.primary,
    borderWidth: 1.5,
    backgroundColor: '#EFF6FF',
  },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxActive: { backgroundColor: BrandColors.primary },
  shapeLabel: { fontSize: 9, fontWeight: '700', color: '#111827', fontFamily: 'Manrope_700Bold', textAlign: 'center' },
  shapeLabelActive: { color: BrandColors.primary },
  shapeMeta: { fontSize: 7, color: '#9CA3AF', fontFamily: 'Inter_400Regular', textAlign: 'center', marginTop: -3 },
  checkDot: {
    position: 'absolute',
    top: 3,
    right: 3,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: BrandColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheet: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    justifyContent: 'space-between',
    elevation: 8,
  },
  notch: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', marginBottom: 12 },
  sheetHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700', fontFamily: 'Manrope_700Bold' },
  title: { fontSize: 18, fontWeight: '800', color: '#111827', fontFamily: 'Manrope_700Bold', marginBottom: 2 },
  subtitle: { fontSize: 12, color: '#6B7280', fontFamily: 'Inter_400Regular', lineHeight: 16 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  priceBlock: { flex: 1 },
  priceLabel: { fontSize: 11, color: '#9CA3AF', fontFamily: 'Inter_400Regular' },
  price: { fontSize: 20, fontWeight: '800', color: BrandColors.primary, fontFamily: 'Manrope_700Bold' },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: BrandColors.primary,
    paddingVertical: 17,
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  primaryBtnPressed: { opacity: 0.88, transform: [{ scale: 0.97 }] },
  primaryText: { color: '#fff', fontWeight: '800', fontSize: 16, fontFamily: 'Manrope_700Bold' },
  primaryPrice: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Inter_600SemiBold',
  },
});
