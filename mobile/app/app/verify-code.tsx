import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
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

import { BrandColors, IconColors } from '@/constants/theme';
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
      <StatusBar style="light" />

      {/* Header Bar */}
      <View style={styles.header}>
        <Pressable
          hitSlop={12}
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}>
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </Pressable>
        <View style={styles.brandGroup}>
          <Ionicons name="shield-checkmark" size={20} color="#FFFFFF" />
          <Text style={styles.brandTitle}>NUYDA SECURITY</Text>
        </View>
        <View style={{ width: 32 }} />
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

            {/* Mascot / Icon Badge */}
            <View style={styles.mascotArea}>
              <Animated.View entering={FadeInUp.delay(100).duration(500)} style={styles.iconWrap}>
                <View style={[styles.bigIconBadge, { backgroundColor: isPasswordReset ? '#FEF3C7' : '#EDE9FE' }]}>
                  <Ionicons
                    name={isPasswordReset ? 'key-outline' : 'mail-unread-outline'}
                    size={48}
                    color={isPasswordReset ? '#D97706' : '#7C3AED'}
                  />
                </View>
              </Animated.View>
            </View>

            {/* Verification Card */}
            <Animated.View entering={FadeInDown.delay(200).duration(600)} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>
                  {isPasswordReset ? 'Reset Verification Code' : 'Verify Your Email'}
                </Text>
                <Text style={styles.cardSubtitle}>
                  Please enter the 4-digit code sent to:
                </Text>
                <View style={styles.emailBadge}>
                  <Ionicons name="mail" size={13} color="#0052CC" />
                  <Text style={styles.emailBadgeText} numberOfLines={1}>
                    {email || 'your email'}
                  </Text>
                </View>
              </View>

              {/* Error Banner */}
              {errorMessage && (
                <View style={styles.errorBanner}>
                  <Ionicons name="alert-circle" size={16} color="#DC2626" />
                  <Text style={styles.errorBannerText}>{errorMessage}</Text>
                </View>
              )}

              {/* 4-Digit Input Boxes */}
              <View style={styles.codeRow}>
                {digits.map((digit, idx) => {
                  const isFocused = Boolean(digit);
                  return (
                    <View
                      key={idx}
                      style={[
                        styles.digitBox,
                        isFocused && styles.digitBoxActive,
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
              </View>

              <Text style={styles.expiryNote}>
                ⏰ The verification code will expire in 10 minutes.
              </Text>

              {/* Verify Button */}
              <Pressable
                onPress={handleVerify}
                disabled={!isComplete || loading}
                style={({ pressed }) => [
                  styles.verifyBtn,
                  !isComplete && styles.verifyBtnDisabled,
                  pressed && { opacity: 0.85 },
                ]}>
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                    <Text style={styles.verifyBtnText}>
                      {isPasswordReset ? 'Verify & Reset Password' : 'Verify & Proceed'}
                    </Text>
                  </>
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
            </Animated.View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0052CC',
  },
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
    fontFamily: 'Manrope_700Bold',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
  },
  mascotArea: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconWrap: {
    marginTop: 10,
  },
  bigIconBadge: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  cardHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    fontFamily: 'Manrope_700Bold',
    textAlign: 'center',
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    fontFamily: 'Inter_400Regular',
    marginTop: 6,
    textAlign: 'center',
  },
  emailBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 10,
    maxWidth: '100%',
  },
  emailBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0052CC',
    fontFamily: 'Inter_600SemiBold',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 12,
    color: '#B91C1C',
    fontFamily: 'Inter_500Medium',
  },
  codeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  digitBox: {
    flex: 1,
    height: 64,
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  digitBoxActive: {
    borderColor: '#0052CC',
    backgroundColor: '#EFF6FF',
  },
  digitBoxError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  digitInput: {
    width: '100%',
    height: '100%',
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    fontFamily: 'Courier',
    textAlign: 'center',
  },
  expiryNote: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    fontFamily: 'Inter_400Regular',
  },
  verifyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0052CC',
    height: 52,
    borderRadius: 14,
    shadowColor: '#0052CC',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  verifyBtnDisabled: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0,
    elevation: 0,
  },
  verifyBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Manrope_700Bold',
  },
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
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
    color: '#0052CC',
    fontFamily: 'Inter_600SemiBold',
  },
});
