import * as THREE from 'three';

// Procedural drinkware builder — same technique as mobile/app/app/mug-3d.tsx:
// lathe-turned outer body + flipped inner wall + bottom cap + rim torus,
// optional C-handle, lid (travel mug) and foot ring. Units are scene-relative;
// the preview centers (but never rescales) vessels so relative sizes stay true.

export interface VesselParams {
    height: number;
    topR: number;
    bottomR: number;
    thickness: number;
    /** Mid-body outward bow. */
    bulge: number;
    handle?: boolean;
    /** 0.7 small (espresso/teacup), 1 standard, 1.25 big (stein/tankard). */
    handleScale?: number;
    lid?: boolean;
    glass?: boolean;
    steel?: boolean;
    /** Inner floor height — thick glass bases sit higher. */
    floor?: number;
    footRing?: boolean;
}

export interface VesselLabel {
    rTop: number;
    rBottom: number;
    y: number;
    height: number;
}

const VESSELS: Record<string, VesselParams> = {
    // Thick classic mug with a handle — coffee/tea.
    mug: { height: 1.9, topR: 1.02, bottomR: 0.92, thickness: 0.08, bulge: 0.03, handle: true },
    // Transparent drinking cup — no handle, heavy base.
    glass_cup: { height: 1.7, topR: 0.95, bottomR: 0.8, thickness: 0.07, bulge: 0.01, glass: true, floor: 0.32 },
    // Tall cylindrical tumbler for cold drinks — brushed steel.
    tumbler: { height: 2.4, topR: 0.85, bottomR: 0.7, thickness: 0.07, bulge: 0.015, steel: true },
    // Insulated travel mug with a lid — no handle.
    travel_mug: { height: 2.3, topR: 0.88, bottomR: 0.68, thickness: 0.08, bulge: 0.02, steel: true, lid: true },
    // Smaller than a mug, handled.
    coffee_cup: { height: 1.4, topR: 0.85, bottomR: 0.7, thickness: 0.07, bulge: 0.03, handle: true, handleScale: 0.8 },
    // Small wide tea cup with a delicate handle.
    teacup: { height: 1.05, topR: 1.0, bottomR: 0.62, thickness: 0.06, bulge: 0.05, handle: true, handleScale: 0.7 },
    // Very small demitasse with a tiny handle.
    espresso: { height: 0.8, topR: 0.55, bottomR: 0.42, thickness: 0.07, bulge: 0.03, handle: true, handleScale: 0.7 },
    // Wide cup for lattes.
    latte: { height: 1.15, topR: 1.15, bottomR: 0.7, thickness: 0.06, bulge: 0.06, handle: true, handleScale: 0.8 },
    // Rounded wide bowl for cappuccino.
    cappuccino: { height: 1.2, topR: 1.05, bottomR: 0.62, thickness: 0.07, bulge: 0.1, handle: true },
    // Large beer stein with a big handle and foot ring.
    stein: { height: 2.2, topR: 1.1, bottomR: 1.0, thickness: 0.1, bulge: 0.02, handle: true, handleScale: 1.25, footRing: true },
    // Traditional straight-sided tankard with a big handle.
    tankard: { height: 2.0, topR: 0.95, bottomR: 0.88, thickness: 0.1, bulge: 0.0, handle: true, handleScale: 1.25, footRing: true },
};

export const VESSEL_VIEWERS = [
    { value: 'mug', label: 'Mug — 3D' },
    { value: 'glass_cup', label: 'Glass Cup — 3D' },
    { value: 'tumbler', label: 'Tumbler — 3D' },
    { value: 'travel_mug', label: 'Travel Mug — 3D' },
    { value: 'coffee_cup', label: 'Coffee Cup — 3D' },
    { value: 'teacup', label: 'Teacup — 3D' },
    { value: 'espresso', label: 'Espresso Cup — 3D' },
    { value: 'latte', label: 'Latte Cup — 3D' },
    { value: 'cappuccino', label: 'Cappuccino Cup — 3D' },
    { value: 'stein', label: 'Beer Stein — 3D' },
    { value: 'tankard', label: 'Tankard — 3D' },
];

export function isVesselType(viewerType: string): boolean {
    return viewerType in VESSELS;
}

function radiusAt(p: VesselParams, t: number): number {
    return THREE.MathUtils.lerp(p.bottomR, p.topR, t) + Math.sin(t * Math.PI) * p.bulge;
}

export function buildVessel(type: string, color = '#FFFFFF'): { group: THREE.Group; label: VesselLabel } {
    const p = VESSELS[type] ?? VESSELS.mug;
    const h = p.height;
    const floor = p.floor ?? p.thickness;
    const group = new THREE.Group();

    const ceramicMat = new THREE.MeshStandardMaterial({ color, roughness: 0.28, metalness: 0.02 });
    const innerMat = new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.32, side: THREE.DoubleSide });
    const steelMat = new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.85 });
    const glassMat = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        roughness: 0.05,
        metalness: 0,
        transmission: 0.92,
        thickness: 0.4,
        ior: 1.5,
    });
    const plasticMat = new THREE.MeshStandardMaterial({ color: 0x374151, roughness: 0.5, metalness: 0.1 });
    const bodyMat = p.glass ? glassMat : p.steel ? steelMat : ceramicMat;

    // 1) Outer body — lathe for taper + bulge.
    const bodyProfile: THREE.Vector2[] = [];
    for (let i = 0; i <= 28; i++) {
        const t = i / 28;
        bodyProfile.push(new THREE.Vector2(radiusAt(p, t), -h / 2 + t * h));
    }
    group.add(new THREE.Mesh(new THREE.LatheGeometry(bodyProfile, 56), bodyMat));

    // 2) Inner wall (hollow look) — flipped normals face inward.
    const innerProfile: THREE.Vector2[] = [];
    for (let i = 0; i <= 28; i++) {
        const t = i / 28;
        innerProfile.push(
            new THREE.Vector2(radiusAt(p, t) - p.thickness, -h / 2 + floor + t * (h - floor + 0.04 - p.thickness)),
        );
    }
    const innerGeo = new THREE.LatheGeometry(innerProfile, 56);
    innerGeo.scale(-1, 1, 1);
    group.add(new THREE.Mesh(innerGeo, p.glass ? glassMat : innerMat));

    // 3) Inner floor.
    const floorMesh = new THREE.Mesh(new THREE.CircleGeometry(p.bottomR - 0.02, 48), p.glass ? glassMat : ceramicMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = -h / 2 + floor + 0.005;
    group.add(floorMesh);

    // 4) Rim torus for wall-thickness highlight.
    const rim = new THREE.Mesh(new THREE.TorusGeometry(p.topR - p.thickness / 2, p.thickness / 2, 12, 56), bodyMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = h / 2;
    group.add(rim);

    // 5) C-handle — torus arc inset into the wall to hide the seam.
    if (p.handle) {
        const s = p.handleScale ?? 1;
        const handleR = h * 0.26 * s;
        const tube = Math.max(p.thickness * 1.4, 0.09) * s;
        const attachX = radiusAt(p, 0.5);
        const handleMesh = new THREE.Mesh(new THREE.TorusGeometry(handleR, tube, 18, 40, Math.PI), bodyMat);
        handleMesh.position.set(attachX - tube * 0.5, 0, 0);
        handleMesh.rotation.z = -Math.PI / 2;
        group.add(handleMesh);
        const capGeo = new THREE.SphereGeometry(tube * 0.98, 16, 12);
        const capTop = new THREE.Mesh(capGeo, bodyMat);
        capTop.position.set(attachX + tube * 0.1, handleR, 0);
        capTop.scale.set(1, 0.9, 0.9);
        group.add(capTop);
        const capBot = new THREE.Mesh(capGeo, bodyMat);
        capBot.position.set(attachX + tube * 0.1, -handleR, 0);
        capBot.scale.set(1, 0.9, 0.9);
        group.add(capBot);
    }

    // 6) Travel-mug lid.
    if (p.lid) {
        const lidBody = new THREE.Mesh(new THREE.CylinderGeometry(p.topR + 0.07, p.topR + 0.03, 0.24, 48), plasticMat);
        lidBody.position.y = h / 2 + 0.1;
        group.add(lidBody);
        const lidTop = new THREE.Mesh(new THREE.CircleGeometry(p.topR + 0.07, 48), plasticMat);
        lidTop.rotation.x = -Math.PI / 2;
        lidTop.position.y = h / 2 + 0.22;
        group.add(lidTop);
        const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.14, 24), plasticMat);
        spout.position.set(p.topR * 0.45, h / 2 + 0.27, 0);
        group.add(spout);
    }

    // 7) Foot ring for stein / tankard.
    if (p.footRing) {
        const foot = new THREE.Mesh(new THREE.TorusGeometry(p.bottomR - 0.04, 0.07, 12, 48), bodyMat);
        foot.rotation.x = Math.PI / 2;
        foot.position.y = -h / 2 + 0.05;
        group.add(foot);
    }

    // Print band for the reference-artwork decal (vessel-local coords).
    const t0 = 0.35;
    const t1 = 0.7;
    const label: VesselLabel = {
        rTop: radiusAt(p, t1) + 0.02,
        rBottom: radiusAt(p, t0) + 0.02,
        y: (t0 + t1) / 2 * h - h / 2,
        height: (t1 - t0) * h,
    };

    return { group, label };
}
