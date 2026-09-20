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
            _crayfishdiffuse: 'Body',
            '07___Default': 'Trim',
            '13___Default': 'Sleeve trim',
            '03___Default': 'Collar',
            '02___Default': 'Hem',
            '08___Default': 'Cuff',
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
        model: 'procedural:pin_circle',
        canvasW: 500,
        canvasH: 500,
        decalW: 0.55,
        decalY: 0.0,
        partLabels: { Face: 'Face', Rim: 'Rim', Back: 'Back', Metal: 'Pin back', Backing: 'Backing', Cap: 'Edge' },
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
    // Every t-shirt sub-type shares the SAME Regular shirt.glb model/layout —
    // the studio re-proportions it per category (morphShirtGLB), so each fit
    // keeps its own category/viewer_type but the same realistic look.
    const isShirt = type === 'shirt' || type.startsWith('shirt_');
    if (isShirt) {
        const base = DESIGNER_PRODUCTS.find((p) => p.type === 'shirt')!;
        if (type === 'shirt_regular') {
            return { ...base, type, label: 'Regular — T-Shirt' };
        }
        return {
            ...base,
            type,
            label: type.replace(/^shirt_/, '').replace(/_/g, ' ') + ' — T-Shirt',
        };
    }
    // Every button-pin shape shares the landing-page pin design —
    // the studio builds it procedurally per shape (buildPin).
    const isPin = type === 'pin' || type.startsWith('pin_');
    if (isPin) {
        const base = DESIGNER_PRODUCTS.find((p) => p.type === 'pin')!;
        if (type === 'pin') return base;
        return {
            ...base,
            type,
            model: `procedural:${type}`,
            label: type.replace(/^pin_/, '').replace(/_/g, ' ') + ' — Button Pin',
        };
    }
    return DESIGNER_PRODUCTS[0];
}
