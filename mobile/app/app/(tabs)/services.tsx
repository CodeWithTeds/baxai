import { Ionicons } from '@expo/vector-icons';
import { Image, type ImageSource } from 'expo-image';
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
import { BrandColors } from '@/constants/theme';

// ─── Types ────────────────────────────────────────────────────────────────────

type ServiceItem = {
  id: string;
  name: string;
  description: string;
  price: string;
  image: ImageSource;
  badge?: string;
  badgeColor?: string;
  featured?: boolean;
};

// ─── Data ────────────────────────────────────────────────────────────────────

const SERVICES: ServiceItem[] = [
  {
    id: '1',
    name: 'Custom Mugs',
    description: 'High-quality ceramic prints for home or office.',
    price: 'From ₱9.99',
    image: require('@/assets/images/custom-mugs.jpeg'),
    badge: 'Bestseller',
    badgeColor: BrandColors.primary,
    featured: true,
  },
  {
    id: '2',
    name: 'Button Pins',
    description: 'Vibrant enamel-style pins.',
    price: 'From ₱1.50',
    image: require('@/assets/images/button-pins.jpg'),
  },
  {
    id: '3',
    name: 'Custom Stickers',
    description: 'Die-cut vinyl, waterproof.',
    price: '₱0.50 ea',
    image: require('@/assets/images/custom-stickers.jpg'),
    badge: 'Deal',
    badgeColor: '#D97706',
  },
  {
    id: '4',
    name: 'Custom T-Shirts',
    description: 'Premium full-colour prints on soft cotton.',
    price: 'From ₱15.00',
    image: require('@/assets/images/custom-thirts.jpg'),
    badge: 'Fast Turnaround',
    badgeColor: '#F53003',
  },
  {
    id: '5',
    name: 'Tote Bags',
    description: 'Eco-friendly canvas with custom artwork.',
    price: 'From ₱12.00',
    image: require('@/assets/images/tote-bags.jpg'),
  },
  {
    id: '6',
    name: 'Calendars',
    description: 'Wall & desk calendars, personalised.',
    price: 'From ₱8.00',
    image: require('@/assets/images/calendars.jpg'),
  },
  {
    id: '7',
    name: 'Custom Pin',
    description: 'Premium custom pin — single-piece showcase.',
    price: 'From ₱1.20',
    image: require('@/assets/images/custom-pin.jpeg'),
  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function FeaturedServiceCard({ item }: { item: ServiceItem }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.featuredCard, pressed && styles.cardPressed]}>
      {/* Image */}
      <View style={styles.featuredImgWrap}>
        <Image
          source={item.image}
          style={styles.featuredImg}
          contentFit="cover"
        />
        {item.badge && (
          <View style={[styles.badge, { backgroundColor: item.badgeColor }]}>
            <Ionicons name="star" size={11} color="#fff" style={{ marginRight: 3 }} />
            <Text style={styles.badgeText}>{item.badge}</Text>
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.featuredInfo}>
        <View style={styles.featuredInfoTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardName}>{item.name}</Text>
            <Text style={styles.cardDesc}>{item.description}</Text>
          </View>
        </View>

        <View style={styles.featuredInfoBottom}>
          <Text style={styles.featuredPrice}>{item.price}</Text>
          <Pressable
            hitSlop={8}
            style={({ pressed }) => [styles.cartBtn, pressed && styles.cartBtnPressed]}>
            <Ionicons name="cart-outline" size={20} color={BrandColors.primary} />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

function GridServiceCard({ item }: { item: ServiceItem }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.gridCard, pressed && styles.cardPressed]}>
      {/* Image */}
      <View style={styles.gridImgWrap}>
        <Image
          source={item.image}
          style={styles.gridImg}
          contentFit="cover"
        />
        {item.badge && (
          <View style={[styles.badge, { backgroundColor: item.badgeColor }]}>
            <Text style={styles.badgeText}>{item.badge}</Text>
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.gridInfo}>
        <Text style={styles.cardName} numberOfLines={2}>{item.name}</Text>
        <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>

        <View style={styles.gridInfoBottom}>
          <Text style={styles.gridPrice}>{item.price}</Text>
          <Pressable
            hitSlop={8}
            style={({ pressed }) => [styles.cartBtn, pressed && styles.cartBtnPressed]}>
            <Ionicons name="cart-outline" size={18} color={BrandColors.primary} />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ServicesScreen() {
  const [query, setQuery] = useState('');

  const featured = SERVICES.filter((s) => s.featured);
  const grid = SERVICES.filter((s) => !s.featured).filter((s) =>
    query.length === 0 ? true : s.name.toLowerCase().includes(query.toLowerCase()),
  );
  const filteredFeatured = featured.filter((s) =>
    query.length === 0 ? true : s.name.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      {/* ── Header + Search ──────────────────────────────────── */}
      <ScreenHeader
        searchPlaceholder="Search services..."
        searchValue={query}
        onSearchChange={setQuery}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">

        {/* ── Featured (full-width) ─────────────────────────── */}
        {filteredFeatured.length > 0 && (
          <Animated.View entering={FadeInDown.delay(80).duration(500)}>
            {filteredFeatured.map((item) => (
              <FeaturedServiceCard key={item.id} item={item} />
            ))}
          </Animated.View>
        )}

        {/* ── All Services grid ─────────────────────────────── */}
        {grid.length > 0 && (
          <Animated.View entering={FadeInDown.delay(160).duration(500)} style={styles.gridSection}>
            <View style={styles.gridRow}>
              {grid.map((item) => (
                <GridServiceCard key={item.id} item={item} />
              ))}
            </View>
          </Animated.View>
        )}

        {/* Empty state */}
        {filteredFeatured.length === 0 && grid.length === 0 && (
          <Animated.View entering={FadeInDown.duration(400)} style={styles.emptyWrap}>
            <Ionicons name="search-outline" size={40} color="#D1D5DB" />
            <Text style={styles.emptyText}>No services found for "{query}"</Text>
          </Animated.View>
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

  // ── Featured card ──────────────────────────────────────────
  featuredCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    ...CARD_SHADOW,
  },
  featuredImgWrap: {
    height: 200,
    backgroundColor: '#F9FAFB',
    position: 'relative',
  },
  featuredImg: {
    width: '100%',
    height: '100%',
  },
  featuredInfo: {
    padding: 16,
    gap: 12,
  },
  featuredInfoTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  featuredInfoBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  featuredPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: BrandColors.primary,
    fontFamily: 'Manrope_700Bold',
  },

  // ── Grid ──────────────────────────────────────────────────
  gridSection: {
    paddingHorizontal: 16,
  },
  gridRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridCard: {
    width: '47.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
    ...CARD_SHADOW,
  },
  gridImgWrap: {
    height: 130,
    backgroundColor: '#F9FAFB',
    position: 'relative',
  },
  gridImg: {
    width: '100%',
    height: '100%',
  },
  gridInfo: {
    padding: 10,
    gap: 4,
  },
  gridInfoBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  gridPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: BrandColors.primary,
    fontFamily: 'Manrope_700Bold',
  },

  // ── Shared card pieces ─────────────────────────────────────
  cardPressed: {
    opacity: 0.85,
  },
  cardName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    fontFamily: 'Manrope_700Bold',
    marginBottom: 2,
  },
  cardDesc: {
    fontSize: 13,
    color: '#6B7280',
    fontFamily: 'Inter_400Regular',
    lineHeight: 18,
  },
  badge: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Manrope_700Bold',
  },
  cartBtn: {
    backgroundColor: '#EFF6FF',
    padding: 8,
    borderRadius: 10,
  },
  cartBtnPressed: {
    backgroundColor: '#DBEAFE',
  },

  // ── Empty state ────────────────────────────────────────────
  emptyWrap: {
    alignItems: 'center',
    marginTop: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },

  bottomSpacer: {
    height: 16,
  },
});
