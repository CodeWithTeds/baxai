import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { BrandColors } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { getApiBaseUrls } from '@/utils/api';

interface Props {
  visible: boolean;
  onClose: () => void;
  email?: string;
  name?: string;
  avatar?: string;
}

export default function ProfileModal({ visible, onClose, email: propEmail, name: propName, avatar }: Props) {
  const { user, logout } = useAuth();
  
  const displayEmail = propEmail || user?.email || 'Not Logged In';
  const displayName = propName || user?.name || (displayEmail.includes('@') ? displayEmail.split('@')[0] : 'User');

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
    // Navigate to Login screen
    router.replace('/login');
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <Animated.View entering={FadeInUp.duration(300)} style={styles.card}>
          {/* Header Bar */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>User Profile</Text>
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

          {/* Backend Info Box */}
          <View style={styles.backendBox}>
            <Ionicons name="cloud-done-outline" size={18} color={BrandColors.primary} />
            <Text style={styles.backendText}>
              Synced to <Text style={{ fontWeight: '700' }}>{`${getApiBaseUrls()[0] ?? ''}/customers`}</Text>
            </Text>
          </View>

          {/* Logout Button */}
          <Pressable
            onPress={handleLogout}
            style={({ pressed }) => [styles.logoutBtn, pressed && styles.logoutBtnPressed]}
            android_ripple={{ color: '#FEE2E2' }}>
            <Ionicons name="log-out-outline" size={20} color="#EF4444" />
            <Text style={styles.logoutText}>Log Out</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
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
