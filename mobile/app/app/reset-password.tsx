import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
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
import { apiResetPassword } from '@/utils/auth-api';

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams<{
    email?: string;
    code?: string;
  }>();

  const email = (params.email || '').trim().toLowerCase();
  const code = (params.code || '').trim();

  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const triggerHaptic = async (style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) => {
    if (Platform.OS !== 'web') {
      try {
        await Haptics.impactAsync(style);
      } catch {}
    }
  };

  const hasMinLength = password.length >= 8;
  const passwordsMatch = password.length > 0 && password === passwordConfirmation;

  const handleResetPassword = async () => {
    await triggerHaptic();
    setErrorMessage(null);

    if (!password) {
      setErrorMessage('Please enter your new password.');
      return;
    }

    if (password.length < 8) {
      setErrorMessage('New password must be at least 8 characters long.');
      return;
    }

    if (!passwordConfirmation) {
      setErrorMessage('Please confirm your new password.');
      return;
    }

    if (password !== passwordConfirmation) {
      setErrorMessage('Passwords do not match. Please check again.');
      return;
    }

    setLoading(true);
    Keyboard.dismiss();

    try {
      const res = await apiResetPassword({
        email,
        code,
        password,
        password_confirmation: passwordConfirmation,
      });

      if (res.status === 'success') {
        triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
        Alert.alert(
          '🎉 Password Reset Complete!',
          'Your password has been reset successfully. You can now sign in with your new password.',
          [
            {
              text: 'Sign In Now',
              onPress: () => {
                router.replace('/login');
              },
            },
          ]
        );
      } else {
        setErrorMessage(res.message || 'Could not reset password. Your code may have expired.');
        triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Password reset failed. Please try again.');
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
              <Text style={styles.title}>Reset password</Text>
              <Text style={styles.subtitle}>
                Choose a strong password with at least 8 characters.
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
              {/* New Password */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>New password</Text>
                <View
                  style={[
                    styles.inputContainer,
                    focusedField === 'password' && styles.inputContainerFocused,
                  ]}>
                  <TextInput
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
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="next"
                    style={styles.textInput}
                  />
                  <Pressable hitSlop={10} onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color="#6B7280"
                    />
                  </Pressable>
                </View>
              </View>

              {/* Confirm New Password */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Confirm new password</Text>
                <View
                  style={[
                    styles.inputContainer,
                    focusedField === 'confirm' && styles.inputContainerFocused,
                  ]}>
                  <TextInput
                    placeholder="Re-type your new password"
                    placeholderTextColor="#9CA3AF"
                    value={passwordConfirmation}
                    onChangeText={(val) => {
                      setPasswordConfirmation(val);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    onFocus={() => setFocusedField('confirm')}
                    onBlur={() => setFocusedField(null)}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="done"
                    onSubmitEditing={handleResetPassword}
                    style={styles.textInput}
                  />
                  <Pressable hitSlop={10} onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeBtn}>
                    <Ionicons
                      name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color="#6B7280"
                    />
                  </Pressable>
                </View>
              </View>

              {/* Password Checklist Badges */}
              <View style={styles.checklist}>
                <View style={styles.checkItem}>
                  <Ionicons
                    name={hasMinLength ? 'checkmark-circle' : 'ellipse-outline'}
                    size={14}
                    color={hasMinLength ? '#10B981' : '#9CA3AF'}
                  />
                  <Text style={[styles.checkText, hasMinLength && styles.checkTextActive]}>
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

              {/* Submit Button */}
              <Pressable
                onPress={handleResetPassword}
                disabled={loading || !hasMinLength || !passwordsMatch}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  (!hasMinLength || !passwordsMatch || loading) && styles.primaryBtnDisabled,
                  pressed && hasMinLength && passwordsMatch && styles.primaryBtnPressed,
                ]}
                android_ripple={{ color: '#003D9B' }}>
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.primaryBtnText}>Update Password</Text>
                )}
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
    marginBottom: 16,
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
    marginBottom: 18,
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
});
