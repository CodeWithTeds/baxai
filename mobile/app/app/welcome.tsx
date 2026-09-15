import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';

import { BrandColors } from '@/constants/theme';
import { useLanguage } from '@/contexts/language-context';

export default function WelcomeScreen() {
  const { t } = useLanguage();

  const triggerHaptic = async () => {
    if (Platform.OS !== 'web') {
      try {
        await Haptics.selectionAsync();
      } catch {}
    }
  };

  const handleGetStarted = async () => {
    await triggerHaptic();
    router.push('/(tabs)');
  };

  const handleLogin = async () => {
    await triggerHaptic();
    router.push('/(tabs)');
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {/* Background gradient */}
      <LinearGradient
        colors={['#2979E8', '#0052CC', '#0041A8']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* ── Brand header ─────────────────────────────────── */}
      <SafeAreaView edges={['top']} style={styles.topSafe}>
        {/* Wrap in plain View to avoid Reanimated opacity warning */}
        <View style={styles.headerWrap}>
          <Animated.View entering={FadeIn.duration(500)} style={styles.header}>
            <Ionicons name="print" size={22} color="#FFFFFF" />
            <Text style={styles.headerTitle}>{t.brandName}</Text>
          </Animated.View>
        </View>

        <View style={styles.taglineWrap}>
          <Animated.View entering={FadeIn.delay(160).duration(500)}>
            <Text style={styles.tagline}>{t.brandTagline}</Text>
          </Animated.View>
        </View>
      </SafeAreaView>

      {/* ── Mascot ───────────────────────────────────────── */}
      {/* zIndex 2 so it renders above the white card */}
      <View style={styles.mascotContainer}>
        <Animated.View
          entering={FadeInUp.delay(200).duration(650).springify()}
          style={styles.mascotFrame}>
          <Image
            source={require('@/assets/images/owl-mascot.png')}
            style={styles.mascotImage}
            contentFit="contain"
            priority="high"
            transition={200}
          />
        </Animated.View>
      </View>

      {/* ── White bottom card ────────────────────────────── */}
      <View style={styles.cardOuter}>
        <Animated.View
          entering={FadeInUp.delay(260).duration(600).springify()}
          style={styles.card}>

          {/* Get Started */}
          <Pressable
            onPress={handleGetStarted}
            style={({ pressed }) => [
              styles.btnPrimary,
              pressed && styles.btnPrimaryPressed,
            ]}
            android_ripple={{ color: '#0041A8' }}>
            <Text style={styles.btnPrimaryText}>{t.getStarted}</Text>
          </Pressable>

          {/* Already have account */}
          <Pressable
            onPress={handleLogin}
            style={({ pressed }) => [
              styles.btnSecondary,
              pressed && styles.btnSecondaryPressed,
            ]}
            android_ripple={{ color: '#E8F0FE' }}>
            <Text style={styles.btnSecondaryText}>{t.alreadyHaveAccount}</Text>
          </Pressable>

          {/* Terms — wrap in plain View to avoid layout animation conflict */}
          <View style={styles.termsWrap}>
            <Animated.View entering={FadeInDown.delay(400).duration(400)}>
              <Text style={styles.termsText}>
                {t.termsPrefix}
                <Text style={styles.termsLink}>{t.termsOfService}</Text>
                {t.termsMiddle}
                <Text style={styles.termsLink}>{t.privacyPolicy}</Text>
              </Text>
            </Animated.View>
          </View>

          {/* Absorbs home-indicator space on iOS */}
          <SafeAreaView edges={['bottom']} />
        </Animated.View>
      </View>
    </View>
  );
}

const CARD_RADIUS = 30;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0052CC',
  },

  // ── Top ──────────────────────────────────────────────────
  topSafe: {
    alignItems: 'center',
    paddingHorizontal: 28,
    zIndex: 1,
  },
  headerWrap: {
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 14,
    paddingBottom: 8,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    fontFamily: 'Manrope_700Bold',
    letterSpacing: 0.1,
  },
  taglineWrap: {
    alignItems: 'center',
  },
  tagline: {
    color: 'rgba(255,255,255,0.90)',
    fontSize: 14.5,
    lineHeight: 22,
    textAlign: 'center',
    fontFamily: 'Inter_400Regular',
    paddingHorizontal: 4,
  },

  // ── Mascot ───────────────────────────────────────────────
  mascotContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    paddingHorizontal: 16,
  },
  mascotFrame: {
    width: '92%',
    maxWidth: 350,
    aspectRatio: 724 / 771,
  },
  mascotImage: {
    width: '100%',
    height: '100%',
  },

  // ── Card ─────────────────────────────────────────────────
  cardOuter: {
    zIndex: 1,
  },
  card: {
    backgroundColor: '#F0F2F5',
    borderTopLeftRadius: CARD_RADIUS,
    borderTopRightRadius: CARD_RADIUS,
    paddingTop: 28,
    paddingHorizontal: 18,
    paddingBottom: 6,
    gap: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.10,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: -6 },
      },
      android: { elevation: 12 },
    }),
  },

  // ── Buttons ──────────────────────────────────────────────
  btnPrimary: {
    backgroundColor: '#007AFF',
    borderRadius: 14,
    paddingVertical: 17,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#0041A8',
        shadowOpacity: 0.28,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
      },
      android: { elevation: 5 },
    }),
  },
  btnPrimaryPressed: {
    backgroundColor: '#0066DD',
  },
  btnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    fontFamily: 'Manrope_700Bold',
    letterSpacing: 0.2,
  },

  btnSecondary: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 17,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
      },
      android: { elevation: 2 },
    }),
  },
  btnSecondaryPressed: {
    backgroundColor: '#EEF4FF',
  },
  btnSecondaryText: {
    color: BrandColors.secondary,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },

  // ── Terms ────────────────────────────────────────────────
  termsWrap: {
    alignItems: 'center',
  },
  termsText: {
    color: '#6B7280',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 19,
    fontFamily: 'Inter_400Regular',
  },
  termsLink: {
    color: '#374151',
    textDecorationLine: 'underline',
    fontFamily: 'Inter_500Medium',
  },
});
