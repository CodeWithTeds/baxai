import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
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
import { BrandColors } from '@/constants/theme';
import { fetchPrintOrders, type ApiPrintOrder } from '@/utils/api';

const STATUS_COLORS: Record<string, string> = {
  pending: '#F59E0B',
  in_production: '#3B82F6',
  ready: '#8B5CF6',
  shipped: '#6366F1',
  delivered: '#10B981',
  picked_up: '#10B981',
  cancelled: '#EF4444',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  in_production: 'In Production',
  ready: 'Ready',
  shipped: 'Shipped',
  delivered: 'Delivered',
  picked_up: 'Picked Up',
  cancelled: 'Cancelled',
};

function PrintOrderCard({ item, onPress }: { item: ApiPrintOrder; onPress: () => void }) {
  const statusColor = STATUS_COLORS[item.status] || '#6B7280';
  const statusLabel = STATUS_LABELS[item.status] || item.status;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
      <View style={styles.cardHeader}>
        <View style={styles.orderInfo}>
          <Text style={styles.orderNumber}>{item.order_number || item.orderNumber}</Text>
          <Text style={styles.orderDate}>{item.placedOn || item.placed_at || 'Just now'}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.serviceRow}>
          <Ionicons name="print-outline" size={16} color={BrandColors.primary} />
          <Text style={styles.serviceName}>{item.service_name}</Text>
        </View>
        <Text style={styles.specs} numberOfLines={1}>
          {item.specifications?.map((s: any) => s.label).join(' • ') || 'Standard print'}
        </Text>
        <Text style={styles.qty}>Qty: {item.quantity}</Text>
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.total}>{item.total_formatted || `₱${Number(item.total).toFixed(2)}`}</Text>
        <View style={styles.paymentBadge}>
          <Ionicons
            name={item.payment_method === 'gcash' ? 'phone-portrait-outline' : 'cash-outline'}
            size={12}
            color={item.payment_status === 'paid' ? '#10B981' : '#F59E0B'}
          />
          <Text style={[
            styles.paymentText,
            { color: item.payment_status === 'paid' ? '#10B981' : '#F59E0B' }
          ]}>
            {item.payment_status === 'paid' ? 'Paid' : 'Pending'}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function PrintOrdersScreen() {
  const [orders, setOrders] = useState<ApiPrintOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const loadData = async () => {
    try {
      const data = await fetchPrintOrders();
      setOrders(data);
    } catch (err) {
      console.warn('[PrintOrders] Error loading orders:', err);
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

  const handleOrderPress = (order: ApiPrintOrder) => {
    router.push({
      pathname: '/print-order-detail',
      params: { id: String(order.id) },
    } as any);
  };

  return (
    <View style={styles.root}>
      <ScreenHeader />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[BrandColors.primary]} />
        }>
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={BrandColors.primary} />
            <Text style={styles.loadingText}>Loading print orders...</Text>
          </View>
        ) : orders.length > 0 ? (
          <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.content}>
            <View style={styles.headerRow}>
              <Ionicons name="receipt-outline" size={20} color={BrandColors.primary} />
              <Text style={styles.headerTitle}>Print Orders</Text>
              <Text style={styles.headerCount}>({orders.length})</Text>
            </View>

            <View style={styles.list}>
              {orders.map((order) => (
                <PrintOrderCard
                  key={order.id}
                  item={order}
                  onPress={() => handleOrderPress(order)}
                />
              ))}
            </View>
          </Animated.View>
        ) : (
          <View style={styles.emptyWrap}>
            <Ionicons name="receipt-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyText}>No print orders yet.</Text>
            <Pressable
              onPress={() => router.push('/print-services' as any)}
              style={styles.orderNowBtn}>
              <Text style={styles.orderNowText}>Order Now</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

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
  scroll: {
    paddingTop: 16,
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
  content: {
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
  },
  headerCount: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  list: {
    gap: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...CARD_SHADOW,
  },
  cardPressed: {
    opacity: 0.85,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderInfo: {
    flex: 1,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  orderDate: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardBody: {
    gap: 6,
    marginBottom: 12,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  serviceName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  specs: {
    fontSize: 13,
    color: '#6B7280',
  },
  qty: {
    fontSize: 13,
    color: '#6B7280',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
  },
  total: {
    fontSize: 18,
    fontWeight: '800',
    color: BrandColors.primary,
  },
  paymentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  paymentText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  orderNowBtn: {
    backgroundColor: BrandColors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 8,
  },
  orderNowText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 16,
  },
});
