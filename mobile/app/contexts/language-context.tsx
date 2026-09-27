import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';

export type Language = 'en' | 'tl';

type Translations = {
  // Language Selection
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
  // Navigation / Tabs
  navHome: string;
  navServices: string;
  navOrders: string;
  navAiHub: string;
  // Search
  searchPlaceholder: string;
  // Home Screen
  heroTitle: string;
  heroSubtitle: string;
  categories: string;
  featuredProducts: string;
  viewAll: string;
  // Categories Labels
  catMugs: string;
  catPins: string;
  catCalendars: string;
  catTotes: string;
  catStickers: string;
  catPrinting: string;
  // Products
  prodMug: string;
  prodMugDesc: string;
  prodTshirt: string;
  prodTshirtDesc: string;
  prodStickers: string;
  prodStickersDesc: string;
  prodPins: string;
  prodPinsDesc: string;
  prodTotes: string;
  prodTotesDesc: string;
  prodCalendars: string;
  prodCalendarsDesc: string;
  prodCustomPin: string;
  prodCustomPinDesc: string;
  // Badges
  bestseller: string;
  fastTurnaround: string;
  highDemand: string;
  deal: string;
  // Services
  ourServices: string;
  servicesSubtitle: string;
  filterAll: string;
  filter3D: string;
  filterApparel: string;
  filterPromo: string;
  fromPrice: string;
  // Orders
  ordersTitle: string;
  activeOrders: string;
  pastOrders: string;
  orderNumberPrefix: string;
  placedOn: string;
  qtyPrefix: string;
  viewDetails: string;
  trackOrder: string;
  statusInProgress: string;
  statusProcessing: string;
  statusCompleted: string;
  statusCancelled: string;
  // Order Details
  orderDetails: string;
  orderStatus: string;
  trackingTimeline: string;
  itemsOrdered: string;
  orderSummary: string;
  subtotal: string;
  shippingFee: string;
  tax: string;
  total: string;
  shippingAddress: string;
  paymentMethod: string;
  estimatedDelivery: string;
  // AI Hub
  aiAssistant: string;
  aiAssistantDesc: string;
  quickActions: string;
  qaTrackOrder: string;
  qaCheckPricing: string;
  qaTalkAgent: string;
  qaDesignHelp: string;
  voiceIdle: string;
  voiceRecording: string;
  voiceTranscribing: string;
  voiceThinking: string;
  voiceSpeaking: string;
  voiceError: string;
  owlGreeting: string;
  // Auth
  createAccount: string;
  welcomeBack: string;
  registerSubtitle: string;
  loginSubtitle: string;
  continueWithGoogle: string;
  alreadyHaveAccountLink: string;
  dontHaveAccountLink: string;
  // 3D Viewers
  dragToRotate: string;
  addToCart: string;
  customize: string;
  back: string;
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
    // Navigation / Tabs
    navHome: 'Home',
    navServices: 'Services',
    navOrders: 'Orders',
    navAiHub: 'AI Hub',
    // Search
    searchPlaceholder: 'What are you looking to print?',
    // Home Screen
    heroTitle: 'Custom Printing & AI Solutions',
    heroSubtitle: 'Turn your ideas into custom products with fast turnaround.',
    categories: 'Categories',
    featuredProducts: 'Featured Products',
    viewAll: 'View All',
    // Categories Labels
    catMugs: 'Mugs',
    catPins: 'Pins',
    catCalendars: 'Calendars',
    catTotes: 'Totes',
    catStickers: 'Stickers',
    catPrinting: 'Printing',
    // Products
    prodMug: 'Custom Ceramic Mug',
    prodMugDesc: 'High-quality ceramic prints for home or office.',
    prodTshirt: 'Premium Custom T-Shirts',
    prodTshirtDesc: 'Premium full-colour prints on soft cotton.',
    prodStickers: 'Die-Cut Vinyl Stickers',
    prodStickersDesc: 'Die-cut vinyl, waterproof.',
    prodPins: 'Button Pins',
    prodPinsDesc: 'Vibrant enamel-style pins.',
    prodTotes: 'Tote Bags',
    prodTotesDesc: 'Eco-friendly canvas with custom artwork.',
    prodCalendars: 'Calendars',
    prodCalendarsDesc: 'Wall & desk calendars, personalised.',
    prodCustomPin: 'Custom Pin',
    prodCustomPinDesc: 'Premium custom pin — single-piece showcase.',
    // Badges
    bestseller: '3D • Bestseller',
    fastTurnaround: 'Fast Turnaround',
    highDemand: 'High Demand',
    deal: 'Deal',
    // Services
    ourServices: 'Our Services',
    servicesSubtitle: 'Explore top quality custom printing options',
    filterAll: 'All',
    filter3D: '3D Print',
    filterApparel: 'Apparel',
    filterPromo: 'Promo',
    fromPrice: 'From',
    // Orders
    ordersTitle: 'My Orders',
    activeOrders: 'Active Orders',
    pastOrders: 'Past Orders',
    orderNumberPrefix: 'Order',
    placedOn: 'Placed on',
    qtyPrefix: 'Qty',
    viewDetails: 'View Details',
    trackOrder: 'Track Order',
    statusInProgress: 'In Progress',
    statusProcessing: 'Processing',
    statusCompleted: 'Completed',
    statusCancelled: 'Cancelled',
    // Order Details
    orderDetails: 'Order Details',
    orderStatus: 'Order Status',
    trackingTimeline: 'Tracking Timeline',
    itemsOrdered: 'Items Ordered',
    orderSummary: 'Order Summary',
    subtotal: 'Subtotal',
    shippingFee: 'Shipping Fee',
    tax: 'Tax',
    total: 'Total',
    shippingAddress: 'Shipping Address',
    paymentMethod: 'Payment Method',
    estimatedDelivery: 'Estimated Delivery',
    // AI Hub
    aiAssistant: 'Owl AI Assistant',
    aiAssistantDesc: 'Ask anything about products, order tracking, or custom designs.',
    quickActions: 'Quick Actions',
    qaTrackOrder: 'Track Order',
    qaCheckPricing: 'Check Pricing',
    qaTalkAgent: 'Talk to Agent',
    qaDesignHelp: 'Design Help',
    voiceIdle: 'Tap to speak',
    voiceRecording: 'Listening… tap to stop',
    voiceTranscribing: 'Transcribing…',
    voiceThinking: 'Thinking…',
    voiceSpeaking: 'Speaking…',
    voiceError: 'Tap to try again',
    owlGreeting: 'Hello! I am your AI assistant. Tap the mascot below or type a message to get started.',
    // 3D Viewers
    // Auth
    createAccount: 'Create Account',
    welcomeBack: 'Welcome Back',
    registerSubtitle: 'Sign up to manage your custom printing orders with ease.',
    loginSubtitle: 'Sign in to access your printing account and track orders.',
    continueWithGoogle: 'Continue with Google',
    alreadyHaveAccountLink: 'I already have an account',
    dontHaveAccountLink: "Don't have an account? Register",
    // 3D Viewers
    dragToRotate: 'Drag to rotate 3D model',
    addToCart: 'Add to Cart',
    customize: 'Customize',
    back: 'Back',
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
    // Auth
    createAccount: 'Lumikha ng Account',
    welcomeBack: 'Maligayang Pagbabalik',
    registerSubtitle: 'Mag-rehistro upang pamahalaan ang iyong mga order sa pag-print nang madali.',
    loginSubtitle: 'Mag-sign in upang ma-access ang iyong account at masubaybayan ang mga order.',
    continueWithGoogle: 'Magpatuloy gamit ang Google',
    alreadyHaveAccountLink: 'Mayroon na akong account',
    dontHaveAccountLink: 'Wala pang account? Mag-rehistro',
    // Navigation / Tabs
    navHome: 'Tahanan',
    navServices: 'Mga Serbisyo',
    navOrders: 'Mga Order',
    navAiHub: 'AI Hub',
    // Search
    searchPlaceholder: 'Ano ang gusto mong ipalimbag?',
    // Home Screen
    heroTitle: 'Kustom na Pag-imprenta at AI Solutions',
    heroSubtitle: 'Gawing totoong produkto ang iyong mga ideya nang mabilis.',
    categories: 'Mga Kategorya',
    featuredProducts: 'Mga Tampok na Produkto',
    viewAll: 'Tingnan Lahat',
    // Categories Labels
    catMugs: 'Mga Tasa',
    catPins: 'Mga Pin',
    catCalendars: 'Mga Kalendaryo',
    catTotes: 'Mga Bag',
    catStickers: 'Mga Sticker',
    catPrinting: 'Pag-imprenta',
    // Products
    prodMug: 'Kustom na Ceramic Mug',
    prodMugDesc: 'Mataas na kalidad na ceramic prints para sa tahanan o opisina.',
    prodTshirt: 'Pramiyum na Kustom T-Shirt',
    prodTshirtDesc: 'Pramiyum na kumpletong kulay na print sa malambot na bulak.',
    prodStickers: 'Die-Cut Vinyl Stickers',
    prodStickersDesc: 'Die-cut na vinyl, hindi nababasa ng tubig.',
    prodPins: 'Button Pins',
    prodPinsDesc: 'Makukulay at matitibay na button pins.',
    prodTotes: 'Tote Bags',
    prodTotesDesc: 'Makatotohanang canvas bag na may kustom na sining.',
    prodCalendars: 'Mga Kalendaryo',
    prodCalendarsDesc: 'Pang-pader at pang-mesa na mga kalendaryo.',
    prodCustomPin: 'Kustom na Pin',
    prodCustomPinDesc: 'Pramiyum na kustom na pin — solong piraso.',
    // Badges
    bestseller: '3D • Pinakamabenta',
    fastTurnaround: 'Mabilis na Paggawa',
    highDemand: 'Mataas ang Demand',
    deal: 'Magandang Alok',
    // Services
    ourServices: 'Aming mga Serbisyo',
    servicesSubtitle: 'Tuklasin ang aming mga de-kalidad na serbisyo sa pag-imprenta',
    filterAll: 'Lahat',
    filter3D: '3D Imprenta',
    filterApparel: 'Mga Damit',
    filterPromo: 'Pang-promo',
    fromPrice: 'Mula',
    // Orders
    ordersTitle: 'Aking mga Order',
    activeOrders: 'Kasalukuyang Order',
    pastOrders: 'Nakalipas na Order',
    orderNumberPrefix: 'Order',
    placedOn: 'Inorder noong',
    qtyPrefix: 'Dami',
    viewDetails: 'Tingnan ang Detalye',
    trackOrder: 'Sundan ang Order',
    statusInProgress: 'Ginagawa Pa',
    statusProcessing: 'Inihahanda',
    statusCompleted: 'Kumpleto Na',
    statusCancelled: 'Kanselado',
    // Order Details
    orderDetails: 'Mga Detalye ng Order',
    orderStatus: 'Estado ng Order',
    trackingTimeline: 'Timeline ng Pagsubaybay',
    itemsOrdered: 'Mga Inorder na Produkto',
    orderSummary: 'Buod ng Order',
    subtotal: 'Subtotal',
    shippingFee: 'Bayad sa Pagpapadala',
    tax: 'Buwis',
    total: 'Kabuuan',
    shippingAddress: 'Tirahan ng Pagpapadalhan',
    paymentMethod: 'Paraan ng Pagbabayad',
    estimatedDelivery: 'Inaasahang Pagdating',
    // AI Hub
    aiAssistant: 'Owl AI Assistant',
    aiAssistantDesc: 'Magtanong tungkol sa mga produkto, pag-track ng order, o mga kustom na disenyo.',
    quickActions: 'Mga Mabilis na Aksyon',
    qaTrackOrder: 'Sundan ang Order',
    qaCheckPricing: 'Suriin ang Presyo',
    qaTalkAgent: 'Makausap ang Agent',
    qaDesignHelp: 'Tulong sa Disenyo',
    voiceIdle: 'Pindutin para magsalita',
    voiceRecording: 'Nakinig… pindutin para huminto',
    voiceTranscribing: 'Isinasalin sa teksto…',
    voiceThinking: 'Nag-iisip…',
    voiceSpeaking: 'Nagsasalita…',
    voiceError: 'Pindutin para subukang muli',
    owlGreeting: 'Kumusta! Ako ang iyong AI assistant. Pindutin ang mascot sa ibaba o mag-type ng mensahe para magsimula.',
    // 3D Viewers
    dragToRotate: 'I-drag para iputok ang 3D model',
    addToCart: 'Idagdag sa Cart',
    customize: 'I-customize',
    back: 'Bumalik',
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
