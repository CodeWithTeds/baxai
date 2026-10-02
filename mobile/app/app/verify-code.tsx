import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import { BrandColors } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { apiResendCode, apiVerifyEmail, apiVerifyResetCode } from '@/utils/auth-api';
import { syncCustomerToBackend } from '@/utils/customer-sync';

export default function VerifyCodeScreen() {
  const params = useLocalSearchParams<{
    email?: string;
    type?: string;
    name?: string;
  }>();

  const email = (params.email || '').trim().toLowerCase();
  const type = (params.type || 'email_verification') as 'email_verification' | 'password_reset';
  const name = params.name || '';

  const { login } = useAuth();

  const [digits, setDigits] = useState<string[]>(['', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(60);

  const inputRefs = [
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
  ];

  // Resend countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  // Auto-focus first digit on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRefs[0].current?.focus();
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  const triggerHaptic = async (style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) => {
    if (Platform.OS !== 'web') {
      try {
        await Haptics.impactAsync(style);
      } catch {}
    }
  };

  const handleDigitChange = (val: string, index: number) => {
    setErrorMessage(null);
    const cleaned = val.replace(/[^0-9]/g, '');

    // Handle paste of 4 digits
    if (cleaned.length === 4) {
      const split = cleaned.split('');
      setDigits(split);
      inputRefs[3].current?.focus();
      triggerHaptic();
      return;
    }

    const char = cleaned.slice(-1);
    const newDigits = [...digits];
    newDigits[index] = char;
    setDigits(newDigits);

    if (char && index < 3) {
      inputRefs[index + 1].current?.focus();
      triggerHaptic();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        const newDigits = [...digits];
        newDigits[index - 1] = '';
        setDigits(newDigits);
        inputRefs[index - 1].current?.focus();
      }
    }
  };

  const fullCode = digits.join('');
  const isComplete = fullCode.length === 4;

  const handleVerify = async () => {
    if (!isComplete) {
      setErrorMessage('Please enter all 4 digits of the verification code.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    Keyboard.dismiss();

    try {
      if (type === 'email_verification') {
        const res = await apiVerifyEmail({ email, code: fullCode });
        if (res.status === 'success' && res.access_token && res.user) {
          triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
          await login(res.access_token, res.user);
          await syncCustomerToBackend(email, res.user.name || name);

          Alert.alert(
            '🎉 Verification Successful!',
            'Your email address has been verified. Welcome to NUYDA ENTERPRISE!',
            [
              {
                text: 'Continue to Shop',
                onPress: () => {
                  router.replace({
                    pathname: '/(tabs)',
                    params: { authSuccess: '1', email, name: res.user?.name || name },
                  } as any);
                },
              },
            ]
          );
        } else {
          setErrorMessage(res.message || 'Incorrect verification code. Please try again.');
          triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
        }
      } else {
        // Password reset code verification
        const res = await apiVerifyResetCode({ email, code: fullCode });
        if (res.status === 'success') {
          triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
          router.push({
            pathname: '/reset-password',
            params: { email, code: fullCode },
          } as any);
        } else {
          setErrorMessage(res.message || 'Incorrect reset code. Please try again.');
          triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
        }
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Verification failed. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || resending) return;
    setResending(true);
    setErrorMessage(null);

    try {
      const res = await apiResendCode({ email, type });
      if (res.status === 'success') {
        setCountdown(60);
        setDigits(['', '', '', '']);
        inputRefs[0].current?.focus();
        triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
        Alert.alert('Code Sent', 'A fresh 4-digit code has been sent to your email.');
      } else {
        setErrorMessage(res.message || 'Could not resend code. Please try again.');
      }
    } catch (e: any) {
      setErrorMessage(e?.message || 'Failed to resend code.');
    } finally {
      setResending(false);
    }
  };

  const isPasswordReset = type === 'password_reset';

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.root}>
      <StatusBar style="dark" />

      {/* Top Navigation Row (Header removed, only minimal squircle back button) */}
      <View style={styles.topNav}>
        <Pressable
          hitSlop={12}
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}>
          <Ionicons name="chevron-back" size={20} color="#111827" />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
        style={{ flex: 1 }}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>

            {/* Header Block */}
            <Animated.View entering={FadeInUp.duration(400)} style={styles.headerBlock}>
              <Text style={styles.title}>
                {isPasswordReset ? 'Reset Verification' : 'Verify Email'}
              </Text>
              <Text style={styles.subtitle}>
                We sent a 4-digit verification code to
              </Text>

              {/* Email Chip */}
              <View style={styles.emailBadge}>
                <Ionicons name="mail" size={13} color={BrandColors.primary} />
                <Text style={styles.emailBadgeText} numberOfLines={1}>
                  {email || 'your email'}
                </Text>
              </View>
            </Animated.View>

            {/* Error Banner */}
            {errorMessage && (
              <Animated.View entering={FadeInDown.duration(250)} style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={17} color="#DC2626" />
                <Text style={styles.errorBannerText}>{errorMessage}</Text>
              </Animated.View>
            )}

            {/* 4-Digit Input Boxes */}
            <Animated.View entering={FadeInUp.delay(100).duration(450)} style={styles.codeRow}>
              {digits.map((digit, idx) => {
                const isFilled = Boolean(digit);
                return (
                  <View
                    key={idx}
                    style={[
                      styles.digitBox,
                      isFilled && styles.digitBoxActive,
                      Boolean(errorMessage) && styles.digitBoxError,
                    ]}>
                    <TextInput
                      ref={inputRefs[idx]}
                      value={digit}
                      onChangeText={(val) => handleDigitChange(val, idx)}
                      onKeyPress={(e) => handleKeyPress(e, idx)}
                      keyboardType="number-pad"
                      maxLength={idx === 0 ? 4 : 1}
                      selectTextOnFocus
                      textAlign="center"
                      style={styles.digitInput}
                    />
                  </View>
                );
              })}
            </Animated.View>

            <Text style={styles.expiryNote}>
              Code expires in 10 minutes.
            </Text>

            {/* Verify Action Button */}
            <Pressable
              onPress={handleVerify}
              disabled={!isComplete || loading}
              style={({ pressed }) => [
                styles.primaryBtn,
                !isComplete && styles.primaryBtnDisabled,
                pressed && isComplete && styles.primaryBtnPressed,
              ]}
              android_ripple={{ color: '#003D9B' }}>
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.primaryBtnText}>
                  {isPasswordReset ? 'Verify Code' : 'Verify & Proceed'}
                </Text>
              )}
            </Pressable>

            {/* Resend Section */}
            <View style={styles.resendRow}>
              <Text style={styles.resendPrompt}>Didn't receive the email? </Text>
              {countdown > 0 ? (
                <Text style={styles.countdownText}>Resend in {countdown}s</Text>
              ) : (
                <Pressable onPress={handleResend} disabled={resending}>
                  <Text style={styles.resendBtnText}>
                    {resending ? 'Sending...' : 'Resend Code'}
                  </Text>
                </Pressable>
              )}
            </View>

            {/* Footer */}
            <View style={styles.footerWrap}>
              <Text style={styles.footerText}>
                Need assistance? Contact our support team.
              </Text>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  topNav: {
    paddingHorizontal: 22,
    paddingTop: Platform.OS === 'android' ? 12 : 6,
    paddingBottom: 8,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
      },
      android: { elevation: 2 },
    }),
  },
  backBtnPressed: {
    backgroundColor: '#F3F4F6',
    transform: [{ scale: 0.96 }],
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
    justifyContent: 'center',
  },
  headerBlock: {
    marginBottom: 28,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#111827',
    fontFamily: 'Manrope_700Bold',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    fontFamily: 'Inter_400Regular',
  },
  emailBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 10,
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  emailBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: BrandColors.primary,
    fontFamily: 'Inter_600SemiBold',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 20,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 13,
    color: '#B91C1C',
    fontFamily: 'Inter_500Medium',
  },
  codeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 14,
  },
  digitBox: {
    flex: 1,
    height: 66,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.03,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
      },
      android: { elevation: 1 },
    }),
  },
  digitBoxActive: {
    borderColor: BrandColors.primary,
    backgroundColor: '#F8FAFF',
  },
  digitBoxError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  digitInput: {
    width: '100%',
    height: '100%',
    fontSize: 26,
    fontWeight: '800',
    color: '#111827',
    fontFamily: 'Courier',
    textAlign: 'center',
  },
  expiryNote: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 24,
    fontFamily: 'Inter_400Regular',
  },
  primaryBtn: {
    backgroundColor: BrandColors.primary,
    borderRadius: 18,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: BrandColors.primary,
        shadowOpacity: 0.28,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
      },
      android: { elevation: 4 },
    }),
  },
  primaryBtnDisabled: {
    backgroundColor: '#D1D5DB',
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryBtnPressed: {
    backgroundColor: BrandColors.tertiary,
    transform: [{ scale: 0.99 }],
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Manrope_700Bold',
    letterSpacing: 0.2,
  },
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22,
  },
  resendPrompt: {
    fontSize: 13,
    color: '#6B7280',
    fontFamily: 'Inter_400Regular',
  },
  countdownText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
    fontFamily: 'Inter_600SemiBold',
  },
  resendBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: BrandColors.primary,
    fontFamily: 'Inter_600SemiBold',
  },
  footerWrap: {
    alignItems: 'center',
    marginTop: 28,
  },
  footerText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
});
