import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';

export type Language = 'en' | 'tl';

type Translations = {
  chooseYourLanguage: string;
  subtitle: string;
  english: string;
  tagalog: string;
  // Welcome screen
  brandName: string;
  brandTagline: string;
  getStarted: string;
  alreadyHaveAccount: string;
  termsPrefix: string;
  termsOfService: string;
  termsMiddle: string;
  privacyPolicy: string;
};

const TRANSLATIONS: Record<Language, Translations> = {
  en: {
    chooseYourLanguage: 'Choose Your Language',
    subtitle: 'Select your preferred language to customize your experience and manage your printing orders with ease.',
    english: 'English',
    tagalog: 'Tagalog',
    // Welcome screen
    brandName: 'NUYDA ENTERPRISE',
    brandTagline: 'An AI-Powered E-Commerce and Printing Management System in Montalban.',
    getStarted: 'Get Started',
    alreadyHaveAccount: 'I already have an account',
    termsPrefix: 'By continuing you agree to our ',
    termsOfService: 'Terms of Services',
    termsMiddle: ' and ',
    privacyPolicy: 'Privacy Policy',
  },
  tl: {
    chooseYourLanguage: 'Piliin ang Iyong Wika',
    subtitle: 'Piliin ang iyong gustong wika upang i-personalize ang iyong karanasan at pamahalaan ang iyong mga order sa pag-print nang madali.',
    english: 'English',
    tagalog: 'Tagalog',
    // Welcome screen
    brandName: 'NUYDA ENTERPRISE',
    brandTagline: 'Isang AI-Powered na E-Commerce at Sistema ng Pamamahala ng Pag-print sa Montalban.',
    getStarted: 'Magsimula',
    alreadyHaveAccount: 'Mayroon na akong account',
    termsPrefix: 'Sa pagpapatuloy, sumasang-ayon ka sa aming ',
    termsOfService: 'Mga Tuntunin ng Serbisyo',
    termsMiddle: ' at ',
    privacyPolicy: 'Patakaran sa Privacy',
  },
};

type LanguageContextValue = {
  language: Language;
  t: Translations;
  setLanguage: (lang: Language) => void;
  hasSelectedLanguage: boolean;
  isLoaded: boolean;
};

const STORAGE_KEY = 'nuyda-language';

const LanguageContext = createContext<LanguageContextValue | null>(null);

// Lightweight storage helper: tries AsyncStorage if installed, else falls back to no-op
async function getStoredLanguage(): Promise<Language | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const v = await AsyncStorage.getItem(STORAGE_KEY);
    if (v === 'en' || v === 'tl') return v;
  } catch {
    // AsyncStorage not installed – try web localStorage
    if (Platform.OS === 'web') {
      try {
        const v = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null;
        if (v === 'en' || v === 'tl') return v as Language;
      } catch {}
    }
  }
  return null;
}

async function storeLanguage(lang: Language) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    await AsyncStorage.setItem(STORAGE_KEY, lang);
    return;
  } catch {
    // fallback to web localStorage
    if (Platform.OS === 'web') {
      try {
        if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, lang);
      } catch {}
    }
  }
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');
  const [hasSelectedLanguage, setHasSelectedLanguage] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    getStoredLanguage().then((stored) => {
      if (!mounted) return;
      if (stored) {
        setLanguageState(stored);
        setHasSelectedLanguage(true);
      }
      setIsLoaded(true);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    setHasSelectedLanguage(true);
    void storeLanguage(lang);
  }, []);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      t: TRANSLATIONS[language],
      setLanguage,
      hasSelectedLanguage,
      isLoaded,
    }),
    [language, setLanguage, hasSelectedLanguage, isLoaded]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}

export { TRANSLATIONS };
