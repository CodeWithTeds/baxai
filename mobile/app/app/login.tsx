import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
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
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import { BrandColors } from '@/constants/theme';
import { LegalModal, LegalTab } from '@/components/legal-modal';
import { useAuth } from '@/contexts/auth-context';
import { useLanguage } from '@/contexts/language-context';
import { apiLogin } from '@/utils/auth-api';
import { syncCustomerToBackend } from '@/utils/customer-sync';

export default function LoginScreen() {
  const { t } = useLanguage();
  const { login } = useAuth();

  const identifierInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);

  const [identifier, setIdentifier] = useState(''); // Email or Username
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<'identifier' | 'password' | null>(null);
  const [legalModalVisible, setLegalModalVisible] = useState(false);
  const [legalModalTab, setLegalModalTab] = useState<LegalTab>('terms');

  // Auto-focus email/username input so keyboard pops up when screen opens
  useEffect(() => {
    const timer = setTimeout(() => {
      identifierInputRef.current?.focus();
    }, 250);
    return () => clearTimeout(timer);
  }, []);

  const triggerHaptic = async (style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) => {
    if (Platform.OS !== 'web') {
      try {
        await Haptics.impactAsync(style);
      } catch {}
    }
  };

  const handleLoginSubmit = async () => {
    await triggerHaptic();
    setErrorMessage(null);

    const cleanIdentifier = identifier.trim();
    const cleanPassword = password.trim();

    if (!cleanIdentifier) {
      setErrorMessage('Please enter your email or username.');
      return;
    }

    if (!cleanPassword) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setLoading(true);
    Keyboard.dismiss();

    try {
      const res = await apiLogin({
        identifier: cleanIdentifier,
        password: cleanPassword,
      });

      if (res.needs_verification || res.status === 'unverified') {
        triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
        const userEmail = res.email || (cleanIdentifier.includes('@') ? cleanIdentifier : '');
        Alert.alert(
          'Email Verification Required',
          res.message || 'Please enter the 4-digit code sent to your email to activate your account.',
          [
            {
              text: 'Enter Code',
              onPress: () => {
                router.push({
                  pathname: '/verify-code',
                  params: {
                    email: userEmail,
                    type: 'email_verification',
                  },
                } as any);
              },
            },
          ]
        );
        return;
      }

      if (res.status === 'success' && res.access_token && res.user) {
        triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
        await login(res.access_token, res.user);
        await syncCustomerToBackend(res.user.email, res.user.name);

        router.replace({
          pathname: '/(tabs)',
          params: {
            authSuccess: '1',
            email: res.user.email,
            name: res.user.name,
          },
        } as any);
      } else {
        setErrorMessage(res.message || 'Invalid email/username or password. Please try again.');
        triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
      }
    } catch (err: any) {
      console.error('[LoginScreen] Sign-in error:', err);
      setErrorMessage(err?.message || 'Could not complete sign in. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoToRegister = async () => {
    await triggerHaptic();
    router.replace('/register');
  };

  const handleGoToForgotPassword = async () => {
    await triggerHaptic();
    router.push('/forgot-password');
  };

  const handleOpenLegal = async (tab: LegalTab) => {
    await triggerHaptic();
    setLegalModalTab(tab);
    setLegalModalVisible(true);
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
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
          showsVerticalScrollIndicator={false}>

          {/* Header Title & Subtitle Matching Ref Design */}
          <Animated.View entering={FadeInUp.duration(400)} style={styles.headerBlock}>
            <Text style={styles.title}>Log in</Text>
            <Text style={styles.subtitle}>
              By logging in, you agree to our{' '}
              <Text
                onPress={() => handleOpenLegal('terms')}
                suppressHighlighting={false}
                style={styles.subtitleLink}>
                Terms of Use
              </Text>.
            </Text>
          </Animated.View>

          {/* Error Banner */}
          {errorMessage && (
            <Animated.View entering={FadeInDown.duration(250)} style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={17} color="#DC2626" />
              <Text style={styles.errorBannerText}>{errorMessage}</Text>
            </Animated.View>
          )}

          {/* Form Fields */}
          <Animated.View entering={FadeInUp.delay(100).duration(450)} style={styles.formContainer}>
            {/* Email / Username Field */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Email or Username</Text>
              <Pressable
                onPress={() => identifierInputRef.current?.focus()}
                style={[
                  styles.inputContainer,
                  focusedField === 'identifier' && styles.inputContainerFocused,
                ]}>
                <TextInput
                  ref={identifierInputRef}
                  placeholder="Your email or username"
                  placeholderTextColor="#9CA3AF"
                  value={identifier}
                  onChangeText={(val) => {
                    setIdentifier(val);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  onFocus={() => setFocusedField('identifier')}
                  onBlur={() => setFocusedField(null)}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  onSubmitEditing={() => passwordInputRef.current?.focus()}
                  style={styles.textInput}
                />
              </Pressable>
            </View>

            {/* Password Field */}
            <View style={styles.fieldGroup}>
              <View style={styles.passwordLabelRow}>
                <Text style={styles.fieldLabel}>Password</Text>
                <Pressable hitSlop={8} onPress={handleGoToForgotPassword}>
                  <Text style={styles.forgotPasswordText}>Forgot password?</Text>
                </Pressable>
              </View>
              <Pressable
                onPress={() => passwordInputRef.current?.focus()}
                style={[
                  styles.inputContainer,
                  focusedField === 'password' && styles.inputContainerFocused,
                ]}>
                <TextInput
                  ref={passwordInputRef}
                  placeholder="Your password"
                  placeholderTextColor="#9CA3AF"
                  value={password}
                  onChangeText={(val) => {
                    setPassword(val);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  secureTextEntry={!showPassword}
                  returnKeyType="done"
                  onSubmitEditing={handleLoginSubmit}
                  style={styles.textInput}
                />
                <Pressable
                  hitSlop={10}
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeBtn}>
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#6B7280"
                  />
                </Pressable>
              </Pressable>
            </View>

              {/* Primary Connect / Log In Button */}
              <Pressable
                onPress={handleLoginSubmit}
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
                  <Text style={styles.primaryBtnText}>Connect</Text>
                )}
              </Pressable>
            </Animated.View>

            {/* Divider "Or" */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Alternate Action Buttons (Ref Style) */}
            <View style={styles.altButtonsGroup}>
              {/* Register / Sign Up Button */}
              <Pressable
                onPress={handleGoToRegister}
                style={({ pressed }) => [
                  styles.socialBtn,
                  pressed && styles.socialBtnPressed,
                ]}>
                <Ionicons name="person-add-outline" size={18} color={BrandColors.primary} />
                <Text style={styles.socialBtnText}>Create an account</Text>
              </Pressable>
            </View>

            {/* Footer Terms & Privacy */}
            <View style={styles.footerWrap}>
              <Text style={styles.footerText}>
                For more information, please see our{' '}
                <Text
                  onPress={() => handleOpenLegal('privacy')}
                  suppressHighlighting={false}
                  style={styles.footerLink}>
                  Privacy policy
                </Text>.
              </Text>
            </View>
          </ScrollView>
      </KeyboardAvoidingView>

      {/* Interactive Legal Modal */}
      <LegalModal
        visible={legalModalVisible}
        initialTab={legalModalTab}
        onClose={() => setLegalModalVisible(false)}
      />
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
    paddingTop: 12,
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
  subtitleLink: {
    color: '#111827',
    fontWeight: '700',
    fontFamily: 'Inter_600SemiBold',
    textDecorationLine: 'underline',
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
  passwordLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 7,
  },
  forgotPasswordText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: BrandColors.primary,
    fontFamily: 'Inter_600SemiBold',
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
    height: '100%',
    fontSize: 15,
    color: '#111827',
    fontFamily: 'Inter_400Regular',
  },
  eyeBtn: {
    padding: 6,
    marginLeft: 6,
  },
  primaryBtn: {
    backgroundColor: BrandColors.primary,
    borderRadius: 18,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
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
  footerWrap: {
    alignItems: 'center',
    marginTop: 26,
  },
  footerText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
  footerLink: {
    color: '#4B5563',
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
    textDecorationLine: 'underline',
  },
});
