import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { Image as ExpoImage } from 'expo-image';
import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandColors, IconColors } from '@/constants/theme';
import PhilippineAddressModal from '@/components/philippine-address-modal';
import { useAuth } from '@/contexts/auth-context';
import { CartItem, useCart } from '@/contexts/cart-context';
import { CustomerAddress, createOrder, fetchCustomerAddress } from '@/utils/api';

// ─── Full-screen loading overlay ─────────────────────────────────────────────

function LoadingOverlay({ visible, label }: { visible: boolean; label?: string }) {
  const opacity = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(opacity, {
      toValue: visible ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.loadingOverlay, { opacity }]}>
      <View style={styles.loadingBox}>
        <ActivityIndicator size="large" color={BrandColors.primary} />
        {label ? <Text style={styles.loadingLabel}>{label}</Text> : null}
      </View>
    </Animated.View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function CartScreen() {
  const { items, itemCount, subtotal, updateQuantity, removeItem, clearCart } = useCart();
  const { user } = useAuth();
  const [orderSuccessModal, setOrderSuccessModal] = useState(false);
  const [placedOrderId, setPlacedOrderId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState('');
  const [copiedRef, setCopiedRef] = useState(false);

  // Philippine Delivery Address state
  const [savedAddress, setSavedAddress] = useState<CustomerAddress | null>(null);
  const [hasCompleteAddress, setHasCompleteAddress] = useState(false);
  const [loadingAddress, setLoadingAddress] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);

  // Load customer's saved address
  React.useEffect(() => {
    if (user?.email) {
      setLoadingAddress(true);
      fetchCustomerAddress(user.email)
        .then((res) => {
          setSavedAddress(res.address);
          setHasCompleteAddress(res.has_complete_address);
        })
        .finally(() => setLoadingAddress(false));
    } else {
      setSavedAddress(null);
      setHasCompleteAddress(false);
    }
  }, [user?.email]);

  const handleCopyReference = async () => {
    if (!placedOrderId) return;
    await Clipboard.setStringAsync(placedOrderId);
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  const handleClearCart = () => {
    Alert.alert('Clear Cart', 'Remove all items?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear All', style: 'destructive', onPress: clearCart },
    ]);
  };

  const handleCheckout = async () => {
    if (items.length === 0 || isSubmitting) return;

    // 1. Validate user authentication
    if (!user?.email) {
      Alert.alert(
        'Account Required',
        'Please sign in or create an account with a Philippine delivery address before submitting an order.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => router.push('/login') },
        ]
      );
      return;
    }

    // 2. Frontend validation: require complete saved Philippine delivery address
    if (!hasCompleteAddress || !savedAddress) {
      Alert.alert(
        'Delivery Address Required',
        'Before a customer is allowed to place an order, a complete Philippine delivery address (Region, Province, City, Barangay, Street) must be saved in your account.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Add Address Now',
            onPress: () => setShowAddressModal(true),
          },
        ]
      );
      return;
    }

    setLoadingLabel('Verifying address & placing order…');
    setIsSubmitting(true);

    try {
      const orderPayload = {
        customer_name: user?.name || savedAddress.recipient_name || 'Mobile App Customer',
        customer_email: user?.email,
        customer_phone: savedAddress.phone_number || undefined,
        customer_address_id: savedAddress.id,
        payment_method: 'Cash on Delivery',
        notes: savedAddress.delivery_instructions || undefined,
        items: items.map((it) => ({
          product_id: it.productId,
          name: it.name,
          category: it.category,
          sku: it.sku,
          banner_image: it.bannerImage,
          viewer_type: it.viewerType,
          selected_color: it.selectedColor,
          selected_color_name: it.selectedColorName,
          selected_size: it.selectedSize,
          customization: it.customization,
          base_price: it.basePrice,
          addon_price: it.addonPrice,
          unit_price: it.unitPrice,
          quantity: it.quantity,
          total_price: it.totalPrice,
        })),
      };

      const created = await createOrder(orderPayload);
      const orderNum = created?.order_number || `RD-${created?.id || Date.now().toString().slice(-4)}`;
      setPlacedOrderId(orderNum);
      setOrderSuccessModal(true);
    } catch (err: any) {
      console.warn('[Cart] Checkout failed:', err);
      const errData = err?.data;
      const errMsg = errData?.message || err?.message || 'Failed to place order. Please verify your address and try again.';

      // If backend rejected due to address requirement, redirect to address form
      if (errData?.action === 'redirect_to_address_form' || errData?.error_code?.includes('ADDRESS')) {
        Alert.alert(
          'Address Incomplete',
          errMsg,
          [
            {
              text: 'Complete Address',
              onPress: () => setShowAddressModal(true),
            },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
      } else {
        Alert.alert('Order Placement Error', errMsg);
      }
    } finally {
      setIsSubmitting(false);
      setLoadingLabel('');
    }
  };

  const handleFinishOrder = () => {
    setOrderSuccessModal(false);
    clearCart();
    router.replace('/(tabs)/orders');
  };

  const totalCustomizationFees = items.reduce(
    (sum, it) => sum + (it.addonPrice || 0) * (it.quantity || 1),
    0
  );
  const baseItemsSubtotal = subtotal - totalCustomizationFees;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* ── Top Header ─────────────────────────────────────────── */}
      <View style={styles.header}>
        <Pressable
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace('/(tabs)');
          }}
          style={({ pressed }) => [styles.headerBtn, pressed && { opacity: 0.7 }]}
          hitSlop={8}
        >
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </Pressable>

        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Shopping Cart</Text>
          <Text style={styles.headerSubtitle}>
            {itemCount} {itemCount === 1 ? 'item' : 'items'}
          </Text>
        </View>

        {items.length > 0 ? (
          <Pressable
            onPress={handleClearCart}
            style={({ pressed }) => [styles.headerBtn, styles.clearBtn, pressed && { opacity: 0.7 }]}
            hitSlop={8}
          >
            <Ionicons name="trash-outline" size={18} color="#DC2626" />
          </Pressable>
        ) : (
          <View style={styles.headerBtnPlaceholder} />
        )}
      </View>

      {/* ── Main Content ──────────────────────────────────────── */}
      {items.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="cart-outline" size={48} color="#9CA3AF" />
          </View>
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptySubtitle}>
            Customize products with 3D preview and add them here.
          </Text>
          <Pressable
            onPress={() => router.replace('/(tabs)/services')}
            style={({ pressed }) => [styles.browseBtn, { backgroundColor: BrandColors.primary }, pressed && { opacity: 0.85 }]}
          >
            <Ionicons name="sparkles-outline" size={18} color="#FFFFFF" />
            <Text style={styles.browseBtnText}>Browse Products</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Cart Items ─────────────────────────────────────── */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Customized Products ({items.length})</Text>
          </View>

          {items.map((item) => (
            <CartItemCard
              key={item.id}
              item={item}
              onIncrement={() => updateQuantity(item.id, item.quantity + 1)}
              onDecrement={() => updateQuantity(item.id, item.quantity - 1)}
              onRemove={() => removeItem(item.id)}
            />
          ))}

          {/* ── Quality Guarantee ──────────────────────────────── */}
          <View style={styles.perkCard}>
            <View style={styles.perkIconWrap}>
              <Ionicons name="shield-checkmark" size={20} color={BrandColors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.perkTitle}>Quality Guaranteed</Text>
              <Text style={styles.perkDesc}>
                Free design inspection, color proof, and protective custom packaging included.
              </Text>
            </View>
          </View>

          {/* ── Philippine Delivery Address ───────────────────── */}
          {loadingAddress ? (
            <View style={styles.addressLoadingCard}>
              <ActivityIndicator size="small" color={BrandColors.primary} />
              <Text style={styles.addressLoadingText}>Verifying saved Philippine delivery address…</Text>
            </View>
          ) : savedAddress && hasCompleteAddress ? (
            <View style={styles.addressCard}>
              <View style={styles.addressCardHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="location-sharp" size={17} color={BrandColors.primary} />
                  <Text style={styles.addressCardTitle}>Delivery Address</Text>
                </View>
                <View style={styles.addressPsgcBadge}>
                  <Ionicons name="shield-checkmark" size={11} color="#059669" />
                  <Text style={styles.addressPsgcBadgeText}>PSGC Verified</Text>
                </View>
              </View>

              <View style={styles.addressCardBody}>
                <Text style={styles.addressRecipient}>
                  {savedAddress.recipient_name} • {savedAddress.phone_number}
                </Text>
                <Text style={styles.addressStreet}>
                  {savedAddress.street_address}, Brgy. {savedAddress.barangay_name}
                </Text>
                <Text style={styles.addressRegion}>
                  {savedAddress.city_name}, {savedAddress.province_name} {savedAddress.postal_code || ''}
                </Text>
                <Text style={styles.addressRegionSub}>
                  {savedAddress.region_name}
                </Text>
                {savedAddress.delivery_instructions ? (
                  <View style={styles.addressInstructionBox}>
                    <Ionicons name="information-circle-outline" size={13} color="#6B7280" />
                    <Text style={styles.addressInstructionText}>
                      Note: {savedAddress.delivery_instructions}
                    </Text>
                  </View>
                ) : null}
              </View>

              <Pressable
                onPress={() => setShowAddressModal(true)}
                style={({ pressed }) => [styles.addressEditBtn, pressed && { opacity: 0.7 }]}
              >
                <Ionicons name="create-outline" size={15} color={BrandColors.primary} />
                <Text style={styles.addressEditBtnText}>Change Delivery Address</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.addressRequiredCard}>
              <View style={styles.addressRequiredHeader}>
                <View style={styles.addressRequiredIconBox}>
                  <Ionicons name="location-outline" size={20} color="#1F2937" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.addressRequiredTitle}>Philippine Address Required</Text>
                  <Text style={styles.addressRequiredSubtitle}>
                    A complete Philippine address (PSGC Region, Province, City, Barangay, Street) must be saved before checkout.
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={() => setShowAddressModal(true)}
                style={({ pressed }) => [styles.addressAddBtn, pressed && { opacity: 0.85 }]}
              >
                <Ionicons name="add-circle-outline" size={16} color="#FFFFFF" />
                <Text style={styles.addressAddBtnText}>Add Philippine Address</Text>
              </Pressable>
            </View>
          )}

          {/* ── Order Summary ──────────────────────────────────── */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Order Summary</Text>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Products Subtotal</Text>
              <Text style={styles.summaryValue}>₱{baseItemsSubtotal.toFixed(2)}</Text>
            </View>

            {totalCustomizationFees > 0 && (
              <View style={styles.summaryRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={styles.summaryLabel}>Customization Add-ons</Text>
                  <View style={styles.addonTag}>
                    <Text style={styles.addonTagText}>Design Fee</Text>
                  </View>
                </View>
                <Text style={[styles.summaryValue, { color: '#059669' }]}>
                  +₱{totalCustomizationFees.toFixed(2)}
                </Text>
              </View>
            )}

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Estimated Production</Text>
              <Text style={styles.summaryGreen}>1–3 business days</Text>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.totalRow}>
              <View>
                <Text style={styles.totalLabel}>Grand Total</Text>
                <Text style={styles.totalSubtext}>VAT & production fees included</Text>
              </View>
              <Text style={styles.totalValue}>₱{subtotal.toFixed(2)}</Text>
            </View>
          </View>

          {/* ── Actions ────────────────────────────────────────── */}
          <Pressable
            onPress={handleCheckout}
            disabled={isSubmitting}
            style={({ pressed }) => [
              styles.checkoutBtn,
              (pressed || isSubmitting) && { opacity: 0.88 },
            ]}
          >
            <Text style={styles.checkoutBtnText}>
              Place Order • ₱{subtotal.toFixed(2)}
            </Text>
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
          </Pressable>

          <Pressable
            onPress={() => router.push('/(tabs)/services')}
            style={({ pressed }) => [styles.continueBtn, pressed && { opacity: 0.7 }]}
          >
            <Ionicons name="add-circle-outline" size={18} color={BrandColors.primary} />
            <Text style={[styles.continueBtnText, { color: BrandColors.primary }]}>Add More Products</Text>
          </Pressable>
        </ScrollView>
      )}

      {/* ── Loading Overlay ────────────────────────────────────── */}
      <LoadingOverlay visible={isSubmitting} label={loadingLabel} />

      {/* ── Order Success Modal — Apple-style sheet ────────────── */}
      <Modal visible={orderSuccessModal} transparent animationType="slide">
        <Pressable style={styles.sheetBackdrop} onPress={handleFinishOrder} />
        <View style={styles.sheetCard}>
          {/* pill handle */}
          <View style={styles.sheetHandle} />

          <Text style={styles.sheetEmoji}>🎉</Text>
          <Text style={styles.sheetTitle}>Order Placed</Text>
          <Text style={styles.sheetSubtitle}>
            Your order is queued for production and will be ready in 1–3 business days.
          </Text>

          <View style={styles.sheetInfoBox}>
            <Pressable
              onPress={handleCopyReference}
              hitSlop={8}
              style={({ pressed }) => [styles.sheetInfoRow, pressed && { opacity: 0.6 }]}
            >
              <Text style={styles.sheetInfoLabel}>Reference</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.sheetInfoValue}>{placedOrderId}</Text>
                <Ionicons
                  name={copiedRef ? 'checkmark-circle' : 'copy-outline'}
                  size={14}
                  color={copiedRef ? IconColors.success : IconColors.copy}
                />
                {copiedRef && (
                  <Text style={{ fontSize: 11, color: IconColors.success, fontWeight: '700', fontFamily: 'Manrope_700Bold' }}>
                    Copied!
                  </Text>
                )}
              </View>
            </Pressable>
            <View style={styles.sheetInfoDivider} />
            <View style={styles.sheetInfoRow}>
              <Text style={styles.sheetInfoLabel}>Total</Text>
              <Text style={[styles.sheetInfoValue, { color: BrandColors.primary }]}>
                ₱{subtotal.toFixed(2)}
              </Text>
            </View>
            <View style={styles.sheetInfoDivider} />
            <View style={styles.sheetInfoRow}>
              <Text style={styles.sheetInfoLabel}>Items</Text>
              <Text style={styles.sheetInfoValue}>{itemCount}</Text>
            </View>
          </View>

          <Pressable
            onPress={handleFinishOrder}
            style={({ pressed }) => [styles.sheetBtn, pressed && { opacity: 0.88 }]}
          >
            <Text style={styles.sheetBtnText}>View My Orders</Text>
          </Pressable>

          <Pressable
            onPress={() => { setOrderSuccessModal(false); clearCart(); }}
            style={({ pressed }) => [styles.sheetSecondaryBtn, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.sheetSecondaryBtnText}>Done</Text>
          </Pressable>
        </View>
      </Modal>

      {/* ── Philippine Address Modal ────────────────────────────── */}
      <PhilippineAddressModal
        visible={showAddressModal}
        onClose={() => setShowAddressModal(false)}
        email={user?.email}
        initialAddress={savedAddress}
        onAddressSaved={(addr) => {
          setSavedAddress(addr);
          setHasCompleteAddress(true);
        }}
      />
    </SafeAreaView>
  );
}

// ─── Cart Item Card ───────────────────────────────────────────────────────────

function CartItemCard({
  item,
  onIncrement,
  onDecrement,
  onRemove,
}: {
  item: CartItem;
  onIncrement: () => void;
  onDecrement: () => void;
  onRemove: () => void;
}) {
  const previewUri = item.customization.imageUri || item.bannerImage;
  const isOutOfStock = item.stockQuantity !== undefined && item.stockQuantity <= 0;
  const isLowStock = item.stockQuantity > 0 && item.stockQuantity <= 5;
  const isMaxStockReached = item.stockQuantity > 0 && item.quantity >= item.stockQuantity;

  return (
    <View style={styles.itemCard}>
      {/* ── Card Header ─────────────────────────────────────── */}
      <View style={styles.itemCardHeader}>
        <View style={styles.imgWrap}>
          {previewUri ? (
            <ExpoImage source={{ uri: previewUri }} style={styles.itemImage} contentFit="cover" />
          ) : (
            <View style={[styles.imgFallback, { backgroundColor: IconColors.ordersBg }]}>
              <Ionicons name="cube" size={28} color={IconColors.orders} />
            </View>
          )}
        </View>

        <View style={styles.itemInfoWrap}>
          <View style={styles.nameRow}>
            <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
            <Pressable onPress={onRemove} hitSlop={8} style={styles.removeBtn}>
              <Ionicons name="trash-outline" size={17} color={IconColors.danger} />
            </Pressable>
          </View>

          <View style={styles.metaRow}>
            {item.sku ? <Text style={styles.skuText}>SKU: {item.sku}</Text> : null}
            <Text style={styles.categoryBadge}>{item.category || 'Custom Product'}</Text>
          </View>

          <View style={styles.stockRow}>
            {isOutOfStock ? (
              <View style={[styles.stockBadge, styles.stockBadgeOut]}>
                <Ionicons name="close-circle" size={12} color="#DC2626" />
                <Text style={styles.stockTextOut}>Out of Stock</Text>
              </View>
            ) : isLowStock ? (
              <View style={[styles.stockBadge, styles.stockBadgeLow]}>
                <Ionicons name="alert-circle" size={12} color="#D97706" />
                <Text style={styles.stockTextLow}>Low Stock ({item.stockQuantity} left)</Text>
              </View>
            ) : (
              <View style={[styles.stockBadge, styles.stockBadgeIn]}>
                <View style={styles.stockDot} />
                <Text style={styles.stockTextIn}>In Stock</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* ── Customization Specs ──────────────────────────────── */}
      <View style={styles.customizationSection}>
        <Text style={styles.customizationHeading}>Customization</Text>
        <View style={styles.chipsWrap}>
          {item.selectedColor && (
            <View style={styles.chip}>
              <View style={[styles.colorDot, { backgroundColor: item.selectedColor }]} />
              <Text style={styles.chipLabel}>{item.selectedColorName || item.selectedColor}</Text>
            </View>
          )}
          {item.selectedSize && (
            <View style={styles.chip}>
              <Text style={styles.chipLabel}>{item.selectedSize}</Text>
            </View>
          )}
          {item.customization.placement && (
            <View style={styles.chip}>
              <Text style={styles.chipLabel}>{item.customization.placement}</Text>
            </View>
          )}
          {item.customization.text ? (
            <View style={[styles.chip, styles.chipTextCustom]}>
              <Text style={[styles.chipLabel, { color: BrandColors.primary }]} numberOfLines={1}>
                "{item.customization.text}"
              </Text>
              {item.customization.fontFamily && (
                <Text style={styles.fontSubtext}>({item.customization.fontFamily})</Text>
              )}
            </View>
          ) : null}
          {item.customization.imageUri ? (
            <View style={[styles.chip, styles.chipArtwork]}>
              <Text style={[styles.chipLabel, { color: '#7C3AED' }]}>Custom Artwork</Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* ── Price & Qty Controls ─────────────────────────────── */}
      <View style={styles.cardFooterRow}>
        <View style={styles.priceBreakdownWrap}>
          <Text style={styles.unitPriceText}>
            ₱{item.unitPrice.toFixed(2)}{' '}
            <Text style={styles.eachText}>/ unit</Text>
          </Text>
          {item.addonPrice > 0 && (
            <Text style={styles.addonBreakdownText}>
              Base ₱{item.basePrice.toFixed(2)} + Design ₱{item.addonPrice.toFixed(2)}
            </Text>
          )}
        </View>

        <View style={styles.stepperWrap}>
          <Pressable
            onPress={onDecrement}
            style={({ pressed }) => [styles.stepperBtn, pressed && { opacity: 0.6 }]}
            hitSlop={6}
          >
            <Ionicons
              name={item.quantity === 1 ? 'trash-outline' : 'remove'}
              size={15}
              color={item.quantity === 1 ? '#DC2626' : '#111827'}
            />
          </Pressable>
          <Text style={styles.quantityNumber}>{item.quantity}</Text>
          <Pressable
            onPress={onIncrement}
            disabled={isMaxStockReached}
            style={({ pressed }) => [
              styles.stepperBtn,
              isMaxStockReached && { opacity: 0.3 },
              pressed && { opacity: 0.6 },
            ]}
            hitSlop={6}
          >
            <Ionicons name="add" size={15} color="#111827" />
          </Pressable>
        </View>

        <View style={styles.lineTotalWrap}>
          <Text style={styles.lineTotalLabel}>Total</Text>
          <Text style={styles.lineTotalValue}>₱{item.totalPrice.toFixed(2)}</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBtnPlaceholder: { width: 38, height: 38 },
  clearBtn: { backgroundColor: '#FEE2E2' },
  headerTitleWrap: { alignItems: 'center' },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    fontFamily: 'Manrope_700Bold',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'Inter_400Regular',
  },

  // Loading overlay
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  loadingBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    gap: 14,
    minWidth: 140,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20, shadowOffset: { width: 0, height: 8 } },
      android: { elevation: 10 },
    }),
  },
  loadingLabel: {
    fontSize: 14,
    color: '#374151',
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
  },

  // Scroll
  scrollContainer: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },

  // Section header
  sectionHeaderRow: { marginBottom: 10 },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
    fontFamily: 'Manrope_700Bold',
  },

  // Item card
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6 },
      android: { elevation: 2 },
    }),
  },
  itemCardHeader: { flexDirection: 'row', gap: 12 },
  imgWrap: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
  },
  itemImage: { width: '100%', height: '100%' },
  imgFallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  itemInfoWrap: { flex: 1 },
  nameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  itemName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 18,
    flex: 1,
    marginRight: 6,
    fontFamily: 'Manrope_700Bold',
  },
  removeBtn: { padding: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  skuText: {
    fontSize: 11,
    color: '#6B7280',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  categoryBadge: {
    fontSize: 10,
    fontWeight: '600',
    color: '#4B5563',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    fontFamily: 'Inter_600SemiBold',
  },
  stockRow: { marginTop: 6 },
  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  stockBadgeIn: { backgroundColor: '#ECFDF5' },
  stockBadgeLow: { backgroundColor: '#FEF3C7' },
  stockBadgeOut: { backgroundColor: '#FEE2E2' },
  stockDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#059669' },
  stockTextIn: { fontSize: 10, fontWeight: '700', color: '#059669', fontFamily: 'Inter_600SemiBold' },
  stockTextLow: { fontSize: 10, fontWeight: '700', color: '#D97706', fontFamily: 'Inter_600SemiBold' },
  stockTextOut: { fontSize: 10, fontWeight: '700', color: '#DC2626', fontFamily: 'Inter_600SemiBold' },

  // Customization chips
  customizationSection: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#F3F4F6',
  },
  customizationHeading: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9CA3AF',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontFamily: 'Inter_600SemiBold',
  },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
  },
  chipTextCustom: { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' },
  chipArtwork: { backgroundColor: '#F5F3FF', borderColor: '#DDD6FE' },
  colorDot: { width: 9, height: 9, borderRadius: 4.5, borderWidth: 1, borderColor: 'rgba(0,0,0,0.15)' },
  chipLabel: { fontSize: 11, fontWeight: '600', color: '#374151', fontFamily: 'Inter_600SemiBold' },
  fontSubtext: { fontSize: 10, color: '#6B7280', fontFamily: 'Inter_400Regular' },

  // Footer row
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#F3F4F6',
  },
  priceBreakdownWrap: { flex: 1 },
  unitPriceText: { fontSize: 13, fontWeight: '800', color: '#111827', fontFamily: 'Manrope_700Bold' },
  eachText: { fontSize: 10, fontWeight: '400', color: '#6B7280' },
  addonBreakdownText: { fontSize: 10, color: '#059669', fontWeight: '600', marginTop: 1 },
  stepperWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
  },
  stepperBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
  },
  quantityNumber: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
    minWidth: 20,
    textAlign: 'center',
    fontFamily: 'Manrope_700Bold',
  },
  lineTotalWrap: { alignItems: 'flex-end', marginLeft: 10 },
  lineTotalLabel: { fontSize: 10, color: '#6B7280', fontFamily: 'Inter_400Regular' },
  lineTotalValue: { fontSize: 15, fontWeight: '900', color: BrandColors.primary, fontFamily: 'Manrope_700Bold' },

  // Perk card
  perkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 14,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  perkIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  perkTitle: { fontSize: 13, fontWeight: '700', color: '#111827', fontFamily: 'Manrope_700Bold' },
  perkDesc: { fontSize: 11, color: '#6B7280', lineHeight: 16, marginTop: 2, fontFamily: 'Inter_400Regular' },

  // Summary card
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
    marginBottom: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
  },
  summaryTitle: { fontSize: 15, fontWeight: '800', color: '#111827', marginBottom: 12, fontFamily: 'Manrope_700Bold' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  summaryLabel: { fontSize: 13, color: '#4B5563', fontFamily: 'Inter_400Regular' },
  summaryValue: { fontSize: 13, fontWeight: '700', color: '#111827', fontFamily: 'Manrope_700Bold' },
  summaryGreen: { fontSize: 12, fontWeight: '700', color: '#059669', fontFamily: 'Inter_600SemiBold' },
  addonTag: { backgroundColor: '#ECFDF5', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
  addonTagText: { fontSize: 9, fontWeight: '700', color: '#059669', fontFamily: 'Inter_600SemiBold' },
  summaryDivider: { height: StyleSheet.hairlineWidth, backgroundColor: '#E5E7EB', marginVertical: 10 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 16, fontWeight: '800', color: '#111827', fontFamily: 'Manrope_700Bold' },
  totalSubtext: { fontSize: 10, color: '#6B7280', marginTop: 1, fontFamily: 'Inter_400Regular' },
  totalValue: { fontSize: 20, fontWeight: '900', color: BrandColors.primary, fontFamily: 'Manrope_700Bold' },

  // Checkout button
  checkoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#111827',
    paddingVertical: 16,
    borderRadius: 14,
    marginBottom: 10,
  },
  checkoutBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    fontFamily: 'Manrope_700Bold',
  },
  continueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  continueBtnText: { fontSize: 13, fontWeight: '600', color: '#374151', fontFamily: 'Inter_600SemiBold' },

  // Empty state
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  emptyIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  emptyTitle: { fontSize: 19, fontWeight: '800', color: '#111827', marginBottom: 6, fontFamily: 'Manrope_700Bold' },
  emptySubtitle: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 24,
    fontFamily: 'Inter_400Regular',
  },
  browseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#111827',
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 14,
  },
  browseBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', fontFamily: 'Manrope_700Bold' },

  // Apple-style bottom sheet success modal
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheetCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingBottom: 36,
    paddingTop: 12,
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 30, shadowOffset: { width: 0, height: -4 } },
      android: { elevation: 20 },
    }),
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    marginBottom: 24,
  },
  sheetEmoji: {
    fontSize: 52,
    marginBottom: 12,
  },
  sheetTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    fontFamily: 'Manrope_700Bold',
    marginBottom: 6,
    textAlign: 'center',
  },
  sheetSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  sheetInfoBox: {
    width: '100%',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 24,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
  },
  sheetInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  sheetInfoDivider: { height: StyleSheet.hairlineWidth, backgroundColor: '#E5E7EB' },
  sheetInfoLabel: { fontSize: 14, color: '#6B7280', fontFamily: 'Inter_400Regular' },
  sheetInfoValue: { fontSize: 14, fontWeight: '700', color: '#111827', fontFamily: 'Manrope_700Bold' },
  sheetBtn: {
    width: '100%',
    backgroundColor: '#111827',
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  sheetBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700', fontFamily: 'Manrope_700Bold' },
  sheetSecondaryBtn: {
    width: '100%',
    paddingVertical: 12,
    alignItems: 'center',
  },
  sheetSecondaryBtnText: { fontSize: 15, fontWeight: '600', color: '#6B7280', fontFamily: 'Inter_600SemiBold' },

  // Delivery Address Card Styles
  addressLoadingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  addressLoadingText: {
    fontSize: 13,
    color: '#6B7280',
  },
  addressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 10,
  },
  addressCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addressCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  addressPsgcBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  addressPsgcBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  addressCardBody: {
    gap: 3,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 12,
  },
  addressRecipient: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
  },
  addressStreet: {
    fontSize: 13,
    color: '#374151',
  },
  addressRegion: {
    fontSize: 12,
    color: '#4B5563',
  },
  addressRegionSub: {
    fontSize: 11,
    color: '#6B7280',
  },
  addressInstructionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
  },
  addressInstructionText: {
    fontSize: 11.5,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  addressEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  addressEditBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: BrandColors.primary,
  },
  addressRequiredCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 14,
    marginVertical: 4,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 2 },
    }),
  },
  addressRequiredHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  addressRequiredIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressRequiredTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    fontFamily: 'Manrope_700Bold',
  },
  addressRequiredSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    lineHeight: 17,
    fontFamily: 'Inter_400Regular',
  },
  addressAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: BrandColors.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  addressAddBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Manrope_700Bold',
  },
});
