import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandColors } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { ApiOrder, fetchOrders } from '@/utils/api';

export interface OrderNotification {
  id: string;
  orderId: string | number;
  orderNumber: string;
  title: string;
  message: string;
  courierName?: string;
  status: string;
  timestamp: number;
}

interface OrderNotificationContextValue {
  activeNotification: OrderNotification | null;
  dismissNotification: () => void;
  checkNow: () => Promise<void>;
  showPushBanner: (notif: Omit<OrderNotification, 'id' | 'timestamp'>) => void;
}

const OrderNotificationContext = createContext<OrderNotificationContextValue>({
  activeNotification: null,
  dismissNotification: () => {},
  checkNow: async () => {},
  showPushBanner: () => {},
});

const STATUS_LABELS: Record<string, string> = {
  in_progress: 'In Progress (Production)',
  processing: 'Processing / Printing Queue',
  delivered: 'Delivered Successfully! 🎉',
  cancelled: 'Order Cancelled',
};

export function OrderNotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [activeNotification, setActiveNotification] = useState<OrderNotification | null>(null);

  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isCheckingRef = useRef(false);

  const showPushBanner = (notif: Omit<OrderNotification, 'id' | 'timestamp'>) => {
    const fullNotif: OrderNotification = {
      ...notif,
      id: `${Date.now()}_${Math.random()}`,
      timestamp: Date.now(),
    };

    setActiveNotification(fullNotif);

    if (Platform.OS !== 'web') {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
    }

    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 8,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();

    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    dismissTimer.current = setTimeout(() => {
      dismissNotification();
    }, 6500);
  };

  const dismissNotification = () => {
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -120,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setActiveNotification(null);
    });
  };

  const checkNow = async () => {
    if (isCheckingRef.current || !user?.email) return;
    isCheckingRef.current = true;

    try {
      const email = user.email.trim().toLowerCase();
      const cacheKey = `@order_status_cache_${email}`;
      const cachedRaw = await AsyncStorage.getItem(cacheKey);
      const knownStatuses: Record<string, string> = cachedRaw ? JSON.parse(cachedRaw) : {};

      const latestOrders = await fetchOrders(email);
      if (!Array.isArray(latestOrders) || latestOrders.length === 0) {
        return;
      }

      const updatedStatuses: Record<string, string> = { ...knownStatuses };
      let hasChanges = false;

      for (const order of latestOrders) {
        const orderId = String(order.id);
        const orderNum = order.orderNumber || order.order_number || orderId;
        const currentStatus = order.status || 'in_progress';
        const courier = order.courierName || order.courier_name || 'J&T Express';
        const trackingNum = order.trackingNumber || order.tracking_number;

        // If we previously had a recorded status and it changed
        if (knownStatuses[orderId] && knownStatuses[orderId] !== currentStatus) {
          const statusText = STATUS_LABELS[currentStatus] || currentStatus;
          const trackingInfo = trackingNum ? ` (Tracking: ${trackingNum})` : '';

          showPushBanner({
            orderId: order.id,
            orderNumber: orderNum,
            title: `Order #${orderNum} Status Updated 🚚`,
            message: `Now ${statusText} via ${courier}${trackingInfo}. Tap to view tracking.`,
            courierName: courier,
            status: currentStatus,
          });
          hasChanges = true;
        }

        updatedStatuses[orderId] = currentStatus;
      }

      await AsyncStorage.setItem(cacheKey, JSON.stringify(updatedStatuses));
    } catch (err) {
      console.warn('[OrderNotificationProvider] check error:', err);
    } finally {
      isCheckingRef.current = false;
    }
  };

  useEffect(() => {
    if (!user?.email) return;

    // Initial check
    checkNow();

    // Auto-polling interval: check for order status changes every 15 seconds
    const interval = setInterval(() => {
      checkNow();
    }, 15000);

    return () => clearInterval(interval);
  }, [user?.email]);

  const handleBannerPress = () => {
    if (!activeNotification) return;
    const targetId = activeNotification.orderId;
    dismissNotification();
    router.push(`/order/${targetId}` as any);
  };

  return (
    <OrderNotificationContext.Provider
      value={{
        activeNotification,
        dismissNotification,
        checkNow,
        showPushBanner,
      }}
    >
      {children}

      {/* ── Real-Time In-App Push Notification Banner ──────────── */}
      {activeNotification && (
        <Animated.View
          style={[
            styles.bannerContainer,
            {
              transform: [{ translateY }],
              opacity,
            },
          ]}
        >
          <SafeAreaView edges={['top']} style={styles.bannerSafe}>
            <Pressable
              onPress={handleBannerPress}
              style={({ pressed }) => [styles.bannerCard, pressed && styles.bannerCardPressed]}
            >
              <View style={styles.iconCircle}>
                <Ionicons
                  name={
                    activeNotification.status === 'delivered'
                      ? 'checkmark-circle'
                      : activeNotification.status === 'cancelled'
                      ? 'close-circle'
                      : 'cube'
                  }
                  size={20}
                  color="#FFFFFF"
                />
              </View>

              <View style={styles.bannerContent}>
                <View style={styles.bannerHeaderRow}>
                  <Text style={styles.bannerTitle}>{activeNotification.title}</Text>
                  <Text style={styles.bannerTime}>Just now</Text>
                </View>
                <Text style={styles.bannerMessage} numberOfLines={2}>
                  {activeNotification.message}
                </Text>
              </View>

              <Pressable hitSlop={10} onPress={dismissNotification} style={styles.bannerCloseBtn}>
                <Ionicons name="close" size={16} color="#9CA3AF" />
              </Pressable>
            </Pressable>
          </SafeAreaView>
        </Animated.View>
      )}
    </OrderNotificationContext.Provider>
  );
}

export function useOrderNotification() {
  return useContext(OrderNotificationContext);
}

const styles = StyleSheet.create({
  bannerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 99999,
    elevation: 99999,
  },
  bannerSafe: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 12 : 6,
  },
  bannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.35,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 6 },
      },
      android: { elevation: 16 },
    }),
  },
  bannerCardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: BrandColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  bannerContent: {
    flex: 1,
    gap: 2,
  },
  bannerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bannerTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Manrope_700Bold',
  },
  bannerTime: {
    fontSize: 10.5,
    color: '#94A3B8',
    fontFamily: 'Inter_400Regular',
  },
  bannerMessage: {
    fontSize: 12,
    color: '#E2E8F0',
    lineHeight: 16,
    fontFamily: 'Inter_400Regular',
  },
  bannerCloseBtn: {
    padding: 6,
    marginLeft: 6,
  },
});
