import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import ScreenHeader from '@/components/screen-header';
import { BrandColors } from '@/constants/theme';
import { createPrintOrder, fetchCustomerAddress, type CustomerAddress } from '@/utils/api';

type PaymentMethod = 'cod' | 'gcash';

export default function PrintOrderCheckoutScreen() {
  const params = useLocalSearchParams<{
    service_id: string;
    service_name: string;
    service_slug: string;
    specifications: string;
    quantity: string;
    is_rush: string;
    unit_price: string;
    subtotal: string;
    rush_fee: string;
    total: string;
  }>();
  const router = useRouter();

  const [file, setFile] = useState<{ uri: string; name: string; type: string; size: number } | null>(null);
  const [fulfillmentType, setFulfillmentType] = useState<'delivery' | 'pickup'>('delivery');
  const [address, setAddress] = useState<CustomerAddress | null>(null);
  const [loadingAddress, setLoadingAddress] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod');
  const [gcashReference, setGcashReference] = useState('');
  const [gcashScreenshot, setGcashScreenshot] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const specifications = JSON.parse(params.specifications || '[]');
  const quantity = parseInt(params.quantity || '1', 10);
  const isRush = params.is_rush === '1';
  const subtotal = parseFloat(params.subtotal || '0');
  const rushFee = parseFloat(params.rush_fee || '0');
  const shippingFee = fulfillmentType === 'delivery' ? 100 : 0;
  const total = subtotal + rushFee + shippingFee;

  useEffect(() => {
    loadAddress();
  }, []);

  const loadAddress = async () => {
    setLoadingAddress(true);
    try {
      const result = await fetchCustomerAddress();
      setAddress(result.address);
    } catch (err) {
      console.warn('[PrintOrderCheckout] Error loading address:', err);
    } finally {
      setLoadingAddress(false);
    }
  };

  const pickFile = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        quality: 1,
        allowsEditing: false,
      });

      if (result.canceled) return;

      const asset = result.assets[0];
      setFile({
        uri: asset.uri,
        name: asset.fileName || `file_${Date.now()}.jpg`,
        type: asset.mimeType || 'image/jpeg',
        size: asset.fileSize || 0,
      });
    } catch (err) {
      Alert.alert('Error', 'Failed to pick file. Please try again.');
    }
  };

  const pickGcashScreenshot = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: false,
      });

      if (result.canceled) return;

      const asset = result.assets[0];
      setGcashScreenshot({
        uri: asset.uri,
        name: 'gcash_screenshot.jpg',
        type: 'image/jpeg',
      });
    } catch (err) {
      Alert.alert('Error', 'Failed to pick screenshot. Please try again.');
    }
  };

  const handleSubmit = async () => {
    if (!file) {
      Alert.alert('File Required', 'Please upload a file to print.');
      return;
    }

    if (fulfillmentType === 'delivery' && !address) {
      Alert.alert('Address Required', 'Please add a delivery address in your profile.');
      return;
    }

    if (paymentMethod === 'gcash') {
      if (!gcashReference.trim()) {
        Alert.alert('GCash Reference Required', 'Please enter your GCash reference number.');
        return;
      }
      if (!gcashScreenshot) {
        Alert.alert('Screenshot Required', 'Please upload a screenshot of your GCash payment.');
        return;
      }
    }

    setSubmitting(true);
    try {
      const result = await createPrintOrder({
        service_id: parseInt(params.service_id, 10),
        specifications,
        quantity,
        fulfillment_type: fulfillmentType,
        customer_address_id: address?.id,
        payment_method: paymentMethod,
        gcash_reference_number: gcashReference.trim() || undefined,
        is_rush: isRush,
        notes: notes.trim() || undefined,
        file: file as any,
        gcash_screenshot: gcashScreenshot as any,
      });

      Alert.alert(
        'Order Placed!',
        `Your print order #${result.order_number || result.orderNumber} has been placed successfully.`,
        [
          {
            text: 'View Order',
            onPress: () => {
              router.replace({
                pathname: '/print-order-detail',
                params: { id: String(result.id) },
              } as any);
            },
          },
        ]
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to place print order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const isImageFile = file?.type?.startsWith('image/');

  return (
    <View style={styles.root}>
      <ScreenHeader />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Service</Text>
            <View style={styles.serviceCard}>
              <Ionicons name="print-outline" size={20} color={BrandColors.primary} />
              <View style={styles.serviceInfo}>
                <Text style={styles.serviceName}>{params.service_name}</Text>
                <Text style={styles.serviceSpecs}>
                  {specifications.map((s: any) => s.label).join(' • ')}
                </Text>
                <Text style={styles.serviceQty}>Qty: {quantity}</Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Upload File</Text>
            <Pressable onPress={pickFile} style={styles.uploadArea}>
              {file ? (
                <View style={styles.filePreview}>
                  {isImageFile ? (
                    <Image source={{ uri: file.uri }} style={styles.fileImage} />
                  ) : (
                    <View style={styles.fileIconWrap}>
                      <Ionicons name="document-text" size={32} color={BrandColors.primary} />
                    </View>
                  )}
                  <View style={styles.fileInfo}>
                    <Text style={styles.fileName} numberOfLines={1}>{file.name}</Text>
                    <Text style={styles.fileSize}>{(file.size / 1024 / 1024).toFixed(2)} MB</Text>
                  </View>
                  <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                </View>
              ) : (
                <View style={styles.uploadPlaceholder}>
                  <Ionicons name="cloud-upload-outline" size={40} color="#9CA3AF" />
                  <Text style={styles.uploadText}>Tap to upload your file</Text>
                  <Text style={styles.uploadSubtext}>PDF, PNG, JPG, AI, PSD, DOCX, SVG</Text>
                </View>
              )}
            </Pressable>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Fulfillment</Text>
            <View style={styles.fulfillmentRow}>
              <Pressable
                onPress={() => setFulfillmentType('delivery')}
                style={[styles.fulfillmentOption, fulfillmentType === 'delivery' && styles.fulfillmentSelected]}>
                <Ionicons
                  name="bicycle-outline"
                  size={20}
                  color={fulfillmentType === 'delivery' ? BrandColors.primary : '#6B7280'}
                />
                <Text style={[styles.fulfillmentText, fulfillmentType === 'delivery' && styles.fulfillmentTextSelected]}>
                  Delivery
                </Text>
                {fulfillmentType === 'delivery' && <Text style={styles.fulfillmentFee}>+₱100</Text>}
              </Pressable>
              <Pressable
                onPress={() => setFulfillmentType('pickup')}
                style={[styles.fulfillmentOption, fulfillmentType === 'pickup' && styles.fulfillmentSelected]}>
                <Ionicons
                  name="storefront-outline"
                  size={20}
                  color={fulfillmentType === 'pickup' ? BrandColors.primary : '#6B7280'}
                />
                <Text style={[styles.fulfillmentText, fulfillmentType === 'pickup' && styles.fulfillmentTextSelected]}>
                  Store Pickup
                </Text>
                {fulfillmentType === 'pickup' && <Text style={styles.fulfillmentFree}>Free</Text>}
              </Pressable>
            </View>
            {fulfillmentType === 'delivery' && (
              <View style={styles.addressCard}>
                {loadingAddress ? (
                  <ActivityIndicator size="small" color={BrandColors.primary} />
                ) : address ? (
                  <>
                    <View style={styles.addressHeader}>
                      <Ionicons name="location-outline" size={16} color={BrandColors.primary} />
                      <Text style={styles.addressLabel}>Delivery Address</Text>
                    </View>
                    <Text style={styles.addressText}>
                      {address.recipient_name} • {address.phone_number}
                    </Text>
                    <Text style={styles.addressText}>
                      {address.formatted_address || `${address.street_address}, ${address.barangay_name}, ${address.city_name}`}
                    </Text>
                  </>
                ) : (
                  <Text style={styles.noAddress}>No address found. Please add one in your profile.</Text>
                )}
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment Method</Text>
            <View style={styles.paymentRow}>
              <Pressable
                onPress={() => setPaymentMethod('cod')}
                style={[styles.paymentOption, paymentMethod === 'cod' && styles.paymentSelected]}>
                <Ionicons
                  name="cash-outline"
                  size={20}
                  color={paymentMethod === 'cod' ? BrandColors.primary : '#6B7280'}
                />
                <Text style={[styles.paymentText, paymentMethod === 'cod' && styles.paymentTextSelected]}>
                  Cash on Delivery
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setPaymentMethod('gcash')}
                style={[styles.paymentOption, paymentMethod === 'gcash' && styles.paymentSelected]}>
                <Ionicons
                  name="phone-portrait-outline"
                  size={20}
                  color={paymentMethod === 'gcash' ? BrandColors.primary : '#6B7280'}
                />
                <Text style={[styles.paymentText, paymentMethod === 'gcash' && styles.paymentTextSelected]}>
                  GCash
                </Text>
              </Pressable>
            </View>

            {paymentMethod === 'gcash' && (
              <View style={styles.gcashSection}>
                <TextInput
                  style={styles.gcashInput}
                  placeholder="GCash Reference Number"
                  value={gcashReference}
                  onChangeText={setGcashReference}
                  placeholderTextColor="#9CA3AF"
                />
                <Pressable onPress={pickGcashScreenshot} style={styles.screenshotBtn}>
                  {gcashScreenshot ? (
                    <View style={styles.screenshotPreview}>
                      <Image source={{ uri: gcashScreenshot.uri }} style={styles.screenshotImage} />
                      <Text style={styles.screenshotText}>Screenshot uploaded</Text>
                      <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                    </View>
                  ) : (
                    <>
                      <Ionicons name="camera-outline" size={20} color={BrandColors.primary} />
                      <Text style={styles.screenshotBtnText}>Upload Payment Screenshot</Text>
                    </>
                  )}
                </Pressable>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes (Optional)</Text>
            <TextInput
              style={styles.notesInput}
              placeholder="Any special instructions..."
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.priceCard}>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Subtotal</Text>
              <Text style={styles.priceValue}>₱{subtotal.toFixed(2)}</Text>
            </View>
            {isRush && rushFee > 0 && (
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Rush Fee</Text>
                <Text style={styles.priceValue}>₱{rushFee.toFixed(2)}</Text>
              </View>
            )}
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>
                {fulfillmentType === 'delivery' ? 'Shipping' : 'Pickup'}
              </Text>
              <Text style={styles.priceValue}>
                {shippingFee > 0 ? `₱${shippingFee.toFixed(2)}` : 'Free'}
              </Text>
            </View>
            <View style={[styles.priceRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>₱{total.toFixed(2)}</Text>
            </View>
          </View>
        </Animated.View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          onPress={handleSubmit}
          disabled={submitting}
          style={({ pressed }) => [styles.submitBtn, (pressed || submitting) && styles.submitBtnDisabled]}>
          {submitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
              <Text style={styles.submitBtnText}>Place Print Order</Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  scroll: {
    paddingBottom: 100,
  },
  content: {
    padding: 16,
    gap: 20,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  serviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  serviceInfo: {
    flex: 1,
    gap: 2,
  },
  serviceName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  serviceSpecs: {
    fontSize: 12,
    color: '#6B7280',
  },
  serviceQty: {
    fontSize: 12,
    color: '#6B7280',
  },
  uploadArea: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  uploadPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  uploadText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  uploadSubtext: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  filePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  fileImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  fileIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  fileSize: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  fulfillmentRow: {
    flexDirection: 'row',
    gap: 10,
  },
  fulfillmentOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  fulfillmentSelected: {
    borderColor: BrandColors.primary,
    backgroundColor: '#EFF6FF',
  },
  fulfillmentText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  fulfillmentTextSelected: {
    color: BrandColors.primary,
    fontWeight: '600',
  },
  fulfillmentFee: {
    fontSize: 12,
    color: '#6B7280',
  },
  fulfillmentFree: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
  },
  addressCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addressLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  addressText: {
    fontSize: 13,
    color: '#6B7280',
  },
  noAddress: {
    fontSize: 13,
    color: '#EF4444',
  },
  paymentRow: {
    flexDirection: 'row',
    gap: 10,
  },
  paymentOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  paymentSelected: {
    borderColor: BrandColors.primary,
    backgroundColor: '#EFF6FF',
  },
  paymentText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  paymentTextSelected: {
    color: BrandColors.primary,
    fontWeight: '600',
  },
  gcashSection: {
    gap: 10,
    marginTop: 4,
  },
  gcashInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    color: '#111827',
  },
  screenshotBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  screenshotBtnText: {
    fontSize: 14,
    fontWeight: '500',
    color: BrandColors.primary,
  },
  screenshotPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  screenshotImage: {
    width: 32,
    height: 32,
    borderRadius: 6,
  },
  screenshotText: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
  },
  notesInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    color: '#111827',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  priceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  priceValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 10,
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '800',
    color: BrandColors.primary,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: -3 },
      },
      android: { elevation: 10 },
    }),
  },
  submitBtn: {
    backgroundColor: BrandColors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
