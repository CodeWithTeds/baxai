import { Ionicons } from '@expo/vector-icons';

// ─── Types ────────────────────────────────────────────────────────────────────

export type OrderStatus = 'in_progress' | 'processing' | 'delivered' | 'cancelled';

export type TrackingStep = {
  label: string;
  subtitle: string;
  /** 'done' = completed, 'active' = current step, 'pending' = not yet */
  state: 'done' | 'active' | 'pending';
};

export type LineItem = {
  id: string;
  name: string;
  spec: string;
  price: string;
  qty: number;
  image: ReturnType<typeof require>;
};

export type Order = {
  id: string;
  orderNumber: string;
  placedOn: string;
  /** e.g. "Oct 24" — shown on detail header */
  expectedDelivery: string;
  status: OrderStatus;
  /** Primary product name shown on the list card */
  productName: string;
  /** Thumbnail for the list card */
  image: ReturnType<typeof require>;
  trackingSteps: TrackingStep[];
  lineItems: LineItem[];
  subtotal: string;
  delivery: string;
  total: string;
};

// ─── Status display config ────────────────────────────────────────────────────

export const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  in_progress: {
    label: 'In Progress',
    color: '#0052CC',
    bg: '#EFF6FF',
    icon: 'time-outline',
  },
  processing: {
    label: 'Processing',
    color: '#D97706',
    bg: '#FEF3C7',
    icon: 'sync-outline',
  },
  delivered: {
    label: 'Delivered',
    color: '#059669',
    bg: '#ECFDF5',
    icon: 'checkmark-circle-outline',
  },
  cancelled: {
    label: 'Cancelled',
    color: '#DC2626',
    bg: '#FEF2F2',
    icon: 'close-circle-outline',
  },
};

// ─── Data ─────────────────────────────────────────────────────────────────────

export const ACTIVE_ORDERS: Order[] = [
  {
    id: '1',
    orderNumber: 'RD-8829',
    placedOn: 'Oct 24, 2023',
    expectedDelivery: 'Oct 30',
    status: 'in_progress',
    productName: 'Premium Matte Business Cards (Double-sided)',
    image: require('@/assets/images/shopping-owl.png'),
    trackingSteps: [
      { label: 'Order Placed',          subtitle: 'Oct 24, 09:41 AM',      state: 'done' },
      { label: 'Finishing & Packaging', subtitle: 'Currently processing',   state: 'active' },
      { label: 'Shipped',               subtitle: 'Pending',                state: 'pending' },
      { label: 'Delivered',             subtitle: '',                       state: 'pending' },
    ],
    lineItems: [
      {
        id: 'li-1',
        name: 'Premium Business Cards',
        spec: 'Matte Finish, 16pt Paper',
        price: '₱45.00',
        qty: 500,
        image: require('@/assets/images/shopping-owl.png'),
      },
    ],
    subtotal: '₱45.00',
    delivery: 'Free',
    total: '₱45.00',
  },
  {
    id: '2',
    orderNumber: 'RD-8830',
    placedOn: 'Oct 25, 2023',
    expectedDelivery: 'Nov 1',
    status: 'processing',
    productName: 'Vinyl Event Banner (8×4 ft)',
    image: require('@/assets/images/shopping-owl.png'),
    trackingSteps: [
      { label: 'Order Placed', subtitle: 'Oct 25, 02:15 PM', state: 'done' },
      { label: 'Printing',     subtitle: 'In queue',         state: 'active' },
      { label: 'Shipped',      subtitle: 'Pending',          state: 'pending' },
      { label: 'Delivered',    subtitle: '',                  state: 'pending' },
    ],
    lineItems: [
      {
        id: 'li-2',
        name: 'Vinyl Event Banner',
        spec: '8×4 ft, Full Colour',
        price: '₱120.00',
        qty: 2,
        image: require('@/assets/images/shopping-owl.png'),
      },
    ],
    subtotal: '₱120.00',
    delivery: 'Free',
    total: '₱120.00',
  },
];

export const PAST_ORDERS: Order[] = [
  {
    id: '3',
    orderNumber: 'RD-8790',
    placedOn: 'Oct 18, 2023',
    expectedDelivery: 'Oct 22',
    status: 'delivered',
    productName: 'Glossy Tri-fold Brochures',
    image: require('@/assets/images/shopping-owl.png'),
    trackingSteps: [
      { label: 'Order Placed', subtitle: 'Oct 18, 10:00 AM', state: 'done' },
      { label: 'Printing',     subtitle: 'Oct 18, 03:00 PM', state: 'done' },
      { label: 'Shipped',      subtitle: 'Oct 20, 08:00 AM', state: 'done' },
      { label: 'Delivered',    subtitle: 'Oct 22, 01:30 PM', state: 'done' },
    ],
    lineItems: [
      {
        id: 'li-3',
        name: 'Premium Business Cards',
        spec: 'Matte Finish, 16pt Paper',
        price: '₱45.00',
        qty: 500,
        image: require('@/assets/images/shopping-owl.png'),
      },
      {
        id: 'li-4',
        name: 'Tri-fold Brochures',
        spec: 'Glossy Finish, 8.5×11"',
        price: '₱120.00',
        qty: 250,
        image: require('@/assets/images/shopping-owl.png'),
      },
    ],
    subtotal: '₱165.00',
    delivery: 'Free',
    total: '₱165.00',
  },
  {
    id: '4',
    orderNumber: 'RD-8741',
    placedOn: 'Oct 5, 2023',
    expectedDelivery: 'Oct 10',
    status: 'delivered',
    productName: 'Custom Die-Cut Stickers (A4 Sheet)',
    image: require('@/assets/images/shopping-owl.png'),
    trackingSteps: [
      { label: 'Order Placed', subtitle: 'Oct 5, 11:00 AM',  state: 'done' },
      { label: 'Printing',     subtitle: 'Oct 5, 04:00 PM',  state: 'done' },
      { label: 'Shipped',      subtitle: 'Oct 7, 09:00 AM',  state: 'done' },
      { label: 'Delivered',    subtitle: 'Oct 10, 12:00 PM', state: 'done' },
    ],
    lineItems: [
      {
        id: 'li-5',
        name: 'Die-Cut Stickers',
        spec: 'A4 Sheet, Vinyl Matte',
        price: '₱30.00',
        qty: 50,
        image: require('@/assets/images/shopping-owl.png'),
      },
    ],
    subtotal: '₱30.00',
    delivery: 'Free',
    total: '₱30.00',
  },
  {
    id: '5',
    orderNumber: 'RD-8700',
    placedOn: 'Sep 28, 2023',
    expectedDelivery: 'Oct 3',
    status: 'cancelled',
    productName: 'Tarpaulin Backdrop (10×8 ft)',
    image: require('@/assets/images/shopping-owl.png'),
    trackingSteps: [
      { label: 'Order Placed', subtitle: 'Sep 28, 08:30 AM', state: 'done' },
      { label: 'Cancelled',    subtitle: 'Sep 28, 10:00 AM', state: 'active' },
      { label: 'Shipped',      subtitle: '',                  state: 'pending' },
      { label: 'Delivered',    subtitle: '',                  state: 'pending' },
    ],
    lineItems: [
      {
        id: 'li-6',
        name: 'Tarpaulin Backdrop',
        spec: '10×8 ft, 440gsm Tarp',
        price: '₱85.00',
        qty: 1,
        image: require('@/assets/images/shopping-owl.png'),
      },
    ],
    subtotal: '₱85.00',
    delivery: 'Free',
    total: '₱85.00',
  },
];

export const ALL_ORDERS = [...ACTIVE_ORDERS, ...PAST_ORDERS];
