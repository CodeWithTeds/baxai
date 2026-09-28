import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

import { Product3DPreview } from '@/components/3d/Product3DPreview';
import { BrandColors } from '@/constants/theme';
import { useLanguage } from '@/contexts/language-context';

export const FONT_STYLES = [
  { id: 'sans', label: 'Modern', family: 'system-ui, -apple-system, sans-serif' },
  { id: 'serif', label: 'Serif', family: 'Georgia, Times New Roman, serif' },
  { id: 'bold', label: 'Bold', family: 'Impact, Arial Black, sans-serif' },
  { id: 'cursive', label: 'Cursive', family: '"Brush Script MT", "Caveat", cursive' },
  { id: 'mono', label: 'Retro', family: '"Courier New", Courier, monospace' },
  { id: 'playful', label: 'Playful', family: '"Comic Sans MS", "Chalkboard SE", sans-serif' },
];

export const TEXT_PALETTE = [
  { id: 'black', hex: '#111827', label: 'Black' },
  { id: 'white', hex: '#FFFFFF', label: 'White' },
  { id: 'gold', hex: '#D97706', label: 'Gold' },
  { id: 'red', hex: '#DC2626', label: 'Red' },
  { id: 'blue', hex: '#2563EB', label: 'Blue' },
  { id: 'green', hex: '#059669', label: 'Green' },
];

const FONT_SIZES = [
  { label: 'S', size: 48 },
  { label: 'M', size: 64 },
  { label: 'L', size: 84 },
  { label: 'XL', size: 104 },
];

export const PRESET_TEXTS = ['Custom Mug', 'Coffee First', 'Placides Co.', 'Best Boss'];

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
  const [customText, setCustomText] = useState('Custom Mug');
  const [selectedFont, setSelectedFont] = useState(FONT_STYLES[0].family);
  const [selectedTextColor, setSelectedTextColor] = useState('#111827');
  const [selectedFontSize, setSelectedFontSize] = useState(64);
  const [customImageUri, setCustomImageUri] = useState<string | null>(null);
  const [pickingImage, setPickingImage] = useState(false);

  // Logo / Design picker for both Web and Mobile devices
  const handlePickLogo = async () => {
    try {
      setPickingImage(true);
      if (Platform.OS === 'web') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e: any) => {
          const file = e.target?.files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
              if (event.target?.result) {
                setCustomImageUri(event.target.result as string);
              }
              setPickingImage(false);
            };
            reader.readAsDataURL(file);
          } else {
            setPickingImage(false);
          }
        };
        input.click();
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          alert('Photo library permission is needed to upload custom designs.');
          setPickingImage(false);
          return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          quality: 0.9,
        });
        if (!result.canceled && result.assets && result.assets.length > 0) {
          setCustomImageUri(result.assets[0].uri);
        }
        setPickingImage(false);
      }
    } catch (err) {
      console.warn('[ImagePicker] Error picking logo:', err);
      setPickingImage(false);
    }
  };

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
          {/* Live Customization Active Indicator */}
          {(customText.trim().length > 0 || customImageUri) ? (
            <View style={styles.liveDesignPill}>
              <View style={styles.liveDot} />
              <Text style={styles.liveDesignLabel} numberOfLines={1}>
                {customImageUri && customText.trim()
                  ? `Logo + "${customText.trim()}"`
                  : customImageUri
                  ? 'Custom Logo Active'
                  : `"${customText.trim()}"`}
              </Text>
            </View>
          ) : null}

          <View style={styles.pricePill}>
            <Text style={styles.priceText}>{price}</Text>
          </View>
          <Product3DPreview
            viewerType={viewerType}
            selectedColor={selectedColor}
            onColorChange={setSelectedColor}
            customText={customText}
            customTextColor={selectedTextColor}
            customFontFamily={selectedFont}
            customFontSize={selectedFontSize}
            customImageUri={customImageUri || undefined}
            height={360}
            label={name}
          />
        </View>

        {/* ── Customization Controls ─────────────────────────────────── */}
        <View style={styles.customizerSection}>
          {/* 1. Custom Text Input */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>1. Add Custom Text</Text>
            {customText ? (
              <Pressable onPress={() => setCustomText('')} hitSlop={8}>
                <Text style={styles.clearBtnText}>Clear text</Text>
              </Pressable>
            ) : null}
          </View>

          <TextInput
            style={styles.textInput}
            placeholder="Type your name or custom text here..."
            placeholderTextColor="#9CA3AF"
            value={customText}
            onChangeText={setCustomText}
            maxLength={40}
          />

          {/* Quick Preset Text Chips */}
          <View style={styles.presetRow}>
            {PRESET_TEXTS.map((p) => (
              <Pressable
                key={p}
                onPress={() => setCustomText(p)}
                style={styles.presetChip}>
                <Text style={styles.presetChipText}>{p}</Text>
              </Pressable>
            ))}
          </View>

          {/* 2. Choose Text Font */}
          <Text style={styles.subSectionTitle}>Choose Font Style</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {FONT_STYLES.map((f) => {
              const isSelected = selectedFont === f.family;
              return (
                <Pressable
                  key={f.id}
                  onPress={() => setSelectedFont(f.family)}
                  style={[styles.fontChip, isSelected && styles.fontChipActive]}>
                  <Text style={[styles.fontChipText, isSelected && styles.fontChipTextActive]}>
                    {f.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* 3. Text Color & Size Row */}
          <View style={styles.controlsRow}>
            {/* Color Swatches */}
            <View style={{ flex: 1 }}>
              <Text style={styles.subSectionTitle}>Text Color</Text>
              <View style={styles.textColorRow}>
                {TEXT_PALETTE.map((c) => {
                  const isSelected = selectedTextColor === c.hex;
                  return (
                    <Pressable
                      key={c.id}
                      onPress={() => setSelectedTextColor(c.hex)}
                      style={[
                        styles.textSwatch,
                        { backgroundColor: c.hex },
                        isSelected && styles.textSwatchActive,
                      ]}
                    />
                  );
                })}
              </View>
            </View>

            {/* Size Buttons */}
            <View>
              <Text style={styles.subSectionTitle}>Text Size</Text>
              <View style={styles.sizeBtnRow}>
                {FONT_SIZES.map((s) => {
                  const isSelected = selectedFontSize === s.size;
                  return (
                    <Pressable
                      key={s.label}
                      onPress={() => setSelectedFontSize(s.size)}
                      style={[styles.sizeBtn, isSelected && styles.sizeBtnActive]}>
                      <Text style={[styles.sizeBtnText, isSelected && styles.sizeBtnTextActive]}>
                        {s.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>

          {/* 4. Upload Logo or Design */}
          <View style={styles.divider} />
          <Text style={styles.sectionTitle}>2. Upload Logo or Artwork</Text>

          {customImageUri ? (
            <View style={styles.uploadedImageBox}>
              <ExpoImage source={{ uri: customImageUri }} style={styles.uploadedThumbnail} contentFit="contain" />
              <View style={{ flex: 1 }}>
                <Text style={styles.uploadedTitle}>Artwork Applied to 3D Model</Text>
                <Text style={styles.uploadedSubtitle}>Visible live on the model surface</Text>
              </View>
              <Pressable onPress={() => setCustomImageUri(null)} style={styles.removeImageBtn}>
                <Ionicons name="trash-outline" size={16} color="#DC2626" />
                <Text style={styles.removeImageText}>Remove</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={handlePickLogo}
              disabled={pickingImage}
              style={({ pressed }) => [styles.uploadBtn, pressed && { opacity: 0.8 }]}>
              {pickingImage ? (
                <ActivityIndicator size="small" color={BrandColors.primary} />
              ) : (
                <>
                  <Ionicons name="cloud-upload-outline" size={20} color={BrandColors.primary} />
                  <Text style={styles.uploadBtnText}>Upload Custom Image / Logo</Text>
                </>
              )}
            </Pressable>
          )}
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
  liveDesignPill: {
    position: 'absolute',
    top: 24,
    left: 24,
    zIndex: 10,
    backgroundColor: 'rgba(17, 24, 39, 0.88)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    maxWidth: '55%',
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10B981',
  },
  liveDesignLabel: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
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
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    fontFamily: 'Manrope_700Bold',
  },
  subSectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 6,
  },
  clearBtnText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '600',
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
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
    marginBottom: 6,
  },
  presetChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  presetChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4B5563',
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  fontChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  fontChipActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  fontChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  fontChipTextActive: {
    color: '#FFFFFF',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    marginTop: 4,
  },
  textColorRow: {
    flexDirection: 'row',
    gap: 8,
  },
  textSwatch: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  textSwatchActive: {
    borderWidth: 2.5,
    borderColor: '#111827',
    transform: [{ scale: 1.15 }],
  },
  sizeBtnRow: {
    flexDirection: 'row',
    gap: 4,
  },
  sizeBtn: {
    width: 32,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sizeBtnActive: {
    backgroundColor: BrandColors.primary,
    borderColor: BrandColors.primary,
  },
  sizeBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4B5563',
  },
  sizeBtnTextActive: {
    color: '#FFFFFF',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 4,
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
    paddingVertical: 14,
  },
  uploadBtnText: {
    color: BrandColors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  uploadedImageBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  uploadedThumbnail: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  uploadedTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  uploadedSubtitle: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '500',
  },
  removeImageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  removeImageText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '600',
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
