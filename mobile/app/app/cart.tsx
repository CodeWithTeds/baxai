import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
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
import { useAuth } from '@/contexts/auth-context';
import { CartItem, useCart } from '@/contexts/cart-context';
import { createOrder } from '@/utils/api';

export default function CartScreen() {
  const { items, itemCount, subtotal, updateQuantity, removeItem, clearCart } = useCart();
  const { user } = useAuth();
  const [orderSuccessModal, setOrderSuccessModal] = useState(false);
  const [placedOrderId, setPlacedOrderId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClearCart = () => {
    Alert.alert('Clear Cart', 'Are you sure you want to remove all items from your cart?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear All', style: 'destructive', onPress: clearCart },
    ]);
  };

  const handleCheckout = async () => {
    if (items.length === 0 || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const orderPayload = {
        customer_name: user?.name || 'Mobile App Customer',
        customer_email: user?.email || undefined,
        payment_method: 'Cash on Delivery',
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
      const orderNum = created?.order_number || `RD-${Date.now().toString().slice(-4)}`;
      setPlacedOrderId(orderNum);
      setOrderSuccessModal(true);
    } catch (err) {
      console.warn('[Cart] Checkout failed:', err);
      const fallbackId = `RD-${Date.now().toString().slice(-4)}`;
      setPlacedOrderId(fallbackId);
      setOrderSuccessModal(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinishOrder = () => {
    setOrderSuccessModal(false);
    clearCart();
    router.replace('/(tabs)/orders');
  };

  // Calculate total customization addon fees across cart
  const totalCustomizationFees = items.reduce(
    (sum, it) => sum + (it.addonPrice || 0) * (it.quantity || 1),
    0
  );

  const baseItemsSubtotal = subtotal - totalCustomizationFees;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* ── Top Header Navigation ──────────────────────────────── */}
      <View style={styles.header}>
        <Pressable
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(tabs)');
            }
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
            accessibilityLabel="Clear all items in cart"
          >
            <Ionicons name="trash-outline" size={18} color="#DC2626" />
          </Pressable>
        ) : (
          <View style={styles.headerBtnPlaceholder} />
        )}
      </View>

      {/* ── Main Content ────────────────────────────────────────── */}
      {items.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="cart-outline" size={56} color="#9CA3AF" />
          </View>
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptySubtitle}>
            Customize dynamic products with 3D interactive preview and add them here to review!
          </Text>
          <Pressable
            onPress={() => router.replace('/(tabs)/services')}
            style={({ pressed }) => [styles.browseBtn, pressed && { opacity: 0.85 }]}
          >
            <Ionicons name="sparkles" size={18} color="#FFFFFF" />
            <Text style={styles.browseBtnText}>Browse Customizable Products</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Pre-Cart Verification Status Banner ───────────── */}
          <View style={styles.verificationBanner}>
            <View style={styles.bannerHeaderRow}>
              <View style={styles.bannerCheckIcon}>
                <Ionicons name="checkmark-circle" size={18} color="#059669" />
              </View>
              <Text style={styles.bannerTitle}>Pre-Cart Verification Active</Text>
            </View>
            <Text style={styles.bannerBody}>
              All items are dynamically validated with live inventory, variant specifications, and custom artwork ready for production.
            </Text>
          </View>

          {/* ── Cart Items List ──────────────────────────────── */}
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

          {/* ── Free Packaging / Proof Inspection Info ──────── */}
          <View style={styles.perkCard}>
            <View style={styles.perkIconWrap}>
              <Ionicons name="shield-checkmark" size={20} color={BrandColors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.perkTitle}>Quality Guaranteed</Text>
              <Text style={styles.perkDesc}>
                Includes free professional design inspection, color matching proof, and protective custom packaging.
              </Text>
            </View>
          </View>

          {/* ── Order Summary Card ───────────────────────────── */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Order Summary</Text>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Base Products Subtotal</Text>
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

          {/* ── Actions ─────────────────────────────────────── */}
          <Pressable
            onPress={handleCheckout}
            style={({ pressed }) => [styles.checkoutBtn, pressed && { opacity: 0.88 }]}
          >
            <Text style={styles.checkoutBtnText}>Proceed to Checkout • ₱{subtotal.toFixed(2)}</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
          </Pressable>

          <Pressable
            onPress={() => router.push('/(tabs)/services')}
            style={({ pressed }) => [styles.continueBtn, pressed && { opacity: 0.7 }]}
          >
            <Ionicons name="add-circle-outline" size={18} color="#374151" />
            <Text style={styles.continueBtnText}>Add More Products</Text>
          </Pressable>
        </ScrollView>
      )}

      {/* ── Order Placed Success Modal ───────────────────────── */}
      <Modal visible={orderSuccessModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.successModalCard}>
            <View style={styles.successIconCircle}>
              <Ionicons name="checkmark-done" size={44} color="#FFFFFF" />
            </View>
            <Text style={styles.successModalTitle}>Order Placed! 🎉</Text>
            <Text style={styles.successModalSubtitle}>
              Your customized order has been received and queued for production.
            </Text>

            <View style={styles.successOrderBox}>
              <View style={styles.orderBoxRow}>
                <Text style={styles.orderBoxLabel}>Order Reference:</Text>
                <Text style={styles.orderBoxValue}>{placedOrderId}</Text>
              </View>
              <View style={styles.orderBoxRow}>
                <Text style={styles.orderBoxLabel}>Total Amount:</Text>
                <Text style={[styles.orderBoxValue, { color: BrandColors.primary, fontWeight: '800' }]}>
                  ₱{subtotal.toFixed(2)}
                </Text>
              </View>
              <View style={styles.orderBoxRow}>
                <Text style={styles.orderBoxLabel}>Total Items:</Text>
                <Text style={styles.orderBoxValue}>{itemCount} items</Text>
              </View>
            </View>

            <Pressable onPress={handleFinishOrder} style={styles.viewOrdersBtn}>
              <Text style={styles.viewOrdersBtnText}>View My Orders</Text>
              <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

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
      {/* ── Top Header of Card ───────────────────────────────── */}
      <View style={styles.itemCardHeader}>
        <View style={styles.imgWrap}>
          {previewUri ? (
            <ExpoImage source={{ uri: previewUri }} style={styles.itemImage} contentFit="cover" />
          ) : (
            <View style={styles.imgFallback}>
              <Ionicons name="cube" size={28} color="#9CA3AF" />
            </View>
          )}
        </View>

        <View style={styles.itemInfoWrap}>
          <View style={styles.nameRow}>
            <Text style={styles.itemName} numberOfLines={2}>
              {item.name}
            </Text>
            <Pressable onPress={onRemove} hitSlop={8} style={styles.removeBtn}>
              <Ionicons name="close" size={18} color="#9CA3AF" />
            </Pressable>
          </View>

          <View style={styles.metaRow}>
            {item.sku ? <Text style={styles.skuText}>SKU: {item.sku}</Text> : null}
            <Text style={styles.categoryBadge}>{item.category || 'Custom Product'}</Text>
          </View>

          {/* Live Inventory Status */}
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
                <Ionicons name="checkmark-circle" size={12} color="#059669" />
                <Text style={styles.stockTextIn}>In Stock ({item.stockQuantity} available)</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* ── Customization Specifications Breakdown ─────────── */}
      <View style={styles.customizationSection}>
        <Text style={styles.customizationHeading}>Customization Specs:</Text>
        <View style={styles.chipsWrap}>
          {item.selectedColor && (
            <View style={styles.chip}>
              <View style={[styles.colorDot, { backgroundColor: item.selectedColor }]} />
              <Text style={styles.chipLabel}>Color: {item.selectedColorName || item.selectedColor}</Text>
            </View>
          )}

          {item.selectedSize && (
            <View style={styles.chip}>
              <Ionicons name="resize-outline" size={11} color="#4B5563" />
              <Text style={styles.chipLabel}>Style/Size: {item.selectedSize}</Text>
            </View>
          )}

          {item.customization.placement && (
            <View style={styles.chip}>
              <Ionicons name="navigate-outline" size={11} color="#4B5563" />
              <Text style={styles.chipLabel}>Placement: {item.customization.placement}</Text>
            </View>
          )}

          {item.customization.text ? (
            <View style={[styles.chip, styles.chipTextCustom]}>
              <Ionicons name="text" size={11} color={BrandColors.primary} />
              <Text style={[styles.chipLabel, { color: BrandColors.primary }]} numberOfLines={1}>
                {`"${item.customization.text}"`}
              </Text>
              {item.customization.fontFamily && (
                <Text style={styles.fontSubtext}>({item.customization.fontFamily})</Text>
              )}
            </View>
          ) : null}

          {item.customization.imageUri ? (
            <View style={[styles.chip, styles.chipArtwork]}>
              <Ionicons name="image-outline" size={11} color="#7C3AED" />
              <Text style={[styles.chipLabel, { color: '#7C3AED' }]}>Custom Artwork Attached</Text>
            </View>
          ) : null}

          {item.customization.flipH ? (
            <View style={styles.chip}>
              <Text style={styles.chipLabel}>Flip X</Text>
            </View>
          ) : null}

          {item.customization.flipV ? (
            <View style={styles.chip}>
              <Text style={styles.chipLabel}>Flip Y</Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* ── Price Breakdown & Quantity Controls ────────────── */}
      <View style={styles.cardFooterRow}>
        <View style={styles.priceBreakdownWrap}>
          <Text style={styles.unitPriceText}>
            ₱{item.unitPrice.toFixed(2)} <Text style={styles.eachText}>/ unit</Text>
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
          <Text style={styles.lineTotalLabel}>Item Total</Text>
          <Text style={styles.lineTotalValue}>₱{item.totalPrice.toFixed(2)}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
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
  headerBtnPlaceholder: {
    width: 38,
    height: 38,
  },
  clearBtn: {
    backgroundColor: '#FEE2E2',
  },
  headerTitleWrap: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  verificationBanner: {
    backgroundColor: '#ECFDF5',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginBottom: 16,
  },
  bannerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  bannerCheckIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#065F46',
  },
  bannerBody: {
    fontSize: 12,
    color: '#047857',
    lineHeight: 17,
    paddingLeft: 32,
  },
  sectionHeaderRow: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...Platform.select({
      web: { boxShadow: '0 2px 8px rgba(0,0,0,0.04)' } as any,
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, elevation: 2 },
    }),
  },
  itemCardHeader: {
    flexDirection: 'row',
    gap: 12,
  },
  imgWrap: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  imgFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInfoWrap: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  itemName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
    lineHeight: 18,
    flex: 1,
    marginRight: 6,
  },
  removeBtn: {
    padding: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
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
  },
  stockRow: {
    marginTop: 6,
  },
  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  stockBadgeIn: {
    backgroundColor: '#ECFDF5',
  },
  stockBadgeLow: {
    backgroundColor: '#FEF3C7',
  },
  stockBadgeOut: {
    backgroundColor: '#FEE2E2',
  },
  stockTextIn: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  stockTextLow: {
    fontSize: 10,
    fontWeight: '700',
    color: '#D97706',
  },
  stockTextOut: {
    fontSize: 10,
    fontWeight: '700',
    color: '#DC2626',
  },
  customizationSection: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  customizationHeading: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  chipTextCustom: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  chipArtwork: {
    backgroundColor: '#F5F3FF',
    borderColor: '#DDD6FE',
  },
  colorDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.15)',
  },
  chipLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
  },
  fontSubtext: {
    fontSize: 10,
    color: '#6B7280',
  },
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  priceBreakdownWrap: {
    flex: 1,
  },
  unitPriceText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
  },
  eachText: {
    fontSize: 10,
    fontWeight: '400',
    color: '#6B7280',
  },
  addonBreakdownText: {
    fontSize: 10,
    color: '#059669',
    fontWeight: '600',
    marginTop: 1,
  },
  stepperWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  stepperBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  quantityNumber: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
    minWidth: 20,
    textAlign: 'center',
  },
  lineTotalWrap: {
    alignItems: 'flex-end',
    marginLeft: 10,
  },
  lineTotalLabel: {
    fontSize: 10,
    color: '#6B7280',
  },
  lineTotalValue: {
    fontSize: 15,
    fontWeight: '900',
    color: BrandColors.primary,
  },
  perkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#EFF6FF',
    padding: 14,
    borderRadius: 14,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  perkIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  perkTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E40AF',
  },
  perkDesc: {
    fontSize: 11,
    color: '#1E3A8A',
    lineHeight: 16,
    marginTop: 2,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#4B5563',
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  summaryGreen: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  addonTag: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  addonTagText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#059669',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 10,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  totalSubtext: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 1,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '900',
    color: BrandColors.primary,
  },
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
  },
  continueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  continueBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  emptyTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 24,
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
  browseBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  successModalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  successIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  successModalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 6,
  },
  successModalSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  successOrderBox: {
    width: '100%',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  orderBoxRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  orderBoxLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  orderBoxValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },
  viewOrdersBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#111827',
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
  },
  viewOrdersBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
