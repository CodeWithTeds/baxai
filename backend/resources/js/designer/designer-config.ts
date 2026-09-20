// Per-product configuration for the Design Studio.
// Adding a new customizable product = adding one entry here.

export interface DesignerProductConfig {
    type: string;
    label: string;
    /** .glb under public/models, or 'procedural:sticker' */
    model: string;
    /** print-area canvas in px */
    canvasW: number;
    canvasH: number;
    /** decal size as fraction of model bounding box */
    decalW: number;
    /** vertical offset as fraction of bbox height */
    decalY: number;
    /** friendly labels for model materials (fallback: material name) */
    partLabels: Record<string, string>;
}

export const DESIGNER_PRODUCTS: DesignerProductConfig[] = [
    {
        type: 'mug',
        label: 'Mug',
        model: '/models/mug.glb',
        canvasW: 900,
        canvasH: 450,
        decalW: 0.52,
        decalY: 0.04,
        partLabels: { brownDark: 'Body', greyLight: 'Handle' },
    },
    {
        type: 'shirt',
        label: 'T-Shirt',
        model: '/models/shirt.glb',
        canvasW: 600,
        canvasH: 700,
        decalW: 0.4,
        decalY: 0.1,
        partLabels: {
            '07___Default': 'Body',
            '13___Default': 'Sleeves',
            '03___Default': 'Collar',
            '02___Default': 'Hem',
            '08___Default': 'Cuff',
            _crayfishdiffuse: 'Inner',
        },
    },
    {
        type: 'tote',
        label: 'Tote Bag',
        model: '/models/tote.glb',
        canvasW: 600,
        canvasH: 600,
        decalW: 0.5,
        decalY: 0.0,
        partLabels: { brownLight: 'Bag', Bag: 'Bag' },
    },
    {
        type: 'pin',
        label: 'Button Pin',
        model: '/models/pin.glb',
        canvasW: 500,
        canvasH: 500,
        decalW: 0.55,
        decalY: 0.0,
        partLabels: { Yellow: 'Face', DarkYellow: 'Rim' },
    },
    {
        type: 'calendar',
        label: 'Calendar',
        model: '/models/calendar.glb',
        canvasW: 600,
        canvasH: 700,
        decalW: 0.55,
        decalY: 0.05,
        partLabels: { FFFFFF: 'Pages', '1A1A1A': 'Binding', '00BCD4': 'Accent', '455A64': 'Back' },
    },
    {
        type: 'sticker',
        label: 'Sticker',
        model: 'procedural:sticker',
        canvasW: 500,
        canvasH: 500,
        decalW: 0.6,
        decalY: 0.0,
        partLabels: {},
    },
];

export function designerConfigFor(type: string): DesignerProductConfig {
    const direct = DESIGNER_PRODUCTS.find((p) => p.type === type);
    if (direct) return direct;
    // Apply the T-Shirt — Regular — 3D (alias) design to every t-shirt sub-type
    // so backend/shirt.glb plain layout appears for all common + neckline variants.
    // They keep their own category/viewer_type but share the same regular model/layout.
    const isShirt = type === 'shirt' || type.startsWith('shirt_');
    if (isShirt) {
        const base = DESIGNER_PRODUCTS.find((p) => p.type === 'shirt')!;
        return { ...base, type, label: type.replace(/^shirt_/, '').replace(/_/g, ' ') + ' — T-Shirt' };
    }
    return DESIGNER_PRODUCTS[0];
}
