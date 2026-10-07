import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import ScreenHeader from '@/components/screen-header';
import { BrandColors } from '@/constants/theme';
import { cancelPrintOrder, fetchPrintOrderDetails, type ApiPrintOrder } from '@/utils/api';

const STATUS_STEPS = ['pending', 'in_production', 'ready', 'shipped', 'delivered'];
const STATUS_LABELS: Record<string, string> = {
  pending: 'Order Placed',
  in_production: 'In Production',
  ready: 'Ready',
  shipped: 'Shipped',
  delivered: 'Delivered',
  picked_up: 'Picked Up',
  cancelled: 'Cancelled',
};

export default function PrintOrderDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<ApiPrintOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    loadOrder();
  }, []);

  const loadOrder = async () => {
    try {
      const data = await fetchPrintOrderDetails(params.id);
      setOrder(data);
    } catch (err) {
      console.warn('[PrintOrderDetail] Error loading order:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel Order',
      'Are you sure you want to cancel this print order?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            try {
              const result = await cancelPrintOrder(params.id);
              if (result.success) {
                Alert.alert('Cancelled', 'Your print order has been cancelled.');
                loadOrder();
              } else {
                Alert.alert('Error', result.message || 'Failed to cancel order.');
              }
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to cancel order.');
            } finally {
              setCancelling(false);
            }
          },
        },
      ]
    );
  };

  const getStatusStepIndex = () => {
    if (!order) return 0;
    if (order.status === 'picked_up') return 3;
    if (order.status === 'cancelled') return -1;
    return STATUS_STEPS.indexOf(order.status);
  };

  if (loading) {
    return (
      <View style={styles.root}>
        <ScreenHeader />
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={BrandColors.primary} />
          <Text style={styles.loadingText}>Loading order details...</Text>
        </View>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.root}>
        <ScreenHeader />
        <View style={styles.emptyWrap}>
          <Ionicons name="alert-circle-outline" size={48} color="#D1D5DB" />
          <Text style={styles.emptyText}>Order not found.</Text>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const stepIndex = getStatusStepIndex();
  const isCancelled = order.status === 'cancelled';
  const isImageFile = order.file_type && ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(order.file_type.toLowerCase());

  return (
    <View style={styles.root}>
      <ScreenHeader />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.content}>
          <View style={styles.header}>
            <View>
              <Text style={styles.orderNumber}>{order.order_number || order.orderNumber}</Text>
              <Text style={styles.orderDate}>Placed {order.placedOn || order.placed_at || 'Just now'}</Text>
            </View>
            <View style={[
              styles.statusBadge,
              { backgroundColor: (isCancelled ? '#EF4444' : '#10B981') + '20' }
            ]}>
              <Text style={[
                styles.statusText,
                { color: isCancelled ? '#EF4444' : '#10B981' }
              ]}>
                {STATUS_LABELS[order.status] || order.status}
              </Text>
            </View>
          </View>

          {!isCancelled && (
            <View style={styles.timeline}>
              {STATUS_STEPS.map((step, index) => {
                const isCompleted = index <= stepIndex;
                const isCurrent = index === stepIndex;
                return (
                  <View key={step} style={styles.timelineItem}>
                    <View style={styles.timelineLeft}>
                      <View style={[
                        styles.timelineDot,
                        isCompleted && styles.timelineDotCompleted,
                        isCurrent && styles.timelineDotCurrent,
                      ]}>
                        {isCompleted && <Ionicons name="checkmark" size={12} color="#FFFFFF" />}
                      </View>
                      {index < STATUS_STEPS.length - 1 && (
                        <View style={[
                          styles.timelineLine,
                          index < stepIndex && styles.timelineLineCompleted,
                        ]} />
                      )}
                    </View>
                    <Text style={[
                      styles.timelineLabel,
                      isCompleted && styles.timelineLabelCompleted,
                    ]}>
                      {STATUS_LABELS[step]}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Service Details</Text>
            <View style={styles.detailCard}>
              <View style={styles.detailRow}>
                <Ionicons name="print-outline" size={18} color={BrandColors.primary} />
                <View style={styles.detailInfo}>
                  <Text style={styles.detailLabel}>Service</Text>
                  <Text style={styles.detailValue}>{order.service_name}</Text>
                </View>
              </View>
              {order.specifications && order.specifications.length > 0 && (
                <View style={styles.detailRow}>
                  <Ionicons name="options-outline" size={18} color={BrandColors.primary} />
                  <View style={styles.detailInfo}>
                    <Text style={styles.detailLabel}>Specifications</Text>
                    <Text style={styles.detailValue}>
                      {order.specifications.map((s: any) => s.label).join(' • ')}
                    </Text>
                  </View>
                </View>
              )}
              <View style={styles.detailRow}>
                <Ionicons name="layers-outline" size={18} color={BrandColors.primary} />
                <View style={styles.detailInfo}>
                  <Text style={styles.detailLabel}>Quantity</Text>
                  <Text style={styles.detailValue}>{order.quantity} pcs</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>File</Text>
            <View style={styles.fileCard}>
              {isImageFile && order.file_url ? (
                <Image source={{ uri: order.file_url }} style={styles.fileImage} />
              ) : (
                <View style={styles.fileIconWrap}>
                  <Ionicons name="document-text" size={32} color={BrandColors.primary} />
                </View>
              )}
              <View style={styles.fileInfo}>
                <Text style={styles.fileName} numberOfLines={1}>{order.file_name}</Text>
                <Text style={styles.fileMeta}>
                  {order.file_type?.toUpperCase()} • {(Number(order.file_size) / 1024 / 1024).toFixed(2)} MB
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Fulfillment & Payment</Text>
            <View style={styles.detailCard}>
              <View style={styles.detailRow}>
                <Ionicons
                  name={order.is_pickup ? 'storefront-outline' : 'bicycle-outline'}
                  size={18}
                  color={BrandColors.primary}
                />
                <View style={styles.detailInfo}>
                  <Text style={styles.detailLabel}>Fulfillment</Text>
                  <Text style={styles.detailValue}>
                    {order.is_pickup ? 'Store Pickup' : 'Delivery'}
                  </Text>
                </View>
              </View>
              <View style={styles.detailRow}>
                <Ionicons
                  name={order.payment_method === 'gcash' ? 'phone-portrait-outline' : 'cash-outline'}
                  size={18}
                  color={BrandColors.primary}
                />
                <View style={styles.detailInfo}>
                  <Text style={styles.detailLabel}>Payment</Text>
                  <Text style={styles.detailValue}>
                    {order.payment_method === 'gcash' ? 'GCash' : 'Cash on Delivery'}
                  </Text>
                </View>
              </View>
              {order.payment_method === 'gcash' && order.gcash_reference_number && (
                <View style={styles.detailRow}>
                  <Ionicons name="barcode-outline" size={18} color={BrandColors.primary} />
                  <View style={styles.detailInfo}>
                    <Text style={styles.detailLabel}>GCash Reference</Text>
                    <Text style={styles.detailValue}>{order.gcash_reference_number}</Text>
                  </View>
                </View>
              )}
              <View style={styles.detailRow}>
                <Ionicons
                  name={order.isPaid ? 'checkmark-circle' : 'time-outline'}
                  size={18}
                  color={order.isPaid ? '#10B981' : '#F59E0B'}
                />
                <View style={styles.detailInfo}>
                  <Text style={styles.detailLabel}>Payment Status</Text>
                  <Text style={[
                    styles.detailValue,
                    { color: order.isPaid ? '#10B981' : '#F59E0B' }
                  ]}>
                    {order.isPaid ? 'Paid' : 'Pending'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {order.tracking_number && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tracking</Text>
              <View style={styles.detailCard}>
                <View style={styles.detailRow}>
                  <Ionicons name="cube-outline" size={18} color={BrandColors.primary} />
                  <View style={styles.detailInfo}>
                    <Text style={styles.detailLabel}>Tracking Number</Text>
                    <Text style={styles.detailValue}>{order.tracking_number}</Text>
                  </View>
                </View>
                {order.courier_name && (
                  <View style={styles.detailRow}>
                    <Ionicons name="business-outline" size={18} color={BrandColors.primary} />
                    <View style={styles.detailInfo}>
                      <Text style={styles.detailLabel}>Courier</Text>
                      <Text style={styles.detailValue}>{order.courier_name}</Text>
                    </View>
                  </View>
                )}
              </View>
            </View>
          )}

          <View style={styles.priceCard}>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Subtotal</Text>
              <Text style={styles.priceValue}>{order.subtotal_formatted || `₱${Number(order.subtotal).toFixed(2)}`}</Text>
            </View>
            {Number(order.rush_fee) > 0 && (
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Rush Fee</Text>
                <Text style={styles.priceValue}>{order.rush_fee_formatted || `₱${Number(order.rush_fee).toFixed(2)}`}</Text>
              </View>
            )}
            {Number(order.shipping_fee) > 0 && (
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Shipping</Text>
                <Text style={styles.priceValue}>{order.shipping_fee_formatted || `₱${Number(order.shipping_fee).toFixed(2)}`}</Text>
              </View>
            )}
            <View style={[styles.priceRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{order.total_formatted || `₱${Number(order.total).toFixed(2)}`}</Text>
            </View>
          </View>

          {order.canCancel && (
            <Pressable
              onPress={handleCancel}
              disabled={cancelling}
              style={({ pressed }) => [styles.cancelBtn, pressed && styles.cancelBtnPressed]}>
              <Ionicons name="close-circle-outline" size={20} color="#EF4444" />
              <Text style={styles.cancelBtnText}>
                {cancelling ? 'Cancelling...' : 'Cancel Order'}
              </Text>
            </Pressable>
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  scroll: {
    paddingBottom: 24,
  },
  loadingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  backBtn: {
    backgroundColor: BrandColors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 8,
  },
  backBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  content: {
    padding: 16,
    gap: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  orderNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  orderDate: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  timeline: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 0,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  timelineLeft: {
    alignItems: 'center',
    width: 20,
  },
  timelineDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineDotCompleted: {
    backgroundColor: '#10B981',
  },
  timelineDotCurrent: {
    backgroundColor: BrandColors.primary,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 2,
  },
  timelineLineCompleted: {
    backgroundColor: '#10B981',
  },
  timelineLabel: {
    fontSize: 14,
    color: '#9CA3AF',
    paddingBottom: 16,
    flex: 1,
  },
  timelineLabelCompleted: {
    color: '#111827',
    fontWeight: '500',
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  detailCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  detailInfo: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    marginTop: 2,
  },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  fileImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  fileIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  fileMeta: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  priceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  priceValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 10,
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '800',
    color: BrandColors.primary,
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  cancelBtnPressed: {
    opacity: 0.8,
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#EF4444',
  },
});
