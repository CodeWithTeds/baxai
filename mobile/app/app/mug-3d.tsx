import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Product3DPreview } from '@/components/3d/Product3DPreview';
import { BrandColors } from '@/constants/theme';
import { useLanguage } from '@/contexts/language-context';

export default function Mug3DScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    name?: string;
    price?: string;
    sku?: string;
    stock?: string;
    viewer_type?: string;
    category?: string;
    description?: string;
  }>();

  const name = params.name || 'Coffee Mugs';
  const price = params.price || '₱99.00';
  const sku = params.sku || 'MUG-COFFEE';
  const stock = params.stock !== undefined ? params.stock : '30';
  const viewerType = (params.viewer_type || 'coffee_cup').toLowerCase();
  const category = params.category || 'mugs';
  const description = params.description || 'Custom product with vibrant high-resolution printing.';

  const { t } = useLanguage();
  const [selectedColor, setSelectedColor] = useState('#FFFFFF');
  const [customText, setCustomText] = useState('');

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
          hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color="#111827" />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          3D Customizer — {name}
        </Text>
        <Pressable
          onPress={() => router.push('/(tabs)/services' as any)}
          style={({ pressed }) => [styles.headerCart, pressed && { opacity: 0.6 }]}>
          <Ionicons name="bag-outline" size={20} color={BrandColors.primary} />
        </Pressable>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* 3D Stage Card */}
        <View style={styles.stageCard}>
          <View style={styles.pricePill}>
            <Text style={styles.priceText}>{price}</Text>
          </View>
          <Product3DPreview
            viewerType={viewerType}
            selectedColor={selectedColor}
            onColorChange={setSelectedColor}
            height={360}
            label={name}
          />
        </View>

        {/* Customization Options Bar */}
        <View style={styles.customizerSection}>
          {/* Custom Text Input */}
          <Text style={styles.sectionTitle}>1. Add Custom Text / Name</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Type custom text to print..."
            placeholderTextColor="#9CA3AF"
            value={customText}
            onChangeText={setCustomText}
            maxLength={30}
          />

          {/* Upload Logo / Image Button */}
          <Text style={styles.sectionTitle}>2. Upload Logo or Design</Text>
          <Pressable
            onPress={() => alert('Logo Upload: Select image from device gallery to place on 3D model.')}
            style={({ pressed }) => [styles.uploadBtn, pressed && { opacity: 0.8 }]}>
            <Ionicons name="cloud-upload-outline" size={20} color={BrandColors.primary} />
            <Text style={styles.uploadBtnText}>Upload Custom Image / Logo</Text>
          </Pressable>
        </View>

        {/* Product Details Sheet */}
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <View style={{ flex: 1 }}>
              <View style={styles.badgeRow}>
                <View style={[styles.badge, { backgroundColor: BrandColors.primary }]}>
                  <Ionicons name="star" size={10} color="#fff" />
                  <Text style={styles.badgeText}>{category.toUpperCase()}</Text>
                </View>
                {sku ? (
                  <View style={[styles.badge, { backgroundColor: '#4B5563' }]}>
                    <Text style={styles.badgeText}>SKU: {sku}</Text>
                  </View>
                ) : null}
                <View style={[styles.badge, { backgroundColor: Number(stock) > 0 ? '#059669' : '#DC2626' }]}>
                  <Text style={styles.badgeText}>Stock: {stock}</Text>
                </View>
              </View>
              <Text style={styles.title}>{name}</Text>
              <Text style={styles.subtitle} numberOfLines={3}>{description}</Text>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <View style={styles.priceBlock}>
              <Text style={styles.priceLabel}>Total Price</Text>
              <Text style={styles.price}>{price}</Text>
            </View>
            <Pressable
              onPress={() => alert(`Customized ${name} (${price}) added to cart!`)}
              style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.9 }]}>
              <Text style={styles.primaryText}>Add Customized Item</Text>
              <Ionicons name="cart-outline" size={18} color="#fff" />
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 52 : 16,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 12,
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    fontFamily: 'Manrope_700Bold',
  },
  headerCart: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: 32,
  },
  stageCard: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    position: 'relative',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  pricePill: {
    position: 'absolute',
    top: 24,
    right: 24,
    zIndex: 10,
    backgroundColor: BrandColors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  priceText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  // Customizer Section
  customizerSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 14,
    padding: 16,
    borderRadius: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    fontFamily: 'Manrope_700Bold',
  },
  textInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: BrandColors.primary,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 12,
  },
  uploadBtnText: {
    color: BrandColors.primary,
    fontSize: 14,
    fontWeight: '700',
  },

  sheet: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 16,
    padding: 16,
    gap: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sheetHeader: { gap: 8 },
  badgeRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 4 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  title: { fontSize: 20, fontWeight: '700', color: '#111827', fontFamily: 'Manrope_700Bold' },
  subtitle: { fontSize: 13, color: '#6B7280', lineHeight: 18 },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  priceBlock: { gap: 2 },
  priceLabel: { fontSize: 11, color: '#9CA3AF' },
  price: { fontSize: 20, fontWeight: '800', color: BrandColors.primary, fontFamily: 'Manrope_700Bold' },
  primaryBtn: {
    backgroundColor: BrandColors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primaryText: { color: '#fff', fontSize: 14, fontWeight: '700', fontFamily: 'Manrope_700Bold' },
});
