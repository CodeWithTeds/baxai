import * as THREE from 'three';

// Button pin shapes — SAME design as the landing page pin
// (resources/js/svelte/landing/ProductStage.svelte): glossy printed face,
// metal rim, white backing, safety-pin back. Round/square/star/heart are
// ported 1:1; rectangle/oval/hexagon/triangle/diamond/cloud/flower follow
// the same construction (extruded die-cut + backing + safety back).

export const PIN_SHAPES = [
    { value: 'pin_circle', label: 'Circle / Round — the classic button pin shape', shortLabel: 'Circle / Round' },
    { value: 'pin_square', label: 'Square — four equal sides', shortLabel: 'Square' },
    { value: 'pin_rectangle', label: 'Rectangle — wider than a square', shortLabel: 'Rectangle' },
    { value: 'pin_oval', label: 'Oval — elongated circle', shortLabel: 'Oval' },
    { value: 'pin_heart', label: 'Heart ❤️ — heart-shaped', shortLabel: 'Heart' },
    { value: 'pin_star', label: 'Star ⭐ — 5-point star', shortLabel: 'Star' },
    { value: 'pin_hexagon', label: 'Hexagon — six-sided shape', shortLabel: 'Hexagon' },
    { value: 'pin_triangle', label: 'Triangle — three-sided', shortLabel: 'Triangle' },
    { value: 'pin_diamond', label: 'Diamond ♦️ — four-sided shape turned on its point', shortLabel: 'Diamond' },
    { value: 'pin_cloud', label: 'Cloud ☁️ — rounded cloud shape', shortLabel: 'Cloud' },
    { value: 'pin_flower', label: 'Flower 🌸 — petal-shaped', shortLabel: 'Flower' },
] as const;

export type PinShapeValue = (typeof PIN_SHAPES)[number]['value'];

const PIN_VALUES = new Set<string>(PIN_SHAPES.map((p) => p.value));

export function isPinType(v: string): boolean {
    // Legacy `pin` renders as the classic circle.
    return v === 'pin' || PIN_VALUES.has(v);
}

/** Normalize legacy `pin` → circle so one code path serves every pin. */
export function pinKeyFor(type: string): string {
    if (type === 'pin') return 'pin_circle';
    return PIN_VALUES.has(type) ? type : 'pin_circle';
}

// --- 2D die-cut outlines (landing ports + new shapes) ---

function roundedRectShape(w: number, h: number, r: number): THREE.Shape {
    const s = new THREE.Shape();
    const x = -w / 2;
    const y = -h / 2;
    s.moveTo(x + r, y);
    s.lineTo(x + w - r, y);
    s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r);
    s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h);
    s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r);
    s.quadraticCurveTo(x, y, x + r, y);
    return s;
}

function starShape(outer: number, inner: number, points = 5): THREE.Shape {
    const s = new THREE.Shape();
    for (let i = 0; i < points * 2; i++) {
        const r = i % 2 === 0 ? outer : inner;
        const a = (Math.PI / points) * i - Math.PI / 2;
        const x = Math.cos(a) * r;
        const y = Math.sin(a) * r;
        if (i === 0) s.moveTo(x, y);
        else s.lineTo(x, y);
    }
    s.closePath();
    return s;
}

function heartShape(scale = 1): THREE.Shape {
    const s = new THREE.Shape();
    s.moveTo(0, 0.6 * scale);
    s.bezierCurveTo(0.6 * scale, 0.9 * scale, 1.0 * scale, 0.5 * scale, 0, -0.5 * scale);
    s.bezierCurveTo(-1.0 * scale, 0.5 * scale, -0.6 * scale, 0.9 * scale, 0, 0.6 * scale);
    return s;
}

function ellipseShape(rx: number, ry: number): THREE.Shape {
    const s = new THREE.Shape();
    s.absellipse(0, 0, rx, ry, 0, Math.PI * 2);
    return s;
}

function polygonShape(radius: number, points: number, rot = 0): THREE.Shape {
    const s = new THREE.Shape();
    for (let i = 0; i < points; i++) {
        const a = rot + (i / points) * Math.PI * 2;
        const x = Math.cos(a) * radius;
        const y = Math.sin(a) * radius;
        if (i === 0) s.moveTo(x, y);
        else s.lineTo(x, y);
    }
    s.closePath();
    return s;
}

function triangleShape(): THREE.Shape {
    const s = new THREE.Shape();
    s.moveTo(0, 0.88);
    s.lineTo(0.92, -0.72);
    s.lineTo(-0.92, -0.72);
    s.closePath();
    return s;
}

function diamondShape(): THREE.Shape {
    const s = new THREE.Shape();
    s.moveTo(0, 0.95);
    s.lineTo(0.72, 0);
    s.lineTo(0, -0.95);
    s.lineTo(-0.72, 0);
    s.closePath();
    return s;
}

function cloudShape(): THREE.Shape {
    const s = new THREE.Shape();
    s.moveTo(-0.85, -0.35);
    s.lineTo(0.85, -0.35);
    s.quadraticCurveTo(0.95, -0.35, 0.92, -0.15);
    s.quadraticCurveTo(1.05, 0.05, 0.8, 0.12);
    s.quadraticCurveTo(0.85, 0.45, 0.45, 0.38);
    s.quadraticCurveTo(0.3, 0.62, -0.05, 0.5);
    s.quadraticCurveTo(-0.4, 0.62, -0.5, 0.35);
    s.quadraticCurveTo(-0.95, 0.3, -0.85, 0.0);
    s.quadraticCurveTo(-1.0, -0.2, -0.85, -0.35);
    return s;
}

function flowerShape(petals = 6, radius = 0.95): THREE.Shape {
    const s = new THREE.Shape();
    const steps = petals * 16;
    for (let i = 0; i <= steps; i++) {
        const a = (i / steps) * Math.PI * 2;
        const r = radius * (0.7 + 0.3 * Math.cos(a * petals));
        const x = Math.cos(a) * r;
        const y = Math.sin(a) * r;
        if (i === 0) s.moveTo(x, y);
        else s.lineTo(x, y);
    }
    s.closePath();
    return s;
}

export function pinShapeFor(type: string): THREE.Shape | null {
    const key = pinKeyFor(type);
    switch (key) {
        case 'pin_square':
            return roundedRectShape(1.7, 1.7, 0.06);
        case 'pin_rectangle':
            return roundedRectShape(2.1, 1.5, 0.08);
        case 'pin_oval':
            return ellipseShape(1.05, 0.78);
        case 'pin_heart':
            return heartShape(0.85);
        case 'pin_star':
            return starShape(0.95, 0.48, 5);
        case 'pin_hexagon':
            return polygonShape(1.0, 6, 0);
        case 'pin_triangle':
            return triangleShape();
        case 'pin_diamond':
            return diamondShape();
        case 'pin_cloud':
            return cloudShape();
        case 'pin_flower':
            return flowerShape(6, 0.95);
        default:
            return null; // circle → cylinder construction
    }
}

// --- UV helper: map any face geometry to 0..1 so artwork fits the shape ---

export function pinPlanarUVs(geo: THREE.BufferGeometry, fit = 1): void {
    geo.computeBoundingBox();
    const bb = geo.boundingBox;
    if (!bb) return;
    const w = Math.max(1e-6, bb.max.x - bb.min.x);
    const h = Math.max(1e-6, bb.max.y - bb.min.y);
    const m = Math.max(w, h);
    const ox = bb.min.x - (m - w) / 2;
    const oy = bb.min.y - (m - h) / 2;
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const uv = geo.attributes.uv as THREE.BufferAttribute;
    if (!uv) return;
    for (let i = 0; i < pos.count; i++) {
        uv.setXY(i, 0.5 + ((pos.getX(i) - ox) / m - 0.5) / fit, 0.5 + ((pos.getY(i) - oy) / m - 0.5) / fit);
    }
    uv.needsUpdate = true;
}

// --- Safety-pin back (landing port) ---

function buildSafetyPin(): THREE.Group {
    const g = new THREE.Group();
    const wireMat = new THREE.MeshStandardMaterial({ color: 0xaeb4c0, metalness: 0.92, roughness: 0.18, name: 'Metal' });
    const plateMat = new THREE.MeshStandardMaterial({ color: 0xcbd1dc, metalness: 0.88, roughness: 0.22, name: 'Metal' });

    const plateGeo = new THREE.BoxGeometry(0.26, 0.14, 0.018);
    const leftPlate = new THREE.Mesh(plateGeo, plateMat);
    leftPlate.position.set(-0.62, 0, 0.01);
    const rightPlate = new THREE.Mesh(plateGeo, plateMat);
    rightPlate.position.set(0.62, 0, 0.01);
    leftPlate.castShadow = true;
    rightPlate.castShadow = true;
    g.add(leftPlate, rightPlate);

    const wireGeo = new THREE.CylinderGeometry(0.02, 0.02, 1.44, 12);
    wireGeo.rotateZ(Math.PI / 2);
    const wire = new THREE.Mesh(wireGeo, wireMat);
    wire.position.set(0.02, 0, 0.045);
    wire.castShadow = true;
    g.add(wire);

    const kink = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.02, 8, 12, Math.PI), wireMat);
    kink.rotation.z = Math.PI;
    kink.position.set(-0.06, -0.015, 0.045);
    g.add(kink);

    const coil = new THREE.Mesh(new THREE.TorusGeometry(0.072, 0.018, 12, 20), wireMat);
    coil.rotation.y = Math.PI / 2;
    coil.position.set(0.74, 0, 0.045);
    coil.castShadow = true;
    g.add(coil);

    const hook = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.02, 8, 14, Math.PI), wireMat);
    hook.rotation.x = Math.PI / 2;
    hook.rotation.z = Math.PI;
    hook.position.set(-0.62, -0.065, 0.04);
    g.add(hook);

    return g;
}

// --- Full pin assembly (landing port). Face takes `color`; sides stay white. ---

export function buildPin(type: string, color = '#FFFFFF'): { group: THREE.Group } {
    const key = pinKeyFor(type);
    const capMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.28, metalness: 0.05, name: 'Cap' });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xcdd3de, roughness: 0.22, metalness: 0.78, name: 'Rim' });
    const backMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.85, metalness: 0.02, name: 'Back' });

    if (key === 'pin_circle') {
        const g = new THREE.Group();

        const backGeo = new THREE.CylinderGeometry(0.94, 0.94, 0.05, 64);
        backGeo.rotateX(Math.PI / 2);
        const back = new THREE.Mesh(backGeo, backMat);
        back.position.z = -0.04;
        g.add(back);

        const midGeo = new THREE.CylinderGeometry(0.985, 0.985, 0.11, 64);
        midGeo.rotateX(Math.PI / 2);
        const mid = new THREE.Mesh(midGeo, rimMat);
        mid.position.z = 0.015;
        mid.castShadow = true;
        g.add(mid);

        const rimGeo = new THREE.TorusGeometry(0.985, 0.045, 14, 64);
        const rimFront = new THREE.Mesh(rimGeo, rimMat);
        rimFront.position.z = 0.068;
        g.add(rimFront);

        const domeR = 1.85;
        const thetaLen = 0.58;
        const domeGeo = new THREE.SphereGeometry(domeR, 48, 24, 0, Math.PI * 2, 0, thetaLen);
        domeGeo.rotateX(Math.PI / 2);
        domeGeo.translate(0, 0, -domeR * Math.cos(thetaLen) + 0.07);
        pinPlanarUVs(domeGeo);
        const dome = new THREE.Mesh(
            domeGeo,
            new THREE.MeshStandardMaterial({ color, roughness: 0.16, metalness: 0.04, name: 'Face' }),
        );
        g.add(dome);

        const inner = new THREE.Mesh(new THREE.CircleGeometry(0.975, 64), capMat);
        inner.position.z = 0.0701;
        g.add(inner);

        const safety = buildSafetyPin();
        safety.position.z = -0.068;
        safety.position.y = 0.02;
        g.add(safety);

        return { group: g };
    }

    const shapeObj = pinShapeFor(key) ?? roundedRectShape(1.7, 1.7, 0.06);
    const geo = new THREE.ExtrudeGeometry(shapeObj, {
        depth: 0.14,
        bevelEnabled: true,
        bevelThickness: 0.025,
        bevelSize: 0.022,
        bevelSegments: 4,
        curveSegments: 24,
    });
    geo.center();
    pinPlanarUVs(geo);
    const faceMat = new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.05, name: 'Face' });
    const mesh = new THREE.Mesh(geo, [faceMat, capMat]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    const safety = buildSafetyPin();
    safety.position.z = -0.14;
    safety.scale.set(0.85, 0.85, 0.85);

    const wrap = new THREE.Group();
    wrap.add(mesh, safety);

    // plain white backing so the cutout shows white, not hollow interior
    const backing = new THREE.Mesh(
        new THREE.ShapeGeometry(shapeObj, 24),
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, name: 'Backing' }),
    );
    backing.position.z = 0.04;
    wrap.add(backing);

    return { group: wrap };
}

// --- Artwork decal hugging the pin face (local pin units, pre-normalize) ---

export const PIN_DOME_R = 1.85;
export const PIN_DOME_THETA = 0.58;
export const PIN_DOME_Z = -PIN_DOME_R * Math.cos(PIN_DOME_THETA) + 0.07;

export function buildPinDecal(type: string, tex: THREE.Texture): THREE.Mesh {
    const key = pinKeyFor(type);
    const mat = new THREE.MeshStandardMaterial({
        map: tex,
        transparent: true,
        roughness: 0.35,
        metalness: 0.05,
        alphaTest: 0.02,
    });
    if (key === 'pin_circle') {
        // spherical cap just above the dome so artwork follows the curve
        const g = new THREE.SphereGeometry(PIN_DOME_R + 0.006, 48, 16, 0, Math.PI * 2, 0, PIN_DOME_THETA);
        g.rotateX(Math.PI / 2);
        g.translate(0, 0, PIN_DOME_Z);
        pinPlanarUVs(g);
        return new THREE.Mesh(g, mat);
    }
    const shapeObj = pinShapeFor(key) ?? roundedRectShape(1.7, 1.7, 0.06);
    const g = new THREE.ShapeGeometry(shapeObj, 24);
    pinPlanarUVs(g);
    const mesh = new THREE.Mesh(g, mat);
    // extruded front cap sits at depth/2 (+bevel crown) — float just above it
    mesh.position.z = 0.1;
    return mesh;
}
