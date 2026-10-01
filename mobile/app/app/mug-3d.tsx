import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import {
  CustomizationPlacement,
  getProductPlacementOptions,
} from '@/components/3d/model-customizer';
import { CartHeaderButton } from '@/components/cart-header-button';
import { BrandColors } from '@/constants/theme';
import { useCart } from '@/contexts/cart-context';
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

export const PRODUCT_BODY_COLORS = [
  { id: 'white', hex: '#FFFFFF', label: 'White' },
  { id: 'black', hex: '#111827', label: 'Black' },
  { id: 'navy',  hex: '#0052CC', label: 'Navy' },
  { id: 'red',   hex: '#DC2626', label: 'Red' },
  { id: 'green', hex: '#059669', label: 'Green' },
  { id: 'gold',  hex: '#D97706', label: 'Amber' },
];

export const PRESET_TEXTS = ['Custom Mug', 'Coffee First', 'Placides Co.', 'Best Boss', '☕ Love'];

// ─── Precision Stepper & Manual Numeric Input Control ─────────────────────────
function StepperInputControl({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  onValueChange,
  leftIcon,
  rightIcon,
  formatValue,
  quickPresets,
  subtitle,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onValueChange: (v: number) => void;
  leftIcon?: string;
  rightIcon?: string;
  formatValue?: (v: number) => string;
  quickPresets?: { label: string; value: number }[];
  subtitle?: string;
}) {
  const [textInputVal, setTextInputVal] = useState(String(value));
  const [isFocused, setIsFocused] = useState(false);

  // Synchronize local input text when value changes externally
  useEffect(() => {
    if (!isFocused) {
      setTextInputVal(String(value));
    }
  }, [value, isFocused]);

  const clamp = (v: number) => Math.max(min, Math.min(max, v));

  const handleStep = (delta: number) => {
    const raw = Math.round((value + delta) / step) * step;
    const next = clamp(raw);
    onValueChange(next);
    setTextInputVal(String(next));
  };

  const handleTextChange = (text: string) => {
    setTextInputVal(text);
    if (text === '' || text === '-' || text === '.') return;
    const num = parseFloat(text);
    if (!isNaN(num)) {
      onValueChange(clamp(num));
    }
  };

  const handleCommitText = () => {
    setIsFocused(false);
    const num = parseFloat(textInputVal);
    if (isNaN(num)) {
      setTextInputVal(String(value));
    } else {
      const clamped = clamp(num);
      onValueChange(clamped);
      setTextInputVal(String(clamped));
    }
  };

  const ratio = Math.max(0, Math.min(1, (value - min) / (max - min)));

  return (
    <View style={stepperStyles.wrapper}>
      {/* Header with Title & Live Formatted Badge */}
      <View style={stepperStyles.labelRow}>
        <View style={stepperStyles.titleGroup}>
          {leftIcon ? (
            <Ionicons name={leftIcon as any} size={16} color={BrandColors.primary} style={{ marginRight: 6 }} />
          ) : null}
          <Text style={stepperStyles.label}>{label}</Text>
        </View>
        <View style={stepperStyles.valBadge}>
          <Text style={stepperStyles.valText}>
            {formatValue ? formatValue(value) : `${value}${unit}`}
          </Text>
        </View>
      </View>

      {subtitle ? <Text style={stepperStyles.subtitle}>{subtitle}</Text> : null}

      {/* Main Stepper Controls: [- Button] [ Manual Number Input ] [+ Button] */}
      <View style={stepperStyles.controlRow}>
        {/* Minus Stepper Button */}
        <Pressable
          onPress={() => handleStep(-step)}
          disabled={value <= min}
          style={({ pressed }) => [
            stepperStyles.stepBtn,
            value <= min && stepperStyles.stepBtnDisabled,
            pressed && stepperStyles.stepBtnPressed,
          ]}
          hitSlop={6}
          accessibilityLabel={`Decrease ${label}`}
        >
          <Ionicons
            name="remove"
            size={22}
            color={value <= min ? '#9CA3AF' : BrandColors.primary}
          />
        </Pressable>

        {/* Manual Editable Number Field */}
        <View style={[stepperStyles.inputContainer, isFocused && stepperStyles.inputContainerFocused]}>
          <TextInput
            style={stepperStyles.textInput}
            value={textInputVal}
            onChangeText={handleTextChange}
            onFocus={() => setIsFocused(true)}
            onBlur={handleCommitText}
            onSubmitEditing={handleCommitText}
            keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'numeric'}
            returnKeyType="done"
            selectTextOnFocus
            placeholder={String(value)}
            placeholderTextColor="#9CA3AF"
          />
          {unit ? <Text style={stepperStyles.unitLabel}>{unit}</Text> : null}
        </View>

        {/* Plus Stepper Button */}
        <Pressable
          onPress={() => handleStep(step)}
          disabled={value >= max}
          style={({ pressed }) => [
            stepperStyles.stepBtn,
            value >= max && stepperStyles.stepBtnDisabled,
            pressed && stepperStyles.stepBtnPressed,
          ]}
          hitSlop={6}
          accessibilityLabel={`Increase ${label}`}
        >
          <Ionicons
            name="add"
            size={22}
            color={value >= max ? '#9CA3AF' : BrandColors.primary}
          />
        </Pressable>
      </View>

      {/* Visual Fill Progress Track */}
      <View style={stepperStyles.progressRow}>
        <Text style={stepperStyles.rangeText}>{min}{unit}</Text>
        <View style={stepperStyles.progressTrack}>
          <View style={[stepperStyles.progressFill, { width: `${ratio * 100}%` as any }]} />
        </View>
        <Text style={stepperStyles.rangeText}>{max}{unit}</Text>
      </View>

      {/* Quick Selection Presets */}
      {quickPresets && quickPresets.length > 0 && (
        <View style={stepperStyles.presetRow}>
          {quickPresets.map((p) => {
            const isSelected = Math.abs(value - p.value) < 0.01;
            return (
              <Pressable
                key={p.label}
                onPress={() => {
                  onValueChange(p.value);
                  setTextInputVal(String(p.value));
                }}
                style={[stepperStyles.presetChip, isSelected && stepperStyles.presetChipActive]}
              >
                <Text style={[stepperStyles.presetChipText, isSelected && stepperStyles.presetChipTextActive]}>
                  {p.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

const stepperStyles = StyleSheet.create({
  wrapper: {
    gap: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
    fontFamily: 'Manrope_700Bold',
  },
  valBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  valText: {
    fontSize: 12,
    fontWeight: '700',
    color: BrandColors.primary,
  },
  subtitle: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: -4,
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 2,
  },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: { boxShadow: '0 1px 3px rgba(0,0,0,0.08)' } as any,
      default: { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 3, elevation: 2 },
    }),
  },
  stepBtnPressed: {
    backgroundColor: '#EFF6FF',
    borderColor: BrandColors.primary,
    transform: [{ scale: 0.96 }],
  },
  stepBtnDisabled: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
    opacity: 0.4,
  },
  inputContainer: {
    flex: 1,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  inputContainerFocused: {
    borderColor: BrandColors.primary,
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      web: { boxShadow: '0 0 0 3px rgba(0,82,204,0.15)' } as any,
    }),
  },
  textInput: {
    flex: 1,
    height: 40,
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    padding: 0,
  },
  unitLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
    marginLeft: 4,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: BrandColors.primary,
    borderRadius: 3,
  },
  rangeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#9CA3AF',
    minWidth: 26,
    textAlign: 'center',
  },
  presetRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
    marginTop: 4,
  },
  presetChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  presetChipActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  presetChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4B5563',
  },
  presetChipTextActive: {
    color: '#FFFFFF',
  },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function Mug3DScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id?: string;
    name?: string;
    price?: string;
    sku?: string;
    stock?: string;
    viewer_type?: string;
    category?: string;
    description?: string;
    customization_addon_price?: string;
    max_text_length?: string;
    thumbnail?: string;
    fallback_image?: string;
  }>();

  const name        = params.name        || 'Coffee Mugs';
  const price       = params.price       || '₱99.00';
  const sku         = params.sku         || 'MUG-COFFEE';
  const stock       = params.stock       !== undefined ? params.stock : '30';
  const viewerType  = (params.viewer_type || 'coffee_cup').toLowerCase();
  const category    = params.category    || 'mugs';
  const description = params.description || 'Custom product with vibrant high-resolution printing.';

  const isShirt =
    viewerType.includes('shirt') ||
    category.includes('apparel') ||
    category.includes('shirt') ||
    name.toLowerCase().includes('shirt') ||
    name.toLowerCase().includes('tee');

  const presetList = isShirt
    ? ['Custom Tee', 'Placides Co.', 'Stay Real', 'Vintage', 'Original']
    : PRESET_TEXTS;

  const { t } = useLanguage();

  // Dynamic placement options tailored to product's 3D geometry
  const placementConfig = getProductPlacementOptions(viewerType, category);

  // Customization state
  const [placement, setPlacement] = useState<CustomizationPlacement>(placementConfig.defaultPlacement);
  const [selectedColor, setSelectedColor] = useState('#FFFFFF');
  const [customText, setCustomText] = useState('');
  const [selectedFont, setSelectedFont] = useState(FONT_STYLES[0].family);
  const [selectedTextColor, setSelectedTextColor] = useState('#111827');
  const [customFontSize, setCustomFontSize] = useState(64);
  const [textYOffset, setTextYOffset] = useState(0); // -0.45 to 0.45
  const [offsetX, setOffsetX] = useState(0); // -0.45 to 0.45
  const [designRotation, setDesignRotation] = useState(0); // 0 to 360
  const [designScale, setDesignScale] = useState(1.0); // 0.5 to 1.8
  const [wrapSpan, setWrapSpan] = useState(270); // 90 to 360 degrees
  const [wrapHeight, setWrapHeight] = useState(0.75); // 0.2 to 1.0
  const [wrapRotation, setWrapRotation] = useState(0); // 0 to 360 degrees
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const { addItem } = useCart();
  const [customImageUri, setCustomImageUri] = useState<string | null>(null);
  const [pickingImage, setPickingImage] = useState(false);

  const hasDesign = Boolean(customText.trim() || customImageUri);
  const currentPlacementOption =
    placementConfig.options.find((o) => o.id === placement) || placementConfig.options[0];

  const rawPriceStr = String(price || '99.00').replace(/[^0-9.]/g, '');
  const basePriceNum = parseFloat(rawPriceStr) || 99.00;
  const rawAddonStr = String(params.customization_addon_price || '0').replace(/[^0-9.]/g, '');
  const addonPriceNum = hasDesign ? (parseFloat(rawAddonStr) || 0) : 0;
  const stockNum = parseInt(String(stock), 10) || 30;
  const displayTotal = `₱${(basePriceNum + addonPriceNum).toFixed(2)}`;

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
              if (event.target?.result) {
                setCustomImageUri(event.target.result as string);
                // Make uploaded image prominently sized by default
                setDesignScale(1.3);
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
        if (!result.canceled && result.assets?.length > 0) {
          setCustomImageUri(result.assets[0].uri);
          // Make uploaded image prominently sized by default
          setDesignScale(1.3);
        }
        setPickingImage(false);
      }
    } catch (err) {
      console.warn('[ImagePicker] Error picking logo:', err);
      setPickingImage(false);
    }
  };

  const handleAddToCart = () => {
    if (stockNum <= 0) {
      Alert.alert('Out of Stock', 'Sorry, this product is currently out of stock.');
      return;
    }
    const maxLen = params.max_text_length ? parseInt(String(params.max_text_length), 10) : 300;
    if (customText.length > maxLen) {
      Alert.alert('Text Limit Exceeded', `Custom text must be at most ${maxLen} characters (currently ${customText.length}).`);
      return;
    }

    const unitPrice = Number((basePriceNum + addonPriceNum).toFixed(2));
    addItem({
      productId: params.id || sku || name,
      name,
      category,
      sku: sku || undefined,
      bannerImage: params.thumbnail || params.fallback_image || null,
      viewerType,
      basePrice: basePriceNum,
      addonPrice: addonPriceNum,
      unitPrice,
      quantity: 1,
      totalPrice: unitPrice,
      selectedColor,
      selectedColorName: selectedColorObj?.label || selectedColor,
      customization: {
        text: customText.trim() || undefined,
        fontFamily: selectedFont,
        textColor: selectedTextColor,
        fontSize: customFontSize,
        imageUri: customImageUri || undefined,
        rotation: designRotation,
        flipH,
        flipV,
        placement,
      },
      stockQuantity: stockNum,
    });

    router.push('/cart');
  };

  const selectedColorObj = PRODUCT_BODY_COLORS.find(
    (c) => c.hex.toLowerCase() === selectedColor.toLowerCase()
  );

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
        <CartHeaderButton tintColor="#111827" />
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* ── 3D Stage ─────────────────────────────────────────────────────── */}
        <View style={styles.stageCard}>
          {hasDesign && (
            <View style={styles.liveDesignPill}>
              <View style={styles.liveDot} />
              <Text style={styles.liveDesignLabel} numberOfLines={1}>
                {placement === 'wrap'
                  ? '🔄 Wrap Around Active'
                  : `${currentPlacementOption.shortLabel.toUpperCase()} • ${customImageUri && customText.trim() ? 'Logo + Text' : customImageUri ? 'Logo' : `"${customText.trim()}"`}`}
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
            placement={placement}
            customOffsetX={offsetX}
            customRotation={designRotation}
            customScale={designScale}
            wrapSpan={wrapSpan}
            wrapHeight={wrapHeight}
            wrapRotation={wrapRotation}
            customFlipX={flipH}
            customFlipY={flipV}
            height={360}
            label={name}
          />

          {/* Drag hint */}
          <View style={styles.hintRow}>
            <Ionicons name="hand-left-outline" size={13} color="#9CA3AF" />
            <Text style={styles.hintText}>Drag on model to rotate in full 3D</Text>
          </View>
        </View>

        {/* ── 1. Logo / Artwork (Upload Photo) ──────────────────────────────── */}
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
                <Text style={styles.uploadedSub}>Visible on the 3D product surface</Text>
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
                    <Text style={styles.uploadBtnSub}>PNG, JPG, SVG supported</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={BrandColors.primary} />
                </>
              )}
            </Pressable>
          )}
        </View>

        {/* ── 2. Custom Text Studio ─────────────────────────────────────────── */}
        <View style={styles.card}>
          {/* Header row */}
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="text" size={16} color={BrandColors.primary} />
              <Text style={styles.sectionTitle}>Custom Text</Text>
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
            {presetList.map((p) => (
              <Pressable
                key={p}
                onPress={() => setCustomText(p)}
                style={[styles.presetChip, customText === p && styles.presetChipActive]}>
                <Text style={[styles.presetChipText, customText === p && styles.presetChipTextActive]}>{p}</Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Font style */}
          <Text style={styles.subLabel}>Font Style</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {FONT_STYLES.map((f) => {
              const isSelected = selectedFont === f.family;
              return (
                <Pressable
                  key={f.id}
                  onPress={() => setSelectedFont(f.family)}
                  style={[styles.fontCard, isSelected && styles.fontCardActive]}>
                  <Text style={[styles.fontSample, isSelected && styles.fontSampleActive]}>
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

          <View style={styles.divider} />

          {/* Font size */}
          <StepperInputControl
            label="Font Size"
            value={customFontSize}
            min={20}
            max={160}
            step={4}
            unit="px"
            onValueChange={setCustomFontSize}
            leftIcon="text-outline"
            rightIcon="text"
            formatValue={(v) => `${v}px`}
            quickPresets={[
              { label: 'Small (40px)', value: 40 },
              { label: 'Medium (64px)', value: 64 },
              { label: 'Large (96px)', value: 96 },
              { label: 'Jumbo (128px)', value: 128 },
            ]}
            subtitle="Change text font size with + / - or direct input."
          />
        </View>

        {/* ── 3. Printable Placement Selection ──────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="layers-outline" size={17} color={BrandColors.primary} />
              <Text style={styles.sectionTitle}>Printable Placement</Text>
            </View>
            <View style={styles.activePlacementPill}>
              <Text style={styles.activePlacementPillText}>
                {currentPlacementOption.label}
              </Text>
            </View>
          </View>
          <Text style={styles.subHintText}>
            Select where your custom design will be printed on the 3D product surface.
          </Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.placementScroll}>
            {placementConfig.options.map((opt) => {
              const isSelected = placement === opt.id;
              const isWrapOpt = opt.id === 'wrap';
              return (
                <Pressable
                  key={opt.id}
                  onPress={() => setPlacement(opt.id)}
                  style={[
                    styles.placementBtn,
                    isSelected && styles.placementBtnActive,
                    isWrapOpt && !isSelected && styles.placementBtnWrap,
                  ]}>
                  <Ionicons
                    name={opt.icon as any}
                    size={18}
                    color={isSelected ? '#FFFFFF' : isWrapOpt ? BrandColors.primary : '#4B5563'}
                  />
                  <Text
                    style={[
                      styles.placementBtnText,
                      isSelected && styles.placementBtnTextActive,
                      isWrapOpt && !isSelected && styles.placementBtnTextWrap,
                    ]}>
                    {opt.shortLabel}
                  </Text>
                  {isWrapOpt && (
                    <View style={[styles.wrapBadge, isSelected && { backgroundColor: '#FFFFFF' }]}>
                      <Text style={[styles.wrapBadgeText, isSelected && { color: BrandColors.primary }]}>
                        360°
                      </Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* ── 4. Flexible Wrap Around Customization ─────────────────────────── */}
        {placement === 'wrap' && (
          <View style={[styles.card, styles.wrapCardHighlight]}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="sync-circle" size={19} color={BrandColors.primary} />
                <Text style={[styles.sectionTitle, { color: BrandColors.primary }]}>
                  Flexible Wrap Around Controls
                </Text>
              </View>
              <Pressable
                onPress={() => {
                  setTextYOffset(0);
                  setWrapSpan(270);
                  setWrapHeight(0.75);
                  setWrapRotation(0);
                  setDesignScale(1.0);
                }}
                hitSlop={8}>
                  <Text style={styles.clearBtn}>Reset Wrap</Text>
              </Pressable>
            </View>

            <View style={styles.wrapInfoBanner}>
              <Ionicons name="information-circle-outline" size={16} color="#1D4ED8" />
              <Text style={styles.wrapInfoText}>
                The design wraps seamlessly around the 3D surface. Adjust vertical position, band height, and coverage angle below.
              </Text>
            </View>

            {/* 1. Vertical Position */}
            <StepperInputControl
              label="Vertical Position (Up / Down)"
              value={Math.round(textYOffset * 100)}
              min={-45}
              max={45}
              step={5}
              unit="%"
              onValueChange={(v) => setTextYOffset(v / 100)}
              leftIcon="arrow-down-outline"
              rightIcon="arrow-up-outline"
              formatValue={(v) => (v === 0 ? 'Center (0%)' : v > 0 ? `Near Top (+${v}%)` : `Lower (${v}%)`)}
              quickPresets={[
                { label: 'Near Top (+25%)', value: 25 },
                { label: 'Center (0%)', value: 0 },
                { label: 'Lower Portion (-25%)', value: -25 },
              ]}
              subtitle="Use + / - buttons or type % to adjust vertical height."
            />

            <View style={styles.divider} />

            {/* 2. Wrap Coverage / Span */}
            <StepperInputControl
              label="Wrap Around Coverage (Arc Span)"
              value={wrapSpan}
              min={60}
              max={360}
              step={15}
              unit="°"
              onValueChange={setWrapSpan}
              leftIcon="pie-chart-outline"
              rightIcon="refresh-circle-outline"
              formatValue={(v) => `${v}° ${v >= 355 ? '(Full 360°)' : v >= 265 ? '(Handle-to-Handle)' : '(Half)'}`}
              quickPresets={[
                { label: '180° Half', value: 180 },
                { label: '270° Handle-to-Handle', value: 270 },
                { label: '360° Full Wrap', value: 360 },
              ]}
              subtitle="Set coverage degrees around circumference."
            />

            <View style={styles.divider} />

            {/* 3. Wrap Band Height */}
            <StepperInputControl
              label="Wrap Band Height / Thickness"
              value={Math.round(wrapHeight * 100)}
              min={20}
              max={100}
              step={5}
              unit="%"
              onValueChange={(v) => setWrapHeight(v / 100)}
              leftIcon="resize-outline"
              rightIcon="expand-outline"
              formatValue={(v) => `${v}%`}
              quickPresets={[
                { label: 'Slim Ribbon (40%)', value: 40 },
                { label: 'Standard (75%)', value: 75 },
                { label: 'Full Height (100%)', value: 100 },
              ]}
              subtitle="Set vertical print band thickness."
            />

            <View style={styles.divider} />

            {/* 4. Wrap Rotation around object */}
            <StepperInputControl
              label="Rotate Wrap Around Product"
              value={wrapRotation}
              min={0}
              max={360}
              step={15}
              unit="°"
              onValueChange={setWrapRotation}
              leftIcon="refresh-outline"
              rightIcon="sync-outline"
              formatValue={(v) => `${v}°`}
              quickPresets={[
                { label: '0° Front', value: 0 },
                { label: '90° Left', value: 90 },
                { label: '180° Back', value: 180 },
                { label: '270° Right', value: 270 },
              ]}
              subtitle="Rotate pattern around product body."
            />
          </View>
        )}

        {/* ── 5. Directional Placement & Fine Adjustment ─────────────────────── */}
        {placement !== 'wrap' && (
          <View style={styles.card}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="move-outline" size={17} color={BrandColors.primary} />
                <Text style={styles.sectionTitle}>Position & Size</Text>
              </View>
              {(textYOffset !== 0 || offsetX !== 0 || designScale !== 1.0 || designRotation !== 0 || flipH || flipV) && (
                <Pressable
                  onPress={() => {
                    setTextYOffset(0);
                    setOffsetX(0);
                    setDesignScale(1.0);
                    setDesignRotation(0);
                    setFlipH(false);
                    setFlipV(false);
                  }}
                  hitSlop={8}>
                  <Text style={styles.clearBtn}>Reset</Text>
                </Pressable>
              )}
            </View>

            {/* Vertical Position */}
            <StepperInputControl
              label="Vertical Position (Up / Down)"
              value={Math.round(textYOffset * 100)}
              min={-45}
              max={45}
              step={5}
              unit="%"
              onValueChange={(v) => setTextYOffset(v / 100)}
              leftIcon="arrow-down-outline"
              rightIcon="arrow-up-outline"
              formatValue={(v) => (v === 0 ? 'Center (0%)' : v > 0 ? `Top (+${v}%)` : `Bottom (${v}%)`)}
              quickPresets={[
                { label: 'Top (+25%)', value: 25 },
                { label: 'Center (0%)', value: 0 },
                { label: 'Bottom (-25%)', value: -25 },
              ]}
              subtitle="Move position vertically with + / - or direct number."
            />

            <View style={styles.divider} />

            {/* Horizontal Position / Shift */}
            <StepperInputControl
              label="Horizontal Position (Left / Right)"
              value={Math.round(offsetX * 100)}
              min={-45}
              max={45}
              step={5}
              unit="%"
              onValueChange={(v) => setOffsetX(v / 100)}
              leftIcon="arrow-back-outline"
              rightIcon="arrow-forward-outline"
              formatValue={(v) => (v === 0 ? 'Center (0%)' : v > 0 ? `Right (+${v}%)` : `Left (${v}%)`)}
              quickPresets={[
                { label: 'Left (-20%)', value: -20 },
                { label: 'Center (0%)', value: 0 },
                { label: 'Right (+20%)', value: 20 },
              ]}
              subtitle="Shift position horizontally."
            />

            <View style={styles.divider} />

            {/* Scale / Size */}
            <StepperInputControl
              label="Design Scale / Size"
              value={Math.round(designScale * 100)}
              min={20}
              max={300}
              step={10}
              unit="%"
              onValueChange={(v) => setDesignScale(v / 100)}
              leftIcon="contract-outline"
              rightIcon="expand-outline"
              formatValue={(v) => `${v}%`}
              quickPresets={[
                { label: 'Compact (70%)', value: 70 },
                { label: 'Standard (100%)', value: 100 },
                { label: 'Large (140%)', value: 140 },
                { label: 'Max (200%)', value: 200 },
              ]}
              subtitle="Use + / - buttons or type custom size percentage."
            />

            <View style={styles.divider} />

            {/* Rotation / Angle */}
            <StepperInputControl
              label="Design Angle / Rotation"
              value={designRotation}
              min={0}
              max={360}
              step={15}
              unit="°"
              onValueChange={setDesignRotation}
              leftIcon="refresh-outline"
              rightIcon="sync-outline"
              formatValue={(v) => `${v}°`}
              quickPresets={[
                { label: '0° Straight', value: 0 },
                { label: '90° CW', value: 90 },
                { label: '180° Inverted', value: 180 },
                { label: '270° CCW', value: 270 },
              ]}
              subtitle="Set rotation angle in degrees."
            />

            {/* Image Flip Controls (when image is uploaded) */}
            {customImageUri ? (
              <>
                <View style={styles.divider} />
                <View style={stepperStyles.labelRow}>
                  <Text style={stepperStyles.label}>Image Flip Orientation</Text>
                </View>
                <View style={styles.quickPresetRow}>
                  <Pressable
                    onPress={() => setFlipH((prev) => !prev)}
                    style={[styles.quickChip, flipH && styles.quickChipActive]}>
                    <Text style={[styles.quickChipText, flipH && styles.quickChipTextActive]}>
                      ↔️ Flip Horizontal {flipH ? '✓' : ''}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setFlipV((prev) => !prev)}
                    style={[styles.quickChip, flipV && styles.quickChipActive]}>
                    <Text style={[styles.quickChipText, flipV && styles.quickChipTextActive]}>
                      ↕️ Flip Vertical {flipV ? '✓' : ''}
                    </Text>
                  </Pressable>
                </View>
              </>
            ) : null}
          </View>
        )}

        {/* ── Product Base Color ────────────────────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="color-palette-outline" size={17} color={BrandColors.primary} />
            <Text style={styles.sectionTitle}>Product Base Color</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.chipRow, { gap: 12 }]}>
            {PRODUCT_BODY_COLORS.map((c) => {
              const isSelected = selectedColor.toUpperCase() === c.hex.toUpperCase();
              return (
                <Pressable
                  key={c.id}
                  onPress={() => setSelectedColor(c.hex)}
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
              <Text style={styles.priceValue}>{displayTotal}</Text>
            </View>
          <Pressable
              onPress={handleAddToCart}
              style={({ pressed }) => [styles.addBtn, pressed && styles.addBtnPressed]}
            >
              <Ionicons name="bag-add-outline" size={22} color="#fff" />
              <Text style={styles.addBtnText}>Add to Cart</Text>
              <Text style={styles.addBtnPrice}>{displayTotal}</Text>
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
    maxWidth: '65%',
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
  subHintText: { fontSize: 12, color: '#6B7280', marginTop: -4, marginBottom: 2 },

  // Placement options
  activePlacementPill: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  activePlacementPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: BrandColors.primary,
  },
  placementScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  placementBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  placementBtnActive: {
    backgroundColor: BrandColors.primary,
    borderColor: BrandColors.primary,
    ...Platform.select({
      web: { boxShadow: '0 2px 8px rgba(0,82,204,0.25)' } as any,
      default: { shadowColor: BrandColors.primary, shadowOpacity: 0.25, shadowRadius: 6, elevation: 3 },
    }),
  },
  placementBtnWrap: {
    borderColor: '#93C5FD',
    backgroundColor: '#F0F9FF',
  },
  placementBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
  },
  placementBtnTextActive: {
    color: '#FFFFFF',
  },
  placementBtnTextWrap: {
    color: BrandColors.primary,
  },
  wrapBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  wrapBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: BrandColors.primary,
  },

  // Wrap section highlight
  wrapCardHighlight: {
    borderColor: '#93C5FD',
    backgroundColor: '#FAFCFF',
  },
  wrapInfoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 10,
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  wrapInfoText: {
    flex: 1,
    fontSize: 12,
    color: '#1E40AF',
    lineHeight: 16,
  },

  // Quick preset chips
  quickPresetRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: -2,
    flexWrap: 'wrap',
  },
  quickChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  quickChipActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  quickChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4B5563',
  },
  quickChipTextActive: {
    color: '#FFFFFF',
  },

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
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: BrandColors.primary,
    paddingVertical: 17,
    borderRadius: 16,
    marginTop: 4,
  },
  addBtnPressed: { opacity: 0.88, transform: [{ scale: 0.97 }] },
  addBtnText: { color: '#fff', fontSize: 16, fontWeight: '800', fontFamily: 'Manrope_700Bold' },
  addBtnPrice: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Inter_600SemiBold',
  },
});
