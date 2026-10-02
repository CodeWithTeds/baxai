import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandColors } from '@/constants/theme';
import { useLanguage } from '@/contexts/language-context';

export const HOME_TUTORIAL_KEY = '@has_seen_home_tutorial_v2';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface SpotlightTargets {
  search?: React.RefObject<View | null>;
  categories?: React.RefObject<View | null>;
  featured?: React.RefObject<View | null>;
}

interface TourStepConfig {
  id: 'search' | 'categories' | 'featured' | 'tabs';
  badge: string;
  title: string;
  desc: string;
  mascot: any;
  mascotPoseLabel: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  targets?: SpotlightTargets;
  onScrollToStep?: (stepIndex: number) => void;
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function HomeTutorialSpotlight({
  visible,
  onClose,
  targets,
  onScrollToStep,
}: Props) {
  const insets = useSafeAreaInsets();
  const { language } = useLanguage();
  const isTl = language === 'tl';
  const [currentStep, setCurrentStep] = useState(0);
  const [measuredRect, setMeasuredRect] = useState<Rect | null>(null);

  // Gentle, playful bobbing animation for the mascot only
  const mascotBob = useSharedValue(0);
  const mascotHop = useSharedValue(0);

  useEffect(() => {
    mascotBob.value = withRepeat(
      withSequence(
        withTiming(-5, { duration: 750 }),
        withTiming(0, { duration: 750 })
      ),
      -1,
      true
    );
  }, []);

  useEffect(() => {
    // Subtle, friendly hop when switching steps
    mascotHop.value = -8;
    mascotHop.value = withSpring(0, { damping: 11, stiffness: 140 });
  }, [currentStep]);

  const mascotAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: mascotBob.value + mascotHop.value }],
  }));

  const steps: TourStepConfig[] = [
    {
      id: 'search',
      badge: isTl ? '🔍 PAGHAHANAP & ACCESS' : '🔍 SEARCH & QUICK ACCESS',
      title: isTl ? 'Mabilis na Paghahanap' : 'Find Any Product Fast',
      desc: isTl
        ? 'Gamitin ang search bar upang maghanap ng custom mugs, t-shirts, at iba pa. Makikita rin dito ang iyong Cart at Profile.'
        : 'Use this bar to quickly search any product or category. Your live Cart and Account Profile are also right here!',
      mascot: require('@/assets/images/owl-mascot.png'),
      mascotPoseLabel: isTl ? 'Owla ang Tagapayo' : 'Owla Guide',
    },
    {
      id: 'categories',
      badge: isTl ? '🏷️ MGA KATEGORYA' : '🏷️ BROWSE CATEGORIES',
      title: isTl ? 'Iba-ibang Produkto' : 'Explore All Categories',
      desc: isTl
        ? 'Pumili sa Mugs, T-Shirts, Button Pins, Stickers, at Tote Bags. Ang may markang "3D" ay may interactive preview!'
        : 'Explore our catalog of Mugs, Shirts, Pins, Stickers & Tote Bags. Items with a "3D" badge support real-time 3D rotation!',
      mascot: require('@/assets/images/shopping-owl.png'),
      mascotPoseLabel: isTl ? 'Owla sa Pamimili' : 'Shopping Owla',
    },
    {
      id: 'featured',
      badge: isTl ? '⭐ MGA TAMPOK NA PRODUKTO' : '⭐ FEATURED & 3D STUDIO',
      title: isTl ? 'Suriin ang Bestsellers' : '3D Previews & Bestsellers',
      desc: isTl
        ? 'Tingnan ang pinakasikat na mga gawa. I-tap ang anumang produkto para sa 360° 3D preview bago mag-order!'
        : 'Check out our top-rated custom prints. Tap any item to inspect in 360° 3D and customize text live before ordering!',
      mascot: require('@/assets/images/owl-mascot-v2.png'),
      mascotPoseLabel: isTl ? 'Owla 3D Master' : '3D Owla',
    },
    {
      id: 'tabs',
      badge: isTl ? '🧭 NAVIGATION & OWLA AI' : '🧭 NAVIGATION & OWLA AI',
      title: isTl ? 'Owla AI Assistant & Hub' : 'Owla AI Hub & Navigation',
      desc: isTl
        ? 'Lumipat sa Services para sa buong catalog, i-track ang iyong mga order, o kausapin si Owla AI para sa tulong sa disenyo.'
        : 'Easily navigate through all Services, track active orders live, or tap the AI Hub to brainstorm designs with Owla AI!',
      mascot: require('@/assets/images/owl-mascot.png'),
      mascotPoseLabel: isTl ? 'Owla AI Copilot' : 'Owla AI Copilot',
    },
  ];

  const activeStep = steps[currentStep] || steps[0];

  // Tailored fallback coordinates for each section so bounding box is never misaligned
  const getFallbackRect = (stepId: TourStepConfig['id']): Rect => {
    const topSafe = insets.top;
    switch (stepId) {
      case 'search':
        return {
          x: 16,
          y: topSafe + 56,
          width: SCREEN_WIDTH - 32,
          height: 48,
        };
      case 'categories':
        return {
          x: 16,
          y: topSafe + 185,
          width: SCREEN_WIDTH - 32,
          height: 110,
        };
      case 'featured':
        return {
          x: 16,
          y: topSafe + 175,
          width: SCREEN_WIDTH - 32,
          height: 280,
        };
      case 'tabs':
      default:
        return {
          x: 16,
          y: SCREEN_HEIGHT - insets.bottom - 74,
          width: SCREEN_WIDTH - 32,
          height: 64,
        };
    }
  };

  // Reset to first step whenever the spotlight opens
  useEffect(() => {
    if (visible) {
      setCurrentStep(0);
      setMeasuredRect(null);
    }
  }, [visible]);

  // Measure the target on screen whenever step changes or modal opens
  const measureTarget = () => {
    if (!visible) return;

    if (activeStep.id === 'tabs') {
      const barHeight = 64;
      const barBottomMargin = insets.bottom > 0 ? insets.bottom + 4 : 14;
      setMeasuredRect({
        x: 16,
        y: SCREEN_HEIGHT - barBottomMargin - barHeight,
        width: SCREEN_WIDTH - 32,
        height: barHeight,
      });
      return;
    }

    let targetRef: React.RefObject<View | null> | undefined;
    if (activeStep.id === 'search') targetRef = targets?.search;
    else if (activeStep.id === 'categories') targetRef = targets?.categories;
    else if (activeStep.id === 'featured') targetRef = targets?.featured;

    const node = targetRef?.current;
    if (node && typeof (node as any).measureInWindow === 'function') {
      try {
        (node as any).measureInWindow((x: number, y: number, width: number, height: number) => {
          if (typeof width === 'number' && width > 20 && height > 20) {
            setMeasuredRect({ x, y, width, height });
          }
        });
      } catch (e) {
        // Fallback handles it cleanly
      }
    }
  };

  useEffect(() => {
    if (!visible) return;
    setMeasuredRect(null);

    // 1. Tell parent to scroll if needed
    onScrollToStep?.(currentStep);

    // 2. Measure once after scroll animation settles
    const t = setTimeout(measureTarget, 220);

    return () => {
      clearTimeout(t);
    };
  }, [currentStep, visible]);

  const triggerHaptic = async (style = Haptics.ImpactFeedbackStyle.Light) => {
    if (Platform.OS !== 'web') {
      try {
        await Haptics.impactAsync(style);
      } catch {}
    }
  };

  const handleFinish = async () => {
    await triggerHaptic(Haptics.NotificationFeedbackType.Success as any);
    try {
      await AsyncStorage.setItem(HOME_TUTORIAL_KEY, 'true');
    } catch {}
    onClose();
  };

  const handleNext = async () => {
    if (currentStep < steps.length - 1) {
      await triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
      setCurrentStep((prev) => prev + 1);
    } else {
      await handleFinish();
    }
  };

  const handlePrev = async () => {
    if (currentStep > 0) {
      await triggerHaptic();
      setCurrentStep((prev) => prev - 1);
    }
  };

  if (!visible) return null;

  // Use measuredRect if available, or tailored step fallback
  const currentRect: Rect = measuredRect || getFallbackRect(activeStep.id);

  // Add comfortable padding around the target element
  const pad = 6;
  const boxX = Math.max(6, currentRect.x - pad);
  const boxY = Math.max(insets.top, currentRect.y - pad);
  const boxW = Math.min(SCREEN_WIDTH - 12, currentRect.width + pad * 2);
  const boxH = currentRect.height + pad * 2;

  // Decide if tooltip should go below or above the bounding box
  const tooltipHeightEstimate = 220;
  const spaceBelow = SCREEN_HEIGHT - (boxY + boxH) - insets.bottom;
  const placeBelow = spaceBelow >= tooltipHeightEstimate || boxY < SCREEN_HEIGHT * 0.45;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Light subtle backdrop scrim - NO opaque solid BG so home page is clearly visible! */}
      <Pressable style={styles.scrim} onPress={handleFinish}>
        <View style={StyleSheet.absoluteFill} />
      </Pressable>

      {/* ── Accurate Dynamic Bounding Box Highlight ───────────────── */}
      <Animated.View
        key={`box-${activeStep.id}`}
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(150)}
        style={[
          styles.boundingBox,
          {
            left: boxX,
            top: boxY,
            width: boxW,
            height: boxH,
          },
        ]}
        pointerEvents="none"
      >
        {/* Pulsing corner accents */}
        <View style={[styles.corner, styles.cornerTL]} />
        <View style={[styles.corner, styles.cornerTR]} />
        <View style={[styles.corner, styles.cornerBL]} />
        <View style={[styles.corner, styles.cornerBR]} />

        {/* Bounding box label tag */}
        <View style={styles.boxTag}>
          <Text style={styles.boxTagText}>{activeStep.badge}</Text>
        </View>
      </Animated.View>

      {/* ── Explanation Tooltip Box with Mascot ──────────────────── */}
      <Animated.View
        key={`tooltip-${activeStep.id}`}
        entering={
          placeBelow
            ? FadeInDown.duration(200)
            : FadeInUp.duration(200)
        }
        exiting={FadeOut.duration(120)}
        style={[
          styles.tooltipCard,
          placeBelow
            ? {
                top: Math.min(SCREEN_HEIGHT - tooltipHeightEstimate - insets.bottom - 10, boxY + boxH + 12),
              }
            : {
                top: Math.max(insets.top + 10, boxY - tooltipHeightEstimate - 14),
              },
        ]}
      >
        {/* Top Header: Step counter & Skip Button */}
        <View style={styles.cardHeader}>
          <View style={styles.stepBadge}>
            <Text style={styles.stepBadgeText}>
              {isTl ? 'Hakbang' : 'Step'} {currentStep + 1} / {steps.length}
            </Text>
          </View>

          <Pressable
            hitSlop={12}
            style={({ pressed }) => [styles.skipBtn, pressed && styles.pressed]}
            onPress={handleFinish}
          >
            <Text style={styles.skipBtnText}>{isTl ? 'Laktawan (Skip)' : 'Skip'}</Text>
            <Ionicons name="close" size={16} color="#6B7280" />
          </Pressable>
        </View>

        {/* Mascot & Explanation Body */}
        <View style={styles.cardBody}>
          {/* Mascot Image with Gentle Playful Bounce */}
          <Animated.View style={[styles.mascotWrap, mascotAnimatedStyle]}>
            <View style={styles.mascotBgCircle} />
            <Image
              source={activeStep.mascot}
              style={styles.mascotImg}
              contentFit="contain"
              priority="high"
            />
            <Text style={styles.mascotLabel} numberOfLines={1}>
              {activeStep.mascotPoseLabel}
            </Text>
          </Animated.View>

          {/* Explanation Text */}
          <View style={styles.textWrap}>
            <Text style={styles.titleText}>{activeStep.title}</Text>
            <Text style={styles.descText}>{activeStep.desc}</Text>
          </View>
        </View>

        {/* Bottom Actions */}
        <View style={styles.cardFooter}>
          {/* Back button */}
          {currentStep > 0 ? (
            <Pressable
              hitSlop={8}
              style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
              onPress={handlePrev}
            >
              <Ionicons name="arrow-back" size={16} color="#4B5563" />
              <Text style={styles.backBtnText}>{isTl ? 'Bumalik' : 'Back'}</Text>
            </Pressable>
          ) : (
            <View style={styles.emptyBack} />
          )}

          {/* Step dots */}
          <View style={styles.dotsRow}>
            {steps.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i === currentStep ? styles.dotActive : styles.dotInactive,
                ]}
              />
            ))}
          </View>

          {/* Next / Got It button */}
          <Pressable
            style={({ pressed }) => [
              styles.nextBtn,
              pressed && styles.pressed,
            ]}
            onPress={handleNext}
          >
            <LinearGradient
              colors={['#0052CC', '#1D4ED8']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.nextBtnGradient}
            >
              <Text style={styles.nextBtnText}>
                {currentStep === steps.length - 1
                  ? isTl
                    ? 'Nakuha Ko! 🎉'
                    : 'Got It! 🎉'
                  : isTl
                  ? 'Susunod'
                  : 'Next'}
              </Text>
              <Ionicons
                name={
                  currentStep === steps.length - 1
                    ? 'checkmark'
                    : 'arrow-forward'
                }
                size={16}
                color="#FFFFFF"
              />
            </LinearGradient>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(15, 23, 42, 0.40)', // Translucent scrim so home page content is visible!
  },
  boundingBox: {
    position: 'absolute',
    borderWidth: 2.5,
    borderColor: '#2563EB',
    borderStyle: 'dashed',
    borderRadius: 16,
    backgroundColor: 'rgba(37, 99, 235, 0.08)', // subtle highlight tint
    ...Platform.select({
      ios: {
        shadowColor: '#2563EB',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.7,
        shadowRadius: 10,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  corner: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderColor: '#0052CC',
  },
  cornerTL: {
    top: -2,
    left: -2,
    borderTopWidth: 3.5,
    borderLeftWidth: 3.5,
    borderTopLeftRadius: 6,
  },
  cornerTR: {
    top: -2,
    right: -2,
    borderTopWidth: 3.5,
    borderRightWidth: 3.5,
    borderTopRightRadius: 6,
  },
  cornerBL: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 3.5,
    borderLeftWidth: 3.5,
    borderBottomLeftRadius: 6,
  },
  cornerBR: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 3.5,
    borderRightWidth: 3.5,
    borderBottomRightRadius: 6,
  },
  boxTag: {
    position: 'absolute',
    top: -12,
    alignSelf: 'center',
    backgroundColor: '#0052CC',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 8,
  },
  boxTagText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    fontFamily: 'Manrope_700Bold',
  },
  tooltipCard: {
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#E0E7FF',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.22,
        shadowRadius: 20,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  stepBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  stepBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: BrandColors.primary,
    fontFamily: 'Manrope_700Bold',
  },
  skipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  skipBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    fontFamily: 'Inter_600SemiBold',
  },
  pressed: {
    opacity: 0.7,
  },
  cardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 12,
  },
  mascotWrap: {
    width: 78,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mascotBgCircle: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#DBEAFE',
    opacity: 0.8,
  },
  mascotImg: {
    width: 70,
    height: 70,
  },
  mascotLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    color: BrandColors.primary,
    marginTop: 4,
    textAlign: 'center',
    fontFamily: 'Manrope_700Bold',
  },
  textWrap: {
    flex: 1,
  },
  titleText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
    fontFamily: 'Manrope_700Bold',
    marginBottom: 4,
  },
  descText: {
    fontSize: 12.5,
    color: '#4B5563',
    fontFamily: 'Inter_400Regular',
    lineHeight: 17,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  backBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
    fontFamily: 'Inter_600SemiBold',
  },
  emptyBack: {
    width: 60,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dot: {
    height: 5,
    borderRadius: 2.5,
  },
  dotActive: {
    width: 16,
    backgroundColor: BrandColors.primary,
  },
  dotInactive: {
    width: 5,
    backgroundColor: '#D1D5DB',
  },
  nextBtn: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  nextBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  nextBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Manrope_700Bold',
  },
});
