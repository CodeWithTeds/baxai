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
import { fetchPrintServices, type ApiPrintService } from '@/utils/api';

const SERVICE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  tarpaulin: 'image-outline',
  banner: 'flag-outline',
  'sticker-print': 'pricetag-outline',
  'document-print': 'document-text-outline',
  'photo-print': 'camera-outline',
  'business-card': 'card-outline',
  'flyer': 'paper-plane-outline',
  'poster': 'easel-outline',
  'canvas-paint': 'brush-outline',
  'mug-print': 'cafe-outline',
  'tshirt-print': 'shirt-outline',
  'packaging': 'cube-outline',
  default: 'print-outline',
};

function getServiceIcon(slug: string): keyof typeof Ionicons.glyphMap {
  return SERVICE_ICONS[slug] || SERVICE_ICONS.default;
}

function ServiceCard({ item, onPress }: { item: ApiPrintService; onPress: () => void }) {
  const iconName = getServiceIcon(item.slug);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
      <View style={styles.iconWrap}>
        <Ionicons name={iconName} size={28} color={BrandColors.primary} />
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.cardDesc} numberOfLines={2}>{item.description || 'Professional printing service'}</Text>
        <View style={styles.cardFooter}>
          <Text style={styles.cardPrice}>{item.base_price_formatted}</Text>
          <Text style={styles.cardUnit}>per {item.unit.replace('_', ' ')}</Text>
        </View>
        {item.turnaround_time && (
          <View style={styles.turnaroundBadge}>
            <Ionicons name="time-outline" size={12} color="#6B7280" />
            <Text style={styles.turnaroundText}>{item.turnaround_time}</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

export default function PrintServicesScreen() {
  const [services, setServices] = useState<ApiPrintService[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const loadData = async () => {
    try {
      const data = await fetchPrintServices();
      setServices(data);
    } catch (err) {
      console.warn('[PrintServices] Error loading services:', err);
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

  const handleServicePress = (service: ApiPrintService) => {
    router.push({
      pathname: '/print-service-detail',
      params: { slug: service.slug, name: service.name },
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
            <Text style={styles.loadingText}>Loading print services...</Text>
          </View>
        ) : services.length > 0 ? (
          <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.gridSection}>
            <View style={styles.headerRow}>
              <Ionicons name="print-outline" size={20} color={BrandColors.primary} />
              <Text style={styles.headerTitle}>Print Services</Text>
              <Text style={styles.headerCount}>({services.length})</Text>
            </View>
            <Text style={styles.headerSubtitle}>
              Upload your file and get it printed professionally
            </Text>

            <View style={styles.grid}>
              {services.map((service) => (
                <ServiceCard
                  key={service.id}
                  item={service}
                  onPress={() => handleServicePress(service)}
                />
              ))}
            </View>
          </Animated.View>
        ) : (
          <View style={styles.emptyWrap}>
            <Ionicons name="print-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyText}>No print services available at the moment.</Text>
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
  gridSection: {
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
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
  headerSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 16,
  },
  grid: {
    gap: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...CARD_SHADOW,
  },
  cardPressed: {
    opacity: 0.85,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: {
    flex: 1,
    gap: 4,
  },
  cardName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  cardDesc: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginTop: 4,
  },
  cardPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: BrandColors.primary,
  },
  cardUnit: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  turnaroundBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  turnaroundText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
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
    paddingHorizontal: 24,
  },
  bottomSpacer: {
    height: 16,
  },
});
