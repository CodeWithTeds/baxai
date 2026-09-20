import * as THREE from 'three';

// Modern, realistic tote/bag builder — box-based with beveled edges,
// fabric-true materials, stitched handles and hardware. Same philosophy as
// vessel-builder: procedural, no GLB dependency, centered but never rescaled
// so relative sizes stay honest.

export interface BagParams {
    width: number;
    height: number;
    depth: number;
    /** How much the bottom bows out when gusseted. 0 = flat. */
    gusset?: number;
    /** Handle shape. */
    handles: 'tote' | 'single' | 'crossbody' | 'drawstring' | 'none';
    handleHeight?: number;
    /** Fabric type — drives roughness/metalness/transmission. */
    fabric: 'canvas' | 'leather' | 'clear' | 'nylon' | 'cotton';
    zip?: boolean;
    /** Mock hardware (zip pull, feet, buckles). */
    hardware?: boolean;
}

export const BAGS: Record<string, BagParams> = {
    tote:           { width: 1.6,  height: 1.35, depth: 0.42, gusset: 0.08, handles: 'tote',      handleHeight: 0.9, fabric: 'cotton' },
    mini_tote:      { width: 1.05, height: 0.95, depth: 0.32, gusset: 0.06, handles: 'tote',      handleHeight: 0.65, fabric: 'cotton' },
    shoulder_bag:   { width: 1.4,  height: 1.1,  depth: 0.35, handles: 'single',  handleHeight: 1.15, fabric: 'leather' },
    crossbody:      { width: 1.0,  height: 0.85, depth: 0.22, handles: 'crossbody', handleHeight: 1.4, fabric: 'nylon', hardware: true },
    drawstring:     { width: 1.25, height: 1.45, depth: 0.38, handles: 'drawstring', fabric: 'cotton' },
    canvas_bag:     { width: 1.55, height: 1.3,  depth: 0.4,  gusset: 0.07, handles: 'tote',      handleHeight: 0.88, fabric: 'canvas' },
    zip_tote:       { width: 1.55, height: 1.3,  depth: 0.4,  handles: 'tote',      handleHeight: 0.85, fabric: 'canvas', zip: true, hardware: true },
    gusseted_tote:  { width: 1.55, height: 1.32, depth: 0.58, gusset: 0.14, handles: 'tote',      handleHeight: 0.9, fabric: 'canvas' },
    flat_tote:      { width: 1.55, height: 1.32, depth: 0.08, handles: 'tote',      handleHeight: 0.9, fabric: 'cotton' },
    book_tote:      { width: 1.45, height: 1.15, depth: 0.34, handles: 'tote',      handleHeight: 0.72, fabric: 'canvas' },
    grocery_tote:   { width: 1.5,  height: 1.4,  depth: 0.55, gusset: 0.12, handles: 'tote',      handleHeight: 0.75, fabric: 'cotton' },
    clear_tote:     { width: 1.55, height: 1.28, depth: 0.42, handles: 'tote',      handleHeight: 0.85, fabric: 'clear',  hardware: true },
    beach_tote:     { width: 1.75, height: 1.15, depth: 0.44, handles: 'tote',      handleHeight: 0.95, fabric: 'cotton' },
    laptop_tote:    { width: 1.6,  height: 1.25, depth: 0.38, handles: 'tote',      handleHeight: 0.82, fabric: 'nylon', zip: true, hardware: true },
    leather_tote:   { width: 1.52, height: 1.28, depth: 0.38, handles: 'tote',      handleHeight: 0.85, fabric: 'leather', hardware: true },
    convertible_tote:{width: 1.5,  height: 1.3,  depth: 0.42, handles: 'crossbody', handleHeight: 1.35, fabric: 'nylon', zip: true, hardware: true },
};

export const BAG_VIEWERS = [
    { value: 'tote', label: 'Tote Bag — 3D' },
    { value: 'mini_tote', label: 'Mini Tote — 3D' },
    { value: 'shoulder_bag', label: 'Shoulder Bag — 3D' },
    { value: 'crossbody', label: 'Crossbody — 3D' },
    { value: 'drawstring', label: 'Drawstring Bag — 3D' },
    { value: 'canvas_bag', label: 'Canvas Bag — 3D' },
    { value: 'zip_tote', label: 'Zip Tote — 3D' },
    { value: 'gusseted_tote', label: 'Gusseted Tote — 3D' },
    { value: 'flat_tote', label: 'Flat Tote — 3D' },
    { value: 'book_tote', label: 'Book Tote — 3D' },
    { value: 'grocery_tote', label: 'Grocery Tote — 3D' },
    { value: 'clear_tote', label: 'Clear Tote — 3D' },
    { value: 'beach_tote', label: 'Beach Tote — 3D' },
    { value: 'laptop_tote', label: 'Laptop Tote — 3D' },
    { value: 'leather_tote', label: 'Leather Tote — 3D' },
    { value: 'convertible_tote', label: 'Convertible Tote — 3D' },
];

export function isBagType(v: string): boolean { return v in BAGS; }

function fabricMat(fabric: BagParams['fabric'], color: string): THREE.Material {
    const c = new THREE.Color(color);
    if (fabric === 'clear') {
        return new THREE.MeshPhysicalMaterial({
            color: 0xffffff, roughness: 0.12, metalness: 0,
            transmission: 0.94, thickness: 0.06, ior: 1.4,
            transparent: true, opacity: 0.52, side: THREE.DoubleSide,
        });
    }
    if (fabric === 'leather') {
        // warm, slightly waxy leather — keep the tint visible
        return new THREE.MeshStandardMaterial({
            color: c, roughness: 0.38, metalness: 0.02,
            bumpScale: 0.015,
        });
    }
    if (fabric === 'nylon') {
        return new THREE.MeshStandardMaterial({ color: c, roughness: 0.55, metalness: 0.08 });
    }
    if (fabric === 'canvas') {
        return new THREE.MeshStandardMaterial({ color: c, roughness: 0.92, metalness: 0 });
    }
    // cotton
    return new THREE.MeshStandardMaterial({ color: c, roughness: 0.88, metalness: 0 });
}

function handleMat(): THREE.Material {
    return new THREE.MeshStandardMaterial({ color: 0x1a1c1e, roughness: 0.6, metalness: 0.05 });
}

function metalMat(): THREE.Material {
    return new THREE.MeshStandardMaterial({ color: 0x9aa0b0, roughness: 0.28, metalness: 0.85 });
}

export function buildBag(type: string, color = '#FFFFFF'): { group: THREE.Group; labelW: number; labelH: number } {
    const p = BAGS[type] ?? BAGS.tote;
    const group = new THREE.Group();

    // Drawstring — soft puch like the reference photo: cream fabric, cinched ruffled top
    if (type === 'drawstring') {
        const w = p.width, h = p.height, d = p.depth;
        const pouchColor = color === '#FFFFFF' ? '#FFF8DC' : color;
        const mat = new THREE.MeshStandardMaterial({ color: pouchColor, roughness: 0.92, metalness: 0, side: THREE.DoubleSide });
        // high-res box so we can gather the top like real fabric
        const geo = new THREE.BoxGeometry(w, h, d, 14, 14, 6);
        const posAttr = geo.attributes.position as THREE.BufferAttribute;
        const v = new THREE.Vector3();
        for (let i = 0; i < posAttr.count; i++) {
            v.fromBufferAttribute(posAttr, i);
            const ny = (v.y + h / 2) / h; // 0 bottom → 1 top
            if (ny > 0.82) {
                // gather: pinch width/depth toward center, add ruffle waves
                const gather = 0.78 + Math.sin(v.x * 18) * 0.045 + Math.cos(v.z * 18) * 0.035;
                v.x *= gather;
                v.z *= 0.82 + Math.sin(v.x * 12) * 0.02;
                v.y += Math.sin(v.x * 22) * 0.03 + Math.cos(v.z * 20) * 0.02;
            } else if (ny > 0.55) {
                // gentle belly bulge
                const bulge = Math.sin(ny * Math.PI) * 0.04;
                v.x *= 1 + bulge * 0.55;
                v.z *= 1 + bulge * 0.55;
                v.y += bulge * 0.15;
            } else {
                // subtle bottom round
                const bottom = Math.pow(1 - ny, 2) * 0.02;
                v.x *= 1 - bottom;
                v.z *= 1 - bottom;
            }
            // soft wrinkles across the body
            v.x += Math.sin(v.y * 9 + v.z * 4) * 0.008;
            v.z += Math.cos(v.y * 8 + v.x * 3) * 0.007;
            posAttr.setXYZ(i, v.x, v.y, v.z);
        }
        geo.computeVertexNormals();
        // make top open: punch a rectangular hole by making the top face invisible — we push its vertices down
        // instead we rely on the gathered shape reading as closed sack; keep it closed for a soft pouch
        const pouch = new THREE.Mesh(geo, mat);
        pouch.castShadow = true;
        pouch.receiveShadow = true;
        group.add(pouch);

        // drawstring channel — a slightly darker ring where the cord runs
        const channel = new THREE.Mesh(
            new THREE.TorusGeometry(w * 0.44, 0.03, 8, 28),
            new THREE.MeshStandardMaterial({ color: pouchColor, roughness: 0.95 }),
        );
        channel.rotation.x = Math.PI / 2;
        channel.position.y = h / 2 - 0.09;
        channel.scale.set(1, d / w * 1.22, 1);
        group.add(channel);

        // cords — cream with knots, draping naturally like the photo
        const cordMat = new THREE.MeshStandardMaterial({ color: 0xe8dcc3, roughness: 0.85 });
        for (const side of [-1, 1]) {
            const curve = new THREE.CatmullRomCurve3([
                new THREE.Vector3(side * w * 0.46, h / 2 - 0.09, 0),
                new THREE.Vector3(side * (w * 0.62), h / 2 - 0.04, side * 0.06),
                new THREE.Vector3(side * (w * 0.58), h / 2 - 0.28, side * 0.14),
                new THREE.Vector3(side * (w * 0.52), -h * 0.08, side * 0.10),
            ]);
            const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.022, 8, false), cordMat);
            group.add(tube);
            const knot = new THREE.Mesh(new THREE.SphereGeometry(0.038, 10, 8), cordMat);
            knot.position.set(side * (w * 0.52), -h * 0.08, side * 0.10);
            knot.scale.set(1.4, 1, 1);
            group.add(knot);
        }

        const labelW = w * 0.58;
        const labelH = h * 0.32;
        return { group, labelW, labelH };
    }

    const bodyMat = fabricMat(p.fabric, color);
    const isFlat = p.depth < 0.12;

    // Open-top body — 5 walls + bottom so you can see inside like a real tote.
    const w = p.width, h = p.height, d = isFlat ? 0.08 : p.depth;
    const t = 0.03; // wall thickness
    const innerMat = new THREE.MeshStandardMaterial({ color: 0xf3f4f6, roughness: 0.95, side: THREE.DoubleSide });

    const addWall = (geo: THREE.BoxGeometry, mat: THREE.Material, pos: THREE.Vector3) => {
        const m = new THREE.Mesh(geo, mat);
        m.position.copy(pos);
        m.castShadow = true;
        m.receiveShadow = true;
        group.add(m);
    };

    // bottom
    addWall(new THREE.BoxGeometry(w, t, d), bodyMat, new THREE.Vector3(0, -h / 2 + t / 2, 0));
    // front
    addWall(new THREE.BoxGeometry(w, h, t), bodyMat, new THREE.Vector3(0, 0, d / 2 - t / 2));
    // back
    addWall(new THREE.BoxGeometry(w, h, t), bodyMat, new THREE.Vector3(0, 0, -d / 2 + t / 2));
    // left
    addWall(new THREE.BoxGeometry(t, h, d - 2 * t), bodyMat, new THREE.Vector3(-w / 2 + t / 2, 0, 0));
    // right
    addWall(new THREE.BoxGeometry(t, h, d - 2 * t), bodyMat, new THREE.Vector3(w / 2 - t / 2, 0, 0));

    // Inner lining floor so bottom reads as fabric, not hollow void
    if (!isFlat && p.fabric !== 'clear') {
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.06, d - 0.06), innerMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.set(0, -h / 2 + t + 0.005, 0);
        group.add(floor);
    }

    // Bottom gusset crease — a thin line where the bottom folds
    if ((p.gusset ?? 0) > 0.05 && !isFlat) {
        const crease = new THREE.Mesh(
            new THREE.BoxGeometry(w - 0.08, 0.02, d + 0.02),
            new THREE.MeshStandardMaterial({ color: 0x000000, transparent: true, opacity: 0.06 }),
        );
        crease.position.y = -h / 2 + 0.04;
        group.add(crease);
    }

    // Handles
    const hMat = p.fabric === 'leather' ? new THREE.MeshStandardMaterial({ color: 0x5a3a22, roughness: 0.45 }) : handleMat();
    const mMat = metalMat();

    const addToteHandles = () => {
        const hh = p.handleHeight ?? 0.85;
        const tube = 0.045;
        for (const side of [-1, 1]) {
            const x = side * w * 0.28;
            // U-shaped handles over the top, front → back — like the mugs' inset handle trick,
            // ends penetrate the top edge so there is no visible gap.
            const curve = new THREE.CatmullRomCurve3([
                new THREE.Vector3(x, h / 2 - 0.04, d / 2),
                new THREE.Vector3(x, h / 2 + hh * 0.5, d / 2 * 0.55),
                new THREE.Vector3(x, h / 2 + hh * 0.5, -d / 2 * 0.55),
                new THREE.Vector3(x, h / 2 - 0.04, -d / 2),
            ]);
            const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, tube, 10, false), hMat);
            mesh.castShadow = true;
            group.add(mesh);
            // stitching plates — slightly inset into the body to hide the seam, front + back
            const plateGeo = new THREE.BoxGeometry(0.14, 0.09, 0.015);
            const plateMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.6 });
            for (const z of [d / 2, -d / 2]) {
                const plate = new THREE.Mesh(plateGeo, plateMat);
                plate.position.set(x, h / 2 - 0.02, z * 0.92);
                plate.rotation.y = z < 0 ? Math.PI : 0;
                group.add(plate);
                const riv = new THREE.Mesh(new THREE.CircleGeometry(0.028, 12), mMat);
                riv.position.set(x, h / 2 - 0.02, z + (z > 0 ? 0.016 : -0.016));
                riv.rotation.y = z < 0 ? Math.PI : 0;
                group.add(riv);
            }
        }
    };

    const addSingleHandle = () => {
        const hh = p.handleHeight ?? 1.15;
        const tube = 0.042;
        const curve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(-w * 0.32, h / 2 - 0.02, 0),
            new THREE.Vector3(-w * 0.18, h / 2 + hh * 0.5, 0),
            new THREE.Vector3(w * 0.18, h / 2 + hh * 0.5, 0),
            new THREE.Vector3(w * 0.32, h / 2 - 0.02, 0),
        ]);
        const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, tube, 10, false), hMat);
        group.add(mesh);
    };

    const addCrossbodyStrap = () => {
        const hh = p.handleHeight ?? 1.35;
        const tube = 0.03;
        const curve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(-w / 2 - 0.02, h * 0.22, 0),
            new THREE.Vector3(-w * 0.25, h / 2 + hh * 0.45, 0),
            new THREE.Vector3(w * 0.25, h / 2 + hh * 0.45, 0),
            new THREE.Vector3(w / 2 + 0.02, h * 0.22, 0),
        ]);
        const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 28, tube, 10, false), hMat);
        group.add(mesh);
        // slider buckle
        const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.06, 0.02), mMat);
        buckle.position.set(0, h / 2 + hh * 0.22, 0);
        group.add(buckle);
    };

    const addDrawstring = () => {
        const cord = new THREE.Mesh(new THREE.TorusGeometry(w * 0.42, 0.022, 8, 32), hMat);
        cord.rotation.x = Math.PI / 2;
        cord.position.y = h / 2 - 0.02;
        cord.scale.set(1, 1.35, 1);
        group.add(cord);
        // hanging tails
        for (const s of [-1, 1]) {
            const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.55, 10), hMat);
            tail.position.set(s * 0.12, h / 2 - 0.28, d / 2 + 0.03);
            tail.rotation.z = s * 0.18;
            group.add(tail);
            const aglet = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.08, 10), mMat);
            aglet.position.set(s * 0.16, h / 2 - 0.56, d / 2 + 0.04);
            group.add(aglet);
        }
    };

    if (p.handles === 'tote') addToteHandles();
    else if (p.handles === 'single') addSingleHandle();
    else if (p.handles === 'crossbody') addCrossbodyStrap();
    else if (p.handles === 'drawstring') addDrawstring();

    // Zipper tape
    if (p.zip) {
        const zipTape = new THREE.Mesh(new THREE.BoxGeometry(w - 0.06, 0.04, d + 0.02), new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.5 }));
        zipTape.position.y = h / 2 - 0.02;
        group.add(zipTape);
        const pull = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.06, 0.015), mMat);
        pull.position.set(w * 0.18, h / 2 + 0.02, d / 2 + 0.025);
        group.add(pull);
    }

    // Hardware feet for structured totes
    if (p.hardware && !isFlat && p.fabric !== 'clear') {
        for (const x of [-w * 0.35, w * 0.35]) {
            const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.02, 12), mMat);
            foot.position.set(x, -h / 2 - 0.01, 0);
            group.add(foot);
        }
    }

    // Print area — centered on front face
    const labelW = Math.min(w * 0.62, 0.95);
    const labelH = Math.min(h * 0.42, 0.55);

    return { group, labelW, labelH };
}
