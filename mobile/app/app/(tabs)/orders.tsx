import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import ScreenHeader from '@/components/screen-header';
import {
  ACTIVE_ORDERS,
  PAST_ORDERS,
  STATUS_CONFIG,
  type Order,
} from '@/constants/orders-data';
import { BrandColors } from '@/constants/theme';

// ─── Order Card ───────────────────────────────────────────────────────────────

function OrderCard({ item, index }: { item: Order; index: number }) {
  const cfg = STATUS_CONFIG[item.status];

  const handlePress = () => {
    router.push(`/order/${item.id}` as any);
  };

  return (
    <Animated.View entering={FadeInDown.delay(index * 80).duration(500)}>
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>

        {/* ── Card header ─────────────────────────────── */}
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.orderNumber}>#{item.orderNumber}</Text>
            <Text style={styles.orderDate}>Placed on {item.placedOn}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
            <Ionicons name={cfg.icon} size={13} color={cfg.color} style={{ marginRight: 4 }} />
            <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
        </View>

        {/* ── Divider ─────────────────────────────────── */}
        <View style={styles.divider} />

        {/* ── Product row ─────────────────────────────── */}
        <View style={styles.productRow}>
          <View style={styles.imgWrap}>
            <Image
              source={item.image}
              style={styles.productImg}
              contentFit="cover"
            />
          </View>
          <View style={styles.productInfo}>
            <Text style={styles.productName} numberOfLines={2}>
              {item.productName}
            </Text>
            <View style={styles.productMeta}>
              <View style={styles.qtyBadge}>
                <Text style={styles.qtyText}>
                  Qty: {item.lineItems.reduce((s, li) => s + li.qty, 0)}
                </Text>
              </View>
              <Text style={styles.totalText}>{item.total}</Text>
            </View>
          </View>
        </View>

        {/* ── Footer actions ──────────────────────────── */}
        <View style={styles.cardFooter}>
          <Pressable
            onPress={handlePress}
            hitSlop={8}
            style={({ pressed }) => [styles.footerBtn, pressed && styles.footerBtnPressed]}>
            <Ionicons name="document-text-outline" size={15} color={BrandColors.primary} />
            <Text style={styles.footerBtnText}>View Details</Text>
          </Pressable>

          {(item.status === 'in_progress' || item.status === 'processing') && (
            <Pressable
              hitSlop={8}
              onPress={handlePress}
              style={({ pressed }) => [
                styles.footerBtn,
                styles.footerBtnSecondary,
                pressed && styles.footerBtnPressed,
              ]}>
              <Ionicons name="location-outline" size={15} color="#6B7280" />
              <Text style={[styles.footerBtnText, { color: '#6B7280' }]}>Track Order</Text>
            </Pressable>
          )}

          {item.status === 'delivered' && (
            <Pressable
              hitSlop={8}
              style={({ pressed }) => [
                styles.footerBtn,
                styles.footerBtnSecondary,
                pressed && styles.footerBtnPressed,
              ]}>
              <Ionicons name="repeat-outline" size={15} color="#6B7280" />
              <Text style={[styles.footerBtnText, { color: '#6B7280' }]}>Reorder</Text>
            </Pressable>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ─── Tab toggle ───────────────────────────────────────────────────────────────

function TabToggle({
  active,
  onChange,
}: {
  active: 'active' | 'past';
  onChange: (v: 'active' | 'past') => void;
}) {
  return (
    <View style={styles.toggleWrap}>
      <Pressable
        onPress={() => onChange('active')}
        style={[styles.toggleTab, active === 'active' && styles.toggleTabActive]}>
        <Text style={[styles.toggleText, active === 'active' && styles.toggleTextActive]}>
          Active Orders
        </Text>
        {ACTIVE_ORDERS.length > 0 && (
          <View style={[styles.toggleCount, active === 'active' && styles.toggleCountActive]}>
            <Text style={[styles.toggleCountText, active === 'active' && styles.toggleCountTextActive]}>
              {ACTIVE_ORDERS.length}
            </Text>
          </View>
        )}
      </Pressable>

      <Pressable
        onPress={() => onChange('past')}
        style={[styles.toggleTab, active === 'past' && styles.toggleTabActive]}>
        <Text style={[styles.toggleText, active === 'past' && styles.toggleTextActive]}>
          Past Orders
        </Text>
      </Pressable>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function OrdersScreen() {
  const [tab, setTab] = useState<'active' | 'past'>('active');
  const orders = tab === 'active' ? ACTIVE_ORDERS : PAST_ORDERS;

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      {/* ── Header + Search ──────────────────────────────────── */}
      <ScreenHeader
        title="My Orders"
        hideSearch
      />

      {/* ── Tab toggle ───────────────────────────────────────── */}
      <View style={styles.toggleContainer}>
        <TabToggle active={tab} onChange={setTab} />
      </View>

      {/* ── Orders list ──────────────────────────────────────── */}
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}>

        {orders.length === 0 ? (
          <Animated.View entering={FadeInDown.duration(400)} style={styles.emptyWrap}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="receipt-outline" size={48} color="#D1D5DB" />
            </View>
            <Text style={styles.emptyTitle}>No orders yet</Text>
            <Text style={styles.emptySubtitle}>
              {tab === 'active'
                ? 'Your active orders will appear here.'
                : 'Your completed orders will appear here.'}
            </Text>
          </Animated.View>
        ) : (
          orders.map((order, i) => (
            <OrderCard key={order.id} item={order} index={i} />
          ))
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
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  android: { elevation: 3 },
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },

  toggleContainer: {
    backgroundColor: '#FFFFFF',
    paddingBottom: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 3 },
      },
      android: { elevation: 3 },
    }),
  },

  toggleWrap: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 4,
    marginBottom: 0,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 4,
  },
  toggleTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 10,
    gap: 6,
  },
  toggleTabActive: {
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
      },
      android: { elevation: 2 },
    }),
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
    fontFamily: 'Inter_600SemiBold',
  },
  toggleTextActive: {
    color: '#111827',
  },
  toggleCount: {
    backgroundColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 1,
  },
  toggleCountActive: {
    backgroundColor: BrandColors.primary,
  },
  toggleCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    fontFamily: 'Manrope_700Bold',
  },
  toggleCountTextActive: {
    color: '#FFFFFF',
  },

  scroll: {
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 24,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    marginBottom: 14,
    overflow: 'hidden',
    ...CARD_SHADOW,
  },
  cardPressed: {
    opacity: 0.92,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    fontFamily: 'Manrope_700Bold',
    marginBottom: 3,
  },
  orderDate: {
    fontSize: 12,
    color: '#9CA3AF',
    fontFamily: 'Inter_400Regular',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Manrope_700Bold',
  },

  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginHorizontal: 16,
  },

  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
  },
  imgWrap: {
    width: 72,
    height: 72,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F9FAFB',
    flexShrink: 0,
  },
  productImg: {
    width: '100%',
    height: '100%',
  },
  productInfo: {
    flex: 1,
    gap: 8,
  },
  productName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    fontFamily: 'Manrope_700Bold',
    lineHeight: 20,
  },
  productMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  qtyBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  qtyText: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'Inter_500Medium',
  },
  totalText: {
    fontSize: 18,
    fontWeight: '800',
    color: BrandColors.primary,
    fontFamily: 'Manrope_700Bold',
  },

  cardFooter: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 14,
    paddingTop: 4,
  },
  footerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  footerBtnSecondary: {
    backgroundColor: '#F3F4F6',
  },
  footerBtnPressed: {
    opacity: 0.7,
  },
  footerBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: BrandColors.primary,
    fontFamily: 'Inter_600SemiBold',
  },

  emptyWrap: {
    alignItems: 'center',
    marginTop: 80,
    gap: 12,
  },
  emptyIconWrap: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#374151',
    fontFamily: 'Manrope_700Bold',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    paddingHorizontal: 32,
  },

  bottomSpacer: {
    height: 16,
  },
});
