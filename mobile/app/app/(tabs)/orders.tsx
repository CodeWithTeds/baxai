import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { Image as ExpoImage } from 'expo-image';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import ScreenHeader from '@/components/screen-header';
import {
  STATUS_CONFIG,
  type Order,
  type OrderStatus,
} from '@/constants/orders-data';
import { BrandColors, IconColors } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useLanguage } from '@/contexts/language-context';
import { useOrderNotification } from '@/contexts/order-notification-context';
import CancelOrderModal from '@/components/cancel-order-modal';
import { ApiOrder, apiCancelOrder, fetchOrders } from '@/utils/api';

// ─── Status pill colors ───────────────────────────────────────────────────────

const STATUS_PILL: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  in_progress: { bg: '#EFF6FF', text: '#1D4ED8', dot: '#3B82F6', label: 'In Progress' },
  processing:  { bg: '#FEF3C7', text: '#92400E', dot: '#F59E0B', label: 'Processing'  },
  delivered:   { bg: '#ECFDF5', text: '#065F46', dot: '#10B981', label: 'Delivered'   },
  cancelled:   { bg: '#FEF2F2', text: '#991B1B', dot: '#EF4444', label: 'Cancelled'   },
};

// ─── Order Card ───────────────────────────────────────────────────────────────

function OrderCard({
  item,
  index,
  onCancelPress,
}: {
  item: ApiOrder | Order;
  index: number;
  onCancelPress?: (order: ApiOrder | Order) => void;
}) {
  const { t } = useLanguage();
  const slideAnim = useRef(new Animated.Value(30)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 380,
        delay: index * 70,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 380,
        delay: index * 70,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const statusKey = (item.status || 'in_progress') as OrderStatus;
  const pill = STATUS_PILL[statusKey] || STATUS_PILL.in_progress;

  const [copied, setCopied] = useState(false);

  const handleCopyOrderNum = async () => {
    const numToCopy = item.orderNumber || (item as any).order_number || String(item.id);
    await Clipboard.setStringAsync(String(numToCopy));
    try {
      await Haptics.selectionAsync();
    } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePress = () => router.push(`/order/${item.id}` as any);

  const orderNum   = item.orderNumber || (item as any).order_number || String(item.id);
  const placedDate = item.placedOn    || (item as any).placed_at    || 'Recently';
  const totalDisplay =
    (item as any).total_formatted ||
    (item as any).total_display ||
    (typeof item.total === 'number' ? `₱${item.total.toFixed(2)}` : String(item.total ?? '—'));

  const lineItems    = Array.isArray((item as any).lineItems) ? (item as any).lineItems
                     : Array.isArray((item as any).items)     ? (item as any).items : [];
  const previewImage = (item as any).image || lineItems[0]?.banner_image || lineItems[0]?.customization?.imageUri;
  const productName  = (item as any).productName || lineItems[0]?.product_name || lineItems[0]?.name || 'Custom Product';
  const totalQty     = lineItems.length > 0
    ? lineItems.reduce((s: number, li: any) => s + (li.quantity || li.qty || 1), 0)
    : 1;

  const courierName = (item as any).courierName || (item as any).courier_name;
  const trackingNum = (item as any).trackingNumber || (item as any).tracking_number;
  const discountVal = (item as any).discountTotal || (item as any).discount_total;
  const hasDiscount = (typeof discountVal === 'number' && discountVal > 0) || (item as any).discount_total_formatted;
  const hasProof    = lineItems.some((li: any) => li?.customization?.imageUri || li?.banner_image);

  const handleTrackPress = () => {
    router.push({
      pathname: '/order/[id]',
      params: { id: String(item.id), openTracking: '1' },
    } as any);
  };

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      >
        {/* ── Top strip: order# + status ──────────────────── */}
        <View style={styles.cardTop}>
          <View>
            <Pressable
              onPress={handleCopyOrderNum}
              hitSlop={8}
              style={({ pressed }) => [styles.orderNumCopyRow, pressed && { opacity: 0.6 }]}
            >
              <Text style={styles.orderNumber}>#{orderNum}</Text>
              <Ionicons
                name={copied ? 'checkmark-circle' : 'copy-outline'}
                size={13}
                color={copied ? IconColors.success : IconColors.copy}
                style={{ marginLeft: 5 }}
              />
              {copied && <Text style={[styles.orderCopiedText, { color: IconColors.success }]}>Copied!</Text>}
            </Pressable>
            <Text style={styles.orderDate}>{t.placedOn}  {placedDate}</Text>
          </View>
          <View style={[styles.pill, { backgroundColor: pill.bg }]}>
            <View style={[styles.pillDot, { backgroundColor: pill.dot }]} />
            <Text style={[styles.pillText, { color: pill.text }]}>{pill.label}</Text>
          </View>
        </View>

        {/* ── Product row ──────────────────────────────────── */}
        <View style={styles.productRow}>
          <View style={styles.imgWrap}>
            {previewImage ? (
              <ExpoImage source={{ uri: previewImage }} style={styles.productImg} contentFit="cover" />
            ) : (
              <View style={[styles.imgFallback, { backgroundColor: IconColors.ordersBg }]}>
                <Ionicons name="cube" size={26} color={IconColors.orders} />
              </View>
            )}
          </View>

          <View style={styles.productInfo}>
            <Text style={styles.productName} numberOfLines={2}>{productName}</Text>
            <Text style={styles.productSub}>
              {lineItems.length > 1 ? `${lineItems.length} items` : `Qty: ${totalQty}`}
            </Text>
            <Text style={styles.totalText}>{totalDisplay}</Text>
          </View>

          <Ionicons name="chevron-forward" size={18} color={IconColors.orders} />
        </View>

        {/* ── Order Badges (Courier, Discount, Proof) ──────── */}
        {(courierName || hasDiscount || hasProof) && (
          <View style={styles.cardBadgesRow}>
            {courierName && (
              <View style={styles.courierChip}>
                <Ionicons name="airplane" size={10} color={BrandColors.primary} />
                <Text style={styles.courierChipText} numberOfLines={1}>
                  {courierName}{trackingNum ? ` • ${trackingNum}` : ''}
                </Text>
              </View>
            )}
            {hasDiscount ? (
              <View style={styles.discountChip}>
                <Ionicons name="pricetag" size={10} color="#059669" />
                <Text style={styles.discountChipText}>Discount Applied</Text>
              </View>
            ) : null}
            {hasProof && (
              <View style={styles.proofChip}>
                <Ionicons name="sparkles" size={10} color="#7C3AED" />
                <Text style={styles.proofChipText}>Proof Attached</Text>
              </View>
            )}
          </View>
        )}

        {/* ── Footer CTA row ──────────────────────────────── */}
        <View style={styles.cardFooter}>
          <Pressable
            onPress={handlePress}
            hitSlop={8}
            style={({ pressed }) => [styles.footerBtn, styles.footerBtnDetails, pressed && { opacity: 0.7 }]}
          >
            <Ionicons name="document-text-outline" size={13} color="#475569" />
            <Text style={styles.footerBtnDetailsText}>Details</Text>
          </Pressable>

          {(statusKey === 'in_progress' || statusKey === 'processing') && (
            <>
              {/* Ultra-Modern Live Track Button */}
              <Pressable
                hitSlop={8}
                onPress={handleTrackPress}
                style={({ pressed }) => [styles.footerBtn, styles.footerBtnTrackLive, pressed && { opacity: 0.85 }]}
              >
                <Ionicons name="airplane" size={13} color="#38BDF8" />
                <Text style={styles.footerBtnTrackLiveText}>Live Track</Text>
                <View style={styles.liveTrackBeaconDot} />
              </Pressable>

              {/* Ultra-Modern Cancel Button */}
              <Pressable
                hitSlop={8}
                onPress={() => onCancelPress?.(item)}
                style={({ pressed }) => [styles.footerBtn, styles.footerBtnCancelModern, pressed && { opacity: 0.75 }]}
              >
                <Ionicons name="close-circle-outline" size={13} color="#E11D48" />
                <Text style={styles.footerBtnCancelModernText}>Cancel</Text>
              </Pressable>
            </>
          )}

          {statusKey === 'delivered' && (
            <Pressable
              hitSlop={8}
              onPress={() => router.push('/(tabs)/services')}
              style={({ pressed }) => [styles.footerBtn, styles.footerBtnGray, pressed && { opacity: 0.7 }]}
            >
              <View style={[styles.btnIconBadge, { backgroundColor: IconColors.servicesBg }]}>
                <Ionicons name="repeat" size={12} color={IconColors.services} />
              </View>
              <Text style={[styles.footerBtnText, { color: IconColors.services }]}>Reorder</Text>
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
  pastCount,
  onChange,
}: {
  active: 'active' | 'past';
  activeCount: number;
  pastCount: number;
  onChange: (v: 'active' | 'past') => void;
}) {
  const { t } = useLanguage();
  return (
    <View style={styles.toggleWrap}>
      {(['active', 'past'] as const).map((tab) => {
        const isActive = active === tab;
        const count    = tab === 'active' ? activeCount : pastCount;
        return (
          <Pressable
            key={tab}
            onPress={() => onChange(tab)}
            style={[styles.toggleTab, isActive && styles.toggleTabActive]}
          >
            <Text style={[styles.toggleText, isActive && styles.toggleTextActive]}>
              {tab === 'active' ? t.activeOrders : t.pastOrders}
            </Text>
            {count > 0 && (
              <View style={[styles.toggleBadge, isActive && styles.toggleBadgeActive]}>
                <Text style={[styles.toggleBadgeText, isActive && styles.toggleBadgeTextActive]}>
                  {count}
                </Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function OrdersScreen() {
  const [tab, setTab]         = useState<'active' | 'past'>('active');
  const [orders, setOrders]   = useState<ApiOrder[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user }  = useAuth();
  const { t }     = useLanguage();
  const { showPushBanner, checkNow } = useOrderNotification();
  const [cancelModalOrder, setCancelModalOrder] = useState<ApiOrder | Order | null>(null);
  const userEmail = user?.email;

  const loadOrders = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await fetchOrders(userEmail);
      if (Array.isArray(data) && data.length > 0) setOrders(data);
    } catch (err) {
      console.warn('[OrdersScreen] Error fetching orders:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userEmail]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  const handleConfirmCancel = async (reason: string) => {
    if (!cancelModalOrder) return;
    const targetOrder = cancelModalOrder;
    const orderNum = targetOrder.orderNumber || (targetOrder as any).order_number || String(targetOrder.id);
    try {
      const res = await apiCancelOrder(targetOrder.id, reason);
      if (res.success) {
        if (Platform.OS !== 'web') {
          try {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch {}
        }
        setOrders(prev =>
          prev.map(o => (o.id === targetOrder.id ? { ...o, status: 'cancelled' as any, can_cancel: false } : o))
        );
        setCancelModalOrder(null);
        showPushBanner({
          orderId: targetOrder.id,
          orderNumber: String(orderNum),
          title: `Order #${orderNum} Cancelled`,
          message: `Reason: ${reason}`,
          status: 'cancelled',
        });
        await checkNow();
      } else {
        Alert.alert('Unable to Cancel', res.message || 'Please contact customer support.');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not complete cancellation.');
    }
  };

  const activeOrders = orders.filter(o => o.status === 'in_progress' || o.status === 'processing');
  const pastOrders   = orders.filter(o => o.status === 'delivered'   || o.status === 'cancelled');
  const displayed    = tab === 'active' ? activeOrders : pastOrders;

  const filteredOrders = displayed.filter((o) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const orderNum = (o.orderNumber || (o as any).order_number || String(o.id)).toLowerCase();
    const prodName = (o.productName || (o as any).product_name || (o as any).name || '').toLowerCase();
    return orderNum.includes(q) || prodName.includes(q);
  });

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      <ScreenHeader
        title={t.ordersTitle || 'My Orders'}
        searchPlaceholder="Search order # or product..."
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* ── Tab toggle ─────────────────────────────────── */}
      <View style={styles.toggleContainer}>
        <TabToggle
          active={tab}
          activeCount={activeOrders.length}
          pastCount={pastOrders.length}
          onChange={setTab}
        />
      </View>

      {/* ── List ──────────────────────────────────────── */}
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadOrders(true)} tintColor={BrandColors.primary} colors={[BrandColors.primary]} />
        }
      >
        {loading && !refreshing ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={BrandColors.primary} />
            <Text style={styles.loadingText}>Loading orders…</Text>
          </View>
        ) : filteredOrders.length === 0 ? (
          <View style={styles.emptyWrap}>
            <View style={[
              styles.emptyIconCircle,
              {
                backgroundColor: searchQuery
                  ? IconColors.searchBg
                  : tab === 'active'
                  ? IconColors.cartBg
                  : IconColors.aiBg,
              }
            ]}>
              <Ionicons
                name={searchQuery ? 'search' : tab === 'active' ? 'bag-handle' : 'archive'}
                size={38}
                color={searchQuery ? IconColors.search : tab === 'active' ? IconColors.cart : IconColors.ai}
              />
            </View>
            <Text style={styles.emptyTitle}>
              {searchQuery ? 'No matching orders' : tab === 'active' ? 'No active orders' : 'No past orders'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery
                ? `No orders matching "${searchQuery}". Check the order number or clear your search.`
                : tab === 'active'
                ? 'Your active orders will appear here with live status updates.'
                : 'Completed and cancelled orders are archived here.'}
            </Text>
            {searchQuery ? (
              <Pressable
                onPress={() => setSearchQuery('')}
                style={({ pressed }) => [styles.exploreBtn, { backgroundColor: IconColors.danger }, pressed && { opacity: 0.85 }]}
              >
                <Ionicons name="close-circle" size={16} color="#fff" />
                <Text style={styles.exploreBtnText}>Clear Search</Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={() => router.push('/(tabs)/services')}
                style={({ pressed }) => [styles.exploreBtn, { backgroundColor: IconColors.home }, pressed && { opacity: 0.85 }]}
              >
                <Ionicons name="sparkles" size={16} color="#fff" />
                <Text style={styles.exploreBtnText}>Browse Products</Text>
              </Pressable>
            )}
          </View>
        ) : (
          filteredOrders.map((order, i) => (
            <OrderCard
              key={String(order.id || order.orderNumber || i)}
              item={order}
              index={i}
              onCancelPress={(target) => setCancelModalOrder(target)}
            />
          ))
        )}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      <CancelOrderModal
        visible={Boolean(cancelModalOrder)}
        orderNumber={
          cancelModalOrder
            ? String(cancelModalOrder.orderNumber || (cancelModalOrder as any).order_number || cancelModalOrder.id)
            : ''
        }
        onClose={() => setCancelModalOrder(null)}
        onConfirmCancel={handleConfirmCancel}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const SHADOW = Platform.select({
  ios:     { shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  android: { elevation: 3 },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F3F4F6' },

  // Tab toggle
  toggleContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: 4,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 3 } },
      android: { elevation: 3 },
    }),
  },
  toggleWrap: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    padding: 4,
  },
  toggleTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 11,
    gap: 6,
  },
  toggleTabActive: {
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 2 },
    }),
  },
  toggleText: { fontSize: 13, fontWeight: '600', color: '#9CA3AF', fontFamily: 'Inter_600SemiBold' },
  toggleTextActive: { color: '#111827' },
  toggleBadge: {
    backgroundColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 1,
  },
  toggleBadgeActive: { backgroundColor: BrandColors.primary },
  toggleBadgeText: { fontSize: 11, fontWeight: '700', color: '#6B7280', fontFamily: 'Manrope_700Bold' },
  toggleBadgeTextActive: { color: '#FFFFFF' },

  scroll: { paddingTop: 16, paddingHorizontal: 16, paddingBottom: 24 },

  // Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginBottom: 14,
    overflow: 'hidden',
    ...SHADOW,
  },
  cardPressed: { opacity: 0.94, transform: [{ scale: 0.985 }] },

  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F3F4F6',
  },
  orderNumber: { fontSize: 17, fontWeight: '800', color: '#111827', fontFamily: 'Manrope_700Bold' },
  orderNumCopyRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderCopiedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
    marginLeft: 4,
    fontFamily: 'Manrope_700Bold',
  },
  orderDate:   { fontSize: 12, color: '#9CA3AF', fontFamily: 'Inter_400Regular', marginTop: 2 },

  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  pillDot: { width: 6, height: 6, borderRadius: 3 },
  pillText: { fontSize: 12, fontWeight: '700', fontFamily: 'Manrope_700Bold' },

  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
  },
  imgWrap: {
    width: 76,
    height: 76,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#F9FAFB',
    flexShrink: 0,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
  },
  productImg:    { width: '100%', height: '100%' },
  imgFallback:   { flex: 1, alignItems: 'center', justifyContent: 'center' },
  productInfo:   { flex: 1, gap: 4 },
  productName:   { fontSize: 14, fontWeight: '700', color: '#111827', fontFamily: 'Manrope_700Bold', lineHeight: 20 },
  productSub:    { fontSize: 12, color: '#9CA3AF', fontFamily: 'Inter_400Regular' },
  totalText:     { fontSize: 19, fontWeight: '900', color: BrandColors.primary, fontFamily: 'Manrope_700Bold' },

  cardBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  courierChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    maxWidth: '100%',
  },
  courierChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: BrandColors.primary,
    fontFamily: 'Inter_600SemiBold',
  },
  discountChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  discountChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
    fontFamily: 'Inter_600SemiBold',
  },
  proofChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  proofChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#7C3AED',
    fontFamily: 'Inter_600SemiBold',
  },

  cardFooter: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 14,
    paddingTop: 2,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#F3F4F6',
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
  footerBtnGray: { backgroundColor: '#F3F4F6' },
  footerBtnText: { fontSize: 12, fontWeight: '600', color: BrandColors.primary, fontFamily: 'Inter_600SemiBold' },
  footerBtnDetails: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  footerBtnDetailsText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    fontFamily: 'Inter_600SemiBold',
  },
  footerBtnTrackLive: {
    backgroundColor: '#0F172A',
  },
  footerBtnTrackLiveText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Manrope_700Bold',
  },
  liveTrackBeaconDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginLeft: 2,
  },
  footerBtnCancelModern: {
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  footerBtnCancelModernText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E11D48',
    fontFamily: 'Inter_600SemiBold',
  },

  btnIconBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 2,
  },

  // Loading / empty
  loadingWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80, gap: 14 },
  loadingText: { fontSize: 13, color: '#6B7280', fontFamily: 'Inter_400Regular' },

  emptyWrap: {
    alignItems: 'center',
    marginTop: 48,
    paddingHorizontal: 32,
    gap: 10,
  },
  emptyIconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
      android: { elevation: 2 },
    }),
  },
  emptyTitle:    { fontSize: 19, fontWeight: '800', color: '#1F2937', fontFamily: 'Manrope_700Bold', textAlign: 'center' },
  emptySubtitle: { fontSize: 13, color: '#6B7280', fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 19 },
  exploreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    backgroundColor: '#111827',
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: 14,
  },
  exploreBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', fontFamily: 'Manrope_700Bold' },

  bottomSpacer: { height: 20 },
});
