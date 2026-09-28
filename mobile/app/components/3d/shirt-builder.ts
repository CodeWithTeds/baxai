import * as THREE from 'three';

// Shirt builder — PLAIN ONLY. Same clean white isolated layout for every tee.
// Each variant is a plain solid-color sewing (no pre-printed graphics) with
// cut-driven scaling and neckline carving. Categories are strict so the
// selector can group them as 👕 Common vs 👔 Neckline.

export interface ShirtParams {
    width: number;
    length: number;
    sleeveLen: number;
    sleeveWidth: number;
    chestEase: number; // extra width for drape — slim 0, regular 0.08, oversized 0.26
    bodyTaper: number; // boxy 0, slim 0.12
    neck: 'crew' | 'v' | 'scoop' | 'henley';
    neckWidth: number;
    neckDepth: number;
    weight?: 'heavy';
    ringer?: boolean;
    pocket?: boolean;
    graphic?: boolean;
}

export const SHIRTS: Record<string, ShirtParams> = {
    // Base plain — used for backend/shirt.glb GLB path (Regular)
    shirt: { width: 1.45, length: 1.55, sleeveLen: 0.48, sleeveWidth: 0.42, chestEase: 0.08, bodyTaper: 0, neck: 'crew', neckWidth: 0.42, neckDepth: 0.14 },
    // 👕 Common T-shirt types — all PLAIN
    shirt_regular: { width: 1.45, length: 1.55, sleeveLen: 0.48, sleeveWidth: 0.42, chestEase: 0.08, bodyTaper: 0, neck: 'crew', neckWidth: 0.42, neckDepth: 0.14 },
    shirt_oversized: { width: 1.84, length: 1.58, sleeveLen: 0.62, sleeveWidth: 0.54, chestEase: 0.26, bodyTaper: 0, neck: 'crew', neckWidth: 0.48, neckDepth: 0.15, weight: 'heavy' },
    shirt_boxy: { width: 1.82, length: 1.3, sleeveLen: 0.56, sleeveWidth: 0.52, chestEase: 0.24, bodyTaper: 0, neck: 'crew', neckWidth: 0.46, neckDepth: 0.14, weight: 'heavy' },
    shirt_relaxed: { width: 1.58, length: 1.58, sleeveLen: 0.52, sleeveWidth: 0.46, chestEase: 0.14, bodyTaper: 0.02, neck: 'crew', neckWidth: 0.44, neckDepth: 0.14 },
    shirt_slim: { width: 1.28, length: 1.52, sleeveLen: 0.44, sleeveWidth: 0.38, chestEase: 0, bodyTaper: 0.12, neck: 'crew', neckWidth: 0.38, neckDepth: 0.13 },
    shirt_cropped: { width: 1.42, length: 1.02, sleeveLen: 0.42, sleeveWidth: 0.4, chestEase: 0.06, bodyTaper: 0.02, neck: 'crew', neckWidth: 0.42, neckDepth: 0.14 },
    shirt_baby: { width: 1.1, length: 1.05, sleeveLen: 0.32, sleeveWidth: 0.34, chestEase: 0, bodyTaper: 0.1, neck: 'crew', neckWidth: 0.34, neckDepth: 0.12 },
    shirt_longline: { width: 1.46, length: 1.95, sleeveLen: 0.5, sleeveWidth: 0.42, chestEase: 0.08, bodyTaper: 0, neck: 'crew', neckWidth: 0.42, neckDepth: 0.14 },
    shirt_heavy: { width: 1.52, length: 1.6, sleeveLen: 0.54, sleeveWidth: 0.48, chestEase: 0.16, bodyTaper: 0, neck: 'crew', neckWidth: 0.44, neckDepth: 0.14, weight: 'heavy' },
    shirt_ringer: { width: 1.45, length: 1.55, sleeveLen: 0.48, sleeveWidth: 0.42, chestEase: 0.08, bodyTaper: 0, neck: 'crew', neckWidth: 0.42, neckDepth: 0.14, ringer: true },
    shirt_pocket: { width: 1.45, length: 1.55, sleeveLen: 0.48, sleeveWidth: 0.42, chestEase: 0.08, bodyTaper: 0, neck: 'crew', neckWidth: 0.42, neckDepth: 0.14, pocket: true },
    shirt_graphic: { width: 1.48, length: 1.58, sleeveLen: 0.5, sleeveWidth: 0.44, chestEase: 0.1, bodyTaper: 0, neck: 'crew', neckWidth: 0.44, neckDepth: 0.15, graphic: true },
    // 👔 Neckline types — also plain, only cut + detail varies
    shirt_crew: { width: 1.45, length: 1.55, sleeveLen: 0.48, sleeveWidth: 0.42, chestEase: 0.08, bodyTaper: 0, neck: 'crew', neckWidth: 0.42, neckDepth: 0.14 },
    shirt_vneck: { width: 1.45, length: 1.55, sleeveLen: 0.48, sleeveWidth: 0.42, chestEase: 0.08, bodyTaper: 0, neck: 'v', neckWidth: 0.46, neckDepth: 0.32 },
    shirt_scoop: { width: 1.45, length: 1.55, sleeveLen: 0.48, sleeveWidth: 0.42, chestEase: 0.08, bodyTaper: 0, neck: 'scoop', neckWidth: 0.56, neckDepth: 0.24 },
    shirt_henley: { width: 1.45, length: 1.55, sleeveLen: 0.48, sleeveWidth: 0.42, chestEase: 0.08, bodyTaper: 0, neck: 'henley', neckWidth: 0.4, neckDepth: 0.14 },
};

// 👕 Common T-shirt types — own category, plain only
export const SHIRT_COMMON_VIEWERS = [
    { value: 'shirt_regular', label: 'Regular-fit T-shirt — standard cut, neither tight nor oversized', shortLabel: 'Regular-fit' },
    { value: 'shirt_oversized', label: 'Oversized T-shirt — loose and intentionally larger', shortLabel: 'Oversized' },
    { value: 'shirt_boxy', label: 'Boxy T-shirt — wide, straight shape with a shorter body', shortLabel: 'Boxy' },
    { value: 'shirt_relaxed', label: 'Relaxed-fit T-shirt — loose but less oversized', shortLabel: 'Relaxed-fit' },
    { value: 'shirt_slim', label: 'Slim-fit T-shirt — closer to the body', shortLabel: 'Slim-fit' },
    { value: 'shirt_cropped', label: 'Cropped T-shirt — shorter length, ending around the waist', shortLabel: 'Cropped' },
    { value: 'shirt_baby', label: 'Baby tee — small/fitted shirt, usually shorter and more fitted', shortLabel: 'Baby tee' },
    { value: 'shirt_longline', label: 'Longline T-shirt — longer than a standard T-shirt', shortLabel: 'Longline' },
    { value: 'shirt_heavy', label: 'Heavyweight T-shirt — made with thicker fabric', shortLabel: 'Heavyweight' },
    { value: 'shirt_ringer', label: 'Ringer T-shirt — contrasting color around the collar and sleeve edges', shortLabel: 'Ringer' },
    { value: 'shirt_pocket', label: 'Pocket T-shirt — has a chest pocket', shortLabel: 'Pocket' },
    { value: 'shirt_graphic', label: 'Graphic T-shirt — features artwork, text, or graphics', shortLabel: 'Graphic' },
] as const;

// 👔 Neckline types — own category, plain only
export const SHIRT_NECKLINE_VIEWERS = [
    { value: 'shirt_crew', label: 'Crew neck — round neckline', shortLabel: 'Crew neck' },
    { value: 'shirt_vneck', label: 'V-neck — V-shaped neckline', shortLabel: 'V-neck' },
    { value: 'shirt_scoop', label: 'Scoop neck — deeper/wider rounded neckline', shortLabel: 'Scoop neck' },
    { value: 'shirt_henley', label: 'Henley — buttons near the neckline', shortLabel: 'Henley' },
] as const;

export const SHIRT_CATEGORIES = [
    { id: 'common', label: '👕 Common T-shirt types', viewers: SHIRT_COMMON_VIEWERS },
    { id: 'neckline', label: '👔 Neckline types', viewers: SHIRT_NECKLINE_VIEWERS },
] as const;

export const SHIRT_VIEWERS = [
    // Keep alias shirt → regular for backward compat (defaults to plain Regular)
    { value: 'shirt', label: 'T-Shirt — Regular — 3D' },
    ...SHIRT_COMMON_VIEWERS.map((v) => ({ value: v.value, label: `${v.shortLabel} — 3D` })),
    ...SHIRT_NECKLINE_VIEWERS.map((v) => ({ value: v.value, label: `${v.shortLabel} — 3D` })),
];

export function isShirtType(v: string): boolean {
    return v in SHIRTS;
}

export function isHeavyShirtType(v: string): boolean {
    const p = SHIRTS[v];
    if (!p) return false;
    return p.weight === 'heavy' || v === 'shirt_oversized' || v === 'shirt_boxy';
}

// --- Fit-style morphs: SAME Regular shirt.glb, re-proportioned per category ---
// Follows the fit-guide layout: Slim narrower, Regular baseline, Oversized
// wider+longer, Boxy wide+short, Cropped short, Baby small+fitted,
// Longline extra-long, Heavyweight thicker fabric feel, Ringer contrast trim,
// Pocket chest pocket, Graphic bigger print area, necklines carved.

export type ShirtNeck = 'crew' | 'v' | 'scoop' | 'boat' | 'henley';

export interface ShirtFit {
    /** width multiplier about model center */
    w: number;
    /** length multiplier anchored at the shoulders (collar stays, hem moves) */
    len: number;
    /** depth/volume multiplier */
    depth: number;
    /** waist taper 0..1 (slim/baby follow the body) */
    taper: number;
    /** dropped-shoulder amount as fraction of height (oversized/boxy hang off-shoulder) */
    shoulderDrop: number;
    /** extra width beyond the shoulder line (wide loose sleeves vs fitted) */
    sleeveFlare: number;
    neck: ShirtNeck;
    ringer: boolean;
    pocket: boolean;
    heavy: boolean;
    graphic: boolean;
    /** print-area fractions of chest width / body height */
    decalW: number;
    decalH: number;
}

const REGULAR_FIT: ShirtFit = {
    w: 1, len: 1, depth: 1, taper: 0, shoulderDrop: 0, sleeveFlare: 0, neck: 'crew',
    ringer: false, pocket: false, heavy: false, graphic: false,
    decalW: 0.55, decalH: 0.42,
};

export const SHIRT_FITS: Record<string, ShirtFit> = {
    shirt: { ...REGULAR_FIT },
    shirt_regular: { ...REGULAR_FIT },
    shirt_oversized: { ...REGULAR_FIT, w: 1.3, len: 1.14, depth: 1.14, shoulderDrop: 0.07, sleeveFlare: 0.12, decalW: 0.58, decalH: 0.44 },
    shirt_boxy: { ...REGULAR_FIT, w: 1.26, len: 0.78, depth: 1.1, shoulderDrop: 0.08, sleeveFlare: 0.1, decalW: 0.58, decalH: 0.4 },
    shirt_relaxed: { ...REGULAR_FIT, w: 1.1, len: 1.04, depth: 1.04, shoulderDrop: 0.02, sleeveFlare: 0.03 },
    shirt_slim: { ...REGULAR_FIT, w: 0.8, len: 0.98, depth: 0.96, taper: 0.1, sleeveFlare: -0.03, decalW: 0.52, decalH: 0.42 },
    shirt_cropped: { ...REGULAR_FIT, w: 1.06, len: 0.62, depth: 1.0, shoulderDrop: 0.02, decalW: 0.52, decalH: 0.36 },
    shirt_baby: { ...REGULAR_FIT, w: 0.74, len: 0.68, depth: 0.94, taper: 0.08, decalW: 0.5, decalH: 0.36 },
    shirt_longline: { ...REGULAR_FIT, w: 1.0, len: 1.32, depth: 1.0, decalW: 0.55, decalH: 0.4 },
    shirt_heavy: { ...REGULAR_FIT, w: 1.05, len: 1.03, depth: 1.08, heavy: true },
    shirt_ringer: { ...REGULAR_FIT, ringer: true },
    shirt_pocket: { ...REGULAR_FIT, pocket: true },
    shirt_graphic: { ...REGULAR_FIT, w: 1.02, len: 1.02, graphic: true, decalW: 0.66, decalH: 0.54 },
    shirt_crew: { ...REGULAR_FIT, neck: 'crew' },
    shirt_vneck: { ...REGULAR_FIT, neck: 'v' },
    shirt_scoop: { ...REGULAR_FIT, neck: 'scoop' },
    shirt_henley: { ...REGULAR_FIT, neck: 'henley' },
};

export function shirtFitFor(type: string): ShirtFit {
    return SHIRT_FITS[type] ?? SHIRT_FITS.shirt_regular;
}

/** Collar + cuff material names in shirt.glb (contrast trim for Ringer). */
export const SHIRT_TRIM_MATS = new Set(['03___Default', '08___Default']);

/** Contrast trim color for Ringer: dark trim on light shirts, white on dark. */
export function shirtTrimContrast(colorHex: string): string {
    const c = new THREE.Color(colorHex);
    const lum = 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
    return lum > 0.45 ? '#1A1C1E' : '#FFFFFF';
}

function shirtMeshes(group: THREE.Group): THREE.Mesh[] {
    const out: THREE.Mesh[] = [];
    group.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) out.push(o as THREE.Mesh);
    });
    return out;
}

/**
 * Re-proportion the Regular shirt.glb per fit category — same model, same
 * materials, just reshaped. Runs in model units BEFORE normalize/scale.
 * - width about center, length anchored at shoulders, depth for volume
 * - neckline carve for v/scoop/boat (front only, collar follows)
 * - chest pocket + henley placket/buttons modelled in place via raycast
 */
export function morphShirtGLB(group: THREE.Group, type: string): { fit: ShirtFit; sizeRatio: number } {
    const fit = shirtFitFor(type);
    const meshes = shirtMeshes(group);
    if (meshes.length === 0) return { fit, sizeRatio: 1 };

    group.updateMatrixWorld(true);
    let box = new THREE.Box3().setFromObject(group);
    let size = box.getSize(new THREE.Vector3());
    let center = box.getCenter(new THREE.Vector3());
    if (size.x <= 0 || size.y <= 0) return { fit, sizeRatio: 1 };
    // Baseline size BEFORE reshaping — callers normalize against this so every
    // fit shares one uniform scale and relative sizes stay visible on screen
    // (baby renders smaller, oversized bigger) instead of each being stretched
    // to fill the frame identically.
    const preMax = Math.max(size.x, size.y, size.z) || 1;

    const tmp = new THREE.Vector3();
    const inv = new THREE.Matrix4();
    const morphPoint = (p: THREE.Vector3) => {
        // width (+ waist taper for slim/baby)
        const t = Math.max(0, Math.min(1, (box.max.y - p.y) / (size.y || 1)));
        let ws = fit.w;
        if (fit.taper > 0) ws *= 1 - fit.taper * Math.sin(t * Math.PI);
        p.x = center.x + (p.x - center.x) * ws;
        // length anchored at shoulders so the collar never moves
        p.y = box.max.y - (box.max.y - p.y) * fit.len;
        // depth/volume
        p.z = center.z + (p.z - center.z) * fit.depth;
    };

    // 1) proportional reshape (world space, baked back to local)
    for (const mesh of meshes) {
        mesh.updateWorldMatrix(true, false);
        inv.copy(mesh.matrixWorld).invert();
        const pos = mesh.geometry.attributes.position as THREE.BufferAttribute | undefined;
        if (!pos) continue;
        for (let i = 0; i < pos.count; i++) {
            tmp.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
            morphPoint(tmp);
            tmp.applyMatrix4(inv);
            pos.setXYZ(i, tmp.x, tmp.y, tmp.z);
        }
        pos.needsUpdate = true;
        mesh.geometry.computeVertexNormals();
        // positions changed — drop cached bounds so later Box3/raycast calls measure fresh
        mesh.geometry.boundingBox = null;
        mesh.geometry.boundingSphere = null;
    }

    // 1b) dropped shoulders + sleeve flare — what makes oversized/boxy read loose
    // like the fit guide (seam hangs off-shoulder, sleeves flare wide) vs slim
    // (sleeves pull in). Torso body (|x| inside the shoulder line) is untouched.
    if (fit.shoulderDrop > 0 || fit.sleeveFlare !== 0) {
        group.updateMatrixWorld(true);
        box = new THREE.Box3().setFromObject(group);
        size = box.getSize(new THREE.Vector3());
        center = box.getCenter(new THREE.Vector3());
        const shoulderX = size.x * 0.26;
        for (const mesh of shirtMeshes(group)) {
            mesh.updateWorldMatrix(true, false);
            inv.copy(mesh.matrixWorld).invert();
            const pos = mesh.geometry.attributes.position as THREE.BufferAttribute | undefined;
            if (!pos) continue;
            let touched = false;
            for (let i = 0; i < pos.count; i++) {
                tmp.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
                const ax = Math.abs(tmp.x - center.x);
                if (ax > shoulderX) {
                    const ramp = Math.min(1, (ax - shoulderX) / (size.x * 0.18 || 1));
                    const r = ramp * ramp * (3 - 2 * ramp); // smoothstep — no visible seam kink
                    if (fit.shoulderDrop > 0) tmp.y -= fit.shoulderDrop * size.y * r;
                    if (fit.sleeveFlare !== 0) tmp.x = center.x + (tmp.x - center.x) * (1 + fit.sleeveFlare * r);
                    tmp.applyMatrix4(inv);
                    pos.setXYZ(i, tmp.x, tmp.y, tmp.z);
                    touched = true;
                }
            }
            if (touched) {
                pos.needsUpdate = true;
                mesh.geometry.computeVertexNormals();
                mesh.geometry.boundingBox = null;
                mesh.geometry.boundingSphere = null;
            }
        }
    }

    // 2) neckline carve — front verts near the collar follow a V/scoop/boat profile
    if (fit.neck === 'v' || fit.neck === 'scoop' || fit.neck === 'boat') {
        group.updateMatrixWorld(true);
        box = new THREE.Box3().setFromObject(group);
        size = box.getSize(new THREE.Vector3());
        center = box.getCenter(new THREE.Vector3());
        const halfW = size.x * (fit.neck === 'v' ? 0.1 : fit.neck === 'scoop' ? 0.14 : 0.22);
        const zoneBottom = box.max.y - size.y * (fit.neck === 'v' ? 0.2 : 0.16);
        const dropAmt = size.y * (fit.neck === 'v' ? 0.17 : fit.neck === 'scoop' ? 0.1 : 0.055);
        for (const mesh of shirtMeshes(group)) {
            mesh.updateWorldMatrix(true, false);
            inv.copy(mesh.matrixWorld).invert();
            const pos = mesh.geometry.attributes.position as THREE.BufferAttribute | undefined;
            if (!pos) continue;
            let touched = false;
            for (let i = 0; i < pos.count; i++) {
                tmp.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
                const dx = Math.abs(tmp.x - center.x);
                if (tmp.y > zoneBottom && dx < halfW && tmp.z > center.z) {
                    const u = dx / (halfW || 1);
                    const drop =
                        fit.neck === 'v'
                            ? dropAmt * (1 - u)
                            : fit.neck === 'scoop'
                              ? dropAmt * Math.cos((u * Math.PI) / 2)
                              : dropAmt * (0.75 + 0.25 * Math.cos((u * Math.PI) / 2));
                    tmp.y -= Math.max(0, drop);
                    tmp.applyMatrix4(inv);
                    pos.setXYZ(i, tmp.x, tmp.y, tmp.z);
                    touched = true;
                }
            }
            if (touched) {
                pos.needsUpdate = true;
                mesh.geometry.computeVertexNormals();
                // positions changed — drop cached bounds so later Box3/raycast calls measure fresh
                mesh.geometry.boundingBox = null;
                mesh.geometry.boundingSphere = null;
            }
        }
    }

    // 3) details modelled in place (surface found via raycast so they sit flush)
    group.updateMatrixWorld(true);
    box = new THREE.Box3().setFromObject(group);
    size = box.getSize(new THREE.Vector3());
    center = box.getCenter(new THREE.Vector3());
    const ray = new THREE.Raycaster();
    const surfaceZ = (x: number, y: number): number => {
        ray.set(new THREE.Vector3(x, y, box.max.z + Math.max(size.z, size.x) * 0.5), new THREE.Vector3(0, 0, -1));
        const hits = ray.intersectObjects(shirtMeshes(group), false);
        return hits.length > 0 ? hits[0].point.z : box.max.z - size.z * 0.02;
    };
    const fabric = (name: string) =>
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: fit.heavy ? 0.9 : 0.82, metalness: 0.02, name });

    if (fit.pocket) {
        // wearer's left chest = viewer's right (+x from the front)
        const px = center.x + size.x * 0.2;
        const py = box.max.y - size.y * 0.34;
        const pz = surfaceZ(px, py);
        const pw = size.x * 0.11;
        const ph = size.y * 0.1;
        const thick = Math.max(size.z * 0.02, size.x * 0.008);
        const pocket = new THREE.Mesh(new THREE.BoxGeometry(pw, ph, thick), fabric('Pocket'));
        pocket.position.set(px, py, pz + thick / 2 - thick * 0.3);
        pocket.castShadow = true;
        group.add(pocket);
        const seam = new THREE.Mesh(
            new THREE.BoxGeometry(pw + size.x * 0.008, size.y * 0.006, thick * 0.5),
            new THREE.MeshStandardMaterial({ color: 0x9ca3af, transparent: true, opacity: 0.5, name: 'PocketSeam' }),
        );
        seam.position.set(px, py + ph / 2, pz + thick * 0.4);
        group.add(seam);
    }

    if (fit.neck === 'henley') {
        const px = center.x;
        const py = box.max.y - size.y * 0.12;
        const pz = surfaceZ(px, py);
        const thick = Math.max(size.z * 0.02, size.x * 0.008);
        const placket = new THREE.Mesh(new THREE.BoxGeometry(size.x * 0.045, size.y * 0.13, thick), fabric('Placket'));
        placket.position.set(px, py, pz + thick / 2 - thick * 0.3);
        group.add(placket);
        for (let i = 0; i < 3; i++) {
            const btn = new THREE.Mesh(
                new THREE.CylinderGeometry(size.x * 0.008, size.x * 0.008, thick * 0.6, 12),
                new THREE.MeshStandardMaterial({ color: 0xf3f4f6, roughness: 0.35, metalness: 0.05, name: 'Buttons' }),
            );
            btn.rotation.x = Math.PI / 2;
            btn.position.set(px, box.max.y - size.y * (0.08 + i * 0.035), pz + thick * 0.55);
            group.add(btn);
        }
    }

    // 4) heavyweight fabric feel
    if (fit.heavy) {
        for (const mesh of shirtMeshes(group)) {
            const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            mats.forEach((m) => {
                const sm = m as THREE.MeshStandardMaterial;
                if ('roughness' in sm) sm.roughness = 0.9;
            });
        }
    }

    // Relative size vs the unmorphed Regular baseline — lets callers keep one
    // uniform scale so fits visibly differ in size (baby smaller, oversized bigger).
    group.updateMatrixWorld(true);
    const postSize = new THREE.Box3().setFromObject(group).getSize(new THREE.Vector3());
    const sizeRatio = Math.max(postSize.x, postSize.y, postSize.z) / preMax;
    return { fit, sizeRatio };
}

// --- Wrinkle helpers shared between torso and decal ---
// Return Z offset for a given world X/Y on the shirt front.
// This is the SAME function used for torso vertices so the decal matches the fabric.
export function shirtWrinkle(x: number, y: number, torsoH: number, isBoxyHeavy: boolean): number {
    const ny = (y + torsoH / 2) / torsoH;
    const clampedNy = Math.max(0, Math.min(1, ny));
    const baseCurve = Math.sin(clampedNy * Math.PI) * 0.012;
    if (isBoxyHeavy) {
        return Math.sin(x * 3.2) * 0.022 * Math.sin(clampedNy * Math.PI * 0.9) + Math.sin(x * 7.1 + y * 1.1) * 0.007 + baseCurve;
    }
    return Math.sin(x * 4.5) * 0.015 * Math.sin(clampedNy * Math.PI) + Math.cos(y * 3.0) * 0.005 + baseCurve;
}

// Chest bulge – subtle convex across X for the front panel (center pops out)
export function shirtChestBulge(x: number, w: number): number {
    const nx = x / (w / 2 || 1); // -1..1
    // parabolic bulge: max 0.035 at center, 0 at edges
    return (1 - nx * nx) * 0.03;
}

// Apply drape displacement to a PlaneGeometry decal so it hugs the shirt surface.
// geometry: PlaneGeometry positioned at (0, centerY, frontZ). We offset vertices in local Z
// to follow chest bulge + wrinkle, then recompute normals so lighting looks non-flat.
export function applyShirtDecalDrape(
    geometry: THREE.BufferGeometry,
    opts: { centerY: number; frontZ: number; torsoW: number; torsoH: number; isBoxyHeavy: boolean },
): void {
    const pos = geometry.attributes.position as THREE.BufferAttribute;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i);
        // world X/Y at this decal vertex
        const worldX = v.x;
        const worldY = opts.centerY + v.y;
        const wr = shirtWrinkle(worldX, worldY, opts.torsoH, opts.isBoxyHeavy);
        const bulge = shirtChestBulge(worldX, opts.torsoW);
        // keep original plane Z (usually 0) and add front offset + bulge + wrinkle
        // We do NOT overwrite world Z – we add displacement relative to plane local Z
        const nz = v.z + bulge + wr;
        pos.setZ(i, nz);
    }
    geometry.computeVertexNormals();
    // slight extra: nudge plane a tiny bit toward front so it never z-fights
    // (caller already placed mesh at frontZ, this displacement is relative)
}

// NOTE: the old blocky procedural buildShirt was removed — every fit now
// re-proportions the same Regular shirt.glb via morphShirtGLB above.

