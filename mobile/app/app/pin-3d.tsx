import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { BrandColors } from '@/constants/theme';
import { PIN_SHAPES, Pin3DViewer, type PinShape } from '@/components/Pin3DViewer';

export default function Pin3DScreen() {
  const router = useRouter();
  const [shape, setShape] = useState<PinShape>('round');
  const [loading, setLoading] = useState(true);

  const active = PIN_SHAPES.find((p) => p.id === shape) ?? PIN_SHAPES[0];

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color="#111827" />
        </Pressable>
        <Text style={styles.headerTitle}>Button Pin — 3D Preview</Text>
        <Pressable onPress={() => router.push('/(tabs)/services' as any)} style={({ pressed }) => [styles.headerCart, pressed && { opacity: 0.6 }]}>
          <Ionicons name="bag-outline" size={20} color={BrandColors.primary} />
        </Pressable>
      </View>

      {/* 3D Stage */}
      <View style={styles.stageWrap}>
        {Platform.OS === 'web' ? (
          <View style={styles.webFallback}>
            <Image source={require('@/assets/images/button-pins.jpg')} style={styles.webImg} contentFit="cover" />
            <View style={styles.webBadge}>
              <Ionicons name="cube-outline" size={14} color="#fff" />
              <Text style={styles.webBadgeText}>3D — available on native</Text>
            </View>
          </View>
        ) : (
          <>
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
              <Text style={styles.priceText}>{active.price}</Text>
            </View>
          </>
        )}
      </View>

      {/* Choose shape — at bottom below pin */}
      <View style={styles.catBar}>
        <View style={styles.catBarHeader}>
          <Text style={styles.catBarTitle}>Choose shape</Text>
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
                <Text style={styles.badgeText}>{shape.charAt(0).toUpperCase() + shape.slice(1)}</Text>
              </View>
              <View style={styles.stockBadge}>
                <View style={styles.stockDot} />
                <Text style={styles.stockText}>In stock</Text>
              </View>
            </View>
            <Text style={styles.title}>Button Pin — {active.label}</Text>
            <Text style={styles.subtitle}>{active.desc} • Enamel + metal rim</Text>
          </View>
          <Pressable style={({ pressed }) => [styles.wishBtn, pressed && { opacity: 0.7 }]}>
            <Ionicons name="heart-outline" size={20} color="#6B7280" />
          </Pressable>
        </View>

        <View style={styles.legend}>
          <View style={styles.legendDot} />
          <Text style={styles.legendText}>Safety pin back • {active.desc}</Text>
        </View>

        <View style={styles.actions}>
          <View style={styles.priceBlock}>
            <Text style={styles.priceLabel}>Starting at</Text>
            <Text style={styles.price}>{active.price}</Text>
          </View>
          <Pressable style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.9 }]}>
            <Text style={styles.primaryText}>Customize</Text>
            <Ionicons name="color-palette-outline" size={16} color="#fff" />
          </Pressable>
          <Pressable style={({ pressed }) => [styles.cartBtn, pressed && { opacity: 0.85 }]}>
            <Ionicons name="cart-outline" size={18} color={BrandColors.primary} />
          </Pressable>
        </View>
        <Text style={styles.footnote}>Tap a shape above • Drag to rotate</Text>
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
    paddingHorizontal: 12,
    paddingTop: Platform.OS === 'ios' ? 52 : 16,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 15, fontWeight: '700', color: '#111827', fontFamily: 'Manrope_700Bold' },
  headerCart: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
  stageWrap: { height: 340, backgroundColor: '#F3F4F6', position: 'relative', overflow: 'hidden' },
  loadingOverlay: {
    ...StyleSheet.absoluteFill as object,
    backgroundColor: 'rgba(243,244,246,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: { fontSize: 13, color: '#6B7280', fontFamily: 'Inter_400Regular' },
  hintPill: {
    position: 'absolute',
    bottom: 14,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  hintText: { fontSize: 11, color: '#6B7280', fontFamily: 'Inter_500Medium' },
  pricePill: { position: 'absolute', top: 14, left: 14, backgroundColor: '#111827', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  priceText: { color: '#fff', fontSize: 12, fontWeight: '700', fontFamily: 'Manrope_700Bold' },
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
    marginTop: 14,
    marginBottom: 14,
    borderRadius: 12,
    paddingTop: 10,
    paddingBottom: 10,
    gap: 6,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: -2 },
  },
  catBarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    marginBottom: 0,
  },
  catBarTitle: { fontSize: 10, fontWeight: '700', color: '#6B7280', fontFamily: 'Manrope_700Bold', letterSpacing: 0.5, textTransform: 'uppercase' },
  catBarCount: { fontSize: 9, color: '#9CA3AF', fontFamily: 'Inter_500Medium', backgroundColor: '#F3F4F6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, overflow: 'hidden' },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 10, paddingTop: 6 },
  catScroll: { paddingHorizontal: 10, gap: 6, flexDirection: 'row', paddingTop: 6, paddingBottom: 2 },
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
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  iconBoxActive: { backgroundColor: BrandColors.primary, borderColor: BrandColors.primary },
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
    marginTop: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
  },
  notch: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', marginBottom: 14 },
  sheetHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700', fontFamily: 'Manrope_700Bold' },
  stockBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F0FDF4', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  stockDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22C55E' },
  stockText: { color: '#15803D', fontSize: 11, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  title: { fontSize: 18, fontWeight: '800', color: '#111827', fontFamily: 'Manrope_700Bold', marginBottom: 4 },
  subtitle: { fontSize: 12, color: '#6B7280', fontFamily: 'Inter_400Regular', lineHeight: 16 },
  wishBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F9FAFB', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#F3F4F6' },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, backgroundColor: '#F9FAFB', padding: 10, borderRadius: 10 },
  legendDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB' },
  legendText: { fontSize: 11, color: '#6B7280', fontFamily: 'Inter_400Regular', flex: 1 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 18 },
  priceBlock: { flex: 1 },
  priceLabel: { fontSize: 11, color: '#9CA3AF', fontFamily: 'Inter_400Regular' },
  price: { fontSize: 22, fontWeight: '800', color: BrandColors.primary, fontFamily: 'Manrope_700Bold' },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: BrandColors.primary, paddingHorizontal: 20, paddingVertical: 14, borderRadius: 14 },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 14, fontFamily: 'Manrope_700Bold' },
  cartBtn: { width: 46, height: 46, borderRadius: 14, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
  footnote: { marginTop: 12, fontSize: 11, color: '#9CA3AF', textAlign: 'center', fontFamily: 'Inter_400Regular' },
});
