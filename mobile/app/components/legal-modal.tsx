import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandColors } from '@/constants/theme';

export type LegalTab = 'terms' | 'privacy';

interface LegalModalProps {
  visible: boolean;
  initialTab?: LegalTab;
  onClose: () => void;
}

export function LegalModal({
  visible,
  initialTab = 'terms',
  onClose,
}: LegalModalProps) {
  const [activeTab, setActiveTab] = useState<LegalTab>(initialTab);

  // Sync tab when opening if initialTab changes
  const currentTab = activeTab || initialTab;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'overFullScreen'}
      onRequestClose={onClose}>
      <SafeAreaView edges={['top', 'bottom']} style={styles.modalRoot}>
        {/* Modal Handle & Close Header */}
        <View style={styles.header}>
          <View style={styles.pillHandle} />
          <View style={styles.headerRow}>
            <View style={styles.brandTitleRow}>
              <Image
                source={require('@/assets/images/logo.png')}
                style={styles.headerLogo}
                contentFit="contain"
              />
              <Text style={styles.headerTitle}>NUYDA ENTERPRISE Legal</Text>
            </View>
            <Pressable
              hitSlop={12}
              onPress={onClose}
              style={({ pressed }) => [styles.closeBtn, pressed && styles.closeBtnPressed]}>
              <Ionicons name="close" size={20} color="#111827" />
            </Pressable>
          </View>

          {/* Segmented Control Switcher */}
          <View style={styles.segmentedControl}>
            <Pressable
              onPress={() => setActiveTab('terms')}
              style={[
                styles.segmentItem,
                currentTab === 'terms' && styles.segmentItemActive,
              ]}>
              <Ionicons
                name="document-text-outline"
                size={16}
                color={currentTab === 'terms' ? '#FFFFFF' : '#6B7280'}
              />
              <Text
                style={[
                  styles.segmentText,
                  currentTab === 'terms' && styles.segmentTextActive,
                ]}>
                Terms of Service
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setActiveTab('privacy')}
              style={[
                styles.segmentItem,
                currentTab === 'privacy' && styles.segmentItemActive,
              ]}>
              <Ionicons
                name="lock-closed-outline"
                size={16}
                color={currentTab === 'privacy' ? '#FFFFFF' : '#6B7280'}
              />
              <Text
                style={[
                  styles.segmentText,
                  currentTab === 'privacy' && styles.segmentTextActive,
                ]}>
                Privacy Policy
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Scrollable Legal Body */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}>
          {currentTab === 'terms' ? (
            <TermsOfServiceContent />
          ) : (
            <PrivacyPolicyContent />
          )}
        </ScrollView>

        {/* Bottom Accept / Dismiss Button */}
        <View style={styles.bottomBar}>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              styles.acceptBtn,
              pressed && styles.acceptBtnPressed,
            ]}>
            <Text style={styles.acceptBtnText}>I Understand & Agree</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function TermsOfServiceContent() {
  return (
    <View style={styles.contentContainer}>
      <View style={styles.badgeRow}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Last Updated: October 2026</Text>
        </View>
        <View style={[styles.badge, styles.badgeHighlight]}>
          <Text style={[styles.badgeText, styles.badgeHighlightText]}>E-Commerce Act (RA 8792)</Text>
        </View>
      </View>

      <Text style={styles.sectionHeading}>1. Welcome & Acceptance of Terms</Text>
      <Text style={styles.paragraph}>
        Welcome to <Text style={styles.boldText}>NUYDA ENTERPRISE</Text> (Placides Printing and Custom Merchandise).
        By creating an account, placing an order, or utilizing our mobile application, website, or AI recommendation
        assistant, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
      </Text>

      <Text style={styles.sectionHeading}>2. Account Creation & Security</Text>
      <Text style={styles.paragraph}>
        To place custom orders and save Philippine delivery addresses, you must register an account using a valid username,
        email address, and secure password. You are required to verify your email address via our 4-digit authentication code.
        You are solely responsible for safeguarding your login credentials.
      </Text>

      <Text style={styles.sectionHeading}>3. Custom Printing & Production</Text>
      <Text style={styles.paragraph}>
        • <Text style={styles.boldText}>Design Approvals:</Text> For custom prints (mugs, t-shirts, pins, banners, stickers),
        orders are printed based on the digital designs, text, and 3D preview specifications confirmed during checkout.
      </Text>
      <Text style={styles.paragraph}>
        • <Text style={styles.boldText}>Intellectual Property Rights:</Text> You represent and warrant that you own or have the
        necessary rights, licenses, and permissions to use any logo, artwork, photo, or brand graphic uploaded for printing.
      </Text>
      <Text style={styles.paragraph}>
        • <Text style={styles.boldText}>Color & Material Variance:</Text> Slight variations in color tones between digital screens
        (RGB) and physical heat-press/sublimation print surfaces (CMYK) are normal in the printing industry.
      </Text>

      <Text style={styles.sectionHeading}>4. Pricing, Payments & Discounts</Text>
      <Text style={styles.paragraph}>
        All prices are listed in Philippine Pesos (PHP ₱). Payments may be made via supported digital payment gateways, GCash,
        Maya, cards, and Cash on Delivery (COD) where available. Promotional discount coupons and loyalty VIP points must be
        applied prior to order confirmation.
      </Text>

      <Text style={styles.sectionHeading}>5. Shipping & Philippine Address Delivery</Text>
      <Text style={styles.paragraph}>
        Delivery is fulfilled nationwide across the Philippines through accredited courier partners. You are responsible for
        providing accurate Philippine Standard Geographic Code (PSGC) delivery information (Region, Province, City/Municipality,
        Barangay, and Street details).
      </Text>

      <Text style={styles.sectionHeading}>6. Cancellations & Returns</Text>
      <Text style={styles.paragraph}>
        Because custom merchandise is manufactured on-demand specifically for each customer, custom print orders cannot be cancelled
        once production has begun. In the rare event of manufacturing defects, missing items, or transit damage, please notify customer
        service within 48 hours of delivery for replacement or credit.
      </Text>

      <Text style={styles.sectionHeading}>7. Governing Law</Text>
      <Text style={styles.paragraph}>
        These Terms shall be governed by and construed in accordance with the laws of the Republic of the Philippines, including
        the Electronic Commerce Act of 2000 (R.A. 8792) and Consumer Act of the Philippines (R.A. 7394).
      </Text>
    </View>
  );
}

function PrivacyPolicyContent() {
  return (
    <View style={styles.contentContainer}>
      <View style={styles.badgeRow}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>DPA 2012 Compliant</Text>
        </View>
        <View style={[styles.badge, styles.badgeHighlight]}>
          <Text style={[styles.badgeText, styles.badgeHighlightText]}>RA 10173 Philippines</Text>
        </View>
      </View>

      <Text style={styles.sectionHeading}>1. Our Commitment to Your Privacy</Text>
      <Text style={styles.paragraph}>
        <Text style={styles.boldText}>NUYDA ENTERPRISE</Text> is committed to protecting your personal data in full compliance
        with the <Text style={styles.boldText}>Data Privacy Act of 2012 (Republic Act No. 10173)</Text> of the Philippines and its
        Implementing Rules and Regulations. This Privacy Policy outlines what information we collect, why we collect it, and how we keep it safe.
      </Text>

      <Text style={styles.sectionHeading}>2. Information We Collect</Text>
      <Text style={styles.paragraph}>
        We only collect information necessary to provide our custom printing and e-commerce services:
      </Text>
      <Text style={styles.paragraph}>
        • <Text style={styles.boldText}>Account Credentials:</Text> Username, email address, encrypted passwords, and verification code history.
      </Text>
      <Text style={styles.paragraph}>
        • <Text style={styles.boldText}>Delivery Information:</Text> Recipient name, mobile phone number, Region, Province, City/Municipality,
        Barangay, and postal address coordinates.
      </Text>
      <Text style={styles.paragraph}>
        • <Text style={styles.boldText}>Print Orders & Media:</Text> Uploaded graphics, logos, mockups, and printing dimension preferences.
      </Text>
      <Text style={styles.paragraph}>
        • <Text style={styles.boldText}>Technical Data:</Text> IP address, authentication tokens, and basic mobile device telemetry for app security.
      </Text>

      <Text style={styles.sectionHeading}>3. How We Use Your Data</Text>
      <Text style={styles.paragraph}>
        • To process, manufacture, and ship your custom print orders.
      </Text>
      <Text style={styles.paragraph}>
        • To transmit 4-digit security codes for account activation and password recovery.
      </Text>
      <Text style={styles.paragraph}>
        • To deliver real-time order tracking and dispatch notifications.
      </Text>
      <Text style={styles.paragraph}>
        • To power Owla AI printing recommendations and tailored product suggestions.
      </Text>

      <Text style={styles.sectionHeading}>4. Information Sharing & Security</Text>
      <Text style={styles.paragraph}>
        <Text style={styles.boldText}>We do not sell, rent, or trade your personal data.</Text> We only share minimal necessary information
        with authorized third parties: accredited courier partners for delivery fulfillment and transactional email relays for verification.
        All data in transit is encrypted using modern TLS encryption and token-based API authentication.
      </Text>

      <Text style={styles.sectionHeading}>5. Your Rights as a Data Subject</Text>
      <Text style={styles.paragraph}>
        Under Philippine law (RA 10173), you are entitled to:
      </Text>
      <Text style={styles.paragraph}>
        • <Text style={styles.boldText}>Right to Access:</Text> View all personal details and order history stored on your account.
      </Text>
      <Text style={styles.paragraph}>
        • <Text style={styles.boldText}>Right to Rectification:</Text> Update or correct your profile and delivery addresses at any time.
      </Text>
      <Text style={styles.paragraph}>
        • <Text style={styles.boldText}>Right to Erasure / Account Deletion:</Text> Request deletion of your account and personal data from our systems.
      </Text>

      <Text style={styles.sectionHeading}>6. Contact Data Protection Officer</Text>
      <Text style={styles.paragraph}>
        If you have questions, concerns, or requests regarding this Privacy Policy or your personal information, please contact our
        Data Protection Officer at <Text style={styles.boldText}>privacy@nuydaenterprise.com</Text> or via the in-app customer support channel.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  pillHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    alignSelf: 'center',
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  brandTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerLogo: {
    width: 26,
    height: 20,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
    fontFamily: 'Manrope_700Bold',
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnPressed: {
    backgroundColor: '#E5E7EB',
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    padding: 4,
    gap: 4,
  },
  segmentItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
  },
  segmentItemActive: {
    backgroundColor: BrandColors.primary,
    ...Platform.select({
      ios: {
        shadowColor: BrandColors.primary,
        shadowOpacity: 0.25,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
      },
      android: { elevation: 2 },
    }),
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    fontFamily: 'Inter_600SemiBold',
  },
  segmentTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 28,
  },
  contentContainer: {
    paddingBottom: 16,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 18,
    flexWrap: 'wrap',
  },
  badge: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    color: '#374151',
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
  badgeHighlight: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  badgeHighlightText: {
    color: BrandColors.primary,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    fontFamily: 'Manrope_700Bold',
    marginTop: 16,
    marginBottom: 6,
  },
  paragraph: {
    fontSize: 13.5,
    lineHeight: 21,
    color: '#4B5563',
    fontFamily: 'Inter_400Regular',
    marginBottom: 8,
  },
  boldText: {
    fontWeight: '700',
    color: '#111827',
    fontFamily: 'Inter_600SemiBold',
  },
  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 10 : 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  acceptBtn: {
    backgroundColor: BrandColors.primary,
    borderRadius: 16,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: BrandColors.primary,
        shadowOpacity: 0.28,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
      },
      android: { elevation: 3 },
    }),
  },
  acceptBtnPressed: {
    backgroundColor: BrandColors.tertiary,
    transform: [{ scale: 0.99 }],
  },
  acceptBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Manrope_700Bold',
  },
});
