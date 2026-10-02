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
  Linking,
  Modal,
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
import { useOrderNotification } from '@/contexts/order-notification-context';
import CancelOrderModal from '@/components/cancel-order-modal';
import { ApiOrder, apiCancelOrder, fetchOrderDetails } from '@/utils/api';

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

function DynamicLineItemRow({ item, onViewProof }: { item: any; onViewProof?: (item: any) => void }) {
  const previewUri = item.banner_image || item.image || item.customization?.imageUri;
  const unitPriceFormatted = item.price || (item.unit_price ? `₱${Number(item.unit_price).toFixed(2)}` : '₱0.00');
  const totalPriceFormatted = item.total || (item.total_price ? `₱${Number(item.total_price).toFixed(2)}` : unitPriceFormatted);
  const qty = item.quantity || item.qty || 1;

  const customization = item.customization || {};
  const hasProof = Boolean(customization.imageUri || item.banner_image || customization.text);

  return (
    <View style={li.row}>
      <Pressable
        onPress={() => hasProof && onViewProof?.(item)}
        disabled={!hasProof}
        style={({ pressed }) => [li.imgWrap, hasProof && pressed && { opacity: 0.8 }]}
      >
        {previewUri ? (
          <Image source={{ uri: previewUri }} style={li.img} resizeMode="cover" />
        ) : (
          <View style={li.fallbackImg}>
            <Ionicons name="cube" size={28} color="#9CA3AF" />
          </View>
        )}
        {hasProof && (
          <View style={li.imgProofBadge}>
            <Ionicons name="eye" size={10} color="#FFFFFF" />
          </View>
        )}
      </Pressable>
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
            <Pressable
              onPress={() => onViewProof?.(item)}
              hitSlop={6}
              style={({ pressed }) => [li.chip, li.artworkChip, pressed && { opacity: 0.7 }]}
            >
              <Ionicons name="eye" size={10} color="#7C3AED" />
              <Text style={[li.chipText, { color: '#7C3AED', fontWeight: '700' }]}>Design Proof</Text>
            </Pressable>
          ) : null}
        </View>

        {/* Action button to view design proof */}
        {hasProof && (
          <Pressable
            onPress={() => onViewProof?.(item)}
            style={({ pressed }) => [li.proofBtn, pressed && li.proofBtnPressed]}
          >
            <Ionicons name="sparkles" size={12} color="#7C3AED" />
            <Text style={li.proofBtnText}>Inspect Design Proof</Text>
            <Ionicons name="chevron-forward" size={12} color="#7C3AED" />
          </Pressable>
        )}

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

// ─── Real Courier Tracking Modal ──────────────────────────────────────────────

function RealTrackingModal({
  visible,
  onClose,
  order,
}: {
  visible: boolean;
  onClose: () => void;
  order: any;
}) {
  const [copiedTrack, setCopiedTrack] = useState(false);
  if (!order) return null;

  const orderNum = order.orderNumber || order.order_number || order.id;
  const courier = order.courierName || order.courier_name || 'J&T Express';
  const trackingNum = order.trackingNumber || order.tracking_number || `JT-${String(orderNum).replace(/\D/g, '') || '92817482'}PH`;
  const trackingUrl = order.trackingUrl || order.tracking_url || `https://www.jtexpress.ph/trajectoryQuery?bills=${trackingNum}`;
  const expectedDate = order.expectedDelivery || order.expected_delivery || '3–5 business days';
  const steps: TrackingStep[] = order.trackingSteps || order.tracking_steps || [];
  const shippingAddress = order.shipping_address;

  const handleCopy = async () => {
    await Clipboard.setStringAsync(trackingNum);
    if (Platform.OS !== 'web') {
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
    }
    setCopiedTrack(true);
    setTimeout(() => setCopiedTrack(false), 2000);
  };

  const handleOpenCourierWeb = async () => {
    try {
      const supported = await Linking.canOpenURL(trackingUrl);
      if (supported) {
        await Linking.openURL(trackingUrl);
      } else {
        Alert.alert('Tracking URL', trackingUrl);
      }
    } catch {
      Alert.alert('Courier Tracking', `Tracking Number: ${trackingNum}\nCourier: ${courier}`);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView edges={['top', 'bottom']} style={styles.modalRoot}>
        {/* Header */}
        <View style={styles.modalHeader}>
          <View style={styles.pillHandle} />
          <View style={styles.modalHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={styles.courierIconBadge}>
                <Ionicons name="airplane" size={18} color="#FFFFFF" />
              </View>
              <View>
                <Text style={styles.modalTitle}>Live Shipment Tracking</Text>
                <Text style={styles.modalSubtitle}>Official Courier Dispatch</Text>
              </View>
            </View>
            <Pressable hitSlop={10} onPress={onClose} style={styles.modalCloseBtn}>
              <Ionicons name="close" size={20} color="#1F2937" />
            </Pressable>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.modalScroll} showsVerticalScrollIndicator={false}>
          {/* Courier Card */}
          <View style={styles.courierCard}>
            <View style={styles.courierTop}>
              <View>
                <Text style={styles.courierLabel}>ASSIGNED COURIER</Text>
                <Text style={styles.courierName}>{courier}</Text>
              </View>
              <View style={styles.dispatchPill}>
                <View style={styles.dispatchDot} />
                <Text style={styles.dispatchPillText}>In Transit</Text>
              </View>
            </View>

            <View style={styles.trackingNumberBox}>
              <View style={{ flex: 1 }}>
                <Text style={styles.trackingNumberLabel}>Tracking Number / Waybill</Text>
                <Text style={styles.trackingNumberText}>{trackingNum}</Text>
              </View>
              <Pressable
                onPress={handleCopy}
                style={({ pressed }) => [styles.copyTrackBtn, pressed && { opacity: 0.7 }]}
              >
                <Ionicons
                  name={copiedTrack ? 'checkmark' : 'copy-outline'}
                  size={15}
                  color={copiedTrack ? '#059669' : BrandColors.primary}
                />
                <Text style={[styles.copyTrackText, copiedTrack && { color: '#059669' }]}>
                  {copiedTrack ? 'Copied' : 'Copy'}
                </Text>
              </Pressable>
            </View>

            <View style={styles.courierMetaRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="time-outline" size={15} color="#4B5563" />
                <Text style={styles.courierMetaText}>Est. Delivery: <Text style={{ fontWeight: '700', color: '#111827' }}>{expectedDate}</Text></Text>
              </View>
            </View>

            <Pressable
              onPress={handleOpenCourierWeb}
              style={({ pressed }) => [styles.courierWebBtn, pressed && { opacity: 0.85 }]}
            >
              <Ionicons name="globe-outline" size={16} color="#FFFFFF" />
              <Text style={styles.courierWebBtnText}>Open {courier} Tracking Website</Text>
              <Ionicons name="open-outline" size={14} color="#FFFFFF" />
            </Pressable>
          </View>

          {/* Detailed Timeline */}
          <View style={styles.trackingTimelineCard}>
            <Text style={styles.timelineCardTitle}>Dispatch Checkpoints</Text>
            <Timeline steps={steps} />
          </View>

          {/* Delivery Address Destination */}
          {shippingAddress && (
            <View style={styles.destinationCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Ionicons name="location-sharp" size={16} color={BrandColors.primary} />
                <Text style={styles.destinationTitle}>Destination Address</Text>
              </View>
              <Text style={styles.destinationRecipient}>
                {shippingAddress.recipient || order.customer_name || 'Customer'}
                {shippingAddress.phone ? ` • ${shippingAddress.phone}` : ''}
              </Text>
              <Text style={styles.destinationAddress}>
                {shippingAddress.address || 'Standard Delivery'}, {shippingAddress.city || ''}
              </Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Design Proof Viewer Modal ────────────────────────────────────────────────

function DesignProofModal({
  visible,
  onClose,
  item,
}: {
  visible: boolean;
  onClose: () => void;
  item: any;
}) {
  if (!item) return null;

  const customization = item.customization || {};
  const imageUri = customization.imageUri || item.banner_image || item.image;
  const productName = item.name || item.product_name || 'Custom Product';
  const customText = customization.text;

  const handleShareProof = async () => {
    try {
      await Share.share({
        message: `Design Proof for ${productName} (Text: "${customText || 'N/A'}") - Placides Printing & Custom Lab`,
        url: imageUri || undefined,
      });
    } catch {}
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.proofOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.proofCard}>
          {/* Header */}
          <View style={styles.proofHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={styles.proofHeaderIconCircle}>
                <Ionicons name="sparkles" size={16} color="#7C3AED" />
              </View>
              <View>
                <Text style={styles.proofTitle}>Design Proof</Text>
                <Text style={styles.proofSubtitle} numberOfLines={1}>{productName}</Text>
              </View>
            </View>
            <Pressable hitSlop={10} onPress={onClose} style={styles.proofCloseBtn}>
              <Ionicons name="close" size={20} color="#6B7280" />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16 }}>
            {/* Artwork Preview Canvas */}
            <View style={styles.proofCanvas}>
              {imageUri ? (
                <Image
                  source={{ uri: imageUri }}
                  style={styles.proofImg}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.proofFallback}>
                  <Ionicons name="image-outline" size={48} color="#9CA3AF" />
                  <Text style={styles.proofFallbackText}>No custom image uploaded</Text>
                </View>
              )}

              {/* Text overlay banner if text was applied */}
              {customText ? (
                <View style={styles.proofTextOverlay}>
                  <Text style={styles.proofTextLabel}>CUSTOM ENGRAVING / PRINT TEXT</Text>
                  <Text style={styles.proofTextContent}>"{customText}"</Text>
                </View>
              ) : null}
            </View>

            {/* Print Specifications */}
            <View style={styles.proofSpecsCard}>
              <View style={styles.verifiedRow}>
                <Ionicons name="checkmark-circle" size={16} color="#059669" />
                <Text style={styles.verifiedText}>High-DPI Print Proof Approved</Text>
              </View>

              <View style={styles.specGrid}>
                {item.selected_color && (
                  <View style={styles.specItem}>
                    <Text style={styles.specLabel}>COLOR</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      <View style={[styles.specDot, { backgroundColor: item.selected_color }]} />
                      <Text style={styles.specVal}>{item.selected_color_name || item.selected_color}</Text>
                    </View>
                  </View>
                )}
                {item.selected_size && (
                  <View style={styles.specItem}>
                    <Text style={styles.specLabel}>SIZE</Text>
                    <Text style={styles.specVal}>{item.selected_size}</Text>
                  </View>
                )}
                {customization.placement && (
                  <View style={styles.specItem}>
                    <Text style={styles.specLabel}>PLACEMENT</Text>
                    <Text style={styles.specVal}>{customization.placement}</Text>
                  </View>
                )}
                {item.sku && (
                  <View style={styles.specItem}>
                    <Text style={styles.specLabel}>SKU</Text>
                    <Text style={styles.specVal}>{item.sku}</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Actions */}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <Pressable
                onPress={handleShareProof}
                style={({ pressed }) => [styles.shareProofBtn, pressed && { opacity: 0.8 }]}
              >
                <Ionicons name="share-outline" size={16} color={BrandColors.primary} />
                <Text style={styles.shareProofBtnText}>Share Proof</Text>
              </Pressable>
              <Pressable
                onPress={onClose}
                style={({ pressed }) => [styles.doneProofBtn, pressed && { opacity: 0.85 }]}
              >
                <Text style={styles.doneProofBtnText}>Done</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function OrderDetailScreen() {
  const { id, openTracking } = useLocalSearchParams<{ id: string; openTracking?: string }>();
  const { t } = useLanguage();
  const { user } = useAuth();

  const [order, setOrder] = useState<ApiOrder | Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [trackingModalVisible, setTrackingModalVisible] = useState(false);
  const [activeProofItem, setActiveProofItem] = useState<any | null>(null);
  const { showPushBanner, checkNow } = useOrderNotification();

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
          if (openTracking === '1' || openTracking === 'true') {
            setTrackingModalVisible(true);
          }
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
  }, [id, user?.email, openTracking]);

  const handleShare = async () => {
    if (!order) return;
    const orderNum = order.orderNumber || (order as any).order_number || order.id;
    try {
      await Share.share({
        message: `Placides Order #${orderNum} - Status: ${order.status.toUpperCase()} (Total: ${(order as any).total_formatted || order.total})`,
      });
    } catch {}
  };

  const handleTrackOrder = () => {
    setTrackingModalVisible(true);
  };

  const statusKey = (order?.status || 'in_progress') as OrderStatus;
  const cfg = STATUS_CONFIG[statusKey] || STATUS_CONFIG.in_progress;
  const orderNum = order?.orderNumber || (order as any)?.order_number || order?.id;
  const canCancel = (order as any)?.can_cancel ?? (order as any)?.canCancel ?? (statusKey === 'in_progress' || statusKey === 'processing');

  const handleCancelOrder = () => {
    setCancelModalVisible(true);
  };

  const handleConfirmCancelWithReason = async (reason: string) => {
    if (!order) return;
    try {
      const res = await apiCancelOrder(order.id, reason);
      if (res.success) {
        if (Platform.OS !== 'web') {
          try {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch {}
        }
        if (res.order) {
          setOrder(res.order);
        } else {
          setOrder((prev: any) =>
            prev
              ? {
                  ...prev,
                  status: 'cancelled',
                  can_cancel: false,
                  canCancel: false,
                  cancellation_reason: reason,
                }
              : null
          );
        }
        setCancelModalVisible(false);
        showPushBanner({
          orderId: order.id,
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

  const placedDate = order.placedOn || (order as any).placed_at || 'Recently';
  const expectedDelivery = (order as any).expectedDelivery || (order as any).expected_delivery || '3–5 business days';
  const courierName = (order as any).courierName || (order as any).courier_name || 'J&T Express';
  const trackingNumber = (order as any).trackingNumber || (order as any).tracking_number || `JT-${String(orderNum).replace(/\D/g, '') || '92817482'}PH`;

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

  const discountTotal = Number((order as any).discount_total ?? 0);
  const discountFormatted = (order as any).discount_total_formatted || (discountTotal > 0 ? `₱${discountTotal.toFixed(2)}` : null);

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
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <Ionicons name="airplane" size={13} color={BrandColors.primary} />
                <Text style={styles.courierSnippet}>
                  {courierName} • <Text style={{ fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }}>{trackingNumber}</Text>
                </Text>
              </View>
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
                  <DynamicLineItemRow
                    item={item}
                    onViewProof={(proofItem) => setActiveProofItem(proofItem)}
                  />
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
            <Text style={styles.sectionTitle}>Delivery & Courier Details</Text>
            <View style={styles.card}>
              <View style={styles.addressWrap}>
                <View style={[styles.addressIconCircle, { backgroundColor: IconColors.cartBg }]}>
                  <Ionicons name="location" size={18} color={IconColors.cart} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.addressRecipient}>{shippingAddress.recipient || (order as any).customer_name || 'Customer'}</Text>
                  <Text style={styles.addressLine}>{shippingAddress.address || 'Standard Delivery'}</Text>
                  {shippingAddress.city ? <Text style={styles.addressLine}>{shippingAddress.city}, {shippingAddress.postal_code}</Text> : null}
                  
                  {/* Courier details in delivery card */}
                  <View style={styles.courierInlineBadge}>
                    <Ionicons name="paper-plane-outline" size={13} color={BrandColors.primary} />
                    <Text style={styles.courierInlineText}>
                      Courier: <Text style={{ fontWeight: '700' }}>{courierName}</Text> (Tracking: {trackingNumber})
                    </Text>
                  </View>

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

          {/* Discount Voucher row (Item #4) */}
          {discountTotal > 0 && (
            <View style={styles.summaryRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="pricetag" size={13} color="#059669" />
                <Text style={[styles.summaryLabel, { color: '#059669', fontWeight: '600' }]}>Discount Voucher</Text>
              </View>
              <Text style={[styles.summaryValue, { color: '#059669', fontWeight: '700' }]}>
                -{discountFormatted ? discountFormatted.replace(/^-/, '') : `₱${discountTotal.toFixed(2)}`}
              </Text>
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
              onPress={handleTrackOrder}
              style={({ pressed }) => [
                styles.actionBtnTrackModern,
                pressed && { opacity: 0.9, transform: [{ scale: 0.985 }] },
              ]}>
              <View style={styles.trackRadarWrap}>
                <Ionicons name="airplane" size={18} color="#38BDF8" />
                <View style={styles.radarPulseDot} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.actionBtnTrackModernTitle}>Live Courier Tracking</Text>
                  <View style={styles.liveDispatchChip}>
                    <Text style={styles.liveDispatchChipText}>IN TRANSIT</Text>
                  </View>
                </View>
                <Text style={styles.actionBtnTrackModernSub} numberOfLines={1}>
                  {courierName} • {trackingNumber}
                </Text>
              </View>
              <View style={styles.trackArrowBtn}>
                <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
              </View>
            </Pressable>
          )}

          {/* Cancel Order Button */}
          {canCancel && (
            <Pressable
              onPress={handleCancelOrder}
              disabled={cancelling}
              style={({ pressed }) => [
                styles.actionBtnCancelModern,
                pressed && { opacity: 0.8, backgroundColor: '#FFF5F5' },
              ]}
            >
              <View style={styles.cancelIconWrap}>
                <Ionicons name="close-circle-outline" size={17} color="#E11D48" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.actionBtnCancelModernTitle}>Cancel This Order</Text>
                <Text style={styles.actionBtnCancelModernSub}>
                  Release print slot & refund payment
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={14} color="#FDA4AF" />
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

      {/* ── Real Courier Tracking Modal (Item #2) ────────────── */}
      <RealTrackingModal
        visible={trackingModalVisible}
        onClose={() => setTrackingModalVisible(false)}
        order={order}
      />

      {/* ── Design Proof Inspector Modal (Item #5) ───────────── */}
      <DesignProofModal
        visible={Boolean(activeProofItem)}
        onClose={() => setActiveProofItem(null)}
        item={activeProofItem}
      />

      {/* ── Modern Interactive Cancel Order Modal ──────────── */}
      <CancelOrderModal
        visible={cancelModalVisible}
        orderNumber={String(orderNum)}
        onClose={() => setCancelModalVisible(false)}
        onConfirmCancel={handleConfirmCancelWithReason}
      />
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
    position: 'relative',
  },
  imgProofBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#7C3AED',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 3,
  },
  proofBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 7,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  proofBtnPressed: {
    opacity: 0.75,
    backgroundColor: '#EDE9FE',
  },
  proofBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7C3AED',
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

  courierSnippet: {
    fontSize: 12,
    color: '#4B5563',
    fontFamily: 'Inter_500Medium',
  },
  courierInlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  courierInlineText: {
    fontSize: 12,
    color: '#1E40AF',
    fontFamily: 'Inter_500Medium',
  },
  // ── Modern Action Button Styles ──
  actionBtnTrackModern: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOpacity: 0.2,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
      },
      android: { elevation: 4 },
    }),
  },
  trackRadarWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    position: 'relative',
  },
  radarPulseDot: {
    position: 'absolute',
    top: 3,
    right: 3,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    borderWidth: 1.5,
    borderColor: '#0F172A',
  },
  actionBtnTrackModernTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: 'Manrope_700Bold',
  },
  liveDispatchChip: {
    backgroundColor: 'rgba(56, 189, 248, 0.18)',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: 'rgba(56, 189, 248, 0.4)',
  },
  liveDispatchChipText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#38BDF8',
    letterSpacing: 0.5,
  },
  actionBtnTrackModernSub: {
    fontSize: 12,
    color: '#94A3B8',
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  trackArrowBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },

  actionBtnCancelModern: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderWidth: 1.5,
    borderColor: '#FECDD3',
    ...Platform.select({
      ios: {
        shadowColor: '#E11D48',
        shadowOpacity: 0.06,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
      },
      android: { elevation: 1 },
    }),
  },
  cancelIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: '#FFF1F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  actionBtnCancelModernTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#E11D48',
    fontFamily: 'Manrope_700Bold',
  },
  actionBtnCancelModernSub: {
    fontSize: 11,
    color: '#9CA3AF',
    fontFamily: 'Inter_400Regular',
    marginTop: 1,
  },

  // ── Modal & Real Tracking Styles ──
  modalRoot: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  modalHeader: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingTop: 8,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  pillHandle: {
    width: 36,
    height: 4,
    backgroundColor: '#D1D5DB',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 10,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  courierIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: BrandColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    fontFamily: 'Manrope_700Bold',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'Inter_400Regular',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScroll: {
    padding: 16,
    gap: 16,
  },
  courierCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...CARD_SHADOW,
  },
  courierTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  courierLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    letterSpacing: 0.5,
  },
  courierName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    fontFamily: 'Manrope_700Bold',
    marginTop: 2,
  },
  dispatchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  dispatchDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#059669',
  },
  dispatchPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  trackingNumberBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 12,
  },
  trackingNumberLabel: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  trackingNumberText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: 2,
  },
  copyTrackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  copyTrackText: {
    fontSize: 12,
    fontWeight: '700',
    color: BrandColors.primary,
  },
  courierMetaRow: {
    marginTop: 12,
  },
  courierMetaText: {
    fontSize: 13,
    color: '#4B5563',
  },
  courierWebBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: BrandColors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 14,
  },
  courierWebBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Manrope_700Bold',
  },
  trackingTimelineCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...CARD_SHADOW,
  },
  timelineCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
    fontFamily: 'Manrope_700Bold',
    marginBottom: 8,
  },
  destinationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...CARD_SHADOW,
  },
  destinationTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    fontFamily: 'Manrope_700Bold',
  },
  destinationRecipient: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  destinationAddress: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 3,
  },

  // ── Design Proof Modal Styles ──
  proofOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  proofCard: {
    backgroundColor: '#FFFFFF',
    width: '100%',
    maxWidth: 440,
    borderRadius: 20,
    overflow: 'hidden',
    maxHeight: '85%',
    ...CARD_SHADOW,
  },
  proofHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  proofHeaderIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  proofTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
    fontFamily: 'Manrope_700Bold',
  },
  proofSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'Inter_400Regular',
  },
  proofCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  proofCanvas: {
    width: '100%',
    height: 260,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  proofImg: {
    width: '100%',
    height: '100%',
  },
  proofFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  proofFallbackText: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  proofTextOverlay: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    backgroundColor: 'rgba(17, 24, 39, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  proofTextLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 0.5,
  },
  proofTextContent: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 2,
  },
  proofSpecsCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  verifiedText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  specGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  specItem: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minWidth: 90,
  },
  specLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#6B7280',
  },
  specDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  specVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
    marginTop: 2,
  },
  shareProofBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingVertical: 12,
    borderRadius: 12,
  },
  shareProofBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: BrandColors.primary,
  },
  doneProofBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BrandColors.primary,
    paddingVertical: 12,
    borderRadius: 12,
  },
  doneProofBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
