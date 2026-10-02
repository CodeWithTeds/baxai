import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
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
import { apiForgotPassword } from '@/utils/auth-api';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  const triggerHaptic = async (style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) => {
    if (Platform.OS !== 'web') {
      try {
        await Haptics.impactAsync(style);
      } catch {}
    }
  };

  const handleSendResetCode = async () => {
    await triggerHaptic();
    setErrorMessage(null);

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setErrorMessage('Please enter your email address.');
      return;
    }

    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    Keyboard.dismiss();

    try {
      const res = await apiForgotPassword({ email: cleanEmail });

      if (res.status === 'success') {
        triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
        Alert.alert(
          'Code Sent!',
          'A 4-digit password reset code has been sent to your email.',
          [
            {
              text: 'Enter Code',
              onPress: () => {
                router.push({
                  pathname: '/verify-code',
                  params: { email: cleanEmail, type: 'password_reset' },
                } as any);
              },
            },
          ]
        );
      } else {
        setErrorMessage(res.message || 'Could not send reset code. Please verify your email.');
        triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to send password reset code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.root}>
      <StatusBar style="dark" />

      {/* Top Navigation Row with Modern Squircle Back Button */}
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
            automaticallyAdjustKeyboardInsets={true}
            showsVerticalScrollIndicator={false}>

            {/* Header Block Matching Ref Modern Design */}
            <Animated.View entering={FadeInUp.duration(400)} style={styles.headerBlock}>
              <Text style={styles.title}>Forgot password</Text>
              <Text style={styles.subtitle}>
                Enter your email address and we'll send you a 4-digit code to reset your password.
              </Text>
            </Animated.View>

            {/* Error Banner */}
            {errorMessage && (
              <Animated.View entering={FadeInDown.duration(250)} style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={17} color="#DC2626" />
                <Text style={styles.errorBannerText}>{errorMessage}</Text>
              </Animated.View>
            )}

            {/* Form */}
            <Animated.View entering={FadeInUp.delay(100).duration(450)} style={styles.formContainer}>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Email address</Text>
                <View
                  style={[
                    styles.inputContainer,
                    isFocused && styles.inputContainerFocused,
                  ]}>
                  <TextInput
                    placeholder="Your email address"
                    placeholderTextColor="#9CA3AF"
                    value={email}
                    onChangeText={(val) => {
                      setEmail(val);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    returnKeyType="done"
                    onSubmitEditing={handleSendResetCode}
                    style={styles.textInput}
                  />
                </View>
              </View>

              {/* Submit Button */}
              <Pressable
                onPress={handleSendResetCode}
                disabled={loading}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  pressed && styles.primaryBtnPressed,
                  loading && { opacity: 0.8 },
                ]}
                android_ripple={{ color: '#003D9B' }}>
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.primaryBtnText}>Send Reset Code</Text>
                )}
              </Pressable>
            </Animated.View>

            {/* Divider "Or" */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Back to Login Button */}
            <View style={styles.altButtonsGroup}>
              <Pressable
                onPress={() => router.replace('/login')}
                style={({ pressed }) => [
                  styles.socialBtn,
                  pressed && styles.socialBtnPressed,
                ]}>
                <Ionicons name="arrow-back-outline" size={18} color={BrandColors.primary} />
                <Text style={styles.socialBtnText}>Remember password? Sign in</Text>
              </Pressable>
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
    marginBottom: 26,
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
    lineHeight: 20,
    fontFamily: 'Inter_400Regular',
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
    marginBottom: 18,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 13,
    color: '#B91C1C',
    fontFamily: 'Inter_500Medium',
  },
  formContainer: {
    width: '100%',
  },
  fieldGroup: {
    marginBottom: 18,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 7,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    height: 54,
    paddingHorizontal: 16,
  },
  inputContainerFocused: {
    borderColor: BrandColors.primary,
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: BrandColors.primary,
        shadowOpacity: 0.12,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
      },
      android: { elevation: 2 },
    }),
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    fontFamily: 'Inter_400Regular',
  },
  primaryBtn: {
    backgroundColor: BrandColors.primary,
    borderRadius: 18,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
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
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 22,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    marginHorizontal: 14,
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '500',
    fontFamily: 'Inter_500Medium',
  },
  altButtonsGroup: {
    gap: 12,
  },
  socialBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 18,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
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
  socialBtnPressed: {
    backgroundColor: '#F3F4F6',
    transform: [{ scale: 0.99 }],
  },
  socialBtnText: {
    color: '#111827',
    fontSize: 14.5,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
});
