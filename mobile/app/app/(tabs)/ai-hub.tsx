import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState, useRef, forwardRef, useImperativeHandle, useMemo } from 'react';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  SlideInLeft,
  SlideInRight,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import ScreenHeader from '@/components/screen-header';
import {
  useVoiceConversation,
  type VoiceState,
  type VerificationState,
  type VerificationStage,
  type ConvoMessage,
  type ConvoProduct,
} from '@/hooks/use-voice-conversation';
import { fetchProducts, getApiBaseUrls, type ApiProduct } from '@/utils/api';
import { getCategoryForItem } from '@/utils/category';
import { BrandColors, IconColors } from '@/constants/theme';

import { useLanguage } from '@/contexts/language-context';
import { useAuth } from '@/contexts/auth-context';

// ─── Quick actions ────────────────────────────────────────────────────────────

// ─── State labels ─────────────────────────────────────────────────────────────

const STATE_COLOR: Record<VoiceState, string> = {
  idle:          '#9CA3AF',
  recording:     '#EF4444',
  transcribing:  '#D97706',
  thinking:      '#7C3AED',
  speaking:      '#059669',
  error:         '#EF4444',
};

// ─── Owl mascot ───────────────────────────────────────────────────────────────

export interface OwlMascotHandle {
  triggerWiggle: () => void;
}

const OwlMascot = forwardRef<
  OwlMascotHandle,
  {
    voiceState: VoiceState;
    onPress: () => void;
    hasMessages?: boolean;
    compact?: boolean;
  }
>(function OwlMascot({ voiceState, onPress, hasMessages, compact = false }, ref) {
  const active = voiceState === 'recording';

  const glowScale   = useSharedValue(1);
  const glowOpacity = useSharedValue(0);

  useEffect(() => {
    if (active) {
      glowScale.value = withRepeat(
        withSequence(
          withTiming(1.2, { duration: 800 }),
          withTiming(1.0, { duration: 800 }),
        ),
        -1,
        true,
      );
      glowOpacity.value = withTiming(1, { duration: 300 });
    } else {
      glowScale.value   = withTiming(1, { duration: 400 });
      glowOpacity.value = withTiming(0, { duration: 400 });
    }
  }, [active]);

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
    opacity: glowOpacity.value,
  }));

  const owlScale = useSharedValue(1);
  const owlRotation = useSharedValue(0);

  useImperativeHandle(ref, () => ({
    triggerWiggle: () => {
      owlRotation.value = withSequence(
        withTiming(-14, { duration: 60 }),
        withTiming(14, { duration: 60 }),
        withTiming(-8, { duration: 60 }),
        withTiming(8, { duration: 60 }),
        withTiming(0, { duration: 70 })
      );
      owlScale.value = withSequence(
        withSpring(1.15, { damping: 5 }),
        withSpring(1.0, { damping: 7 })
      );
    },
  }));

  const owlStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: owlScale.value },
      { rotate: `${owlRotation.value}deg` },
    ],
  }));

  const isBusy = voiceState === 'transcribing' || voiceState === 'thinking' || voiceState === 'speaking';

  return (
    <Pressable
      onPress={onPress}
      disabled={isBusy}
      onPressIn={() => { owlScale.value = withSpring(0.93); }}
      onPressOut={() => { owlScale.value = withSpring(1); }}>
      <View style={compact ? styles.mascotOuterCompact : styles.mascotOuter}>
        {/* Pulsing glow — only when recording */}
        <Animated.View style={[compact ? styles.glowRingCompact : styles.glowRing, glowStyle]} />

        {/* Base circle — colour shifts per state */}
        <View style={[
          compact ? styles.mascotBaseCompact : styles.mascotBase,
          active         && styles.mascotBaseRecording,
          isBusy         && styles.mascotBaseBusy,
        ]} />

        {/* Owl image */}
        <Animated.View style={[compact ? styles.mascotImgWrapCompact : styles.mascotImgWrap, owlStyle]}>
          <Image
            source={require('@/assets/images/image.png')}
            style={styles.mascotImg}
            contentFit="contain"
          />
        </Animated.View>

        {/* Interactive clear indicator tag */}
        {hasMessages && voiceState === 'idle' && (
          <View style={compact ? styles.clearMiniBadgeCompact : styles.clearMiniBadge}>
            <Ionicons name="sparkles" size={compact ? 8 : 11} color="#FFFFFF" />
          </View>
        )}

        {/* Busy spinner overlay */}
        {isBusy && (
          <View style={compact ? styles.busyOverlayCompact : styles.busyOverlay}>
            <ActivityIndicator color={BrandColors.primary} size="small" />
          </View>
        )}
      </View>
    </Pressable>
  );
});

// ─── Chat bubble ─────────────────────────────────────────────────────────────

function cleanDisplayText(text: string): string {
  if (!text) return '';
  return text
    // Replace markdown bold/italic asterisks: **bold** -> bold
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')
    // Remove markdown headers
    .replace(/^#+\s*/gm, '')
    // Remove double dashes or stray symbols
    .replace(/--+/g, ' - ')
    .replace(/\*\*/g, '')
    .trim();
}

function extractOrderRef(text: string): string | null {
  if (!text) return null;
  const match = text.match(/(?:#?\s*(RD[- ]?\d{3,6}))/i);
  if (match) {
    return match[1].replace(/\s+/g, '-').toUpperCase();
  }
  return null;
}

function getProductImage(item: { thumbnail?: string | null; fallback_image?: string | null; name?: string; category?: string }): any {
  const img = item.thumbnail || item.fallback_image;
  if (img) {
    const baseUrl = getApiBaseUrls()[0] ?? '';
    if (img.includes('/storage/')) {
      const storagePath = img.substring(img.indexOf('/storage/'));
      return { uri: `${baseUrl}${storagePath}` };
    }
    const uri = img.startsWith('http')
      ? img
      : `${baseUrl}${img.startsWith('/') ? '' : '/'}${img}`;
    return { uri };
  }
  const nameLower = (item.name || '').toLowerCase();
  const catLower = (item.category || '').toLowerCase();

  if (nameLower.includes('mug') || nameLower.includes('tumbler') || nameLower.includes('cup') || catLower.includes('mug')) {
    return require('@/assets/images/custom-mugs.jpeg');
  }
  if (nameLower.includes('pin') || catLower.includes('pin')) {
    return require('@/assets/images/button-pins.jpg');
  }
  if (nameLower.includes('sticker') || catLower.includes('sticker')) {
    return require('@/assets/images/custom-stickers.jpg');
  }
  if (nameLower.includes('shirt') || nameLower.includes('t-shirt') || catLower.includes('apparel') || catLower.includes('tshirts')) {
    return require('@/assets/images/custom-thirts.jpg');
  }
  if (nameLower.includes('tote') || nameLower.includes('bag')) {
    return require('@/assets/images/tote-bags.jpg');
  }
  if (nameLower.includes('calendar')) {
    return require('@/assets/images/calendars.jpg');
  }
  return require('@/assets/images/custom-mugs.jpeg');
}

function Bubble({
  msg,
  dimmed = false,
  allProducts = [],
}: {
  msg: ConvoMessage;
  dimmed?: boolean;
  allProducts?: ApiProduct[];
}) {
  const router = useRouter();
  const isUser = msg.role === 'user';
  const cleanText = cleanDisplayText(msg.text);
  const detectedOrder = !isUser ? extractOrderRef(msg.text) : null;

  const handleProductPress = (item: ConvoProduct) => {
    try { Haptics.selectionAsync(); } catch {}
    const nameLower = (item.name || '').toLowerCase();
    const vType = (item.viewer_type || item.viewerType || '').toLowerCase();
    const catLower = (item.category || '').toLowerCase();
    const isPin = vType.includes('pin') || catLower.includes('pin') || nameLower.includes('pin');
    const isShirt =
      vType.includes('shirt') ||
      catLower.includes('shirt') ||
      catLower.includes('apparel') ||
      catLower.includes('tshirts') ||
      nameLower.includes('shirt') ||
      nameLower.includes('tee');

    const defaultViewerType = isShirt
      ? 'shirt'
      : isPin
      ? 'pin_cloud'
      : 'coffee_cup';

    const is3D =
      item.is3D ||
      item.has_3d_preview ||
      isPin ||
      isShirt ||
      nameLower.includes('mug') ||
      nameLower.includes('cup') ||
      nameLower.includes('tumbler');

    if (is3D) {
      const targetRoute = isPin ? '/pin-3d' : '/mug-3d';
      router.push({
        pathname: targetRoute,
        params: {
          id: String(item.id),
          name: item.name,
          price: String(item.price || '99.00'),
          sku: item.sku || '',
          stock: item.stock !== undefined ? String(item.stock) : '30',
          viewer_type: item.viewer_type || item.viewerType || defaultViewerType,
          category: item.category || (isShirt ? 'apparel' : isPin ? 'pins' : 'mugs'),
          customization_addon_price: item.customization_addon_price !== undefined ? String(item.customization_addon_price) : undefined,
          max_text_length: item.max_text_length !== undefined ? String(item.max_text_length) : undefined,
          thumbnail: item.thumbnail || undefined,
          fallback_image: item.fallback_image || undefined,
        },
      } as any);
    } else {
      const cat = getCategoryForItem({ name: item.name, category: item.category });
      router.push({
        pathname: '/(tabs)/services',
        params: { category: cat, query: item.name },
      } as any);
    }
  };

  const displayProducts: ConvoProduct[] = useMemo(() => {
    if (isUser) return [];
    if (msg.products && msg.products.length > 0) {
      return msg.products;
    }
    if (allProducts && allProducts.length > 0) {
      const txtLower = msg.text.toLowerCase();
      return allProducts.filter((p) => {
        const pName = (p.name || '').toLowerCase();
        const pSku = (p.sku || '').toLowerCase();
        if (pSku && txtLower.includes(pSku)) return true;
        if (txtLower.includes(pName)) return true;
        if (pName.includes('mug') && (txtLower.includes('mug') || txtLower.includes('cup') || txtLower.includes('espresso') || txtLower.includes('tumbler'))) return true;
        if (pName.includes('shirt') && (txtLower.includes('shirt') || txtLower.includes('t-shirt') || txtLower.includes('tee'))) return true;
        if (pName.includes('pin') && (txtLower.includes('pin') || txtLower.includes('badge'))) return true;
        if (pName.includes('bag') && (txtLower.includes('bag') || txtLower.includes('tote') || txtLower.includes('shoulder'))) return true;
        if (pName.includes('sticker') && txtLower.includes('sticker')) return true;
        if (pName.includes('calendar') && txtLower.includes('calendar')) return true;
        return false;
      }).map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        price: p.base_price,
        sku: p.sku,
        thumbnail: p.thumbnail,
        fallback_image: p.fallback_image,
        has_3d_preview: p.has_3d_preview,
        viewer_type: p.viewer_type,
        stock: p.stock_quantity,
        customization_addon_price: p.customization_addon_price,
        max_text_length: p.max_text_length,
      })).slice(0, 4);
    }
    return [];
  }, [isUser, msg.products, msg.text, allProducts]);

  return (
    <Animated.View
      entering={isUser ? SlideInRight.delay(30).duration(300) : SlideInLeft.delay(30).duration(300)}
      style={[styles.bubbleRow, isUser && styles.bubbleRowUser, dimmed && styles.bubbleRowDimmed]}>
      {!isUser && (
        <View style={styles.avatarSmall}>
          <Image
            source={require('@/assets/images/image.png')}
            style={styles.avatarSmallImg}
            contentFit="cover"
          />
        </View>
      )}
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
        <Text style={[styles.bubbleText, isUser && styles.bubbleTextUser]}>{cleanText}</Text>

        {/* Display detected order */}
        {detectedOrder && (
          <Pressable
            onPress={() => {
              try { Haptics.selectionAsync(); } catch {}
              router.push(`/order/${detectedOrder}`);
            }}
            style={styles.orderActionCard}>
            <View style={[styles.orderActionIcon, { backgroundColor: IconColors.ordersBg }]}>
              <Ionicons name="cube" size={18} color={IconColors.orders} />
            </View>
            <View style={styles.orderActionInfo}>
              <Text style={styles.orderActionTitle}>Order #{detectedOrder}</Text>
              <Text style={styles.orderActionSubtitle}>Tap to track live progress & milestones</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={IconColors.orders} />
          </Pressable>
        )}

        {/* Display requested / recommended products with actual product images */}
        {displayProducts.length > 0 && (
          <View style={styles.productsContainer}>
            {displayProducts.map((prod) => {
              const nameLower = (prod.name || '').toLowerCase();
              const vType = (prod.viewer_type || prod.viewerType || '').toLowerCase();
              const catLower = (prod.category || '').toLowerCase();
              const is3D =
                prod.is3D ||
                prod.has_3d_preview ||
                vType.includes('shirt') ||
                vType.includes('pin') ||
                nameLower.includes('mug') ||
                nameLower.includes('pin') ||
                nameLower.includes('shirt') ||
                nameLower.includes('cup') ||
                nameLower.includes('tumbler') ||
                catLower.includes('mug') ||
                catLower.includes('pin') ||
                catLower.includes('shirt');

              return (
                <Pressable
                  key={String(prod.id || prod.name)}
                  onPress={() => handleProductPress(prod)}
                  style={({ pressed }) => [styles.productCard, pressed && styles.productCardPressed]}>
                  {/* Actual product image */}
                  <View style={styles.productCardImgWrap}>
                    <Image
                      source={getProductImage(prod)}
                      style={styles.productCardImg}
                      contentFit="cover"
                      transition={200}
                    />
                    {is3D && (
                      <View style={styles.productCard3DBadge}>
                        <Ionicons name="cube" size={9} color="#FFFFFF" />
                        <Text style={styles.productCard3DText}>3D</Text>
                      </View>
                    )}
                  </View>

                  {/* Product details */}
                  <View style={styles.productCardInfo}>
                    <View style={styles.productCardTopRow}>
                      <Text style={styles.productCardCategory}>
                        {(prod.category || 'Product').toUpperCase()}
                      </Text>
                      {prod.sku ? <Text style={styles.productCardSku}>{prod.sku}</Text> : null}
                    </View>
                    <Text style={styles.productCardName} numberOfLines={1}>
                      {prod.name}
                    </Text>
                    <View style={styles.productCardBottomRow}>
                      <Text style={styles.productCardPrice}>₱{Number(prod.price || 0).toFixed(2)}</Text>
                      <View style={[styles.productCardBtn, is3D && styles.productCardBtn3D]}>
                        <Ionicons name={is3D ? 'cube-outline' : 'arrow-forward'} size={12} color="#FFFFFF" />
                        <Text style={styles.productCardBtnText}>
                          {is3D ? 'Customize 3D' : 'View'}
                        </Text>
                      </View>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>
    </Animated.View>
  );
}

// ─── Verification Flow Component (No Card / No Box / No Border) ────────────────

const STAGES_CONFIG: {
  id: VerificationStage;
  title: string;
  desc: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
}[] = [
  {
    id: 'user',
    title: 'Checking User',
    desc: 'Validating authenticated session & user context',
    icon: 'person-circle-outline',
    color: IconColors.user,
    bg: IconColors.userBg,
  },
  {
    id: 'data',
    title: 'Checking Data',
    desc: 'Validating conversation payload & request parameters',
    icon: 'server-outline',
    color: IconColors.data,
    bg: IconColors.dataBg,
  },
  {
    id: 'security',
    title: 'Checking Vulnerabilities',
    desc: 'Scanning request security & checking vulnerabilities',
    icon: 'shield-checkmark-outline',
    color: IconColors.ai,
    bg: IconColors.aiBg,
  },
];

function VerificationCard({
  state,
  onRetry,
}: {
  state: VerificationState;
  onRetry: () => void;
}) {
  return (
    <Animated.View entering={FadeIn.duration(300)} style={styles.verificationContainer}>
      <View style={styles.verificationHeader}>
        <View style={[styles.verificationBadge, { backgroundColor: IconColors.aiBg }]}>
          <Ionicons name="shield-checkmark" size={16} color={IconColors.ai} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.verificationTitle}>Security Verification</Text>
          <Text style={styles.verificationSubtitle}>Preparing secure conversation session</Text>
        </View>
        {state.inProgress && (
          <ActivityIndicator size="small" color={IconColors.ai} />
        )}
      </View>

      {/* Informational Notice (Clean inline, no border, no box) */}
      <View style={styles.verificationNotice}>
        <Ionicons name="information-circle" size={16} color={IconColors.security} style={{ marginTop: 1 }} />
        <Text style={styles.verificationNoticeText}>
          This security check only happens once. Please be patient while we securely prepare your first request.
        </Text>
      </View>

      {/* 3 Sequential Stages (Clean list, no card, no boxes) */}
      <View style={styles.stagesContainer}>
        {STAGES_CONFIG.map((stageItem) => {
          const status = state.stages[stageItem.id];
          const isCurrent = state.currentStage === stageItem.id && state.inProgress;
          const isDone = status === 'success';
          const isFailed = status === 'failed';

          return (
            <View key={stageItem.id} style={styles.stageRow}>
              {/* Progress Icon */}
              <View style={[
                styles.stageIconWrap,
                {
                  backgroundColor: isDone
                    ? IconColors.success
                    : isFailed
                    ? IconColors.danger
                    : isCurrent
                    ? stageItem.bg
                    : stageItem.bg,
                },
              ]}>
                {isDone ? (
                  <Ionicons name="checkmark" size={13} color="#FFFFFF" />
                ) : isCurrent ? (
                  <ActivityIndicator size="small" color={stageItem.color} />
                ) : isFailed ? (
                  <Ionicons name="alert" size={13} color="#FFFFFF" />
                ) : (
                  <Ionicons name={stageItem.icon} size={13} color={stageItem.color} />
                )}
              </View>

              {/* Progress Content */}
              <View style={styles.stageInfo}>
                <View style={styles.stageTitleRow}>
                  <Text style={[
                    styles.stageTitle,
                    isDone && { color: IconColors.success },
                    isCurrent && { color: stageItem.color },
                    isFailed && { color: IconColors.danger },
                  ]}>
                    {stageItem.title}
                  </Text>
                  {isDone && (
                    <Text style={[styles.stageStatusDoneLabel, { color: IconColors.success }]}>Verified</Text>
                  )}
                  {isCurrent && (
                    <Text style={[styles.stageStatusActiveLabel, { color: stageItem.color }]}>
                      {stageItem.id === 'security' ? 'Checking vulnerabilities...' : 'Checking...'}
                    </Text>
                  )}
                  {isFailed && (
                    <Text style={[styles.stageStatusFailedLabel, { color: IconColors.danger }]}>Failed</Text>
                  )}
                </View>
                <Text style={styles.stageDesc}>{stageItem.desc}</Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* Failure State & Retry (Border-free) */}
      {state.error && (
        <View style={styles.verificationErrorRow}>
          <Ionicons name="warning-outline" size={16} color="#DC2626" />
          <Text style={styles.verificationErrorText}>{state.error}</Text>
          <Pressable
            onPress={onRetry}
            style={({ pressed }) => [styles.retryBtn, pressed && { opacity: 0.8 }]}>
            <Ionicons name="refresh" size={13} color="#FFFFFF" />
            <Text style={styles.retryBtnText}>Retry</Text>
          </Pressable>
        </View>
      )}
    </Animated.View>
  );
}

// ─── Normal Typing Indicator ───────────────────────────────────────────────────

function TypingIndicator({ voiceState }: { voiceState: VoiceState }) {
  return (
    <Animated.View entering={FadeIn.duration(200)} style={styles.typingContainer}>
      <View style={styles.avatarSmall}>
        <Image
          source={require('@/assets/images/image.png')}
          style={styles.avatarSmallImg}
          contentFit="cover"
        />
      </View>
      <View style={styles.typingBubble}>
        <ActivityIndicator size="small" color="#7C3AED" />
        <Text style={styles.typingText}>
          {voiceState === 'transcribing' ? 'Transcribing audio...' : 'Owla is thinking...'}
        </Text>
      </View>
    </Animated.View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function AiHubScreen() {
  const { user } = useAuth();
  const {
    messages,
    voiceState,
    error,
    verificationState,
    retryVerification,
    toggle,
    sendText,
    clearConversation,
  } = useVoiceConversation(user?.email);
  const { t, language } = useLanguage();

  const owlRef = useRef<OwlMascotHandle>(null);
  const flatListRef = useRef<FlatList>(null);
  const [inputText, setInputText] = useState('');
  const [allProducts, setAllProducts] = useState<ApiProduct[]>([]);

  useEffect(() => {
    fetchProducts()
      .then((prods) => {
        if (Array.isArray(prods) && prods.length > 0) {
          setAllProducts(prods);
        }
      })
      .catch(() => {});
  }, []);

  // Auto-scroll on messages, verification changes, or thinking state
  useEffect(() => {
    const timer = setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 80);
    return () => clearTimeout(timer);
  }, [
    messages.length,
    verificationState.inProgress,
    verificationState.currentStage,
    verificationState.error,
    voiceState,
  ]);

  const handleClearConvo = () => {
    if (messages.length <= 1) {
      owlRef.current?.triggerWiggle();
      return;
    }

    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
    Alert.alert(
      '🧹 Clear Conversation?',
      'Start a fresh chat with Owla? All previous questions and answers in this session will be cleared.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Chat',
          style: 'destructive',
          onPress: () => {
            try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
            owlRef.current?.triggerWiggle();
            clearConversation();
          },
        },
      ]
    );
  };

  const handleOwlPress = () => {
    if (voiceState === 'recording') {
      toggle();
      return;
    }

    if (messages.length > 1) {
      handleClearConvo();
    } else {
      owlRef.current?.triggerWiggle();
      try { Haptics.selectionAsync(); } catch {}
    }
  };

  const handleSend = () => {
    if (!inputText.trim()) return;
    sendText(inputText.trim());
    setInputText('');
  };

  const handlePaste = async () => {
    const text = await Clipboard.getStringAsync();
    if (text) {
      setInputText(text.trim());
      try {
        await Haptics.selectionAsync();
      } catch {}
    }
  };

  const handleQuickAction = async (action: { id: string; label: string }) => {
    if (action.id === 'track') {
      const clip = (await Clipboard.getStringAsync())?.trim();
      if (clip && (/(?:#|rd-|order)/i.test(clip) || /^[a-z0-9_-]{4,15}$/i.test(clip))) {
        sendText(`Track order #${clip.replace(/^#/, '')}`);
        return;
      }
      setInputText('Track order #');
      return;
    }
    if (action.id === 'quiz') {
      sendText(
        language === 'tl'
          ? 'Maaari mo ba akong tulungang pumili ng tamang produkto? Tanungin mo ako ng mabilis na tanong para marekomenda ang pinakamagandang item!'
          : 'Can you help me choose the right product? Ask me a few quick questions to recommend the best item!'
      );
      return;
    }
    sendText(action.label);
  };

  const stateLabels: Record<VoiceState, string> = {
    idle:          t.voiceIdle,
    recording:     t.voiceRecording,
    transcribing:  t.voiceTranscribing,
    thinking:      t.voiceThinking,
    speaking:      t.voiceSpeaking,
    error:         t.voiceError,
  };

  const quickActions = [
    { id: 'quiz',    label: t.qaHelpMeChoose, icon: 'sparkles' as const,             color: IconColors.ai,       bg: IconColors.aiBg },
    { id: 'track',   label: t.qaTrackOrder,   icon: 'bus-outline' as const,          color: IconColors.tracking, bg: IconColors.trackingBg },
    { id: 'pricing', label: t.qaCheckPricing, icon: 'pricetag-outline' as const,     color: IconColors.pricing,  bg: IconColors.pricingBg },
    { id: 'talk',    label: t.qaTalkAgent,    icon: 'headset-outline' as const,      color: IconColors.support,  bg: IconColors.supportBg },
    { id: 'design',  label: t.qaDesignHelp,   icon: 'color-palette-outline' as const, color: IconColors.design,   bg: IconColors.designBg },
  ];

  const isBusy =
    voiceState === 'transcribing' ||
    voiceState === 'thinking' ||
    voiceState === 'speaking' ||
    verificationState.inProgress;
  const hasText = inputText.trim().length > 0;

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <ScreenHeader hideSearch title={t.aiAssistant} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        style={styles.keyboardContainer}
      >
        {/* ── Owl Section (Hero when <= 1 msg, compact bar when chatting) ── */}
        {messages.length <= 1 ? (
          <Animated.View entering={FadeIn.duration(400)} style={styles.owlSection}>
            <OwlMascot
              ref={owlRef}
              voiceState={voiceState}
              onPress={handleOwlPress}
              hasMessages={false}
            />
            <View style={styles.owlNameRow}>
              <Text style={styles.owlName}>Owla</Text>
            </View>
            <Text style={[styles.owlHint, { color: STATE_COLOR[voiceState] }]}>
              {error ? `Error: ${error}` : stateLabels[voiceState]}
            </Text>
          </Animated.View>
        ) : (
          <View style={styles.owlSectionCompact}>
            <OwlMascot
              ref={owlRef}
              voiceState={voiceState}
              onPress={handleOwlPress}
              hasMessages
              compact
            />
            <View style={styles.owlCompactInfo}>
              <Text style={styles.owlCompactName}>Owla</Text>
              <Text style={[styles.owlCompactHint, { color: STATE_COLOR[voiceState] }]} numberOfLines={1}>
                {error
                  ? `Error: ${error}`
                  : (voiceState === 'idle'
                      ? 'Tap Owla to clear conversation'
                      : stateLabels[voiceState])}
              </Text>
            </View>
            <Pressable
              onPress={handleClearConvo}
              hitSlop={8}
              style={({ pressed }) => [styles.clearChip, pressed && { opacity: 0.7 }]}>
              <View style={[styles.clearChipIconBadge, { backgroundColor: IconColors.dangerBg }]}>
                <Ionicons name="trash-outline" size={12} color={IconColors.danger} />
              </View>
              <Text style={[styles.clearChipText, { color: IconColors.danger }]}>Clear chat</Text>
            </Pressable>
          </View>
        )}

        {/* ── Scrollable Chat Messages (flex: 1) ── */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(m) => m.id}
          style={styles.messageList}
          contentContainerStyle={styles.messageListContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          onContentSizeChange={() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }}
          renderItem={({ item, index }) => (
            <Bubble
              msg={item}
              dimmed={messages.length > 2 && index < messages.length - 2}
              allProducts={allProducts}
            />
          )}
          ListFooterComponent={
            verificationState.inProgress || verificationState.error ? (
              <VerificationCard
                state={verificationState}
                onRetry={retryVerification}
              />
            ) : (voiceState === 'thinking' || voiceState === 'transcribing') ? (
              <TypingIndicator voiceState={voiceState} />
            ) : null
          }
        />

        {/* ── Quick actions ── */}
        <View style={styles.quickWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickScroll}>
            {quickActions.map((a) => (
              <Pressable
                key={a.id}
                onPress={() => handleQuickAction(a)}
                disabled={(voiceState !== 'idle' && voiceState !== 'error') || verificationState.inProgress}
                style={({ pressed }) => [
                  styles.quickChip,
                  pressed && styles.quickChipPressed,
                  ((voiceState !== 'idle' && voiceState !== 'error') || verificationState.inProgress) && { opacity: 0.4 },
                ]}>
                <View style={[styles.quickChipIconBadge, { backgroundColor: a.bg }]}>
                  <Ionicons name={a.icon} size={14} color={a.color} />
                </View>
                <Text style={styles.quickChipText}>{a.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* ── Chat Input & Voice Controller (Pinned to bottom) ── */}
        <View style={styles.chatBarContainer}>
          <View style={styles.chatBar}>
            {!inputText ? (
              <Pressable
                onPress={handlePaste}
                hitSlop={8}
                style={({ pressed }) => [styles.barActionBtn, pressed && { opacity: 0.6 }]}
              >
                <View style={[styles.pasteIconBadge, { backgroundColor: IconColors.copyBg }]}>
                  <Ionicons name="clipboard-outline" size={17} color={IconColors.copy} />
                </View>
              </Pressable>
            ) : (
              <Pressable
                onPress={() => setInputText('')}
                hitSlop={8}
                style={({ pressed }) => [styles.barActionBtn, pressed && { opacity: 0.6 }]}
              >
                <Ionicons name="close-circle" size={19} color={IconColors.danger} />
              </Pressable>
            )}

            <TextInput
              style={styles.chatInput}
              placeholder="Type or paste order # to track..."
              placeholderTextColor="#9CA3AF"
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={handleSend}
              returnKeyType="send"
              multiline
              blurOnSubmit={false}
            />

            <View style={styles.chatActionsRight}>
              {/* Mic button — ALWAYS visible, never pushed away */}
              <Pressable
                onPress={toggle}
                disabled={isBusy}
                style={({ pressed }) => [
                  styles.chatMicBtn,
                  voiceState === 'recording' && styles.chatMicBtnRecording,
                  isBusy && styles.chatMicBtnBusy,
                  hasText && voiceState !== 'recording' && styles.chatMicBtnSubtle,
                  pressed && { opacity: 0.85 },
                ]}
              >
                {isBusy ? (
                  <ActivityIndicator color={hasText ? BrandColors.primary : '#FFFFFF'} size="small" />
                ) : (
                  <Ionicons
                    name={voiceState === 'recording' ? 'stop' : 'mic'}
                    size={18}
                    color={hasText && voiceState !== 'recording' ? '#6B7280' : '#FFFFFF'}
                  />
                )}
              </Pressable>

              {/* Send button — appears when user has text */}
              {hasText && (
                <Pressable
                  onPress={handleSend}
                  style={({ pressed }) => [styles.chatSendBtn, pressed && { opacity: 0.85 }]}
                >
                  <Ionicons name="arrow-up" size={18} color="#FFFFFF" />
                </Pressable>
              )}
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  keyboardContainer: {
    flex: 1,
  },

  // ── Owl (Hero) ─────────────────────────────────────────────
  owlSection: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 4,
    gap: 6,
  },
  owlName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    fontFamily: 'Manrope_700Bold',
  },
  owlNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  owlHint: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },

  // ── Owl (Compact row when chatting) ─────────────────────────
  owlSectionCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: 12,
  },
  owlCompactInfo: {
    flex: 1,
  },
  owlCompactName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    fontFamily: 'Manrope_700Bold',
  },
  owlCompactHint: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 1,
  },

  clearChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  clearChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#7C3AED',
  },
  clearMiniBadge: {
    position: 'absolute',
    top: 8,
    right: 12,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } },
      android: { elevation: 3 },
    }),
  },
  clearMiniBadgeCompact: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  mascotOuter: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mascotOuterCompact: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowRing: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#BFDBFE',
    opacity: 0,
  },
  glowRingCompact: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#BFDBFE',
    opacity: 0,
  },
  mascotBase: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#EFF6FF',
  },
  mascotBaseCompact: {
    position: 'absolute',
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#EFF6FF',
  },
  mascotBaseRecording: {
    backgroundColor: '#DBEAFE',
  },
  mascotBaseBusy: {
    backgroundColor: '#F3E8FF',
  },
  mascotImgWrap: {
    width: 122,
    height: 122,
  },
  mascotImgWrapCompact: {
    width: 40,
    height: 40,
  },
  mascotImg: {
    width: '100%',
    height: '100%',
  },
  busyOverlay: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 4,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 2 },
    }),
  },
  busyOverlayCompact: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 2,
  },

  // ── Message List ───────────────────────────────────────────
  messageList: {
    flex: 1,
  },
  messageListContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
  },

  // ── Bubbles ────────────────────────────────────────────────
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 8,
    gap: 8,
  },
  bubbleRowUser: {
    justifyContent: 'flex-end',
  },
  bubbleRowDimmed: {
    opacity: 0.4,
  },
  avatarSmall: {
    width: 26,
    height: 26,
    borderRadius: 13,
    overflow: 'hidden',
    backgroundColor: '#DBEAFE',
    flexShrink: 0,
  },
  avatarSmallImg: {
    width: '100%',
    height: '100%',
  },
  bubble: {
    maxWidth: '82%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    flexShrink: 1,
  },
  bubbleAssistant: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 2 },
    }),
  },
  bubbleUser: {
    backgroundColor: BrandColors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleText: {
    fontSize: 14,
    color: '#1F2937',
    fontFamily: 'Inter_400Regular',
    lineHeight: 20,
  },
  bubbleTextUser: {
    color: '#FFFFFF',
  },
  orderActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F3FF',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  orderActionIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderActionInfo: {
    flex: 1,
  },
  orderActionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B21A8',
  },
  orderActionSubtitle: {
    fontSize: 11,
    color: '#7E22CE',
    marginTop: 1,
  },

  // ── Product Cards in Chat ──────────────────────────────────
  productsContainer: {
    marginTop: 10,
    gap: 8,
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 8,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    gap: 10,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
      android: { elevation: 1 },
    }),
  },
  productCardPressed: {
    backgroundColor: '#F1F5F9',
    borderColor: BrandColors.primary,
  },
  productCardImgWrap: {
    width: 68,
    height: 68,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
    position: 'relative',
  },
  productCardImg: {
    width: '100%',
    height: '100%',
  },
  productCard3DBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0, 82, 204, 0.92)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 4,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  productCard3DText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '800',
    fontFamily: 'Manrope_800ExtraBold',
  },
  productCardInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  productCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  productCardCategory: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.5,
  },
  productCardSku: {
    fontSize: 9,
    color: '#94A3B8',
    fontFamily: 'Inter_500Medium',
  },
  productCardName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: 'Manrope_700Bold',
    textTransform: 'capitalize',
    marginBottom: 4,
  },
  productCardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  productCardPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: BrandColors.primary,
    fontFamily: 'Manrope_800ExtraBold',
  },
  productCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: BrandColors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  productCardBtn3D: {
    backgroundColor: '#7C3AED',
  },
  productCardBtnText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Manrope_700Bold',
  },

  // ── Quick actions ──────────────────────────────────────────
  quickWrap: {
    paddingVertical: 6,
  },
  quickScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  quickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
      android: { elevation: 1 },
    }),
  },
  quickChipPressed: {
    opacity: 0.7,
    backgroundColor: '#EFF6FF',
  },
  quickChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
    fontFamily: 'Inter_500Medium',
  },
  quickChipIconBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearChipIconBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 2,
  },
  pasteIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Chat Bar ───────────────────────────────────────────────
  chatBarContainer: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: Platform.OS === 'ios' ? 24 : 14,
    backgroundColor: '#F5F7FA',
  },
  chatBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 6 : 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 2 },
    }),
  },
  barActionBtn: {
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  chatInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    fontFamily: 'Inter_400Regular',
    paddingHorizontal: 8,
    paddingVertical: Platform.OS === 'ios' ? 6 : 4,
    maxHeight: 90,
    minHeight: 36,
  },
  chatActionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  chatMicBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: BrandColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatMicBtnRecording: {
    backgroundColor: '#EF4444',
  },
  chatMicBtnBusy: {
    backgroundColor: '#7C3AED',
  },
  chatMicBtnSubtle: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  chatSendBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: BrandColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Verification Flow (No Card / No Box / No Border) ───────
  verificationContainer: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    marginHorizontal: 16,
    marginVertical: 10,
    padding: 0,
  },
  verificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  verificationBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verificationTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#1E1B4B',
    fontFamily: 'Inter_700Bold',
  },
  verificationSubtitle: {
    fontSize: 11,
    color: '#6B7280',
    fontFamily: 'Inter_400Regular',
  },
  verificationNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: 'transparent',
    paddingVertical: 4,
    marginBottom: 10,
  },
  verificationNoticeText: {
    flex: 1,
    fontSize: 11.5,
    lineHeight: 16,
    color: '#4B5563',
    fontFamily: 'Inter_500Medium',
  },
  stagesContainer: {
    gap: 8,
  },
  stageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'transparent',
    borderWidth: 0,
    paddingVertical: 4,
  },
  stageIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageIconWrapActive: {
    backgroundColor: '#EDE9FE',
  },
  stageIconWrapDone: {
    backgroundColor: '#10B981',
  },
  stageIconWrapFailed: {
    backgroundColor: '#FEE2E2',
  },
  stageDotPending: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#9CA3AF',
  },
  stageInfo: {
    flex: 1,
  },
  stageTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stageTitle: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#4B5563',
    fontFamily: 'Inter_600SemiBold',
  },
  stageTitleActive: {
    color: '#7C3AED',
  },
  stageTitleDone: {
    color: '#065F46',
  },
  stageTitleFailed: {
    color: '#DC2626',
  },
  stageStatusDoneLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#059669',
    fontFamily: 'Inter_600SemiBold',
  },
  stageStatusActiveLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#7C3AED',
    fontFamily: 'Inter_600SemiBold',
  },
  stageStatusFailedLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#DC2626',
    fontFamily: 'Inter_600SemiBold',
  },
  stageDesc: {
    fontSize: 10.5,
    color: '#9CA3AF',
    fontFamily: 'Inter_400Regular',
    marginTop: 1,
  },
  verificationErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'transparent',
    paddingVertical: 6,
    marginTop: 8,
  },
  verificationErrorText: {
    flex: 1,
    fontSize: 11,
    color: '#DC2626',
    fontFamily: 'Inter_500Medium',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DC2626',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
  },
  retryBtnText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'Inter_600SemiBold',
  },

  // ── Typing Indicator ────────────────────────────────────────
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginHorizontal: 4,
    marginVertical: 6,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } },
      android: { elevation: 1 },
    }),
  },
  typingText: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'Inter_400Regular',
    fontStyle: 'italic',
  },
});
