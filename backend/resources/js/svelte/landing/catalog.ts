export type PinShape = 'round' | 'square' | 'rounded' | 'star' | 'heart' | 'shield';

export type Glaze = {
    name: string;
    hex: string;
};

export type PinOption = {
    id: PinShape;
    label: string;
    desc: string;
    price: string;
};

export const GLAZES: Glaze[] = [
    { name: 'Gloss White', hex: '#ffffff' },
    { name: 'Midnight', hex: '#1A1C1E' },
    { name: 'Nuyda Blue', hex: '#0052CC' },
    { name: 'Sky Blue', hex: '#007AFF' },
    { name: 'Deep Navy', hex: '#003D9B' },
];

export const PIN_SHAPES: PinOption[] = [
    { id: 'round', label: 'Round', desc: '2.25" · Classic button', price: '₱1.50' },
    { id: 'square', label: 'Square', desc: '1.5" · Flat edge', price: '₱1.65' },
    { id: 'rounded', label: 'Rounded', desc: '1.5" · Soft corners', price: '₱1.65' },
    { id: 'star', label: 'Star', desc: '45mm · 5-point', price: '₱1.90' },
    { id: 'heart', label: 'Heart', desc: '40mm · Die-cut', price: '₱1.90' },
    { id: 'shield', label: 'Shield', desc: '42mm · Crest', price: '₱2.00' },
];

export const MUG_PRICE = '₱149';

export const FAQS: { q: string; a: string }[] = [
    {
        q: 'How does the 3D customization work?',
        a: 'Pick a glaze or pin shape below and drag to rotate the live 3D models — the same viewer as our mobile app. Approve the exact look before checkout.',
    },
    {
        q: 'Can I continue on the mobile app?',
        a: 'Yes. NUYDA ENTERPRISE on mobile has the same shop, 3D preview, and Owla AI assistant. Your cart syncs between web and app.',
    },
    {
        q: 'What payment methods do you accept?',
        a: 'GCash, Maya, debit/credit cards, bank transfer, and cash on pickup at our Montalban branch.',
    },
    {
        q: 'How long is production + delivery?',
        a: 'Most custom items print in 1–3 days. Montalban delivery is same-day to next-day; nearby areas take 2–4 days.',
    },
];
