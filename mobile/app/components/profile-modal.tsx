import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { BrandColors } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { CustomerAddress, fetchCustomerAddress, getApiBaseUrls } from '@/utils/api';

interface Props {
  visible: boolean;
  onClose: () => void;
  email?: string;
  name?: string;
  avatar?: string;
  onReplayTutorial?: () => void;
}

export default function ProfileModal({ visible, onClose, email: propEmail, name: propName, avatar, onReplayTutorial }: Props) {
  const { user, logout } = useAuth();
  
  const displayEmail = propEmail || user?.email || 'Not Logged In';
  const displayName = propName || user?.name || (displayEmail.includes('@') ? displayEmail.split('@')[0] : 'User');

  const [address, setAddress] = useState<CustomerAddress | null>(null);
  const [hasCompleteAddress, setHasCompleteAddress] = useState(false);
  const [loadingAddress, setLoadingAddress] = useState(false);

  const handleEditAddress = () => {
    onClose();
    setTimeout(() => {
      router.push('/delivery-address');
    }, 120);
  };

  useEffect(() => {
    if (!visible) return;

    const emailToUse = user?.email || propEmail;
    if (emailToUse) {
      setLoadingAddress(true);
      fetchCustomerAddress(emailToUse)
        .then((res) => {
          setAddress(res.address);
          setHasCompleteAddress(res.has_complete_address);
        })
        .finally(() => setLoadingAddress(false));
    }
  }, [visible, user?.email, propEmail]);

  const triggerHaptic = async () => {
    if (Platform.OS !== 'web') {
      try {
        await Haptics.selectionAsync();
      } catch {}
    }
  };

  const handleLogout = async () => {
    await triggerHaptic();
    await logout();
    onClose();
    router.replace('/login');
  };

  return (
    <>
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <View style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

          <Animated.View entering={FadeInUp.duration(300)} style={styles.card}>
            {/* Header Bar */}
            <View style={styles.header}>
              <View style={styles.headerTitleRow}>
                <Image
                  source={require('@/assets/images/logo.png')}
                  style={styles.headerLogo}
                  contentFit="contain"
                />
                <Text style={styles.headerTitle}>User Profile</Text>
              </View>
              <Pressable hitSlop={10} onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color="#6B7280" />
              </Pressable>
            </View>

            {/* User Info Section */}
            <View style={styles.userSection}>
              <View style={styles.avatarCircle}>
                <Ionicons name="person" size={32} color="#FFFFFF" />
              </View>

              <View style={styles.userMeta}>
                <Text style={styles.userName}>{displayName}</Text>
                <Text style={styles.userEmail}>{displayEmail}</Text>
                
                <View style={styles.badgeRow}>
                  <View style={styles.badge}>
                    <Ionicons name="ribbon-outline" size={12} color="#D97706" />
                    <Text style={styles.badgeText}>VIP Member</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: '#ECFDF5' }]}>
                    <View style={styles.greenDot} />
                    <Text style={[styles.badgeText, { color: '#059669' }]}>Active</Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Philippine Delivery Address Section */}
            <View style={styles.addressBox}>
              <View style={styles.addressBoxHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="location-sharp" size={16} color={BrandColors.primary} />
                  <Text style={styles.addressBoxTitle}>Delivery Address</Text>
                </View>
                {hasCompleteAddress ? (
                  <View style={styles.verifiedTag}>
                    <Text style={styles.verifiedTagText}>PSGC Verified</Text>
                  </View>
                ) : (
                  <View style={styles.unverifiedTag}>
                    <Text style={styles.unverifiedTagText}>Required for Orders</Text>
                  </View>
                )}
              </View>

              {loadingAddress ? (
                <View style={{ paddingVertical: 8, alignItems: 'center' }}>
                  <ActivityIndicator size="small" color={BrandColors.primary} />
                </View>
              ) : address && hasCompleteAddress ? (
                <View style={styles.addressDetails}>
                  <Text style={styles.addressRecipient} numberOfLines={1}>
                    {address.recipient_name} • {address.phone_number}
                  </Text>
                  <Text style={styles.addressText} numberOfLines={2}>
                    {address.street_address}, Brgy. {address.barangay_name}, {address.city_name}, {address.province_name}
                  </Text>
                  <Pressable
                    style={styles.editAddressBtn}
                    onPress={handleEditAddress}
                  >
                    <Ionicons name="create-outline" size={14} color={BrandColors.primary} />
                    <Text style={styles.editAddressBtnText}>Edit Address</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.emptyAddressWrap}>
                  <Text style={styles.emptyAddressText}>
                    No complete Philippine delivery address saved yet.
                  </Text>
                  <Pressable
                    style={styles.addAddressBtn}
                    onPress={handleEditAddress}
                  >
                    <Ionicons name="add-circle-outline" size={15} color="#FFFFFF" />
                    <Text style={styles.addAddressBtnText}>Set Up Philippine Address</Text>
                  </Pressable>
                </View>
              )}
            </View>

            {/* Backend Info Box */}
            <View style={styles.backendBox}>
              <Ionicons name="cloud-done-outline" size={16} color={BrandColors.primary} />
              <Text style={styles.backendText}>
                Synced to <Text style={{ fontWeight: '700' }}>{`${getApiBaseUrls()[0] ?? ''}/customers`}</Text>
              </Text>
            </View>

            {/* Mascot Tour / Tutorial Button */}
            {onReplayTutorial && (
              <Pressable
                onPress={() => {
                  triggerHaptic();
                  onReplayTutorial();
                }}
                style={({ pressed }) => [styles.tutorialBtn, pressed && styles.tutorialBtnPressed]}
              >
                <Ionicons name="sparkles" size={17} color="#2563EB" />
                <Text style={styles.tutorialBtnText}>App Guide & Mascot Tour</Text>
              </Pressable>
            )}

            {/* Logout Button */}
            <Pressable
              onPress={handleLogout}
              style={({ pressed }) => [styles.logoutBtn, pressed && styles.logoutBtnPressed]}
              android_ripple={{ color: '#FEE2E2' }}>
              <Ionicons name="log-out-outline" size={18} color="#EF4444" />
              <Text style={styles.logoutText}>Log Out</Text>
            </Pressable>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-start',
    paddingTop: Platform.OS === 'ios' ? 70 : 50,
    paddingHorizontal: 20,
    alignItems: 'flex-end',
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    gap: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.18,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 8 },
      },
      android: { elevation: 12 },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerLogo: {
    width: 28,
    height: 21,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    fontFamily: 'Manrope_700Bold',
  },
  closeBtn: {
    padding: 4,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: BrandColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userMeta: {
    flex: 1,
    gap: 2,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    fontFamily: 'Manrope_700Bold',
  },
  userEmail: {
    fontSize: 13,
    color: '#6B7280',
    fontFamily: 'Inter_400Regular',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 100,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#D97706',
    fontFamily: 'Inter_600SemiBold',
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  addressBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  addressBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addressBoxTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  verifiedTag: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  verifiedTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  unverifiedTag: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  unverifiedTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#B45309',
  },
  addressDetails: {
    gap: 4,
  },
  addressRecipient: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1F2937',
  },
  addressText: {
    fontSize: 11.5,
    color: '#4B5563',
    lineHeight: 16,
  },
  editAddressBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  editAddressBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: BrandColors.primary,
  },
  emptyAddressWrap: {
    gap: 8,
    alignItems: 'flex-start',
  },
  emptyAddressText: {
    fontSize: 11.5,
    color: '#6B7280',
  },
  addAddressBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: BrandColors.primary,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  addAddressBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  backendBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0F7FF',
    padding: 10,
    borderRadius: 10,
  },
  backendText: {
    fontSize: 11.5,
    color: '#1E40AF',
    fontFamily: 'Inter_400Regular',
    flex: 1,
  },
  tutorialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    paddingVertical: 11,
    borderRadius: 12,
  },
  tutorialBtnPressed: {
    backgroundColor: '#DBEAFE',
  },
  tutorialBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563EB',
    fontFamily: 'Manrope_700Bold',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    paddingVertical: 12,
    borderRadius: 12,
  },
  logoutBtnPressed: {
    backgroundColor: '#FEE2E2',
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#EF4444',
    fontFamily: 'Inter_600SemiBold',
  },
});
