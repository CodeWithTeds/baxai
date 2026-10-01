import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  ALL_ORDERS,
  STATUS_CONFIG,
  type Order,
  type OrderStatus,
  type TrackingStep,
} from '@/constants/orders-data';
import { BrandColors, IconColors } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useLanguage } from '@/contexts/language-context';
import { ApiOrder, fetchOrderDetails } from '@/utils/api';

// ─── Tracking timeline ────────────────────────────────────────────────────────

function Timeline({ steps }: { steps: TrackingStep[] }) {
  if (!steps || steps.length === 0) return null;

  return (
    <View style={tl.wrap}>
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1;
        return (
          <View key={i} style={tl.row}>
            {/* Left column: dot + connector */}
            <View style={tl.leftCol}>
              {/* Connector above */}
              {i > 0 && (
                <View
                  style={[
                    tl.connector,
                    steps[i - 1].state !== 'pending' ? tl.connectorDone : tl.connectorPending,
                  ]}
                />
              )}

              {/* Dot */}
              {step.state === 'done' && (
                <View style={[tl.dot, tl.dotDone]}>
                  <Ionicons name="checkmark" size={12} color="#fff" />
                </View>
              )}
              {step.state === 'active' && (
                <View style={[tl.dot, tl.dotActive]}>
                  <View style={tl.dotActiveInner} />
                </View>
              )}
              {step.state === 'pending' && (
                <View style={[tl.dot, tl.dotPending]} />
              )}

              {/* Connector below */}
              {!isLast && (
                <View
                  style={[
                    tl.connector,
                    step.state === 'done' ? tl.connectorDone : tl.connectorPending,
                  ]}
                />
              )}
            </View>

            {/* Right column: text */}
            <View style={tl.textCol}>
              <Text
                style={[
                  tl.stepLabel,
                  step.state === 'active' && tl.stepLabelActive,
                  step.state === 'pending' && tl.stepLabelPending,
                ]}>
                {step.label}
              </Text>
              {Boolean(step.subtitle && step.subtitle.length > 0) && (
                <Text
                  style={[
                    tl.stepSub,
                    step.state === 'active' && tl.stepSubActive,
                  ]}>
                  {step.subtitle}
                </Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ─── Dynamic Line item row ────────────────────────────────────────────────────

function DynamicLineItemRow({ item }: { item: any }) {
  const previewUri = item.banner_image || item.image || item.customization?.imageUri;
  const unitPriceFormatted = item.price || (item.unit_price ? `₱${Number(item.unit_price).toFixed(2)}` : '₱0.00');
  const totalPriceFormatted = item.total || (item.total_price ? `₱${Number(item.total_price).toFixed(2)}` : unitPriceFormatted);
  const qty = item.quantity || item.qty || 1;

  const customization = item.customization || {};

  return (
    <View style={li.row}>
      <View style={li.imgWrap}>
        {previewUri ? (
          <Image source={{ uri: previewUri }} style={li.img} resizeMode="cover" />
        ) : (
          <View style={li.fallbackImg}>
            <Ionicons name="cube" size={28} color="#9CA3AF" />
          </View>
        )}
      </View>
      <View style={li.info}>
        <Text style={li.name}>{item.name || item.product_name || 'Custom Product'}</Text>
        {item.sku ? <Text style={li.sku}>SKU: {item.sku}</Text> : null}

        {/* Customization Chips */}
        <View style={li.chipsRow}>
          {item.selected_color && (
            <View style={li.chip}>
              <View style={[li.colorDot, { backgroundColor: item.selected_color }]} />
              <Text style={li.chipText}>{item.selected_color_name || item.selected_color}</Text>
            </View>
          )}

          {item.selected_size && (
            <View style={li.chip}>
              <Text style={li.chipText}>{item.selected_size}</Text>
            </View>
          )}

          {customization.placement && (
            <View style={li.chip}>
              <Text style={li.chipText}>Placement: {customization.placement}</Text>
            </View>
          )}

          {customization.text ? (
            <View style={[li.chip, li.customTextChip]}>
              <Ionicons name="text" size={10} color={BrandColors.primary} />
              <Text style={[li.chipText, { color: BrandColors.primary }]} numberOfLines={1}>
                {`"${customization.text}"`}
              </Text>
            </View>
          ) : null}

          {customization.imageUri ? (
            <View style={[li.chip, li.artworkChip]}>
              <Ionicons name="image-outline" size={10} color="#7C3AED" />
              <Text style={[li.chipText, { color: '#7C3AED' }]}>Custom Artwork</Text>
            </View>
          ) : null}
        </View>

        <View style={li.bottom}>
          <Text style={li.price}>{totalPriceFormatted}</Text>
          <View style={li.qtyBadge}>
            <Text style={li.qtyText}>Qty: {qty}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useLanguage();
  const { user } = useAuth();

  const [order, setOrder] = useState<ApiOrder | Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const handleCopyOrderNumber = async () => {
    if (!order) return;
    const orderNum = order.orderNumber || (order as any).order_number || order.id;
    await Clipboard.setStringAsync(String(orderNum));
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    let isMounted = true;

    async function loadOrder() {
      if (!id) return;
      setLoading(true);

      const cleanId = String(id).trim().replace(/^#/, '');
      const lower = cleanId.toLowerCase();

      // Check fallback first for immediate responsiveness
      const fallback = ALL_ORDERS.find((o) =>
        o.id === cleanId ||
        o.orderNumber.toLowerCase() === lower ||
        o.orderNumber.toLowerCase() === `rd-${lower}`
      );
      if (fallback && isMounted) {
        setOrder(fallback);
      }

      // Fetch dynamic order from backend API
      try {
        const dynamicOrder = await fetchOrderDetails(cleanId, user?.email);
        if (dynamicOrder && isMounted) {
          setOrder(dynamicOrder);
        }
      } catch (err) {
        console.warn('[OrderDetailScreen] fetchOrderDetails error:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadOrder();

    return () => {
      isMounted = false;
    };
  }, [id, user?.email]);

  const handleShare = async () => {
    if (!order) return;
    const orderNum = order.orderNumber || (order as any).order_number || order.id;
    try {
      await Share.share({
        message: `Placides Order #${orderNum} - Status: ${order.status.toUpperCase()} (Total: ${(order as any).total_formatted || order.total})`,
      });
    } catch {}
  };

  const handleTrackOrderAlert = () => {
    if (!order) return;
    const orderNum = order.orderNumber || (order as any).order_number || order.id;
    Alert.alert(
      'Live Tracking 🚚',
      `Order #${orderNum} is scheduled for delivery on ${(order as any).expectedDelivery || (order as any).expected_delivery || '3 business days'}. Production and packing are progressing on schedule.`,
      [{ text: 'Got it' }]
    );
  };

  if (!order && !loading) {
    return (
      <SafeAreaView style={styles.notFound}>
        <Ionicons name="receipt-outline" size={48} color="#D1D5DB" />
        <Text style={styles.notFoundText}>Order not found</Text>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>{t.back || 'Go Back'}</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={styles.notFound}>
        <ActivityIndicator size="large" color={BrandColors.primary} />
        <Text style={styles.loadingText}>Fetching order details…</Text>
      </SafeAreaView>
    );
  }

  const statusKey = (order.status || 'in_progress') as OrderStatus;
  const cfg = STATUS_CONFIG[statusKey] || STATUS_CONFIG.in_progress;
  const orderNum = order.orderNumber || (order as any).order_number || order.id;
  const placedDate = order.placedOn || (order as any).placed_at || 'Recently';
  const expectedDelivery = (order as any).expectedDelivery || (order as any).expected_delivery || '3–5 business days';

  const lineItems: any[] = Array.isArray((order as any).lineItems)
    ? (order as any).lineItems
    : Array.isArray((order as any).items)
    ? (order as any).items
    : [];
  const trackingSteps: any[] = Array.isArray((order as any).trackingSteps)
    ? (order as any).trackingSteps
    : Array.isArray((order as any).tracking_steps)
    ? (order as any).tracking_steps
    : [];

  const subtotalFormatted = (order as any).subtotal_formatted || (typeof (order as any).subtotal === 'number' ? `₱${(order as any).subtotal.toFixed(2)}` : String((order as any).subtotal ?? '₱0.00'));
  const shippingFormatted = (order as any).shipping_fee_formatted || (order as any).delivery || 'Free';
  const totalFormatted = (order as any).total_formatted || (order as any).total_display || (typeof order.total === 'number' ? `₱${order.total.toFixed(2)}` : String(order.total));
  const customizationFeeFormatted = (order as any).customization_total_formatted || ((order as any).customization_total > 0 ? `+₱${Number((order as any).customization_total).toFixed(2)}` : null);

  const shippingAddress = (order as any).shipping_address;

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      {/* ── Top bar ──────────────────────────────────────────── */}
      <SafeAreaView edges={['top']} style={styles.topSafe}>
        <View style={styles.topBar}>
          <Pressable
            hitSlop={12}
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backIconBtn, pressed && { opacity: 0.6 }]}>
            <Ionicons name="chevron-back" size={22} color={BrandColors.primary} />
          </Pressable>
          <Text style={styles.topBarTitle}>{t.orderDetails || 'Order Details'}</Text>
          <Pressable hitSlop={12} onPress={handleShare} style={styles.shareBtn}>
            <Ionicons name="share-outline" size={20} color={IconColors.share} />
          </Pressable>
        </View>
      </SafeAreaView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}>

        {/* ── Order number + date ──────────────────────────────── */}
        <View style={styles.heroSection}>
          <Text style={styles.heroLabel}>{(t.orderNumberPrefix || 'ORDER').toUpperCase()}</Text>
          <Pressable
            onPress={handleCopyOrderNumber}
            hitSlop={10}
            style={({ pressed }) => [styles.copyOrderNumBtn, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.heroNumber}>#{orderNum}</Text>
            <View style={[styles.copyPill, copied && styles.copyPillSuccess]}>
              <Ionicons
                name={copied ? 'checkmark' : 'copy-outline'}
                size={13}
                color={copied ? IconColors.success : IconColors.copy}
              />
              <Text style={[styles.copyPillText, copied && styles.copyPillTextSuccess]}>
                {copied ? 'Copied!' : 'Copy'}
              </Text>
            </View>
          </Pressable>
          <View style={styles.heroBadgeRow}>
            <Ionicons name="calendar" size={13} color={IconColors.services} />
            <Text style={styles.heroDate}>{t.placedOn || 'Placed on'} {placedDate}</Text>
          </View>
        </View>

        {/* ── Delivery + status card ───────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.deliveryRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.deliveryLabel}>{t.estimatedDelivery || 'Estimated Delivery'}</Text>
              <Text style={styles.deliveryDate}>{expectedDelivery}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
              <Ionicons name={cfg.icon} size={13} color={cfg.color} style={{ marginRight: 4 }} />
              <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
            </View>
          </View>

          <View style={styles.cardDivider} />

          {/* Tracking timeline */}
          <Timeline steps={trackingSteps} />
        </View>

        {/* ── Items in order ───────────────────────────────────── */}
        <View>
          <Text style={styles.sectionTitle}>
            {t.itemsOrdered || 'Items in Order'}{lineItems.length > 0 ? ` (${lineItems.length})` : ''}
          </Text>

          <View style={styles.card}>
            {lineItems.length > 0 ? (
              lineItems.map((item: any, i: number) => (
                <View key={item.id || i}>
                  <DynamicLineItemRow item={item} />
                  {i < lineItems.length - 1 && <View style={styles.cardDivider} />}
                </View>
              ))
            ) : (
              <View style={styles.noItemsRow}>
                <Ionicons name="cube" size={28} color={IconColors.orders} />
                <Text style={styles.noItemsText}>Item details will appear once synced.</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Shipping Address (if dynamic) ────────────────────── */}
        {shippingAddress && (
          <View>
            <Text style={styles.sectionTitle}>Delivery Details</Text>
            <View style={styles.card}>
              <View style={styles.addressWrap}>
                <View style={[styles.addressIconCircle, { backgroundColor: IconColors.cartBg }]}>
                  <Ionicons name="location" size={18} color={IconColors.cart} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.addressRecipient}>{shippingAddress.recipient || (order as any).customer_name || 'Customer'}</Text>
                  <Text style={styles.addressLine}>{shippingAddress.address || 'Standard Delivery'}</Text>
                  {shippingAddress.city ? <Text style={styles.addressLine}>{shippingAddress.city}, {shippingAddress.postal_code}</Text> : null}
                  <Text style={styles.paymentMethodTag}>
                    Payment: {(order as any).payment_method || 'Cash on Delivery'} ({(order as any).payment_status || 'Pending'})
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* ── Price summary ────────────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t.subtotal || 'Subtotal'}</Text>
            <Text style={styles.summaryValue}>{subtotalFormatted}</Text>
          </View>

          {customizationFeeFormatted && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Customization Fees</Text>
              <Text style={[styles.summaryValue, { color: '#059669' }]}>{customizationFeeFormatted}</Text>
            </View>
          )}

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t.shippingFee || 'Delivery'}</Text>
            <Text style={[styles.summaryValue, shippingFormatted === 'Free' && styles.summaryFree]}>
              {shippingFormatted}
            </Text>
          </View>
          <View style={styles.cardDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>{t.total || 'Total'}</Text>
            <Text style={styles.totalValue}>{totalFormatted}</Text>
          </View>
        </View>

        {/* ── Actions ──────────────────────────────────────────── */}
        <View style={styles.actions}>
          {(statusKey === 'in_progress' || statusKey === 'processing') && (
            <Pressable
              onPress={handleTrackOrderAlert}
              style={({ pressed }) => [styles.actionBtnPrimary, pressed && { opacity: 0.8 }]}>
              <Ionicons name="location" size={18} color="#fff" />
              <Text style={styles.actionBtnPrimaryText}>{t.trackOrder || 'Track Order'}</Text>
            </Pressable>
          )}

          {statusKey === 'delivered' && (
            <Pressable
              onPress={() => router.push('/(tabs)/services')}
              style={({ pressed }) => [styles.actionBtnPrimary, pressed && { opacity: 0.8 }]}>
              <Ionicons name="repeat" size={18} color="#fff" />
              <Text style={styles.actionBtnPrimaryText}>Reorder / Customize Again</Text>
            </Pressable>
          )}

          <Pressable
            onPress={() => router.push('/(tabs)/ai-hub')}
            style={({ pressed }) => [styles.actionBtnSecondary, pressed && { opacity: 0.7 }]}>
            <Ionicons name="sparkles" size={18} color={IconColors.ai} />
            <Text style={[styles.actionBtnSecondaryText, { color: IconColors.ai }]}>{t.qaTalkAgent || 'Chat with AI Support'}</Text>
          </Pressable>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

// ─── Timeline styles ──────────────────────────────────────────────────────────

const CONNECTOR_H = 24;

const tl = StyleSheet.create({
  wrap: {
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  leftCol: {
    width: 28,
    alignItems: 'center',
  },
  connector: {
    width: 2,
    height: CONNECTOR_H,
    borderRadius: 1,
  },
  connectorDone: {
    backgroundColor: BrandColors.primary,
  },
  connectorPending: {
    backgroundColor: '#E5E7EB',
  },
  dot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotDone: {
    backgroundColor: BrandColors.primary,
  },
  dotActive: {
    backgroundColor: '#fff',
    borderWidth: 2.5,
    borderColor: BrandColors.primary,
  },
  dotActiveInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: BrandColors.primary,
  },
  dotPending: {
    backgroundColor: '#F3F4F6',
    borderWidth: 2,
    borderColor: '#D1D5DB',
  },
  textCol: {
    flex: 1,
    paddingLeft: 14,
    paddingBottom: 4,
    justifyContent: 'center',
    minHeight: 26,
  },
  stepLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    fontFamily: 'Manrope_700Bold',
  },
  stepLabelActive: {
    color: BrandColors.primary,
  },
  stepLabelPending: {
    color: '#9CA3AF',
    fontWeight: '500',
  },
  stepSub: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  stepSubActive: {
    color: '#6B7280',
  },
});

// ─── Line item styles ─────────────────────────────────────────────────────────

const li = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  imgWrap: {
    width: 72,
    height: 72,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
    flexShrink: 0,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  img: {
    width: '100%',
    height: '100%',
  },
  fallbackImg: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    gap: 4,
    justifyContent: 'center',
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    fontFamily: 'Manrope_700Bold',
  },
  sku: {
    fontSize: 11,
    color: '#6B7280',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 3,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  customTextChip: {
    backgroundColor: '#EFF6FF',
    borderWidth: 0.5,
    borderColor: '#BFDBFE',
  },
  artworkChip: {
    backgroundColor: '#F5F3FF',
    borderWidth: 0.5,
    borderColor: '#DDD6FE',
  },
  colorDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  chipText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#374151',
  },
  bottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  price: {
    fontSize: 16,
    fontWeight: '800',
    color: BrandColors.primary,
    fontFamily: 'Manrope_700Bold',
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
});

// ─── Screen styles ────────────────────────────────────────────────────────────

const CARD_SHADOW = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  android: { elevation: 2 },
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },

  topSafe: {
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
      },
      android: { elevation: 3 },
    }),
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    fontFamily: 'Manrope_700Bold',
  },
  shareBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  scroll: {
    paddingBottom: 32,
  },

  heroSection: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  heroLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
    letterSpacing: 1.2,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 4,
  },
  heroNumber: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    fontFamily: 'Manrope_700Bold',
  },
  copyOrderNumBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
    marginTop: 2,
  },
  copyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#BFDBFE',
  },
  copyPillSuccess: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  copyPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: BrandColors.primary,
    fontFamily: 'Manrope_700Bold',
  },
  copyPillTextSuccess: {
    color: '#059669',
  },
  heroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  heroDate: {
    fontSize: 13,
    color: '#6B7280',
    fontFamily: 'Inter_400Regular',
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    marginHorizontal: 16,
    marginTop: 16,
    overflow: 'hidden',
    ...CARD_SHADOW,
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginHorizontal: 16,
  },

  deliveryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  deliveryLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    fontFamily: 'Inter_400Regular',
    marginBottom: 3,
  },
  deliveryDate: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    fontFamily: 'Manrope_700Bold',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Manrope_700Bold',
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    fontFamily: 'Manrope_700Bold',
    marginTop: 22,
    marginBottom: 0,
    marginHorizontal: 16,
  },

  addressWrap: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    alignItems: 'flex-start',
  },
  addressIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressRecipient: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  addressLine: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  paymentMethodTag: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '600',
    marginTop: 6,
  },

  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: 'Inter_400Regular',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    fontFamily: 'Inter_600SemiBold',
  },
  summaryFree: {
    color: '#059669',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    fontFamily: 'Manrope_700Bold',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '800',
    color: BrandColors.primary,
    fontFamily: 'Manrope_700Bold',
  },

  actions: {
    paddingHorizontal: 16,
    marginTop: 20,
    gap: 10,
  },
  actionBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: BrandColors.primary,
    paddingVertical: 15,
    borderRadius: 14,
  },
  actionBtnPrimaryText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Manrope_700Bold',
  },
  actionBtnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#EFF6FF',
    paddingVertical: 15,
    borderRadius: 14,
  },
  actionBtnSecondaryText: {
    fontSize: 15,
    fontWeight: '700',
    color: BrandColors.primary,
    fontFamily: 'Manrope_700Bold',
  },

  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#F3F4F6',
  },
  notFoundText: {
    fontSize: 16,
    color: '#6B7280',
    fontFamily: 'Inter_400Regular',
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
  },
  backBtn: {
    backgroundColor: BrandColors.primary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 12,
  },
  backBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontFamily: 'Manrope_700Bold',
  },

  bottomSpacer: {
    height: 24,
  },

  noItemsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  noItemsText: {
    fontSize: 13,
    color: '#9CA3AF',
    fontFamily: 'Inter_400Regular',
  },
});
