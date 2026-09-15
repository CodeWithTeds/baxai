import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';

import { BrandColors } from '@/constants/theme';
import { useLanguage } from '@/contexts/language-context';

export default function LanguageSelectionScreen() {
  const { setLanguage } = useLanguage();

  const handleSelect = async (lang: 'en' | 'tl') => {
    if (Platform.OS !== 'web') {
      try {
        await Haptics.selectionAsync();
      } catch {}
    }
    setLanguage(lang);
    // navigate to the welcome/onboarding screen
    router.replace('/welcome');
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      {/* Header - Rens Digital */}
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <Animated.View entering={FadeIn.duration(500)} style={styles.header}>
          <Ionicons name="print" size={20} color="#FFFFFF" style={styles.headerIcon} />
          <Text style={styles.headerTitle}>Rens Digital</Text>
        </Animated.View>
      </SafeAreaView>

      {/* Mascot Area */}
      <View style={styles.mascotArea}>
        <Animated.View entering={FadeInUp.delay(150).duration(600).springify()} style={styles.mascotWrapper}>
          {/* Star decoration - top right */}
          <Animated.View
            entering={FadeIn.delay(700).duration(400)}
            style={styles.starContainer}
            pointerEvents="none">
            <Ionicons name="star" size={22} color="#FFFFFF" />
          </Animated.View>

          <Image
            source={require('@/assets/images/owl-mascot.png')}
            style={styles.mascotImage}
            contentFit="contain"
            priority="high"
            transition={200}
          />
        </Animated.View>
      </View>

      {/* Bottom Card */}
      <SafeAreaView edges={['bottom']} style={styles.bottomSafe}>
        <Animated.View entering={FadeInUp.delay(300).duration(600).springify()} style={styles.card}>
          {/* Card Header */}
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Choose Your Language</Text>
            <Text style={styles.cardSubtitle}>
              Select your preferred language to customize your experience and manage your printing orders with
              ease.
            </Text>
          </View>

          <View style={styles.divider} />

          <Pressable
            onPress={() => handleSelect('en')}
            style={({ pressed }) => [styles.languageButton, pressed && styles.languageButtonPressed]}
            android_ripple={{ color: '#E5F0FF' }}>
            <Text style={styles.languageText}>English</Text>
          </Pressable>

          <View style={styles.divider} />

          <Pressable
            onPress={() => handleSelect('tl')}
            style={({ pressed }) => [styles.languageButton, pressed && styles.languageButtonPressed]}
            android_ripple={{ color: '#E5F0FF' }}>
            <Text style={styles.languageText}>Tagalog</Text>
          </Pressable>
        </Animated.View>

        {/* Subtle shadow oval under card like reference */}
        <Animated.View entering={FadeInDown.delay(500).duration(500)} style={styles.cardUnderShadow} />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BrandColors.primary, // #0052CC from palette
  },
  headerSafe: {
    zIndex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerIcon: {
    marginTop: 1,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.2,
    fontFamily: 'Manrope_700Bold',
  },
  mascotArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    // push mascot up a bit to leave space for card
    paddingBottom: 16,
    paddingTop: 8,
  },
  mascotWrapper: {
    width: '100%',
    maxWidth: 340,
    aspectRatio: 724 / 771, // original image ratio
    maxHeight: 420,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mascotImage: {
    width: '100%',
    height: '100%',
  },
  starContainer: {
    position: 'absolute',
    top: 18,
    right: 12,
    zIndex: 2,
    // @ts-ignore web uses boxShadow, native uses shadow*
    ...(Platform.OS === 'web'
      ? ({ boxShadow: '0 2px 4px rgba(0,61,155,0.25)' } as any)
      : {
          shadowColor: '#003D9B',
          shadowOpacity: 0.25,
          shadowRadius: 4,
          shadowOffset: { width: 0, height: 2 },
          elevation: 3,
        }),
  },
  bottomSafe: {
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 12 : 20,
  },
  card: {
    backgroundColor: BrandColors.cardBackground,
    borderRadius: 16,
    overflow: 'hidden',
    // @ts-ignore web uses boxShadow
    ...(Platform.OS === 'web'
      ? ({ boxShadow: '0 8px 16px rgba(0,0,0,0.12)' } as any)
      : {
          shadowColor: '#000',
          shadowOpacity: 0.12,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 8 },
          elevation: 8,
        }),
  },
  cardHeader: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 16,
    alignItems: 'center',
    backgroundColor: '#F9FAFB', // very light gray like reference header area
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: BrandColors.title, // #1A1C1E
    textAlign: 'center',
    fontFamily: 'Manrope_700Bold',
  },
  cardSubtitle: {
    marginTop: 6,
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: '400',
    color: BrandColors.subtitle, // #6B7280
    textAlign: 'center',
    paddingHorizontal: 4,
    fontFamily: 'Inter_400Regular',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: BrandColors.divider, // #E5E7EB
    width: '100%',
  },
  languageButton: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  languageButtonPressed: {
    backgroundColor: '#F0F6FF',
  },
  languageText: {
    fontSize: 17,
    fontWeight: '500',
    color: BrandColors.secondary, // #007AFF
    textAlign: 'center',
    fontFamily: 'Inter_500Medium',
  },
  cardUnderShadow: {
    height: 10,
    marginTop: 10,
    marginHorizontal: 32,
    backgroundColor: 'rgba(0, 61, 155, 0.35)', // tertiary with alpha - matches darker oval in reference
    borderRadius: 999,
    opacity: 0.7,
  },
});
