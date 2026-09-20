import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

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

// --- Fabric helper — PLAIN only, no pre-print, solid color ---
function fabricMat(weight: ShirtParams['weight'], color: string): THREE.Material {
    const c = new THREE.Color(color);
    const canvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
    let bump: THREE.CanvasTexture | null = null;
    if (canvas) {
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#808080';
        ctx.fillRect(0, 0, 128, 128);
        const dots = weight === 'heavy' ? 9000 : 6000;
        for (let i = 0; i < dots; i++) {
            const x = Math.random() * 128,
                y = Math.random() * 128;
            ctx.fillStyle = Math.random() > 0.5 ? '#7a7a7a' : '#8e8e8e';
            ctx.fillRect(x, y, 1, 1);
        }
        bump = new THREE.CanvasTexture(canvas);
        bump.wrapS = bump.wrapT = THREE.RepeatWrapping;
        bump.repeat.set(weight === 'heavy' ? 3 : 2, weight === 'heavy' ? 3 : 2);
    }
    const base = {
        color: c,
        roughness: weight === 'heavy' ? 0.72 : 0.82,
        metalness: 0.01,
    } as const;
    if (bump) return new THREE.MeshStandardMaterial({ ...base, bumpMap: bump, bumpScale: weight === 'heavy' ? 0.022 : 0.015 });
    return new THREE.MeshStandardMaterial(base);
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

export function buildShirt(type: string, color = '#FFFFFF'): { group: THREE.Group; labelW: number; labelH: number; torsoW: number; torsoH: number; torsoD: number; isBoxyHeavy: boolean } {
    const p = SHIRTS[type] ?? SHIRTS.shirt;
    const group = new THREE.Group();
    const mat = fabricMat(p.weight, color);
    const isRinger = !!p.ringer;
    const isPocket = !!p.pocket;
    const isGraphic = !!p.graphic;
    const isHenley = p.neck === 'henley';

    // Torso — true 3D volume like the mockup, not a flat card — PLAIN
    const torsoW = p.width + p.chestEase;
    const torsoH = p.length;
    const isBoxyHeavy = (p.weight === 'heavy' && p.chestEase >= 0.2) || type === 'shirt_oversized' || type === 'shirt_boxy';
    const torsoD = isBoxyHeavy ? torsoW * 0.26 : torsoW * 0.22; // chest depth — gives that inflated mannequin volume
    const wb: THREE.BufferGeometry = new RoundedBoxGeometry(torsoW, torsoH, torsoD, 6, 0.06);
    const pos = wb.attributes.position as THREE.BufferAttribute;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i);
        const ny = (v.y + torsoH / 2) / torsoH;
        const ax = Math.abs(v.x);
        // dropped shoulder — seam sits ~0.10 below natural shoulder for boxy/oversized
        const shoulderDrop = isBoxyHeavy ? 0.12 : 0;
        if (ny > 0.78 - shoulderDrop * 0.5) {
            const shoulderStart = torsoW / 2 - 0.52;
            if (ax > shoulderStart) {
                const t = (ax - shoulderStart) / 0.52;
                v.y -= t * (0.2 + shoulderDrop);
                v.x *= 1 - t * 0.05;
            }
        }
        if (p.bodyTaper > 0) v.x *= 1 - p.bodyTaper * Math.sin(ny * Math.PI) * 0.55;
        // fabric folds — subtle, screen-accurate (not noisy) — plain fabric
        v.z += shirtWrinkle(v.x, v.y, torsoH, isBoxyHeavy) + shirtChestBulge(v.x, torsoW) * 0.35;
        // crisp side seam line for boxy
        if (isBoxyHeavy && Math.abs(ax - torsoW / 2) < 0.04) v.z += 0.004;
        if (v.y > torsoH / 2 - 0.2 && ax < p.neckWidth) {
            if (p.neck === 'v') {
                const k = 1 - ax / p.neckWidth;
                if (k > 0) v.y -= k * p.neckDepth;
            } else if (p.neck === 'scoop') {
                const k = Math.cos((v.x / p.neckWidth) * (Math.PI / 2));
                if (k > 0) v.y -= k * p.neckDepth;
            } else if (p.neck === 'henley') {
                // Henley: shallower crew + vertical placket slit
                const k = Math.cos((v.x / p.neckWidth) * (Math.PI / 2));
                if (k > 0) v.y -= k * p.neckDepth * 0.9;
            } else {
                const k = Math.cos((v.x / p.neckWidth) * (Math.PI / 2));
                if (k > 0) v.y -= k * p.neckDepth;
            }
        }
        pos.setXYZ(i, v.x, v.y, v.z);
    }
    wb.computeVertexNormals();
    const torso = new THREE.Mesh(wb, mat);
    torso.name = 'torso';
    torso.castShadow = true;
    torso.receiveShadow = true;
    group.add(torso);

    // Inner neck hole — dark interior so the opening reads as a hole, not a dent
    {
        const holeR = p.neckWidth * 0.52;
        const hole = new THREE.Mesh(
            new THREE.CylinderGeometry(holeR, holeR * 0.96, 0.16, 24, 1, true),
            new THREE.MeshStandardMaterial({ color: 0x2a2a2e, roughness: 0.9, side: THREE.DoubleSide }),
        );
        hole.position.set(0, torsoH / 2 - 0.08, 0);
        group.add(hole);
        const bottomCap = new THREE.Mesh(
            new THREE.CylinderGeometry(holeR * 0.96, holeR * 0.9, 0.01, 24),
            new THREE.MeshStandardMaterial({ color: 0x1a1c1e, roughness: 1 }),
        );
        bottomCap.position.set(0, torsoH / 2 - 0.16, 0);
        group.add(bottomCap);
    }

    // Sleeves — dropped-shoulder for boxy/heavyweight, otherwise regular set-in — PLAIN
    for (const side of [-1, 1] as const) {
        const rTop = p.sleeveWidth * 0.42;
        const rBot = p.sleeveWidth * 0.36;
        const sGeo = new THREE.CylinderGeometry(rTop, rBot, p.sleeveLen, 20, 1, true);
        const sleeve = new THREE.Mesh(sGeo, mat);
        const dropY = isBoxyHeavy ? -0.14 : 0;
        sleeve.rotation.z = side * (Math.PI / 2 + (isBoxyHeavy ? 0.06 : 0.14));
        sleeve.position.set(side * (torsoW / 2 + p.sleeveLen / 2 - 0.08), torsoH / 2 - 0.42 + dropY, 0);
        sleeve.castShadow = true;
        const inner = new THREE.Mesh(
            new THREE.CylinderGeometry(rTop * 0.96, rBot * 0.96, p.sleeveLen, 20, 1, true),
            new THREE.MeshStandardMaterial({ color: 0x1a1c1e, roughness: 1, side: THREE.BackSide, transparent: true, opacity: 0.14 }),
        );
        inner.rotation.copy(sleeve.rotation);
        inner.position.copy(sleeve.position);
        group.add(sleeve);
        group.add(inner);
        // shoulder seam — heavier for boxy
        const seam = new THREE.Mesh(
            new THREE.TorusGeometry(rTop, isBoxyHeavy ? 0.016 : 0.012, 6, 20),
            new THREE.MeshStandardMaterial({ color: 0x000000, transparent: true, opacity: isBoxyHeavy ? 0.14 : 0.1 }),
        );
        seam.rotation.y = Math.PI / 2;
        seam.position.set(side * (torsoW / 2 - 0.02), torsoH / 2 - 0.42 + dropY, 0);
        seam.rotation.z = side * 0.2;
        group.add(seam);
        // cuff hem stitching — detailed double line like mockup — plain
        // Ringer uses contrasting cuff color
        const cuffColor = isRinger ? 0x1a1c1e : 0x9ca3af;
        const cuffOpacity = isRinger ? 0.9 : 0.65;
        const cuff = new THREE.Mesh(
            new THREE.TorusGeometry(rBot * 0.98, 0.008, 6, 20),
            new THREE.MeshStandardMaterial({ color: cuffColor, transparent: true, opacity: cuffOpacity }),
        );
        cuff.rotation.y = Math.PI / 2;
        cuff.position.set(side * (torsoW / 2 + p.sleeveLen - 0.06), torsoH / 2 - 0.42 + dropY, 0);
        group.add(cuff);
        if (isBoxyHeavy) {
            const cuff2 = new THREE.Mesh(
                new THREE.TorusGeometry(rBot * 0.98, 0.004, 6, 20),
                new THREE.MeshStandardMaterial({ color: 0x9ca3af, transparent: true, opacity: 0.35 }),
            );
            cuff2.rotation.y = Math.PI / 2;
            cuff2.position.set(side * (torsoW / 2 + p.sleeveLen - 0.08), torsoH / 2 - 0.42 + dropY, 0);
            group.add(cuff2);
        }
    }

    // Neck rib — smooth ribbed collar like mockup, thicker for heavyweight — PLAIN
    // Ringer variant gets contrasting collar
    {
        const ribColor = isRinger ? 0x1a1c1e : 0xe5e7eb;
        const ribInnerColor = isRinger ? 0x111214 : 0xcbd0e0;
        const ribInnerOpacity = isRinger ? 0.85 : 0.55;
        const rib = new THREE.Mesh(
            new THREE.TorusGeometry(p.neckWidth * 0.64, isBoxyHeavy ? 0.024 : 0.018, 10, 26, Math.PI),
            new THREE.MeshStandardMaterial({ color: ribColor, roughness: 0.65 }),
        );
        rib.rotation.x = Math.PI / 2;
        rib.rotation.z = Math.PI;
        rib.position.set(0, torsoH / 2 - 0.02, 0);
        if (p.neck === 'v') rib.scale.set(1, 1.35, 1);
        if (isHenley) rib.scale.set(1, 0.9, 1);
        group.add(rib);
        const ribInner = new THREE.Mesh(
            new THREE.TorusGeometry(p.neckWidth * 0.64, 0.007, 8, 26, Math.PI),
            new THREE.MeshStandardMaterial({ color: ribInnerColor, transparent: true, opacity: ribInnerOpacity }),
        );
        ribInner.rotation.x = Math.PI / 2;
        ribInner.rotation.z = Math.PI;
        ribInner.position.set(0, torsoH / 2 - 0.02, 0);
        if (p.neck === 'v') ribInner.scale.set(1, 1.35, 1);
        group.add(ribInner);
    }

    // Henley placket + buttons — plain fabric with buttons
    if (isHenley) {
        const placket = new THREE.Mesh(
            new THREE.BoxGeometry(0.14, 0.36, 0.02),
            new THREE.MeshStandardMaterial({ color: 0xf3f4f6, roughness: 0.8 }),
        );
        placket.position.set(0, torsoH / 2 - 0.22, torsoD / 2 + 0.025);
        group.add(placket);
        for (let i = 0; i < 3; i++) {
            const btn = new THREE.Mesh(
                new THREE.CylinderGeometry(0.018, 0.018, 0.008, 12),
                new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, metalness: 0.1 }),
            );
            btn.rotation.x = Math.PI / 2;
            btn.position.set(0, torsoH / 2 - 0.16 - i * 0.09, torsoD / 2 + 0.036);
            group.add(btn);
            const thread = new THREE.Mesh(
                new THREE.CylinderGeometry(0.003, 0.003, 0.012, 6),
                new THREE.MeshStandardMaterial({ color: 0x9ca3af }),
            );
            thread.rotation.z = Math.PI / 2;
            thread.position.copy(btn.position);
            thread.position.z += 0.002;
            group.add(thread);
        }
    }

    // Pocket — chest pocket for pocket tee — plain, same fabric
    if (isPocket) {
        const pw = 0.28;
        const ph = 0.3;
        const pocketGeo = new THREE.BoxGeometry(pw, ph, 0.015);
        const pocketPos = pocketGeo.attributes.position as THREE.BufferAttribute;
        const pv = new THREE.Vector3();
        for (let i = 0; i < pocketPos.count; i++) {
            pv.fromBufferAttribute(pocketPos, i);
            // slight chest bulge so pocket follows torso curve
            const bulge = shirtChestBulge(pv.x - 0.22, torsoW) * 0.6;
            pv.z += bulge;
            pocketPos.setZ(i, pv.z);
        }
        pocketGeo.computeVertexNormals();
        const pocket = new THREE.Mesh(pocketGeo, mat);
        // left chest (from viewer perspective, shirt's left is +X? Actually viewer front is +Z, left is -X? Keep consistent with previous: pocket on left chest from viewer = shirt's left? Use +? We'll place at +X? Let's use -0.32 from center to match typical left chest)
        pocket.position.set(-0.32, 0.18, torsoD / 2 + 0.012);
        pocket.castShadow = true;
        group.add(pocket);
        // pocket seam
        const pSeam = new THREE.Mesh(
            new THREE.BoxGeometry(pw + 0.02, 0.008, 0.008),
            new THREE.MeshStandardMaterial({ color: 0x9ca3af, transparent: true, opacity: 0.5 }),
        );
        pSeam.position.set(-0.32, 0.18 + ph / 2, torsoD / 2 + 0.022);
        group.add(pSeam);
    }

    // Bottom hem stitching — double line for heavyweight — plain
    {
        const hem = new THREE.Mesh(
            new THREE.BoxGeometry(torsoW - 0.02, 0.016, 0.085),
            new THREE.MeshStandardMaterial({ color: 0x9ca3af, transparent: true, opacity: 0.5 }),
        );
        hem.position.set(0, -torsoH / 2 + 0.04, 0);
        group.add(hem);
        if (isBoxyHeavy) {
            const hem2 = new THREE.Mesh(
                new THREE.BoxGeometry(torsoW - 0.04, 0.008, 0.08),
                new THREE.MeshStandardMaterial({ color: 0x9ca3af, transparent: true, opacity: 0.28 }),
            );
            hem2.position.set(0, -torsoH / 2 + 0.07, 0);
            group.add(hem2);
        }
    }

    // Graphic tee has a larger print area, others standard plain area
    const labelW = isGraphic ? torsoW * 0.82 : torsoW * 0.62;
    const labelH = isGraphic ? torsoH * 0.56 : torsoH * 0.42;
    return { group, labelW, labelH, torsoW, torsoH, torsoD, isBoxyHeavy };
}
