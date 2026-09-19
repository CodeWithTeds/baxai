<script lang="ts">
    import { onDestroy, onMount } from 'svelte';
    import * as THREE from 'three';
    import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
    import type { PinShape } from './catalog';

    let {
        product = 'mug',
        glaze = '#ffffff',
        pinShape = 'round',
        autoRotate = true,
    }: {
        product?: 'mug' | 'pin';
        glaze?: string;
        pinShape?: PinShape;
        autoRotate?: boolean;
    } = $props();

    let host: HTMLDivElement;
    let status: 'loading' | 'ready' | 'failed' = $state('loading');

    let raf = 0;
    let ro: ResizeObserver | null = null;
    let decayTimer: ReturnType<typeof setTimeout> | null = null;
    let ceramic: THREE.MeshStandardMaterial | null = null;
    let pinHolder: THREE.Group | null = null;
    let mugGroup: THREE.Group | null = null;

    const productRef = { current: 'mug' as 'mug' | 'pin' };

    const autoRotateRef = { current: true };
    const glazeRef = { current: '#ffffff' };
    const shapeRef: { current: PinShape } = { current: 'round' };

    $effect(() => {
        autoRotateRef.current = autoRotate;
    });

    $effect(() => {
        productRef.current = product;

        const mg: THREE.Group | null = mugGroup;

        if (mg) {
            mg.visible = product === 'mug';
        }

        const ph: THREE.Group | null = pinHolder;

        if (ph) {
            ph.visible = product === 'pin';
        }
    });

    $effect(() => {
        glazeRef.current = glaze;
        ceramic?.color.set(glaze);
    });

    $effect(() => {
        shapeRef.current = pinShape;
        rebuildPin();
    });

    function disposeGroup(group: THREE.Group) {
        group.traverse((child) => {
            const mesh = child as THREE.Mesh;
            if (mesh.geometry) {
                mesh.geometry.dispose();
            }

            const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;

            if (Array.isArray(mat)) {
                mat.forEach((m) => m.dispose());
            } else {
                mat?.dispose();
            }
        });
    }

    /* ── Mascot artwork: the real owl PNG on mug + pin ── */
    // Margins are baked into the textures as transparency, so every mesh
    // maps plain 0..1 UVs — never sample outside the image (that smears
    // edge pixels into streaks).
    let mascotTex: THREE.CanvasTexture | null = null;
    let mascotPinTex: THREE.CanvasTexture | null = null;
    let mascotRequested = false;
    const mascotWaiters: Array<() => void> = [];

    function paddedTexture(img: HTMLImageElement, canvasAspect: number, artHeight: number): THREE.CanvasTexture {
        const ch = 1000;
        const cw = Math.round(ch * canvasAspect);
        const scale = (ch * artHeight) / img.naturalHeight;
        const dw = Math.round(img.naturalWidth * scale);
        const dh = Math.round(img.naturalHeight * scale);
        const cv = document.createElement('canvas');
        cv.width = cw;
        cv.height = ch;
        const ctx = cv.getContext('2d');

        if (ctx) {
            ctx.drawImage(img, Math.round((cw - dw) / 2), Math.round((ch - dh) / 2), dw, dh);
        }

        const t = new THREE.CanvasTexture(cv);
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 8;

        return t;
    }

    function requestMascotTextures() {
        if (mascotRequested) {
            return;
        }

        mascotRequested = true;

        // raw PNG keeps its transparency — no painted background anywhere
        new THREE.TextureLoader().load(
            '/images/owl-mascot-v2.png?v=2',
            (t) => {
                const img = t.image as HTMLImageElement;
                // mug patch is landscape 1.44 x 0.98
                mascotTex = paddedTexture(img, 1.44 / 0.98, 0.66);
                // pin faces are mapped as squares
                mascotPinTex = paddedTexture(img, 1, 0.62);
                t.dispose();
                mascotWaiters.splice(0).forEach((fn) => fn());
            },
            undefined,
            () => {
                /* artwork failed — products stay plain */
            },
        );
    }

    function onMascotReady(fn: () => void) {
        if (mascotTex && mascotPinTex) {
            fn();
        } else {
            mascotWaiters.push(fn);
        }
    }

    /** Remap UVs so the full portrait artwork fits a region undistorted.
     *  fit < 1 shrinks the artwork (clamped edges = backing color). */
    function planarFitUVs(geo: THREE.BufferGeometry, fit = 1) {
        geo.computeBoundingBox();
        const bb = geo.boundingBox;

        if (!bb) {
            return;
        }

        const w = Math.max(1e-6, bb.max.x - bb.min.x);
        const h = Math.max(1e-6, bb.max.y - bb.min.y);
        const m = Math.max(w, h);
        const ox = bb.min.x - (m - w) / 2;
        const oy = bb.min.y - (m - h) / 2;
        const pos = geo.attributes.position as THREE.BufferAttribute;
        const uv = geo.attributes.uv as THREE.BufferAttribute;

        for (let i = 0; i < pos.count; i++) {
            uv.setXY(
                i,
                0.5 + ((pos.getX(i) - ox) / m - 0.5) / fit,
                0.5 + ((pos.getY(i) - oy) / m - 0.5) / fit,
            );
        }

        uv.needsUpdate = true;
    }

    /* ── Mascot sticker: owl decal hugging the mug ── */
    function makeMascotSticker(): THREE.Mesh {
        const mat = new THREE.MeshStandardMaterial({
            transparent: true,
            alphaTest: 0.08,
            roughness: 0.35,
            metalness: 0,
            polygonOffset: true,
            polygonOffsetFactor: -2,
        });

        // curved patch facing +z, riding just above the ceramic.
        // artwork margins are baked into the texture: plain 0..1 UVs.
        const geo = new THREE.CylinderGeometry(1.035, 0.985, 0.98, 32, 1, true, -0.72, 1.44);
        const sticker = new THREE.Mesh(geo, mat);
        sticker.position.y = 0.02;
        sticker.visible = false;

        onMascotReady(() => {
            mat.map = mascotTex;
            mat.needsUpdate = true;
            sticker.visible = true;
        });

        return sticker;
    }

    /* ── Mug builders (mirrors mobile/app/app/mug-3d.tsx) ── */
    function buildMug(): { group: THREE.Group; ceramicMat: THREE.MeshStandardMaterial } {
        const group = new THREE.Group();
        group.scale.set(0.68, 0.68, 0.68);

        const ceramicMat = new THREE.MeshStandardMaterial({
            color: glazeRef.current,
            roughness: 0.28,
            metalness: 0.02,
        });

        const height = 1.9;
        const topR = 1.02;
        const bottomR = 0.92;
        const thickness = 0.08;

        const bodyProfile: THREE.Vector2[] = [];

        for (let i = 0; i <= 24; i++) {
            const t = i / 24;
            const y = -height / 2 + t * height;
            const r = THREE.MathUtils.lerp(bottomR, topR, t) + Math.sin(t * Math.PI) * 0.03;
            bodyProfile.push(new THREE.Vector2(r, y));
        }

        const outerGeo = new THREE.LatheGeometry(bodyProfile, 48);
        // hide the lathe UV seam at the back of the mug
        outerGeo.rotateY(Math.PI);
        const outer = new THREE.Mesh(outerGeo, ceramicMat);
        outer.castShadow = true;
        outer.receiveShadow = true;
        group.add(outer);

        const innerProfile: THREE.Vector2[] = [];

        for (let i = 0; i <= 24; i++) {
            const t = i / 24;
            const y = -height / 2 + thickness + t * (height - thickness * 2 + 0.12);
            const r = THREE.MathUtils.lerp(bottomR - thickness, topR - thickness, t) + Math.sin(t * Math.PI) * 0.02;
            innerProfile.push(new THREE.Vector2(r, y));
        }

        const innerGeo = new THREE.LatheGeometry(innerProfile, 48);
        innerGeo.scale(-1, 1, 1);
        const inner = new THREE.Mesh(
            innerGeo,
            new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.32, side: THREE.DoubleSide }),
        );
        inner.receiveShadow = true;
        group.add(inner);

        const bottom = new THREE.Mesh(new THREE.CircleGeometry(bottomR - 0.02, 48), ceramicMat);
        bottom.rotation.x = -Math.PI / 2;
        bottom.position.y = -height / 2 + 0.01;
        bottom.receiveShadow = true;
        group.add(bottom);

        const rim = new THREE.Mesh(new THREE.TorusGeometry(topR - thickness / 2, thickness / 2, 12, 48), ceramicMat);
        rim.rotation.x = Math.PI / 2;
        rim.position.y = height / 2;
        group.add(rim);

        const handle = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.14, 18, 36, Math.PI), ceramicMat);
        handle.position.set(topR - 0.07, 0, 0);
        handle.rotation.z = -Math.PI / 2;
        handle.castShadow = true;
        handle.receiveShadow = true;
        group.add(handle);

        const capGeo = new THREE.SphereGeometry(0.14 * 0.98, 16, 12);

        const capTop = new THREE.Mesh(capGeo, ceramicMat);
        capTop.position.set(topR - 0.02, 0.5, 0);
        capTop.scale.set(1, 0.9, 0.9);
        group.add(capTop);

        const capBot = new THREE.Mesh(capGeo, ceramicMat);
        capBot.position.set(topR - 0.02, -0.5, 0);
        capBot.scale.set(1, 0.9, 0.9);
        group.add(capBot);

        group.add(makeMascotSticker());

        return { group, ceramicMat };
    }

    /* ── Pin builders (mirrors mobile/components/Pin3DViewer.tsx) ── */
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

            if (i === 0) {
                s.moveTo(x, y);
            } else {
                s.lineTo(x, y);
            }
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

    function shieldShape(w: number, h: number): THREE.Shape {
        const s = new THREE.Shape();
        s.moveTo(-w / 2, h * 0.35);
        s.lineTo(-w / 2, -h * 0.15);
        s.quadraticCurveTo(-w * 0.05, -h * 0.55, 0, -h * 0.5);
        s.quadraticCurveTo(w * 0.05, -h * 0.55, w / 2, -h * 0.15);
        s.lineTo(w / 2, h * 0.35);
        s.quadraticCurveTo(w / 2, h * 0.5, 0, h * 0.5);
        s.quadraticCurveTo(-w / 2, h * 0.5, -w / 2, h * 0.35);

        return s;
    }

    function pinShapeFor(shape: PinShape): THREE.Shape | null {
        if (shape === 'square') {
            return roundedRectShape(1.7, 1.7, 0.06);
        } else if (shape === 'rounded') {
            return roundedRectShape(1.7, 1.7, 0.28);
        } else if (shape === 'star') {
            return starShape(0.95, 0.48, 5);
        } else if (shape === 'heart') {
            return heartShape(0.85);
        } else if (shape === 'shield') {
            return shieldShape(1.55, 1.75);
        }

        return null;
    }

    function buildPinGeometry(shape: PinShape): THREE.BufferGeometry {
        if (shape === 'round') {
            const geo = new THREE.CylinderGeometry(0.98, 0.98, 0.14, 64);
            geo.rotateX(Math.PI / 2);

            return geo;
        }

        const extrude = {
            depth: 0.14,
            bevelEnabled: true,
            bevelThickness: 0.025,
            bevelSize: 0.022,
            bevelSegments: 4,
            curveSegments: 24,
        };

        const shapeObj = pinShapeFor(shape);

        if (shapeObj) {
            const g = new THREE.ExtrudeGeometry(shapeObj, extrude);
            g.center();

            return g;
        }

        return new THREE.CylinderGeometry(0.9, 0.9, 0.14, 32);
    }

    function buildSafetyPin(): THREE.Group {
        const g = new THREE.Group();
        const wireMat = new THREE.MeshStandardMaterial({ color: 0xaeb4c0, metalness: 0.92, roughness: 0.18 });
        const plateMat = new THREE.MeshStandardMaterial({ color: 0xcbd1dc, metalness: 0.88, roughness: 0.22 });

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

    function buildPinMesh(shape: PinShape): THREE.Group {
        const capMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.28, metalness: 0.05 });
        const rimMat = new THREE.MeshStandardMaterial({ color: 0xcdd3de, roughness: 0.22, metalness: 0.78 });
        const backMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.85, metalness: 0.02 });

        if (shape === 'round') {
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
            planarFitUVs(domeGeo);
            const domeMat = new THREE.MeshStandardMaterial({
                color: 0xffffff,
                roughness: 0.16,
                metalness: 0.04,
                alphaTest: 0.5,
            });
            onMascotReady(() => {
                domeMat.map = mascotPinTex;
                domeMat.needsUpdate = true;
            });
            g.add(new THREE.Mesh(domeGeo, domeMat));

            const inner = new THREE.Mesh(new THREE.CircleGeometry(0.975, 64), capMat);
            inner.position.z = 0.0701;
            g.add(inner);

            const safety = buildSafetyPin();
            safety.position.z = -0.068;
            safety.position.y = 0.02;
            g.add(safety);

            return g;
        }

        const geo = buildPinGeometry(shape);
        planarFitUVs(geo);
        const faceMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.3,
            metalness: 0.05,
            alphaTest: 0.5,
        });
        onMascotReady(() => {
            faceMat.map = mascotPinTex;
            faceMat.needsUpdate = true;
        });
        const mesh = new THREE.Mesh(geo, [faceMat, capMat]);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        const safety = buildSafetyPin();
        safety.position.z = -0.14;
        safety.scale.set(0.85, 0.85, 0.85);
        const wrap = new THREE.Group();
        wrap.add(mesh, safety);

        // plain white backing so the cutout shows white, not hollow interior
        const backingShape = pinShapeFor(shape);

        if (backingShape) {
            const backing = new THREE.Mesh(
                new THREE.ShapeGeometry(backingShape, 24),
                new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 }),
            );
            backing.position.z = 0.04;
            wrap.add(backing);
        }

        return wrap;
    }

    function rebuildPin() {
        if (!pinHolder) {
            return;
        }

        while (pinHolder.children.length > 0) {
            const c = pinHolder.children[0];
            pinHolder.remove(c);
            disposeGroup(c as THREE.Group);
        }

        pinHolder.add(buildPinMesh(shapeRef.current));
    }

    onMount(() => {
        let cancelled = false;

        (async () => {
            try {
                if (!host || !document.createElement('canvas').getContext('webgl2')) {
                    throw new Error('WebGL2 unavailable');
                }

                if (cancelled || !host) {
                    return;
                }

                requestMascotTextures();

                const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
                renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
                renderer.setClearColor(0xf5f5f7);
                renderer.shadowMap.enabled = true;
                renderer.shadowMap.type = THREE.PCFShadowMap;
                renderer.domElement.style.display = 'block';
                host.appendChild(renderer.domElement);

                const scene = new THREE.Scene();
                scene.background = new THREE.Color(0xf5f5f7);
                scene.fog = new THREE.Fog(0xf5f5f7, 8, 16);

                const pmrem = new THREE.PMREMGenerator(renderer);
                scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
                scene.environmentIntensity = 0.5;
                pmrem.dispose();

                const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
                camera.position.set(0, 0.7, 3.9);
                camera.lookAt(0, 0.08, 0);

                scene.add(new THREE.AmbientLight(0xffffff, 0.85));
                const dir = new THREE.DirectionalLight(0xffffff, 1.15);
                dir.position.set(2.5, 4, 2);
                dir.castShadow = true;
                dir.shadow.mapSize.set(1024, 1024);
                dir.shadow.camera.left = -4;
                dir.shadow.camera.right = 4;
                dir.shadow.camera.top = 4;
                dir.shadow.camera.bottom = -4;
                scene.add(dir);

                const fill = new THREE.DirectionalLight(0xdbeafe, 0.5);
                fill.position.set(-2.5, 2, -2);
                scene.add(fill);

                const point = new THREE.PointLight(0xffffff, 0.6, 12);
                point.position.set(0, 3, 2.5);
                scene.add(point);

                // ── Lineup: mug left, pin right ──
                const lineup = new THREE.Group();

                const mug = buildMug();
                ceramic = mug.ceramicMat;
                mugGroup = mug.group;
                mug.group.position.set(-0.16, 0.12, 0);
                mug.group.rotation.y = 0.5;
                mug.group.visible = productRef.current === 'mug';
                lineup.add(mug.group);

                pinHolder = new THREE.Group();
                pinHolder.scale.set(0.58, 0.58, 0.58);
                pinHolder.position.set(0, 0.05, 0);
                pinHolder.rotation.set(0.52, -0.32, 0.03);
                pinHolder.visible = productRef.current === 'pin';
                pinHolder.add(buildPinMesh(shapeRef.current));
                lineup.add(pinHolder);

                scene.add(lineup);

                // Soft contact blob only — no ground plane, so no visible box edge.
                const blob = new THREE.Mesh(
                    new THREE.CircleGeometry(0.8, 40),
                    new THREE.MeshBasicMaterial({ color: 0x1a1c1e, transparent: true, opacity: 0.1 }),
                );
                blob.rotation.x = -Math.PI / 2;
                blob.position.y = -0.6;
                scene.add(blob);

                const resize = () => {
                    const w = host.clientWidth || 1;
                    const h = host.clientHeight || 1;
                    renderer.setSize(w, h);
                    const aspect = w / h;
                    camera.aspect = aspect;
                    camera.position.z = aspect < 0.9 ? 5.4 : 3.9;
                    camera.updateProjectionMatrix();
                };
                resize();
                ro = new ResizeObserver(resize);

                if (host) {
                    ro.observe(host);
                }

                let dragging = false;
                let lastX = 0;
                let lastY = 0;
                let lastT = 0;
                let velocity = 0;
                let spin = 0.006;

                const onDown = (e: PointerEvent) => {
                    dragging = true;
                    lastX = e.clientX;
                    lastY = e.clientY;
                    lastT = performance.now();
                    velocity = 0;
                    spin = 0;

                    if (decayTimer) {
                        clearTimeout(decayTimer);
                    }

                    host.setPointerCapture(e.pointerId);
                };

                const onMove = (e: PointerEvent) => {
                    if (!dragging) {
                        return;
                    }

                    const now = performance.now();
                    const dx = e.clientX - lastX;
                    const dy = e.clientY - lastY;
                    const dt = Math.max(1, now - lastT);
                    lineup.rotation.y += dx * 0.01;
                    lineup.rotation.x = Math.max(-0.2, Math.min(0.35, lineup.rotation.x + dy * 0.004));
                    velocity = dx / dt;
                    lastX = e.clientX;
                    lastY = e.clientY;
                    lastT = now;
                };

                const onUp = () => {
                    if (!dragging) {
                        return;
                    }

                    dragging = false;
                    spin = Math.max(-0.025, Math.min(0.025, velocity * 0.25 || 0.006));

                    if (Math.abs(spin) < 0.002) {
                        spin = 0.006;
                    }

                    decayTimer = setTimeout(() => {
                        spin = 0.006;
                    }, 900);
                };

                host.addEventListener('pointerdown', onDown);
                host.addEventListener('pointermove', onMove);
                host.addEventListener('pointerup', onUp);
                host.addEventListener('pointercancel', onUp);

                const cleanup = () => {
                    host.removeEventListener('pointerdown', onDown);
                    host.removeEventListener('pointermove', onMove);
                    host.removeEventListener('pointerup', onUp);
                    host.removeEventListener('pointercancel', onUp);
                };

                (host as unknown as { __cleanup?: () => void }).__cleanup = cleanup;

                let lastTime = performance.now();
                let firstFrame = true;

                const animate = () => {
                    raf = requestAnimationFrame(animate);
                    const now = performance.now();
                    const dt = Math.min(32, now - lastTime) / 16.66;
                    lastTime = now;

                    if (!dragging) {
                        if (autoRotateRef.current) {
                            lineup.rotation.y += spin * dt;
                        }

                        mug.group.position.y = 0.12 + Math.sin(now * 0.0012) * 0.04;

                        if (pinHolder) {
                            pinHolder.position.y = 0.05 + Math.sin(now * 0.0011 + 1.4) * 0.045;
                        }
                    }

                    renderer.render(scene, camera);

                    if (firstFrame) {
                        firstFrame = false;
                        status = 'ready';
                    }
                };
                animate();

                const hostEl = host as unknown as {
                    __three?: {
                        dispose: () => void;
                    };
                };
                hostEl.__three = {
                    dispose: () => {
                        cancelAnimationFrame(raf);

                        if (decayTimer) {
                            clearTimeout(decayTimer);
                        }

                        ro?.disconnect();
                        cleanup();
                        disposeGroup(lineup);
                        blob.geometry.dispose();
                        (blob.material as THREE.Material).dispose();
                        renderer.dispose();
                        renderer.domElement.remove();
                        ceramic = null;
                        pinHolder = null;
                    },
                };
            } catch {
                if (!cancelled) {
                    status = 'failed';
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    });

    onDestroy(() => {
        const hostEl = host as unknown as { __three?: { dispose: () => void }; __cleanup?: () => void } | undefined;
        hostEl?.__three?.dispose();
        hostEl?.__cleanup?.();
    });
</script>

<div bind:this={host} class="relative h-full w-full" style="touch-action: pan-y;">
    {#if status !== 'ready'}
        <div class="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[#f5f5f7]">
            {#if status === 'failed'}
                <p class="text-sm font-medium">3D preview isn&apos;t available in this browser.</p>
                <p class="text-xs text-[#6e6e73]">Try Chrome, Edge, or Safari to spin the products.</p>
            {:else}
                <div class="h-8 w-8 animate-spin rounded-full border-2 border-black/10 border-t-[#0052CC]"></div>
                <p class="text-xs text-[#6e6e73]">Loading 3D…</p>
            {/if}
        </div>
    {/if}
</div>
