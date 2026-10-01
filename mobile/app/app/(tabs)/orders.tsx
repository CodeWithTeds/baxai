import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useState } from 'react';
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
import {
  STATUS_CONFIG,
  type Order,
  type OrderStatus,
} from '@/constants/orders-data';
import { BrandColors } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useLanguage } from '@/contexts/language-context';
import { ApiOrder, fetchOrders } from '@/utils/api';

// ─── Order Card ───────────────────────────────────────────────────────────────

function OrderCard({ item, index }: { item: ApiOrder | Order; index: number }) {
  const { t } = useLanguage();
  const statusKey = (item.status || 'in_progress') as OrderStatus;
  const cfg = STATUS_CONFIG[statusKey] || STATUS_CONFIG.in_progress;

  const getStatusLabel = () => {
    switch (statusKey) {
      case 'in_progress':
        return t.statusInProgress || 'In Progress';
      case 'processing':
        return t.statusProcessing || 'Processing';
      case 'delivered':
        return t.statusCompleted || 'Delivered';
      case 'cancelled':
        return t.statusCancelled || 'Cancelled';
      default:
        return cfg.label;
    }
  };

  const handlePress = () => {
    router.push(`/order/${item.id}` as any);
  };

  const orderNum = item.orderNumber || (item as any).order_number || String(item.id);
  const placedDate = item.placedOn || (item as any).placed_at || 'Recently';
  const totalDisplay = (item as any).total_formatted || (item as any).total_display || (typeof item.total === 'number' ? `₱${item.total.toFixed(2)}` : String(item.total));

  // Determine line items & total item count
  const lineItems = (item as any).lineItems || (item as any).items || [];
  const totalItemQty = lineItems.length > 0
    ? lineItems.reduce((sum: number, li: any) => sum + (li.quantity || li.qty || 1), 0)
    : 1;

  // Resolve preview image (custom design or banner image or fallback)
  const previewImage = (item as any).image || (lineItems[0]?.banner_image) || (lineItems[0]?.customization?.imageUri);

  return (
    <Animated.View entering={FadeInDown.delay(index * 60).duration(400)}>
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>

        {/* ── Card header ─────────────────────────────── */}
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.orderNumber}>#{orderNum}</Text>
            <Text style={styles.orderDate}>{t.placedOn} {placedDate}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
            <Ionicons name={cfg.icon} size={13} color={cfg.color} style={{ marginRight: 4 }} />
            <Text style={[styles.statusText, { color: cfg.color }]}>{getStatusLabel()}</Text>
          </View>
        </View>

        {/* ── Divider ─────────────────────────────────── */}
        <View style={styles.divider} />

        {/* ── Product row ─────────────────────────────── */}
        <View style={styles.productRow}>
          <View style={styles.imgWrap}>
            {previewImage ? (
              <ExpoImage
                source={{ uri: previewImage }}
                style={styles.productImg}
                contentFit="cover"
              />
            ) : (
              <View style={styles.imgFallback}>
                <Ionicons name="cube" size={28} color="#9CA3AF" />
              </View>
            )}
          </View>
          <View style={styles.productInfo}>
            <Text style={styles.productName} numberOfLines={2}>
              {item.productName || lineItems[0]?.product_name || 'Custom Product'}
            </Text>
            <View style={styles.productMeta}>
              <View style={styles.qtyBadge}>
                <Text style={styles.qtyText}>
                  {t.qtyPrefix || 'Qty'}: {totalItemQty}
                </Text>
              </View>
              <Text style={styles.totalText}>{totalDisplay}</Text>
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
            <Text style={styles.footerBtnText}>{t.viewDetails}</Text>
          </Pressable>

          {(statusKey === 'in_progress' || statusKey === 'processing') && (
            <Pressable
              hitSlop={8}
              onPress={handlePress}
              style={({ pressed }) => [
                styles.footerBtn,
                styles.footerBtnSecondary,
                pressed && styles.footerBtnPressed,
              ]}>
              <Ionicons name="location-outline" size={15} color="#6B7280" />
              <Text style={[styles.footerBtnText, { color: '#6B7280' }]}>{t.trackOrder}</Text>
            </Pressable>
          )}

          {statusKey === 'delivered' && (
            <Pressable
              hitSlop={8}
              onPress={handlePress}
              style={({ pressed }) => [
                styles.footerBtn,
                styles.footerBtnSecondary,
                pressed && styles.footerBtnPressed,
              ]}>
              <Ionicons name="repeat-outline" size={15} color="#6B7280" />
              <Text style={[styles.footerBtnText, { color: '#6B7280' }]}>{t.trackOrder}</Text>
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
  activeCount,
  onChange,
}: {
  active: 'active' | 'past';
  activeCount: number;
  onChange: (v: 'active' | 'past') => void;
}) {
  const { t } = useLanguage();
  return (
    <View style={styles.toggleWrap}>
      <Pressable
        onPress={() => onChange('active')}
        style={[styles.toggleTab, active === 'active' && styles.toggleTabActive]}>
        <Text style={[styles.toggleText, active === 'active' && styles.toggleTextActive]}>
          {t.activeOrders}
        </Text>
        {activeCount > 0 && (
          <View style={[styles.toggleCount, active === 'active' && styles.toggleCountActive]}>
            <Text style={[styles.toggleCountText, active === 'active' && styles.toggleCountTextActive]}>
              {activeCount}
            </Text>
          </View>
        )}
      </Pressable>

      <Pressable
        onPress={() => onChange('past')}
        style={[styles.toggleTab, active === 'past' && styles.toggleTabActive]}>
        <Text style={[styles.toggleText, active === 'past' && styles.toggleTextActive]}>
          {t.pastOrders}
        </Text>
      </Pressable>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function OrdersScreen() {
  const [tab, setTab] = useState<'active' | 'past'>('active');
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();
  const userEmail = user?.email;

  const loadOrders = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await fetchOrders(userEmail);
      if (Array.isArray(data) && data.length > 0) {
        setOrders(data);
      }
    } catch (err) {
      console.warn('[OrdersScreen] Error fetching orders:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userEmail]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const onRefresh = () => {
    loadOrders(true);
  };

  const activeOrders = orders.filter(
    (o) => o.status === 'in_progress' || o.status === 'processing'
  );
  const pastOrders = orders.filter(
    (o) => o.status === 'delivered' || o.status === 'cancelled'
  );

  const displayedOrders = tab === 'active' ? activeOrders : pastOrders;

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      {/* ── Header + Search ──────────────────────────────────── */}
      <ScreenHeader
        title={t.ordersTitle || 'My Orders'}
        hideSearch
      />

      {/* ── Tab toggle ───────────────────────────────────────── */}
      <View style={styles.toggleContainer}>
        <TabToggle
          active={tab}
          activeCount={activeOrders.length}
          onChange={setTab}
        />
      </View>

      {/* ── Orders list ──────────────────────────────────────── */}
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[BrandColors.primary]} />
        }>

        {loading && !refreshing ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={BrandColors.primary} />
            <Text style={styles.loadingText}>Loading dynamic orders…</Text>
          </View>
        ) : displayedOrders.length === 0 ? (
          <Animated.View entering={FadeInDown.duration(400)} style={styles.emptyWrap}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="receipt-outline" size={48} color="#D1D5DB" />
            </View>
            <Text style={styles.emptyTitle}>
              {tab === 'active' ? 'No active orders' : 'No past orders'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {tab === 'active'
                ? 'Orders you place will dynamically update here with live tracking.'
                : 'Your completed or delivered orders will be archived here.'}
            </Text>
            <Pressable
              onPress={() => router.push('/(tabs)/services')}
              style={styles.exploreBtn}>
              <Text style={styles.exploreBtnText}>Browse Customizable Products</Text>
            </Pressable>
          </Animated.View>
        ) : (
          displayedOrders.map((order, i) => (
            <OrderCard key={order.id || order.orderNumber || i} item={order} index={i} />
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
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  productImg: {
    width: '100%',
    height: '100%',
  },
  imgFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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

  loadingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },

  emptyWrap: {
    alignItems: 'center',
    marginTop: 60,
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
    fontSize: 13,
    color: '#9CA3AF',
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 18,
  },
  exploreBtn: {
    marginTop: 12,
    backgroundColor: '#111827',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  exploreBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  bottomSpacer: {
    height: 16,
  },
});
