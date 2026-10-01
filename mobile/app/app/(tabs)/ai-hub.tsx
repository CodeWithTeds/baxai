import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState, useRef, forwardRef, useImperativeHandle } from 'react';
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
import { useVoiceConversation, type VoiceState } from '@/hooks/use-voice-conversation';
import { BrandColors } from '@/constants/theme';

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
  }
>(function OwlMascot({ voiceState, onPress, hasMessages }, ref) {
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
      <View style={styles.mascotOuter}>
        {/* Pulsing glow — only when recording */}
        <Animated.View style={[styles.glowRing, glowStyle]} />

        {/* Base circle — colour shifts per state */}
        <View style={[
          styles.mascotBase,
          active         && styles.mascotBaseRecording,
          isBusy         && styles.mascotBaseBusy,
        ]} />

        {/* Owl image */}
        <Animated.View style={[styles.mascotImgWrap, owlStyle]}>
          <Image
            source={require('@/assets/images/image.png')}
            style={styles.mascotImg}
            contentFit="contain"
          />
        </Animated.View>

        {/* Interactive clear indicator tag */}
        {hasMessages && voiceState === 'idle' && (
          <View style={styles.clearMiniBadge}>
            <Ionicons name="sparkles" size={11} color="#FFFFFF" />
          </View>
        )}

        {/* Busy spinner overlay */}
        {isBusy && (
          <View style={styles.busyOverlay}>
            <ActivityIndicator color={BrandColors.primary} size="small" />
          </View>
        )}
      </View>
    </Pressable>
  );
});

// ─── Mic button ───────────────────────────────────────────────────────────────

function MicButton({
  voiceState,
  onPress,
}: {
  voiceState: VoiceState;
  onPress: () => void;
}) {
  const { t } = useLanguage();
  const isRecording = voiceState === 'recording';
  const isBusy      = voiceState === 'transcribing' || voiceState === 'thinking' || voiceState === 'speaking';

  const stateLabels: Record<VoiceState, string> = {
    idle:          t.voiceIdle,
    recording:     t.voiceRecording,
    transcribing:  t.voiceTranscribing,
    thinking:      t.voiceThinking,
    speaking:      t.voiceSpeaking,
    error:         t.voiceError,
  };

  return (
    <View style={styles.micRow}>
      <View style={[styles.micRingOuter, isRecording && styles.micRingOuterActive]}>
        <View style={[styles.micRingInner, isRecording && styles.micRingInnerActive]}>
          <Pressable
            onPress={onPress}
            disabled={isBusy}
            style={({ pressed }) => [
              styles.micBtn,
              isRecording && styles.micBtnActive,
              pressed && { opacity: 0.8 },
            ]}>
            {isBusy
              ? <ActivityIndicator color="#fff" size="small" />
              : <Ionicons name={isRecording ? 'stop' : 'mic'} size={30} color="#fff" />
            }
          </Pressable>
        </View>
      </View>
      <Text style={[styles.micLabel, { color: STATE_COLOR[voiceState] }]}>
        {stateLabels[voiceState]}
      </Text>
    </View>
  );
}

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

function Bubble({ msg, dimmed = false }: { msg: { role: string; text: string; id: string }; dimmed?: boolean }) {
  const router = useRouter();
  const isUser = msg.role === 'user';
  const cleanText = cleanDisplayText(msg.text);
  const detectedOrder = !isUser ? extractOrderRef(msg.text) : null;

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

        {detectedOrder && (
          <Pressable
            onPress={() => {
              try { Haptics.selectionAsync(); } catch {}
              router.push(`/order/${detectedOrder}`);
            }}
            style={styles.orderActionCard}>
            <View style={styles.orderActionIcon}>
              <Ionicons name="cube-outline" size={18} color="#7C3AED" />
            </View>
            <View style={styles.orderActionInfo}>
              <Text style={styles.orderActionTitle}>Order #{detectedOrder}</Text>
              <Text style={styles.orderActionSubtitle}>Tap to track live progress & milestones</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#7C3AED" />
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function AiHubScreen() {
  const { user } = useAuth();
  const { messages, voiceState, error, toggle, sendText, clearConversation } = useVoiceConversation(user?.email);
  const { t } = useLanguage();

  const owlRef = useRef<OwlMascotHandle>(null);
  const [inputText, setInputText] = useState('');

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
    { id: 'track',   label: t.qaTrackOrder,   icon: 'bus-outline' as const },
    { id: 'pricing', label: t.qaCheckPricing, icon: 'pricetag-outline' as const },
    { id: 'talk',    label: t.qaTalkAgent,    icon: 'headset-outline' as const },
    { id: 'design',  label: t.qaDesignHelp,   icon: 'color-palette-outline' as const },
  ];

  // Split messages: latest 2 prominent, rest dimmed history
  const history    = messages.slice(0, -2);
  const latest     = messages.slice(-2);
  const latestAI   = latest.filter((m) => m.role === 'assistant');
  const latestUser = latest.filter((m) => m.role === 'user');

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <ScreenHeader hideSearch title={t.aiAssistant} />

      {/* ── Owl ──────────────────────────────────────────────── */}
      <Animated.View entering={FadeIn.duration(500)} style={styles.owlSection}>
        <OwlMascot
          ref={owlRef}
          voiceState={voiceState}
          onPress={handleOwlPress}
          hasMessages={messages.length > 1}
        />
        <View style={styles.owlNameRow}>
          <Text style={styles.owlName}>Owla</Text>
          {messages.length > 1 && (
            <Pressable
              onPress={handleClearConvo}
              hitSlop={6}
              style={({ pressed }) => [styles.clearChip, pressed && { opacity: 0.7 }]}>
              <Ionicons name="trash-outline" size={12} color="#7C3AED" />
              <Text style={styles.clearChipText}>Clear chat</Text>
            </Pressable>
          )}
        </View>
        <Text style={[styles.owlHint, { color: STATE_COLOR[voiceState] }]}>
          {error
            ? `Error: ${error}`
            : (voiceState === 'idle' && messages.length > 1
                ? 'Tap Owla to clear conversation'
                : stateLabels[voiceState])}
        </Text>
      </Animated.View>

      {/* ── History (dimmed, scrollable) ─────────────────────── */}
      {history.length > 0 && (
        <FlatList
          data={history}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.historyList}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => <Bubble msg={item} dimmed />}
        />
      )}

      {/* ── Latest exchange — full opacity ────────────────────── */}
      <View style={styles.latestSection}>
        {latestAI.map((m)   => <Bubble key={m.id} msg={m} />)}
        {latestUser.map((m) => <Bubble key={m.id} msg={m} />)}
      </View>

      {/* ── Quick actions ────────────────────────────────────── */}
      <View style={styles.quickWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickScroll}>
          {quickActions.map((a) => (
            <Pressable
              key={a.id}
              onPress={() => handleQuickAction(a)}
              disabled={voiceState !== 'idle' && voiceState !== 'error'}
              style={({ pressed }) => [
                styles.quickChip,
                pressed && styles.quickChipPressed,
                (voiceState !== 'idle' && voiceState !== 'error') && { opacity: 0.4 },
              ]}>
              <Ionicons name={a.icon} size={15} color="#374151" />
              <Text style={styles.quickChipText}>{a.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* ── Text Input & Voice Controller ─────────────────────── */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        style={styles.chatBarContainer}
      >
        <View style={styles.chatBar}>
          {!inputText ? (
            <Pressable
              onPress={handlePaste}
              hitSlop={8}
              style={({ pressed }) => [styles.barActionBtn, pressed && { opacity: 0.6 }]}
            >
              <Ionicons name="clipboard-outline" size={20} color="#9CA3AF" />
            </Pressable>
          ) : (
            <Pressable
              onPress={() => setInputText('')}
              hitSlop={8}
              style={({ pressed }) => [styles.barActionBtn, pressed && { opacity: 0.6 }]}
            >
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
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
          />

          {inputText.trim().length > 0 ? (
            <Pressable
              onPress={handleSend}
              style={({ pressed }) => [styles.chatSendBtn, pressed && { opacity: 0.85 }]}
            >
              <Ionicons name="arrow-up" size={18} color="#FFFFFF" />
            </Pressable>
          ) : (
            <Pressable
              onPress={toggle}
              style={({ pressed }) => [
                styles.chatMicBtn,
                voiceState === 'recording' && styles.chatMicBtnRecording,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Ionicons
                name={voiceState === 'recording' ? 'stop' : 'mic'}
                size={18}
                color="#FFFFFF"
              />
            </Pressable>
          )}
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

  // ── Owl ────────────────────────────────────────────────────
  owlSection: {
    alignItems: 'center',
    paddingTop: 16,
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
  clearChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  clearChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#7C3AED',
  },
  owlHint: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  clearMiniBadge: {
    position: 'absolute',
    top: 10,
    right: 14,
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
  mascotOuter: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowRing: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#BFDBFE',
    opacity: 0,
  },
  mascotBase: {
    position: 'absolute',
    width: 136,
    height: 136,
    borderRadius: 68,
    backgroundColor: '#EFF6FF',
  },
  mascotBaseRecording: {
    backgroundColor: '#DBEAFE',
  },
  mascotBaseBusy: {
    backgroundColor: '#F3E8FF',
  },
  mascotImgWrap: {
    width: 140,
    height: 140,
  },
  mascotImg: {
    width: '100%',
    height: '100%',
  },
  busyOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 4,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 2 },
    }),
  },

  // ── History ────────────────────────────────────────────────
  historyList: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 2,
    flexGrow: 0,
  },

  // ── Latest exchange ────────────────────────────────────────
  latestSection: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 4,
    gap: 6,
  },

  // ── Bubbles ────────────────────────────────────────────────
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 6,
    gap: 8,
  },
  bubbleRowUser: {
    justifyContent: 'flex-end',
  },
  bubbleRowDimmed: {
    opacity: 0.35,
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
    maxWidth: '78%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
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

  // ── Quick actions ──────────────────────────────────────────
  quickWrap: {
    paddingVertical: 8,
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

  // ── Mic row ────────────────────────────────────────────────
  micRow: {
    alignItems: 'center',
    paddingVertical: 10,
    gap: 8,
  },
  micRingOuter: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(0,82,204,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  micRingOuterActive: {
    backgroundColor: 'rgba(239,68,68,0.10)',
  },
  micRingInner: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(0,82,204,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  micRingInnerActive: {
    backgroundColor: 'rgba(239,68,68,0.18)',
  },
  micBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: BrandColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios:     { shadowColor: BrandColors.primary, shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 5 } },
      android: { elevation: 7 },
    }),
  },
  micBtnActive: {
    backgroundColor: '#EF4444',
    ...Platform.select({
      ios:     { shadowColor: '#EF4444', shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 5 } },
      android: { elevation: 7 },
    }),
  },
  micLabel: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
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
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
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
  },
  chatInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    fontFamily: 'Inter_400Regular',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  chatSendBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: BrandColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  chatMicBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: BrandColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  chatMicBtnRecording: {
    backgroundColor: '#EF4444',
  },
});
