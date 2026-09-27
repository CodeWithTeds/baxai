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
import { useAuth } from '@/contexts/auth-context';
import { useLanguage } from '@/contexts/language-context';
import { syncCustomerToBackend } from '@/utils/customer-sync';

export default function LoginScreen() {
  const { t } = useLanguage();
  const { login } = useAuth();

  const [identifier, setIdentifier] = useState(''); // Email or Username
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const triggerHaptic = async () => {
    if (Platform.OS !== 'web') {
      try {
        await Haptics.selectionAsync();
      } catch {}
    }
  };

  const handleLoginSubmit = async () => {
    await triggerHaptic();

    const cleanIdentifier = identifier.trim();
    const cleanPassword = password.trim();

    if (!cleanIdentifier) {
      Alert.alert('Required Field', 'Please enter your Email Address or Username.');
      return;
    }

    if (!cleanPassword) {
      Alert.alert('Required Field', 'Please enter your Password.');
      return;
    }

    setLoading(true);

    try {
      const email = cleanIdentifier.includes('@')
        ? cleanIdentifier.toLowerCase()
        : `${cleanIdentifier.toLowerCase()}@gmail.com`;
      const displayName = cleanIdentifier.split('@')[0];

      await login(email, displayName);
      await syncCustomerToBackend(email, displayName);

      router.replace({
        pathname: '/(tabs)',
        params: {
          authSuccess: '1',
          email,
          name: displayName,
        },
      } as any);
    } catch (err: any) {
      console.error('[LoginScreen] Sign-in error:', err);
      Alert.alert('Sign In Error', err?.message || 'Could not complete sign in.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoToRegister = async () => {
    await triggerHaptic();
    router.replace('/register');
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
                <Text style={styles.cardTitle}>{t.welcomeBack}</Text>
                <Text style={styles.cardSubtitle}>Sign in with Email / Username & Password</Text>
              </View>

              {/* Email / Username Field */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Email Address or Username</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="person-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
                  <TextInput
                    placeholder="email@example.com or username"
                    placeholderTextColor="#9CA3AF"
                    value={identifier}
                    onChangeText={setIdentifier}
                    autoCapitalize="none"
                    keyboardType="email-address"
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
                    placeholder="Enter your password"
                    placeholderTextColor="#9CA3AF"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
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

              {/* Submit Sign In Button */}
              <Pressable
                onPress={handleLoginSubmit}
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
                    <Text style={styles.submitBtnText}>Sign In</Text>
                    <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                  </>
                )}
              </Pressable>

              {/* Don't have an account */}
              <Pressable
                onPress={handleGoToRegister}
                style={({ pressed }) => [
                  styles.registerLinkBtn,
                  pressed && styles.registerLinkBtnPressed,
                ]}>
                <Text style={styles.registerLinkText}>{t.dontHaveAccountLink}</Text>
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
    paddingVertical: 10,
  },
  backBtn: {
    padding: 4,
  },
  brandGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Manrope_700Bold',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    paddingBottom: 24,
  },
  mascotArea: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  mascotWrap: {
    width: 120,
    height: 120,
  },
  mascotImg: {
    width: '100%',
    height: '100%',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    marginHorizontal: 16,
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: -4 },
      },
      android: { elevation: 8 },
    }),
  },
  cardHeader: {
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1C1E',
    fontFamily: 'Manrope_700Bold',
    textAlign: 'center',
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    fontFamily: 'Inter_600SemiBold',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    fontFamily: 'Inter_400Regular',
  },
  eyeBtn: {
    padding: 4,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BrandColors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 8,
    marginTop: 8,
    ...Platform.select({
      ios: {
        shadowColor: BrandColors.primary,
        shadowOpacity: 0.25,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
      },
      android: { elevation: 4 },
    }),
  },
  submitBtnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Manrope_700Bold',
  },
  registerLinkBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  registerLinkBtnPressed: {
    opacity: 0.7,
  },
  registerLinkText: {
    fontSize: 14,
    fontWeight: '600',
    color: BrandColors.primary,
    fontFamily: 'Inter_600SemiBold',
  },
});
