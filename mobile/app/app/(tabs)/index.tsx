import { Ionicons } from '@expo/vector-icons';
import { Image, type ImageSource } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import ProfileModal from '@/components/profile-modal';
import ScreenHeader from '@/components/screen-header';
import { BrandColors } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useLanguage } from '@/contexts/language-context';
import { syncCustomerToBackend } from '@/utils/customer-sync';

export default function HomeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ authSuccess?: string; email?: string }>();
  const { user } = useAuth();
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const { t } = useLanguage();

  const activeEmail = params.email || user?.email;

  useEffect(() => {
    if (params.authSuccess === '1') {
      setShowSuccessModal(true);
      if (activeEmail) {
        syncCustomerToBackend(activeEmail);
      }
    }
  }, [params.authSuccess, activeEmail]);

  const categories = [
    { id: 'mugs', label: t.catMugs, icon: 'cafe-outline' as const },
    { id: 'pins', label: t.catPins, icon: 'pricetag-outline' as const },
    { id: 'calendars', label: t.catCalendars, icon: 'calendar-outline' as const },
    { id: 'totes', label: t.catTotes, icon: 'bag-outline' as const },
  ];

  const wideCategories = [
    { id: 'stickers', label: t.catStickers, sublabel: 'Custom', icon: 'layers-outline' as const },
    { id: 'printing', label: t.catPrinting, sublabel: 'General', icon: 'print-outline' as const },
  ];

  const featured = [
    {
      id: '0',
      image: require('@/assets/images/custom-mugs.jpeg'),
      price: '₱9.99',
      badge: t.bestseller,
      badgeColor: BrandColors.primary,
      name: t.prodMug,
      rating: '4.9',
      reviews: '210',
    },
    {
      id: '1',
      image: require('@/assets/images/custom-thirts.jpg'),
      price: '₱15.00',
      badge: t.fastTurnaround,
      badgeColor: '#F53003',
      name: t.prodTshirt,
      rating: '4.9',
      reviews: '120',
    },
    {
      id: '2',
      image: require('@/assets/images/custom-stickers.jpg'),
      price: '₱0.50 ea',
      badge: t.highDemand,
      badgeColor: '#D97706',
      name: t.prodStickers,
      rating: '4.8',
      reviews: '340',
    },
  ];

  const handleCategoryPress = (id: string) => {
    if (id === 'mugs') {
      router.push('/mug-3d' as any);
    } else if (id === 'pins') {
      router.push('/pin-3d' as any);
    }
  };

  const handleFeaturedPress = (item: (typeof featured)[number]) => {
    if (item.id === '0') {
      router.push('/mug-3d' as any);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      {/* ── Header + Search ──────────────────────────────────── */}
      <ScreenHeader onAvatarPress={() => setShowProfileModal(true)} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">

        {/* ── Hero banner ──────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(80).duration(500)} style={styles.heroBanner}>
          <LinearGradient
            colors={['#2979E8', '#0052CC']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />

          {/* Text side */}
          <View style={styles.heroText}>
            <Text style={styles.heroTitle}>{t.heroTitle}</Text>
            <Text style={styles.heroSub}>{t.heroSubtitle}</Text>

            <Pressable
              style={({ pressed }) => [styles.shopBtn, pressed && styles.shopBtnPressed]}
              android_ripple={{ color: '#003D9B' }}>
              <Ionicons name="bag-outline" size={16} color="#FFFFFF" />
              <Text style={styles.shopBtnText}>{t.getStarted}</Text>
            </Pressable>
          </View>

          {/* Mascot */}
          <View style={styles.heroMascot}>
            <Image
              source={require('@/assets/images/shopping-owl.png')}
              style={styles.heroMascotImg}
              contentFit="contain"
              priority="high"
            />
          </View>
        </Animated.View>

        {/* ── Explore Categories ───────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(160).duration(500)} style={styles.section}>
          <Text style={styles.sectionTitle}>{t.categories}</Text>

          {/* Icon grid row */}
          <View style={styles.catRow}>
            {categories.map((cat) => {
              const is3D = cat.id === 'mugs' || cat.id === 'pins';
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => handleCategoryPress(cat.id)}
                  style={({ pressed }) => [styles.catItem, pressed && styles.catItemPressed]}>
                  <View style={[styles.catIconBox, is3D && styles.catIconBox3D, cat.id === 'pins' && { borderColor: '#7C3AED', backgroundColor: '#F5F3FF' }]}>
                    <Ionicons name={cat.icon} size={28} color={cat.id === 'pins' ? '#7C3AED' : BrandColors.primary} />
                    {cat.id === 'mugs' && (
                      <View style={styles.cat3DBadge}>
                        <Text style={styles.cat3DText}>3D</Text>
                      </View>
                    )}
                    {cat.id === 'pins' && (
                      <View style={[styles.cat3DBadge, { backgroundColor: '#7C3AED' }]}>
                        <Text style={styles.cat3DText}>3D</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.catLabel}>{cat.label}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Wide tiles row */}
          <View style={styles.wideCatRow}>
            {wideCategories.map((cat) => (
              <Pressable
                key={cat.id}
                style={({ pressed }) => [styles.wideCatItem, pressed && styles.wideCatItemPressed]}>
                <View style={styles.wideCatTextGroup}>
                  <Text style={styles.wideCatSublabel}>{cat.sublabel}</Text>
                  <Text style={styles.wideCatLabel}>{cat.label}</Text>
                </View>
                <Ionicons name={cat.icon} size={32} color="#D1D5DB" style={styles.wideCatIcon} />
              </Pressable>
            ))}
          </View>
        </Animated.View>

        {/* ── Featured Services ─────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(240).duration(500)} style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t.featuredProducts}</Text>
            <Pressable hitSlop={8} style={styles.seeAllBtn}>
              <Text style={styles.seeAllText}>{t.viewAll}</Text>
              <Ionicons name="arrow-forward" size={14} color={BrandColors.primary} />
            </Pressable>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.featuredScroll}>
            {featured.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => handleFeaturedPress(item)}
                style={({ pressed }) => [
                  styles.featuredCard,
                  item.id === '0' && styles.featuredCard3D,
                  pressed && styles.featuredCardPressed,
                ]}>
                {/* Product image */}
                <View style={styles.featuredImgWrap}>
                  <Image
                    source={item.image}
                    style={styles.featuredImg}
                    contentFit="cover"
                  />
                  {/* Wishlist */}
                  <Pressable hitSlop={8} style={styles.wishlistBtn}>
                    <Ionicons name="heart-outline" size={18} color="#6B7280" />
                  </Pressable>
                  {/* Price badge */}
                  <View style={styles.priceBadge}>
                    <Text style={styles.priceText}>{item.price}</Text>
                  </View>
                </View>

                {/* Info */}
                <View style={styles.featuredInfo}>
                  <Text style={[styles.demandBadge, { color: item.badgeColor }]}>
                    {item.badge}
                  </Text>
                  <Text style={styles.featuredName}>{item.name}</Text>
                  <View style={styles.ratingRow}>
                    <Ionicons name="star" size={13} color="#F59E0B" />
                    <Text style={styles.ratingText}>
                      {item.rating}{' '}
                      <Text style={styles.reviewCount}>({item.reviews})</Text>
                    </Text>
                    {item.id === '0' && (
                      <View style={styles.inline3D}>
                        <Ionicons name="cube-outline" size={11} color={BrandColors.primary} />
                        <Text style={styles.inline3DText}>360°</Text>
                      </View>
                    )}
                  </View>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </Animated.View>

        {/* Bottom spacing */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* ── macOS Auth Success Alert ───────────────────────────── */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}>
        <Pressable style={modalStyles.overlay} onPress={() => setShowSuccessModal(false)}>
          <Animated.View entering={FadeInUp.duration(300)} style={modalStyles.macWindow}>
            {/* macOS Title Bar */}
            <View style={modalStyles.macTitleBar}>
              <View style={modalStyles.macControls}>
                <View style={[modalStyles.macDot, { backgroundColor: '#FF5F56' }]} />
                <View style={[modalStyles.macDot, { backgroundColor: '#FFBD2E' }]} />
                <View style={[modalStyles.macDot, { backgroundColor: '#27C93F' }]} />
              </View>
              <Text style={modalStyles.macTitle}>System Notice</Text>
              <View style={{ width: 44 }} />
            </View>

            {/* Content */}
            <View style={modalStyles.macBody}>
              <Text style={modalStyles.macHeading}>Authenticated Successfully!</Text>
              <Text style={modalStyles.macMessage}>
                Welcome to NUYDA ENTERPRISE! You are now logged in
                {activeEmail ? (
                  <> as <Text style={{ fontWeight: '700', color: '#111827' }}>{activeEmail}</Text></>
                ) : null}.
              </Text>
              <Text style={modalStyles.macHint}>Tap anywhere to close</Text>
            </View>
          </Animated.View>
        </Pressable>
      </Modal>

      {/* ── Profile & Logout Modal ────────────────────────────── */}
      <ProfileModal
        visible={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        email={activeEmail}
      />
    </View>
  );
}

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  macWindow: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.22,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 8 },
      },
      android: { elevation: 12 },
    }),
  },
  macTitleBar: {
    height: 36,
    backgroundColor: '#F3F4F6',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  macControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  macDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
  },
  macTitle: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#4B5563',
    fontFamily: 'Inter_600SemiBold',
  },
  macBody: {
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  macHeading: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    fontFamily: 'Manrope_700Bold',
    textAlign: 'center',
  },
  macMessage: {
    fontSize: 13.5,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 19,
    fontFamily: 'Inter_400Regular',
  },
  macHint: {
    fontSize: 11.5,
    color: '#9CA3AF',
    fontFamily: 'Inter_400Regular',
    marginTop: 4,
  },
});

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },

  // Top bar
  topSafe: {
    backgroundColor: '#FFFFFF',
    zIndex: 10,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 3 },
    }),
  },

  // Scroll
  scroll: {
    paddingBottom: 24,
    paddingTop: 16,
  },


  // Hero
  heroBanner: {
    marginHorizontal: 16,
    borderRadius: 18,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'flex-end',
    minHeight: 180,
    ...Platform.select({
      ios: { shadowColor: '#0041A8', shadowOpacity: 0.30, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
      android: { elevation: 8 },
    }),
  },
  heroText: {
    flex: 1,
    paddingLeft: 20,
    paddingTop: 22,
    paddingBottom: 20,
    zIndex: 1,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    fontFamily: 'Manrope_700Bold',
    lineHeight: 28,
    marginBottom: 6,
  },
  heroSub: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    lineHeight: 19,
    fontFamily: 'Inter_400Regular',
    marginBottom: 16,
  },
  shopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F59E0B',
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
  },
  shopBtnPressed: {
    backgroundColor: '#D97706',
  },
  shopBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
    fontFamily: 'Manrope_700Bold',
  },
  heroMascot: {
    width: 140,
    height: 180,
    justifyContent: 'flex-end',
  },
  heroMascotImg: {
    width: '100%',
    height: '100%',
  },

  // Section
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    fontFamily: 'Manrope_700Bold',
    marginBottom: 14,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 14,
  },
  seeAllText: {
    fontSize: 14,
    color: BrandColors.primary,
    fontFamily: 'Inter_500Medium',
  },

  // Category icon row
  catRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  catItem: {
    alignItems: 'center',
    flex: 1,
  },
  catItemPressed: {
    opacity: 0.7,
  },
  catIconBox: {
    width: 62,
    height: 62,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 2 },
    }),
  },
  catIconBox3D: {
    borderWidth: 1.5,
    borderColor: BrandColors.primary,
    backgroundColor: '#EFF6FF',
  },
  cat3DBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: BrandColors.primary,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 8,
  },
  cat3DText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
    fontFamily: 'Manrope_700Bold',
  },
  catLabel: {
    fontSize: 12,
    color: '#374151',
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },

  // Wide category tiles
  wideCatRow: {
    flexDirection: 'row',
    gap: 12,
  },
  wideCatItem: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 2 },
    }),
  },
  wideCatItemPressed: {
    opacity: 0.75,
  },
  wideCatTextGroup: {
    gap: 2,
  },
  wideCatSublabel: {
    fontSize: 11,
    color: '#9CA3AF',
    fontFamily: 'Inter_400Regular',
  },
  wideCatLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: BrandColors.primary,
    fontFamily: 'Manrope_700Bold',
  },
  wideCatIcon: {
    opacity: 0.5,
  },

  // Featured cards
  featuredRow: {
    flexDirection: 'row',
    gap: 12,
  },
  featuredScroll: {
    gap: 12,
    paddingRight: 16,
  },
  featuredCard: {
    width: 170,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } },
      android: { elevation: 3 },
    }),
  },
  featuredCard3D: {
    borderWidth: 1.5,
    borderColor: BrandColors.primary,
  },
  featuredCardPressed: {
    opacity: 0.85,
  },
  featuredImgWrap: {
    height: 130,
    backgroundColor: '#F9FAFB',
    position: 'relative',
  },
  featuredImg: {
    width: '100%',
    height: '100%',
  },
  wishlistBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 20,
    padding: 5,
  },
  priceBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: '#1F2937',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  priceText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Manrope_700Bold',
  },
  featuredInfo: {
    padding: 10,
    gap: 4,
  },
  demandBadge: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
  featuredName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    fontFamily: 'Manrope_700Bold',
    lineHeight: 18,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingText: {
    fontSize: 12,
    color: '#374151',
    fontFamily: 'Inter_500Medium',
  },
  reviewCount: {
    color: '#9CA3AF',
    fontFamily: 'Inter_400Regular',
  },
  inline3D: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginLeft: 6,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  inline3DText: {
    fontSize: 10,
    color: BrandColors.primary,
    fontFamily: 'Manrope_700Bold',
  },

  bottomSpacer: {
    height: 16,
  },
});
