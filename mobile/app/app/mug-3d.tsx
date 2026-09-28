import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  PanResponder,
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
  { id: 'sans',    label: 'Modern',  family: 'system-ui, -apple-system, sans-serif',         sample: 'Aa' },
  { id: 'serif',   label: 'Serif',   family: 'Georgia, Times New Roman, serif',               sample: 'Aa' },
  { id: 'bold',    label: 'Bold',    family: 'Impact, Arial Black, sans-serif',                sample: 'Aa' },
  { id: 'cursive', label: 'Cursive', family: '"Brush Script MT", "Caveat", cursive',           sample: 'Aa' },
  { id: 'mono',    label: 'Retro',   family: '"Courier New", Courier, monospace',              sample: 'Aa' },
  { id: 'playful', label: 'Playful', family: '"Comic Sans MS", "Chalkboard SE", sans-serif',  sample: 'Aa' },
];

export const TEXT_PALETTE = [
  { id: 'black', hex: '#111827', label: 'Black' },
  { id: 'white', hex: '#FFFFFF', label: 'White' },
  { id: 'gold',  hex: '#D97706', label: 'Gold' },
  { id: 'red',   hex: '#DC2626', label: 'Red' },
  { id: 'blue',  hex: '#2563EB', label: 'Blue' },
  { id: 'green', hex: '#059669', label: 'Green' },
  { id: 'pink',  hex: '#EC4899', label: 'Pink' },
  { id: 'purple',hex: '#7C3AED', label: 'Purple' },
];

export const PRESET_TEXTS = ['Custom Mug', 'Coffee First', 'Placides Co.', 'Best Boss', '☕ Love'];

// ─── Smooth Drag Slider ───────────────────────────────────────────────────────
function DragSlider({
  label,
  value,
  min,
  max,
  step = 1,
  onValueChange,
  leftIcon,
  rightIcon,
  formatValue,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onValueChange: (v: number) => void;
  leftIcon?: string;
  rightIcon?: string;
  formatValue?: (v: number) => string;
}) {
  const trackWidthRef = useRef(1);
  const startValueRef = useRef(value);

  const clamp = (v: number) => Math.max(min, Math.min(max, v));
  const snap = (v: number) => Math.round(v / step) * step;

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        startValueRef.current = value;
      },
      onPanResponderMove: (_, gs) => {
        const delta = (gs.dx / trackWidthRef.current) * (max - min);
        onValueChange(clamp(snap(startValueRef.current + delta)));
      },
    })
  ).current;

  const ratio = Math.max(0, Math.min(1, (value - min) / (max - min)));

  return (
    <View style={sliderStyles.wrapper}>
      <View style={sliderStyles.labelRow}>
        <Text style={sliderStyles.label}>{label}</Text>
        <Text style={sliderStyles.val}>{formatValue ? formatValue(value) : value}</Text>
      </View>
      <View style={sliderStyles.trackRow}>
        {leftIcon ? (
          <Ionicons name={leftIcon as any} size={16} color="#9CA3AF" style={{ marginRight: 6 }} />
        ) : null}
        <View
          style={sliderStyles.trackOuter}
          onLayout={(e) => {
            trackWidthRef.current = e.nativeEvent.layout.width;
          }}
          {...pan.panHandlers}
        >
          {/* Filled track */}
          <View style={[sliderStyles.trackFill, { width: `${ratio * 100}%` as any }]} />
          {/* Thumb */}
          <View
            style={[
              sliderStyles.thumb,
              { left: `${ratio * 100}%` as any, transform: [{ translateX: -12 }] },
            ]}
          />
        </View>
        {rightIcon ? (
          <Ionicons name={rightIcon as any} size={20} color="#9CA3AF" style={{ marginLeft: 6 }} />
        ) : null}
      </View>
    </View>
  );
}

const sliderStyles = StyleSheet.create({
  wrapper: { gap: 4 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 12, fontWeight: '600', color: '#4B5563' },
  val: {
    fontSize: 12,
    fontWeight: '700',
    color: BrandColors.primary,
    minWidth: 32,
    textAlign: 'right',
  },
  trackRow: { flexDirection: 'row', alignItems: 'center' },
  trackOuter: {
    flex: 1,
    height: 44,
    justifyContent: 'center',
    position: 'relative',
  },
  trackFill: {
    position: 'absolute',
    left: 0,
    height: 6,
    backgroundColor: BrandColors.primary,
    borderRadius: 3,
    zIndex: 1,
  },
  thumb: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: BrandColors.primary,
    zIndex: 2,
    top: 10,
    ...Platform.select({
      web: { boxShadow: '0 2px 6px rgba(0,0,0,0.18)' } as any,
      default: { shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 4, elevation: 4 },
    }),
  },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
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

  const name        = params.name        || 'Coffee Mugs';
  const price       = params.price       || '₱99.00';
  const sku         = params.sku         || 'MUG-COFFEE';
  const stock       = params.stock       !== undefined ? params.stock : '30';
  const viewerType  = (params.viewer_type || 'coffee_cup').toLowerCase();
  const category    = params.category    || 'mugs';
  const description = params.description || 'Custom product with vibrant high-resolution printing.';

  const { t } = useLanguage();
  const [selectedColor, setSelectedColor]     = useState('#FFFFFF');
  const [customText, setCustomText]           = useState('');
  const [selectedFont, setSelectedFont]       = useState(FONT_STYLES[0].family);
  const [selectedTextColor, setSelectedTextColor] = useState('#111827');
  const [customFontSize, setCustomFontSize]   = useState(64);
  const [textYOffset, setTextYOffset]         = useState(0);
  const [customImageUri, setCustomImageUri]   = useState<string | null>(null);
  const [pickingImage, setPickingImage]       = useState(false);

  // ─── Image picker ─────────────────────────────────────────────────────────
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
              if (event.target?.result) setCustomImageUri(event.target.result as string);
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
        if (!result.canceled && result.assets?.length > 0) {
          setCustomImageUri(result.assets[0].uri);
        }
        setPickingImage(false);
      }
    } catch (err) {
      console.warn('[ImagePicker] Error picking logo:', err);
      setPickingImage(false);
    }
  };

  const hasDesign = customText.trim().length > 0 || !!customImageUri;

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.headerBtn, pressed && { opacity: 0.6 }]}
          hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color="#111827" />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          3D Customizer — {name}
        </Text>
        <Pressable
          onPress={() => router.push('/(tabs)/services' as any)}
          style={({ pressed }) => [styles.headerBtn, { backgroundColor: '#EFF6FF' }, pressed && { opacity: 0.6 }]}>
          <Ionicons name="bag-outline" size={20} color={BrandColors.primary} />
        </Pressable>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* ── 3D Stage ─────────────────────────────────────────────────────── */}
        <View style={styles.stageCard}>
          {hasDesign && (
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
          )}
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
            customFontSize={customFontSize}
            customTextYOffset={textYOffset}
            customImageUri={customImageUri || undefined}
            height={360}
            label={name}
          />

          {/* Drag hint */}
          <View style={styles.hintRow}>
            <Ionicons name="hand-left-outline" size={13} color="#9CA3AF" />
            <Text style={styles.hintText}>Drag on model to rotate</Text>
          </View>
        </View>

        {/* ── Text Studio ──────────────────────────────────────────────────── */}
        <View style={styles.card}>
          {/* Header row */}
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="text" size={16} color={BrandColors.primary} />
              <Text style={styles.sectionTitle}>Text</Text>
            </View>
            {customText ? (
              <Pressable onPress={() => setCustomText('')} hitSlop={8}>
                <Text style={styles.clearBtn}>✕ Clear</Text>
              </Pressable>
            ) : null}
          </View>

          {/* Text input */}
          <TextInput
            style={styles.textInput}
            placeholder="Type your text here…"
            placeholderTextColor="#9CA3AF"
            value={customText}
            onChangeText={setCustomText}
            maxLength={40}
            returnKeyType="done"
          />

          {/* Preset chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {PRESET_TEXTS.map((p) => (
              <Pressable
                key={p}
                onPress={() => setCustomText(p)}
                style={[styles.presetChip, customText === p && styles.presetChipActive]}>
                <Text style={[styles.presetChipText, customText === p && styles.presetChipTextActive]}>{p}</Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Font style — big tap targets with sample text */}
          <Text style={styles.subLabel}>Font Style</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {FONT_STYLES.map((f) => {
              const isSelected = selectedFont === f.family;
              return (
                <Pressable
                  key={f.id}
                  onPress={() => setSelectedFont(f.family)}
                  style={[styles.fontCard, isSelected && styles.fontCardActive]}>
                  <Text style={[styles.fontSample, { fontFamily: undefined }, isSelected && styles.fontSampleActive]}>
                    Aa
                  </Text>
                  <Text style={[styles.fontLabel, isSelected && styles.fontLabelActive]}>{f.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Text color */}
          <Text style={styles.subLabel}>Text Color</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.chipRow, { gap: 10 }]}>
            {TEXT_PALETTE.map((c) => {
              const isSelected = selectedTextColor === c.hex;
              return (
                <Pressable
                  key={c.id}
                  onPress={() => setSelectedTextColor(c.hex)}
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: c.hex },
                    c.hex === '#FFFFFF' && styles.colorSwatchWhite,
                    isSelected && styles.colorSwatchActive,
                  ]}>
                  {isSelected && (
                    <Ionicons name="checkmark" size={14} color={c.hex === '#FFFFFF' ? '#111827' : '#fff'} />
                  )}
                </Pressable>
              );
            })}
          </ScrollView>

          {/* ── DRAG SLIDERS ── */}
          <View style={styles.divider} />

          {/* Font size slider */}
          <DragSlider
            label="Text Size"
            value={customFontSize}
            min={28}
            max={120}
            step={2}
            onValueChange={setCustomFontSize}
            leftIcon="remove-circle-outline"
            rightIcon="add-circle-outline"
            formatValue={(v) => `${v}px`}
          />

          {/* Vertical position slider */}
          <DragSlider
            label="Position on Product"
            value={Math.round(textYOffset * 100)}
            min={-50}
            max={50}
            step={1}
            onValueChange={(v) => setTextYOffset(v / 100)}
            leftIcon="arrow-down-outline"
            rightIcon="arrow-up-outline"
            formatValue={(v) => (v === 0 ? 'Center' : v > 0 ? `+${v}%` : `${v}%`)}
          />

          {/* Reset position */}
          {(textYOffset !== 0 || customFontSize !== 64) && (
            <Pressable
              onPress={() => { setTextYOffset(0); setCustomFontSize(64); }}
              style={styles.resetBtn}>
              <Ionicons name="refresh-outline" size={13} color="#6B7280" />
              <Text style={styles.resetBtnText}>Reset size & position</Text>
            </Pressable>
          )}
        </View>

        {/* ── Logo / Artwork ────────────────────────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="image-outline" size={16} color={BrandColors.primary} />
            <Text style={styles.sectionTitle}>Logo / Artwork</Text>
          </View>

          {customImageUri ? (
            <View style={styles.uploadedBox}>
              <ExpoImage source={{ uri: customImageUri }} style={styles.uploadedThumb} contentFit="contain" />
              <View style={{ flex: 1 }}>
                <Text style={styles.uploadedTitle}>Artwork applied ✓</Text>
                <Text style={styles.uploadedSub}>Visible on the 3D model surface</Text>
              </View>
              <Pressable onPress={() => setCustomImageUri(null)} style={styles.removeBtn}>
                <Ionicons name="trash-outline" size={16} color="#DC2626" />
                <Text style={styles.removeBtnText}>Remove</Text>
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
                  <Ionicons name="cloud-upload-outline" size={22} color={BrandColors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.uploadBtnTitle}>Upload Logo or Image</Text>
                    <Text style={styles.uploadBtnSub}>PNG, JPG, GIF supported</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={BrandColors.primary} />
                </>
              )}
            </Pressable>
          )}
        </View>

        {/* ── Product Sheet ─────────────────────────────────────────────────── */}
        <View style={styles.card}>
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
          <Text style={styles.productName}>{name}</Text>
          <Text style={styles.productDesc} numberOfLines={3}>{description}</Text>

          <View style={styles.actionsRow}>
            <View>
              <Text style={styles.priceLabel}>Total Price</Text>
              <Text style={styles.priceValue}>{price}</Text>
            </View>
            <Pressable
              onPress={() => alert(`Customized ${name} (${price}) added to cart!`)}
              style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.9 }]}>
              <Text style={styles.addBtnText}>Add to Cart</Text>
              <Ionicons name="cart-outline" size={18} color="#fff" />
            </Pressable>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F3F4F6' },

  // Header
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
  headerBtn: {
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
    marginHorizontal: 10,
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    fontFamily: 'Manrope_700Bold',
  },

  scrollContent: { paddingBottom: 40 },

  // Stage
  stageCard: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    position: 'relative',
    ...Platform.select({
      web: { boxShadow: '0 2px 8px rgba(0,0,0,0.05)' } as any,
      default: { shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
    }),
  },
  liveDesignPill: {
    position: 'absolute',
    top: 14,
    left: 14,
    zIndex: 10,
    backgroundColor: 'rgba(17,24,39,0.88)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    maxWidth: '55%',
  },
  liveDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#10B981' },
  liveDesignLabel: { color: '#fff', fontSize: 11, fontWeight: '700' },
  pricePill: {
    position: 'absolute',
    top: 14,
    right: 14,
    zIndex: 10,
    backgroundColor: BrandColors.primary,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
  },
  priceText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingBottom: 10,
  },
  hintText: { fontSize: 11, color: '#9CA3AF' },

  // Generic card
  card: {
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
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827', fontFamily: 'Manrope_700Bold' },
  clearBtn: { fontSize: 12, color: '#DC2626', fontWeight: '600' },
  subLabel: { fontSize: 12, fontWeight: '600', color: '#4B5563', marginBottom: -4 },

  // Text input
  textInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
  },

  // Presets
  chipRow: { flexDirection: 'row', gap: 8, paddingVertical: 2 },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  presetChipActive: { backgroundColor: '#111827', borderColor: '#111827' },
  presetChipText: { fontSize: 12, fontWeight: '600', color: '#4B5563' },
  presetChipTextActive: { color: '#FFFFFF' },

  // Font cards
  fontCard: {
    width: 68,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    gap: 2,
  },
  fontCardActive: { backgroundColor: '#EFF6FF', borderColor: BrandColors.primary },
  fontSample: { fontSize: 20, color: '#374151' },
  fontSampleActive: { color: BrandColors.primary },
  fontLabel: { fontSize: 10, fontWeight: '600', color: '#6B7280' },
  fontLabelActive: { color: BrandColors.primary },

  // Color swatches
  colorSwatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorSwatchWhite: { borderWidth: 1.5, borderColor: '#D1D5DB' },
  colorSwatchActive: { borderWidth: 2.5, borderColor: '#111827', transform: [{ scale: 1.15 }] },

  // Divider
  divider: { height: 1, backgroundColor: '#F3F4F6' },

  // Reset button
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  resetBtnText: { fontSize: 12, color: '#6B7280', fontWeight: '600' },

  // Upload / logo
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: BrandColors.primary,
    borderStyle: 'dashed',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  uploadBtnTitle: { fontSize: 14, fontWeight: '700', color: BrandColors.primary },
  uploadBtnSub: { fontSize: 11, color: '#60A5FA', marginTop: 1 },
  uploadedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  uploadedThumb: { width: 52, height: 52, borderRadius: 10, backgroundColor: '#fff' },
  uploadedTitle: { fontSize: 13, fontWeight: '700', color: '#111827' },
  uploadedSub: { fontSize: 11, color: '#059669', fontWeight: '500', marginTop: 2 },
  removeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 6 },
  removeBtnText: { fontSize: 12, color: '#DC2626', fontWeight: '600' },

  // Product sheet
  badgeRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  productName: { fontSize: 20, fontWeight: '700', color: '#111827', fontFamily: 'Manrope_700Bold' },
  productDesc: { fontSize: 13, color: '#6B7280', lineHeight: 18 },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  priceLabel: { fontSize: 11, color: '#9CA3AF' },
  priceValue: { fontSize: 22, fontWeight: '800', color: BrandColors.primary, fontFamily: 'Manrope_700Bold' },
  addBtn: {
    backgroundColor: BrandColors.primary,
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addBtnText: { color: '#fff', fontSize: 14, fontWeight: '700', fontFamily: 'Manrope_700Bold' },
});
