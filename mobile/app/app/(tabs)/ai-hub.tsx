import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
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

// ─── Quick actions ────────────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  { id: 'track',   label: 'Track Order',   icon: 'bus-outline' as const },
  { id: 'pricing', label: 'Check Pricing', icon: 'pricetag-outline' as const },
  { id: 'talk',    label: 'Talk to Agent', icon: 'headset-outline' as const },
  { id: 'design',  label: 'Design Help',   icon: 'color-palette-outline' as const },
];

// ─── State labels ─────────────────────────────────────────────────────────────

const STATE_LABEL: Record<VoiceState, string> = {
  idle:          'Tap to speak',
  recording:     'Listening… tap to stop',
  transcribing:  'Transcribing…',
  thinking:      'Thinking…',
  speaking:      'Speaking…',
  error:         'Tap to try again',
};

const STATE_COLOR: Record<VoiceState, string> = {
  idle:          '#9CA3AF',
  recording:     '#EF4444',
  transcribing:  '#D97706',
  thinking:      '#7C3AED',
  speaking:      '#059669',
  error:         '#EF4444',
};

// ─── Owl mascot ───────────────────────────────────────────────────────────────

function OwlMascot({
  voiceState,
  onPress,
}: {
  voiceState: VoiceState;
  onPress: () => void;
}) {
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
  const owlStyle = useAnimatedStyle(() => ({
    transform: [{ scale: owlScale.value }],
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

        {/* Busy spinner overlay */}
        {isBusy && (
          <View style={styles.busyOverlay}>
            <ActivityIndicator color={BrandColors.primary} size="small" />
          </View>
        )}
      </View>
    </Pressable>
  );
}

// ─── Mic button ───────────────────────────────────────────────────────────────

function MicButton({
  voiceState,
  onPress,
}: {
  voiceState: VoiceState;
  onPress: () => void;
}) {
  const isRecording = voiceState === 'recording';
  const isBusy      = voiceState === 'transcribing' || voiceState === 'thinking' || voiceState === 'speaking';

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
        {STATE_LABEL[voiceState]}
      </Text>
    </View>
  );
}

// ─── Chat bubble ─────────────────────────────────────────────────────────────

function Bubble({ msg, dimmed = false }: { msg: { role: string; text: string; id: string }; dimmed?: boolean }) {
  const isUser = msg.role === 'user';
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
        <Text style={[styles.bubbleText, isUser && styles.bubbleTextUser]}>{msg.text}</Text>
      </View>
    </Animated.View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function AiHubScreen() {
  const { messages, voiceState, error, toggle, sendText } = useVoiceConversation();

  // Split messages: latest 2 prominent, rest dimmed history
  const history    = messages.slice(0, -2);
  const latest     = messages.slice(-2);
  const latestAI   = latest.filter((m) => m.role === 'assistant');
  const latestUser = latest.filter((m) => m.role === 'user');

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <ScreenHeader hideSearch />

      {/* ── Owl ──────────────────────────────────────────────── */}
      <Animated.View entering={FadeIn.duration(500)} style={styles.owlSection}>
        <OwlMascot voiceState={voiceState} onPress={toggle} />
        <Text style={styles.owlName}>Owla</Text>
        <Text style={[styles.owlHint, { color: STATE_COLOR[voiceState] }]}>
          {error ? `Error: ${error}` : STATE_LABEL[voiceState]}
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
          {QUICK_ACTIONS.map((a) => (
            <Pressable
              key={a.id}
              onPress={() => sendText(a.label)}
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

      {/* ── Mic button — always visible, never unmounts ───────── */}
      <MicButton voiceState={voiceState} onPress={toggle} />
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
  owlHint: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
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
});
