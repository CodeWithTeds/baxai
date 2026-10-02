import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
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
import Animated, { FadeInUp } from 'react-native-reanimated';

import { BrandColors } from '@/constants/theme';
import { useLanguage } from '@/contexts/language-context';
import { apiRegister } from '@/utils/auth-api';

export default function RegisterScreen() {
  const { t } = useLanguage();

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

    const cleanFullName = fullName.trim();
    const cleanUsername = username.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();
    const cleanConfirm = confirmPassword.trim();

    if (!cleanFullName) {
      setErrorMessage('Please enter your full name.');
      return;
    }
    if (cleanFullName.length < 2) {
      setErrorMessage('Full name must be at least 2 characters.');
      return;
    }

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
        name: cleanFullName,
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
                    name: cleanFullName,
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
          <Ionicons name="print" size={20} color="#FFFFFF" />
          <Text style={styles.brandTitle}>{t.brandName}</Text>
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
            automaticallyAdjustKeyboardInsets={true}
            showsVerticalScrollIndicator={false}>

            {/* Mascot Area */}
            <View style={styles.mascotArea}>
              <Animated.View entering={FadeInUp.delay(100).duration(500)} style={styles.mascotWrap}>
                <Image
                  source={require('@/assets/images/owl-mascot.png')}
                  style={styles.mascotImg}
                  contentFit="contain"
                />
              </Animated.View>
            </View>

            {/* Auth Card */}
            <Animated.View entering={FadeInUp.delay(200).duration(600)} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{t.getStarted}</Text>
                <Text style={styles.cardSubtitle}>Create your account to start ordering</Text>
              </View>

              {/* Error Banner */}
              {errorMessage && (
                <View style={styles.errorBanner}>
                  <Ionicons name="alert-circle" size={16} color="#DC2626" />
                  <Text style={styles.errorBannerText}>{errorMessage}</Text>
                </View>
              )}

              {/* Full Name Field */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Full Name</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="person-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
                  <TextInput
                    placeholder="John Doe"
                    placeholderTextColor="#9CA3AF"
                    value={fullName}
                    onChangeText={(val) => {
                      setFullName(val);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    autoCapitalize="words"
                    returnKeyType="next"
                    style={styles.textInput}
                  />
                </View>
              </View>

              {/* Username Field */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Username</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="at-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
                  <TextInput
                    placeholder="johndoe123"
                    placeholderTextColor="#9CA3AF"
                    value={username}
                    onChangeText={(val) => {
                      setUsername(val);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="next"
                    style={styles.textInput}
                  />
                </View>
              </View>

              {/* Email Address Field */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Email Address</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="mail-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
                  <TextInput
                    placeholder="email@example.com"
                    placeholderTextColor="#9CA3AF"
                    value={email}
                    onChangeText={(val) => {
                      setEmail(val);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    returnKeyType="next"
                    style={styles.textInput}
                  />
                </View>
              </View>

              {/* Password Field */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Password</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="lock-closed-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
                  <TextInput
                    placeholder="At least 8 characters"
                    placeholderTextColor="#9CA3AF"
                    value={password}
                    onChangeText={(val) => {
                      setPassword(val);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    secureTextEntry={!showPassword}
                    returnKeyType="next"
                    style={styles.textInput}
                  />
                  <Pressable
                    hitSlop={8}
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeBtn}>
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color="#6B7280"
                    />
                  </Pressable>
                </View>
              </View>

              {/* Confirm Password Field */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Confirm Password</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="lock-closed-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
                  <TextInput
                    placeholder="Re-type your password"
                    placeholderTextColor="#9CA3AF"
                    value={confirmPassword}
                    onChangeText={(val) => {
                      setConfirmPassword(val);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    secureTextEntry={!showConfirmPassword}
                    returnKeyType="done"
                    onSubmitEditing={handleRegisterSubmit}
                    style={styles.textInput}
                  />
                  <Pressable
                    hitSlop={8}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={styles.eyeBtn}>
                    <Ionicons
                      name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color="#6B7280"
                    />
                  </Pressable>
                </View>
              </View>

              {/* Live Password Indicator */}
              <View style={styles.checklist}>
                <View style={styles.checkItem}>
                  <Ionicons
                    name={hasMinPassword ? 'checkmark-circle' : 'ellipse-outline'}
                    size={14}
                    color={hasMinPassword ? '#10B981' : '#9CA3AF'}
                  />
                  <Text style={[styles.checkText, hasMinPassword && styles.checkTextActive]}>
                    At least 8 characters
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

              {/* Create Account Submit Button */}
              <Pressable
                onPress={handleRegisterSubmit}
                disabled={loading}
                style={({ pressed }) => [
                  styles.submitBtn,
                  pressed && styles.submitBtnPressed,
                  loading && { opacity: 0.8 },
                ]}
                android_ripple={{ color: '#003D9B' }}>
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Text style={styles.submitBtnText}>Create Account</Text>
                    <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                  </>
                )}
              </Pressable>

              {/* Already have an account */}
              <Pressable
                onPress={handleGoToLogin}
                style={({ pressed }) => [
                  styles.loginLinkBtn,
                  pressed && styles.loginLinkBtnPressed,
                ]}>
                <Text style={styles.loginLinkText}>{t.alreadyHaveAccountLink}</Text>
              </Pressable>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
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
    paddingBottom: 40,
    justifyContent: 'center',
  },
  mascotArea: {
    alignItems: 'center',
    marginVertical: 12,
  },
  mascotWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  mascotImg: {
    width: 60,
    height: 60,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  cardHeader: {
    marginBottom: 18,
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    fontFamily: 'Manrope_700Bold',
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
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
    marginBottom: 16,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 12,
    color: '#B91C1C',
    fontFamily: 'Inter_500Medium',
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
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    fontFamily: 'Inter_400Regular',
  },
  eyeBtn: {
    padding: 4,
  },
  checklist: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 16,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  checkText: {
    fontSize: 11,
    color: '#6B7280',
    fontFamily: 'Inter_400Regular',
  },
  checkTextActive: {
    color: '#10B981',
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
  submitBtn: {
    backgroundColor: '#0052CC',
    borderRadius: 14,
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#0052CC',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  submitBtnPressed: {
    backgroundColor: '#003D9B',
    transform: [{ scale: 0.99 }],
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Manrope_700Bold',
  },
  loginLinkBtn: {
    marginTop: 18,
    alignItems: 'center',
    paddingVertical: 4,
  },
  loginLinkBtnPressed: {
    opacity: 0.7,
  },
  loginLinkText: {
    color: '#0052CC',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
});
