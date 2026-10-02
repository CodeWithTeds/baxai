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
import { useLanguage } from '@/contexts/language-context';
import { apiRegister } from '@/utils/auth-api';

export default function RegisterScreen() {
  const { t } = useLanguage();

  const usernameInputRef = useRef<TextInput>(null);
  const emailInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const confirmPasswordInputRef = useRef<TextInput>(null);

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [legalModalVisible, setLegalModalVisible] = useState(false);
  const [legalModalTab, setLegalModalTab] = useState<LegalTab>('terms');

  // Auto-focus username input so keyboard pops up when screen opens
  useEffect(() => {
    const timer = setTimeout(() => {
      usernameInputRef.current?.focus();
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

  const hasMinPassword = password.length >= 8;
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  const handleRegisterSubmit = async () => {
    await triggerHaptic();
    setErrorMessage(null);

    const cleanUsername = username.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();
    const cleanConfirm = confirmPassword.trim();

    if (!cleanUsername) {
      setErrorMessage('Please choose a username.');
      return;
    }
    if (cleanUsername.length < 3) {
      setErrorMessage('Username must be at least 3 characters.');
      return;
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(cleanUsername)) {
      setErrorMessage('Username may only contain letters, numbers, dashes, and underscores.');
      return;
    }

    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (!cleanPassword) {
      setErrorMessage('Please enter a password.');
      return;
    }
    if (cleanPassword.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    if (!cleanConfirm) {
      setErrorMessage('Please confirm your password.');
      return;
    }
    if (cleanPassword !== cleanConfirm) {
      setErrorMessage('Passwords do not match. Please verify.');
      return;
    }

    setLoading(true);
    Keyboard.dismiss();

    try {
      const res = await apiRegister({
        username: cleanUsername,
        email: cleanEmail,
        password: cleanPassword,
        password_confirmation: cleanConfirm,
      });

      if (res.status === 'success' || res.needs_verification) {
        triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
        Alert.alert(
          'Verification Code Sent!',
          `A 4-digit verification code has been sent to ${cleanEmail}. Please enter it to activate your account.`,
          [
            {
              text: 'Enter 4-Digit Code',
              onPress: () => {
                router.push({
                  pathname: '/verify-code',
                  params: {
                    email: cleanEmail,
                    type: 'email_verification',
                    name: cleanUsername,
                  },
                } as any);
              },
            },
          ]
        );
      } else {
        setErrorMessage(res.message || 'Registration failed. Please check your information.');
        triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
      }
    } catch (err: any) {
      console.error('[RegisterScreen] Registration error:', err);
      setErrorMessage(err?.message || 'Could not complete registration. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoToLogin = async () => {
    await triggerHaptic();
    router.replace('/login');
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

          {/* Header Block Matching Ref Modern Design */}
          <Animated.View entering={FadeInUp.duration(400)} style={styles.headerBlock}>
            <Text style={styles.title}>Create account</Text>
            <Text style={styles.subtitle}>
              By signing up, you agree to our{' '}
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

          {/* 4 Form Fields Only: Username, Email, Password, Confirm Password */}
          <Animated.View entering={FadeInUp.delay(100).duration(450)} style={styles.formContainer}>
            {/* 1. Username Field */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Username</Text>
              <Pressable
                onPress={() => usernameInputRef.current?.focus()}
                style={[
                  styles.inputContainer,
                  focusedField === 'username' && styles.inputContainerFocused,
                ]}>
                <TextInput
                  ref={usernameInputRef}
                  placeholder="Your username"
                  placeholderTextColor="#9CA3AF"
                  value={username}
                  onChangeText={(val) => {
                    setUsername(val);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  onFocus={() => setFocusedField('username')}
                  onBlur={() => setFocusedField(null)}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  onSubmitEditing={() => emailInputRef.current?.focus()}
                  style={styles.textInput}
                />
              </Pressable>
            </View>

            {/* 2. Email Field */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Email</Text>
              <Pressable
                onPress={() => emailInputRef.current?.focus()}
                style={[
                  styles.inputContainer,
                  focusedField === 'email' && styles.inputContainerFocused,
                ]}>
                <TextInput
                  ref={emailInputRef}
                  placeholder="Your email address"
                  placeholderTextColor="#9CA3AF"
                  value={email}
                  onChangeText={(val) => {
                    setEmail(val);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  returnKeyType="next"
                  onSubmitEditing={() => passwordInputRef.current?.focus()}
                  style={styles.textInput}
                />
              </Pressable>
            </View>

            {/* 3. Password Field */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Password</Text>
              <Pressable
                onPress={() => passwordInputRef.current?.focus()}
                style={[
                  styles.inputContainer,
                  focusedField === 'password' && styles.inputContainerFocused,
                ]}>
                <TextInput
                  ref={passwordInputRef}
                  placeholder="At least 8 characters"
                  placeholderTextColor="#9CA3AF"
                  value={password}
                  onChangeText={(val) => {
                    setPassword(val);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  secureTextEntry={!showPassword}
                  returnKeyType="next"
                  onSubmitEditing={() => confirmPasswordInputRef.current?.focus()}
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

            {/* 4. Confirm Password Field */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Confirm password</Text>
              <Pressable
                onPress={() => confirmPasswordInputRef.current?.focus()}
                style={[
                  styles.inputContainer,
                  focusedField === 'confirmPassword' && styles.inputContainerFocused,
                ]}>
                <TextInput
                  ref={confirmPasswordInputRef}
                  placeholder="Re-type your password"
                  placeholderTextColor="#9CA3AF"
                  value={confirmPassword}
                  onChangeText={(val) => {
                    setConfirmPassword(val);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  onFocus={() => setFocusedField('confirmPassword')}
                  onBlur={() => setFocusedField(null)}
                  secureTextEntry={!showConfirmPassword}
                  returnKeyType="done"
                  onSubmitEditing={handleRegisterSubmit}
                  style={styles.textInput}
                />
                <Pressable
                  hitSlop={10}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.eyeBtn}>
                  <Ionicons
                    name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#6B7280"
                  />
                </Pressable>
              </Pressable>
            </View>

              {/* Live Password Indicator Badges */}
              <View style={styles.checklist}>
                <View style={styles.checkItem}>
                  <Ionicons
                    name={hasMinPassword ? 'checkmark-circle' : 'ellipse-outline'}
                    size={14}
                    color={hasMinPassword ? '#10B981' : '#9CA3AF'}
                  />
                  <Text style={[styles.checkText, hasMinPassword && styles.checkTextActive]}>
                    8+ characters
                  </Text>
                </View>
                <View style={styles.checkItem}>
                  <Ionicons
                    name={passwordsMatch ? 'checkmark-circle' : 'ellipse-outline'}
                    size={14}
                    color={passwordsMatch ? '#10B981' : '#9CA3AF'}
                  />
                  <Text style={[styles.checkText, passwordsMatch && styles.checkTextActive]}>
                    Passwords match
                  </Text>
                </View>
              </View>

              {/* Primary Create Account Button */}
              <Pressable
                onPress={handleRegisterSubmit}
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
                  <Text style={styles.primaryBtnText}>Create Account</Text>
                )}
              </Pressable>
            </Animated.View>

            {/* Divider "Or" */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Alternate Login Button (Ref Style) */}
            <View style={styles.altButtonsGroup}>
              <Pressable
                onPress={handleGoToLogin}
                style={({ pressed }) => [
                  styles.socialBtn,
                  pressed && styles.socialBtnPressed,
                ]}>
                <Ionicons name="log-in-outline" size={18} color={BrandColors.primary} />
                <Text style={styles.socialBtnText}>Log in with existing account</Text>
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
    paddingTop: 8,
    paddingBottom: 32,
    justifyContent: 'center',
  },
  headerBlock: {
    marginBottom: 20,
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
    marginTop: 6,
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
    marginBottom: 16,
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
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    height: 52,
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
  checklist: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    marginTop: 2,
    marginBottom: 16,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  checkText: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'Inter_400Regular',
  },
  checkTextActive: {
    color: '#10B981',
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
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
    marginVertical: 18,
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
    marginTop: 22,
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
