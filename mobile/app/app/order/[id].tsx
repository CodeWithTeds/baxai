import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ALL_ORDERS, STATUS_CONFIG, type LineItem, type TrackingStep } from '@/constants/orders-data';
import { BrandColors } from '@/constants/theme';

// ─── Tracking timeline ────────────────────────────────────────────────────────

function Timeline({ steps }: { steps: TrackingStep[] }) {
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
              {step.subtitle.length > 0 && (
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

// ─── Line item row ────────────────────────────────────────────────────────────

function LineItemRow({ item }: { item: LineItem }) {
  return (
    <View style={li.row}>
      <View style={li.imgWrap}>
        <Image source={item.image} style={li.img} contentFit="cover" />
      </View>
      <View style={li.info}>
        <Text style={li.name}>{item.name}</Text>
        <Text style={li.spec}>{item.spec}</Text>
        <View style={li.bottom}>
          <Text style={li.price}>{item.price}</Text>
          <View style={li.qtyBadge}>
            <Text style={li.qtyText}>Qty: {item.qty}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const order = ALL_ORDERS.find((o) => o.id === id);

  if (!order) {
    return (
      <SafeAreaView style={styles.notFound}>
        <Ionicons name="receipt-outline" size={48} color="#D1D5DB" />
        <Text style={styles.notFoundText}>Order not found</Text>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Go back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const cfg = STATUS_CONFIG[order.status];

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
          <Text style={styles.topBarTitle}>Order Details</Text>
          <Pressable hitSlop={12} style={styles.shareBtn}>
            <Ionicons name="share-outline" size={20} color={BrandColors.primary} />
          </Pressable>
        </View>
      </SafeAreaView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}>

        {/* ── Order number + date ──────────────────────────────── */}
        <Animated.View entering={FadeInUp.duration(400)} style={styles.heroSection}>
          <Text style={styles.heroLabel}>ORDER NUMBER</Text>
          <Text style={styles.heroNumber}>#{order.orderNumber}</Text>
          <View style={styles.heroBadgeRow}>
            <Ionicons name="calendar-outline" size={13} color="#9CA3AF" />
            <Text style={styles.heroDate}>{order.placedOn}</Text>
          </View>
        </Animated.View>

        {/* ── Delivery + status card ───────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(80).duration(500)} style={styles.card}>
          <View style={styles.deliveryRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.deliveryLabel}>Expected Delivery</Text>
              <Text style={styles.deliveryDate}>Arriving by {order.expectedDelivery}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
              <Ionicons name="bus-outline" size={13} color={cfg.color} style={{ marginRight: 4 }} />
              <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
            </View>
          </View>

          <View style={styles.cardDivider} />

          {/* Tracking timeline */}
          <Timeline steps={order.trackingSteps} />
        </Animated.View>

        {/* ── Items in order ───────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(160).duration(500)}>
          <Text style={styles.sectionTitle}>Items in Order</Text>

          <View style={styles.card}>
            {order.lineItems.map((item, i) => (
              <View key={item.id}>
                <LineItemRow item={item} />
                {i < order.lineItems.length - 1 && <View style={styles.cardDivider} />}
              </View>
            ))}
          </View>
        </Animated.View>

        {/* ── Price summary ────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(240).duration(500)} style={styles.card}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>{order.subtotal}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery</Text>
            <Text style={[styles.summaryValue, order.delivery === 'Free' && styles.summaryFree]}>
              {order.delivery}
            </Text>
          </View>
          <View style={styles.cardDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{order.total}</Text>
          </View>
        </Animated.View>

        {/* ── Actions ──────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(300).duration(500)} style={styles.actions}>
          {(order.status === 'in_progress' || order.status === 'processing') && (
            <Pressable
              style={({ pressed }) => [styles.actionBtnPrimary, pressed && { opacity: 0.8 }]}>
              <Ionicons name="location-outline" size={18} color="#fff" />
              <Text style={styles.actionBtnPrimaryText}>Track Shipment</Text>
            </Pressable>
          )}
          {order.status === 'delivered' && (
            <Pressable
              style={({ pressed }) => [styles.actionBtnPrimary, pressed && { opacity: 0.8 }]}>
              <Ionicons name="repeat-outline" size={18} color="#fff" />
              <Text style={styles.actionBtnPrimaryText}>Reorder</Text>
            </Pressable>
          )}
          <Pressable
            style={({ pressed }) => [styles.actionBtnSecondary, pressed && { opacity: 0.7 }]}>
            <Ionicons name="chatbubble-outline" size={18} color={BrandColors.primary} />
            <Text style={styles.actionBtnSecondaryText}>Contact Support</Text>
          </Pressable>
        </Animated.View>

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
    width: 70,
    height: 70,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
    flexShrink: 0,
  },
  img: {
    width: '100%',
    height: '100%',
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
  spec: {
    fontSize: 12,
    color: '#9CA3AF',
    fontFamily: 'Inter_400Regular',
  },
  bottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  price: {
    fontSize: 17,
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

  // top bar
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

  // hero
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
    marginBottom: 8,
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

  // cards
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

  // delivery row
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

  // section title
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
    fontFamily: 'Manrope_700Bold',
    marginTop: 24,
    marginBottom: 0,
    marginHorizontal: 16,
  },

  // price summary
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

  // action buttons
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

  // not found
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
});
