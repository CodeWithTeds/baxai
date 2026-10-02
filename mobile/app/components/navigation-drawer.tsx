import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { SlideInLeft, SlideOutLeft } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandColors, IconColors } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useCart } from '@/contexts/cart-context';
import { useLanguage } from '@/contexts/language-context';
import { LegalModal, LegalTab } from '@/components/legal-modal';

interface NavigationDrawerProps {
  visible: boolean;
  onClose: () => void;
}

export default function NavigationDrawer({ visible, onClose }: NavigationDrawerProps) {
  const { user, logout } = useAuth();
  const { itemCount } = useCart();
  const { language, setLanguage, t } = useLanguage();
  const [legalModalVisible, setLegalModalVisible] = useState(false);
  const [legalTab, setLegalTab] = useState<LegalTab>('terms');

  const triggerHaptic = async () => {
    if (Platform.OS !== 'web') {
      try {
        await Haptics.selectionAsync();
      } catch {}
    }
  };

  const handleNavigate = async (action: () => void) => {
    await triggerHaptic();
    onClose();
    setTimeout(() => {
      action();
    }, 150);
  };

  const handleLogout = async () => {
    await triggerHaptic();
    onClose();
    await logout();
    router.replace('/login');
  };

  const displayName = user?.name || (user?.email ? user.email.split('@')[0] : 'Guest Shopper');
  const displayEmail = user?.email || 'Sign in to sync your orders';

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="none"
        onRequestClose={onClose}
      >
        <View style={styles.overlay}>
          {/* Backdrop Pressable */}
          <Pressable style={styles.backdrop} onPress={onClose} />

          {/* Slide-out Drawer Panel */}
          <Animated.View
            entering={SlideInLeft.duration(280)}
            exiting={SlideOutLeft.duration(220)}
            style={styles.drawerCard}
          >
            <SafeAreaView edges={['top', 'bottom']} style={styles.drawerSafe}>
              {/* Header */}
              <View style={styles.drawerHeader}>
                <View style={styles.brandRow}>
                  <Image
                    source={require('@/assets/images/logo.png')}
                    style={styles.drawerLogo}
                    contentFit="contain"
                  />
                  <View>
                    <Text style={styles.brandTitle}>NUYDA</Text>
                    <Text style={styles.brandSubtitle}>ENTERPRISE</Text>
                  </View>
                </View>

                <Pressable hitSlop={10} onPress={onClose} style={styles.closeBtn}>
                  <Ionicons name="close" size={20} color="#4B5563" />
                </Pressable>
              </View>

              <ScrollView
                style={styles.drawerScroll}
                contentContainerStyle={styles.drawerScrollContent}
                showsVerticalScrollIndicator={false}
              >
                {/* User Section Card */}
                <View style={styles.userCard}>
                  <View style={styles.userAvatar}>
                    <Ionicons
                      name={user ? 'person' : 'person-outline'}
                      size={24}
                      color="#FFFFFF"
                    />
                  </View>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName} numberOfLines={1}>
                      {displayName}
                    </Text>
                    <Text style={styles.userEmail} numberOfLines={1}>
                      {displayEmail}
                    </Text>
                    {user ? (
                      <View style={styles.badgeRow}>
                        <View style={styles.userBadge}>
                          <Ionicons name="ribbon-outline" size={11} color="#D97706" />
                          <Text style={styles.userBadgeText}>VIP Member</Text>
                        </View>
                        <View style={[styles.userBadge, { backgroundColor: '#ECFDF5' }]}>
                          <View style={styles.activeDot} />
                          <Text style={[styles.userBadgeText, { color: '#059669' }]}>Active</Text>
                        </View>
                      </View>
                    ) : (
                      <Pressable
                        style={styles.loginPill}
                        onPress={() => handleNavigate(() => router.push('/login'))}
                      >
                        <Text style={styles.loginPillText}>Sign In / Register →</Text>
                      </Pressable>
                    )}
                  </View>
                </View>

                {/* Primary Nav Links */}
                <Text style={styles.navSectionLabel}>NAVIGATION</Text>

                <Pressable
                  style={styles.navItem}
                  onPress={() => handleNavigate(() => router.push('/(tabs)'))}
                >
                  <View style={[styles.navIconBox, { backgroundColor: '#EFF6FF' }]}>
                    <Ionicons name="home-outline" size={19} color="#0052CC" />
                  </View>
                  <Text style={styles.navLabel}>{t.navHome}</Text>
                  <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                </Pressable>

                <Pressable
                  style={styles.navItem}
                  onPress={() => handleNavigate(() => router.push('/(tabs)/services'))}
                >
                  <View style={[styles.navIconBox, { backgroundColor: '#F0FDF4' }]}>
                    <Ionicons name="print-outline" size={19} color="#059669" />
                  </View>
                  <Text style={styles.navLabel}>{t.navServices}</Text>
                  <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                </Pressable>

                <Pressable
                  style={styles.navItem}
                  onPress={() => handleNavigate(() => router.push('/(tabs)/orders'))}
                >
                  <View style={[styles.navIconBox, { backgroundColor: '#FEF3C7' }]}>
                    <Ionicons name="cube-outline" size={19} color="#D97706" />
                  </View>
                  <Text style={styles.navLabel}>{t.navOrders}</Text>
                  <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                </Pressable>

                <Pressable
                  style={styles.navItem}
                  onPress={() => handleNavigate(() => router.push('/(tabs)/ai-hub'))}
                >
                  <View style={[styles.navIconBox, { backgroundColor: '#F3E8FF' }]}>
                    <Ionicons name="sparkles" size={19} color="#7C3AED" />
                  </View>
                  <Text style={styles.navLabel}>{t.navAiHub}</Text>
                  <View style={styles.newBadge}>
                    <Text style={styles.newBadgeText}>AI Studio</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                </Pressable>

                <Pressable
                  style={styles.navItem}
                  onPress={() => handleNavigate(() => router.push('/cart'))}
                >
                  <View style={[styles.navIconBox, { backgroundColor: '#EFF6FF' }]}>
                    <Ionicons name="cart-outline" size={19} color="#0052CC" />
                  </View>
                  <Text style={styles.navLabel}>Shopping Cart</Text>
                  {itemCount > 0 && (
                    <View style={styles.cartCountBadge}>
                      <Text style={styles.cartCountText}>{itemCount}</Text>
                    </View>
                  )}
                  <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                </Pressable>

                <Pressable
                  style={styles.navItem}
                  onPress={() => handleNavigate(() => router.push('/delivery-address'))}
                >
                  <View style={[styles.navIconBox, { backgroundColor: '#FEE2E2' }]}>
                    <Ionicons name="location-outline" size={19} color="#DC2626" />
                  </View>
                  <Text style={styles.navLabel}>Delivery Address</Text>
                  <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                </Pressable>

                <View style={styles.navDivider} />

                {/* Categories Quick Links */}
                <Text style={styles.navSectionLabel}>EXPLORE CATEGORIES</Text>

                {[
                  { id: 'mugs', label: 'Custom Mugs & Drinkware', icon: 'cafe-outline', is3D: true },
                  { id: 'tshirts', label: 'T-Shirts & Apparel', icon: 'shirt-outline', is3D: true },
                  { id: 'pins', label: 'Button Pins & Badges', icon: 'pricetag-outline', is3D: true },
                  { id: 'stickers', label: 'Waterproof Stickers', icon: 'layers-outline' },
                  { id: 'tote_bags', label: 'Canvas Tote Bags', icon: 'bag-outline' },
                  { id: 'calendars', label: 'Wall & Desk Calendars', icon: 'calendar-outline' },
                  { id: 'printing', label: 'All Print Services', icon: 'print-outline' },
                ].map((cat) => (
                  <Pressable
                    key={cat.id}
                    style={styles.catLinkItem}
                    onPress={() =>
                      handleNavigate(() =>
                        router.push({
                          pathname: '/(tabs)/services',
                          params: { category: cat.id },
                        } as any)
                      )
                    }
                  >
                    <Ionicons name={cat.icon as any} size={16} color="#4B5563" />
                    <Text style={styles.catLinkLabel}>{cat.label}</Text>
                    {cat.is3D && (
                      <View style={styles.mini3DBadge}>
                        <Text style={styles.mini3DText}>3D</Text>
                      </View>
                    )}
                  </Pressable>
                ))}

                <View style={styles.navDivider} />

                {/* Preferences & Settings */}
                <Text style={styles.navSectionLabel}>PREFERENCES</Text>

                {/* Language Switcher */}
                <View style={styles.prefRow}>
                  <View style={styles.prefLeft}>
                    <Ionicons name="globe-outline" size={18} color="#4B5563" />
                    <Text style={styles.prefLabel}>Language</Text>
                  </View>
                  <View style={styles.langToggleGroup}>
                    <Pressable
                      style={[styles.langBtn, language === 'en' && styles.langBtnActive]}
                      onPress={async () => {
                        await triggerHaptic();
                        setLanguage('en');
                      }}
                    >
                      <Text style={[styles.langBtnText, language === 'en' && styles.langBtnTextActive]}>
                        EN
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[styles.langBtn, language === 'tl' && styles.langBtnActive]}
                      onPress={async () => {
                        await triggerHaptic();
                        setLanguage('tl');
                      }}
                    >
                      <Text style={[styles.langBtnText, language === 'tl' && styles.langBtnTextActive]}>
                        TL
                      </Text>
                    </Pressable>
                  </View>
                </View>

                {/* Legal Links */}
                <Pressable
                  style={styles.prefRow}
                  onPress={async () => {
                    await triggerHaptic();
                    setLegalTab('terms');
                    setLegalModalVisible(true);
                  }}
                >
                  <View style={styles.prefLeft}>
                    <Ionicons name="document-text-outline" size={18} color="#4B5563" />
                    <Text style={styles.prefLabel}>Terms & Privacy</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                </Pressable>

                {/* Logout or Login Button */}
                {user ? (
                  <Pressable style={styles.logoutBtn} onPress={handleLogout}>
                    <Ionicons name="log-out-outline" size={18} color="#DC2626" />
                    <Text style={styles.logoutBtnText}>Sign Out</Text>
                  </Pressable>
                ) : (
                  <Pressable
                    style={styles.signInBtn}
                    onPress={() => handleNavigate(() => router.push('/login'))}
                  >
                    <Ionicons name="log-in-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.signInBtnText}>Sign In / Register</Text>
                  </Pressable>
                )}
              </ScrollView>
            </SafeAreaView>
          </Animated.View>
        </View>
      </Modal>

      {/* Legal Modal */}
      <LegalModal
        visible={legalModalVisible}
        onClose={() => setLegalModalVisible(false)}
        initialTab={legalTab}
      />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  drawerCard: {
    width: '82%',
    maxWidth: 320,
    height: '100%',
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.25,
        shadowRadius: 15,
        shadowOffset: { width: 4, height: 0 },
      },
      android: { elevation: 16 },
    }),
  },
  drawerSafe: {
    flex: 1,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  drawerLogo: {
    width: 32,
    height: 32,
  },
  brandTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0052CC',
    fontFamily: 'Manrope_800ExtraBold',
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#6B7280',
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1.5,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerScroll: {
    flex: 1,
  },
  drawerScrollContent: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 30,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0052CC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    fontFamily: 'Manrope_700Bold',
  },
  userEmail: {
    fontSize: 11.5,
    color: '#64748B',
    fontFamily: 'Inter_400Regular',
    marginTop: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 5,
  },
  userBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  userBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#B45309',
    fontFamily: 'Inter_700Bold',
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#059669',
  },
  loginPill: {
    marginTop: 4,
  },
  loginPillText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#0052CC',
    fontFamily: 'Inter_600SemiBold',
  },
  navSectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.8,
    marginTop: 8,
    marginBottom: 8,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  navIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    fontFamily: 'Inter_600SemiBold',
  },
  newBadge: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    marginRight: 4,
  },
  newBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#7C3AED',
    fontFamily: 'Inter_700Bold',
  },
  cartCountBadge: {
    backgroundColor: '#0052CC',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 4,
  },
  cartCountText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Inter_700Bold',
  },
  navDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 14,
  },
  catLinkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  catLinkLabel: {
    flex: 1,
    fontSize: 13,
    color: '#475569',
    fontFamily: 'Inter_500Medium',
  },
  mini3DBadge: {
    backgroundColor: '#0052CC',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
  },
  mini3DText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  prefLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  prefLabel: {
    fontSize: 13.5,
    color: '#334155',
    fontFamily: 'Inter_500Medium',
  },
  langToggleGroup: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    padding: 2,
  },
  langBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  langBtnActive: {
    backgroundColor: '#0052CC',
  },
  langBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    fontFamily: 'Inter_600SemiBold',
  },
  langBtnTextActive: {
    color: '#FFFFFF',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
    paddingVertical: 12,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  logoutBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#DC2626',
    fontFamily: 'Inter_700Bold',
  },
  signInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
    paddingVertical: 12,
    backgroundColor: '#0052CC',
    borderRadius: 12,
  },
  signInBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Inter_700Bold',
  },
});
