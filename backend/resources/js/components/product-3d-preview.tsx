import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Cuboid } from 'lucide-react';
import { buildBag, isBagType } from './bag-builder';
import { applyShirtDecalDrape, buildShirt, isShirtType } from './shirt-builder';
import { buildVessel, isVesselType } from './vessel-builder';

// Real product models (CC0 unless noted — see public/models/CREDITS.md)
const DEFAULT_GLB: Record<string, string> = {
    mug: '/models/mug.glb',
    shirt: '/models/shirt.glb',
    tote: '/models/tote.glb',
    pin: '/models/pin.glb',
    calendar: '/models/calendar.glb',
};

// Types safe to recolor via material tint
const TINTABLE = new Set(['mug', 'tote', 'pin']);

const PALETTE = ['#FFFFFF', '#000000', '#0052CC', '#EF4444', '#22C55E', '#F59E0B'];

// Sticker fallback — a flat printed disc is genuinely all a sticker needs
function buildSticker(color: string): THREE.Group {
    const group = new THREE.Group();
    const std = (c: string) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.5, metalness: 0.02 });
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.08, 48), std('#FFFFFF'));
    const face = new THREE.Mesh(new THREE.CylinderGeometry(0.82, 0.82, 0.1, 48), std(color));
    rim.rotation.x = Math.PI / 2;
    face.rotation.x = Math.PI / 2;
    group.add(rim, face);
    return group;
}

export default function Product3DPreview({
    viewerType,
    label,
    modelUrl,
    designImageUrl,
    variant = 'compact',
}: {
    viewerType: string;
    label: string;
    modelUrl?: string;
    /** Reference artwork (uploaded photo) projected onto the template as a print decal. */
    designImageUrl?: string;
    /** Hero = big, impossible-to-miss canvas at the top of /products/create. */
    variant?: 'compact' | 'hero';
}) {
    const mountRef = useRef<HTMLDivElement>(null);
    const [color, setColor] = useState('#FFFFFF');
    const [loading, setLoading] = useState(false);
    const [loadError, setLoadError] = useState('');
    const stateRef = useRef({ rotY: 0.5, rotX: 0.1, dragging: false, lastX: 0, lastY: 0 });

    const showCanvas = viewerType !== 'none';
    const isVessel = isVesselType(viewerType);
    const isBag = isBagType(viewerType);
    const isShirt = isShirtType(viewerType);
    // Apply the T-Shirt — Regular — 3D (alias) design to every t-shirt type.
    // All isShirt types share the same base model `shirt.glb` (plain white isolated layout)
    // so backend/shirt.glb appears for every category variant as requested.
    const effectiveShirtGlb = DEFAULT_GLB['shirt'] ?? '/models/shirt.glb';
    const glbUrl = (modelUrl || '').trim() || DEFAULT_GLB[viewerType] || (isShirt ? effectiveShirtGlb : '');
    const designUrl = (designImageUrl || '').trim();
    // Vessels + bags + shirts take the tint as their body color at build time.
    const canTint = TINTABLE.has(viewerType) || isVessel || isBag || isShirt;

    useEffect(() => {
        if (!showCanvas || !mountRef.current) return;
        const mount = mountRef.current;
        const st = stateRef.current;
        setLoadError('');

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        mount.appendChild(renderer.domElement);

        const scene = new THREE.Scene();
        // clean minimal background like the mockup — isolated on white
        scene.background = new THREE.Color(isShirt ? 0xffffff : 0xf9fafb);
        const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
        if (isShirt) {
            // front three-quarter view, eye-level like studio mockup — pulled back to avoid clipping spouts
            camera.position.set(0.35, 0.45, 3.9);
            camera.lookAt(0, -0.05, 0);
        } else {
            camera.position.set(0, 1.0, 4.4);
            camera.lookAt(0, 0, 0);
        }

        if (isShirt) {
            // studio lighting — soft, photorealistic, clean minimal
            scene.add(new THREE.AmbientLight(0xffffff, 0.92));
            const key = new THREE.DirectionalLight(0xffffff, 1.15);
            key.position.set(2.2, 3.5, 2.8);
            key.castShadow = false;
            scene.add(key);
            const fill = new THREE.DirectionalLight(0xffffff, 0.55);
            fill.position.set(-2.0, 1.2, 2.0);
            scene.add(fill);
            const rim = new THREE.DirectionalLight(0xffffff, 0.35);
            rim.position.set(0, 2.5, -2.5);
            scene.add(rim);
        } else {
            scene.add(new THREE.AmbientLight(0xffffff, 0.85));
            const key = new THREE.DirectionalLight(0xffffff, 1.6);
            key.position.set(2.5, 4, 2.5);
            scene.add(key);
            const fill = new THREE.DirectionalLight(0xdbeafe, 0.55);
            fill.position.set(-2.5, 1.5, -2);
            scene.add(fill);
            const rim = new THREE.DirectionalLight(0xffffff, 0.5);
            rim.position.set(0, 2, -3);
            scene.add(rim);
        }

        const group = new THREE.Group();
        scene.add(group);

        let cancelled = false;
        let designTexture: THREE.Texture | null = null;

        // Project the uploaded reference artwork onto the template as a print
        // decal, sized from the normalized model bounds so it adapts to any GLB.
        const applyDesign = (target: THREE.Group) => {
            if (!designUrl) return;
            new THREE.TextureLoader().load(
                designUrl,
                (tex) => {
                    if (cancelled) {
                        tex.dispose();
                        return;
                    }
                    tex.colorSpace = THREE.SRGBColorSpace;
                    designTexture = tex;
                    const box = new THREE.Box3().setFromObject(target);
                    const size = box.getSize(new THREE.Vector3());
                    const center = box.getCenter(new THREE.Vector3());
                    const img = tex.image as HTMLImageElement | undefined;
                    const aspect = img?.width && img?.height ? img.width / img.height : 1;
                    let w = Math.max(size.x * 0.55, 0.3);
                    let h = w / aspect;
                    const maxH = Math.max(size.y * 0.6, 0.3);
                    if (h > maxH) {
                        h = maxH;
                        w = h * aspect;
                    }
                    const mesh = new THREE.Mesh(
                        new THREE.PlaneGeometry(w, h),
                        new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false }),
                    );
                    mesh.position.set(center.x, center.y, box.max.z + 0.02);
                    target.add(mesh);
                },
                undefined,
                () => {
                    if (!cancelled) setLoadError('Could not load the reference image preview.');
                },
            );
        };

        const addShadowDisc = (target: THREE.Group) => {
            const b = new THREE.Box3().setFromObject(target);
            const isShirtLocal = isShirt;
            // keep shadow well inside the rounded card so the bottom never gets harshly sliced
            const sizeX = b.getSize(new THREE.Vector3()).x;
            const radius = Math.max(sizeX * (isShirtLocal ? 0.36 : 0.48), 0.42);
            const disc = new THREE.Mesh(
                new THREE.CircleGeometry(radius, 32),
                new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: isShirtLocal ? 0.055 : 0.065 }),
            );
            disc.rotation.x = -Math.PI / 2;
            disc.position.y = b.min.y + 0.07;
            if (isShirtLocal && isHeavyShirt(viewerType)) disc.scale.set(1.04, 1, 1.04);
            scene.add(disc);
        };
        const isHeavyShirt = (vt: string) => vt === 'shirt_oversized' || vt === 'shirt_boxy' || vt === 'shirt_heavy';

        const finish = (obj: THREE.Object3D) => {
            // normalize to ~2 units, centered
            const box = new THREE.Box3().setFromObject(obj);
            const size = box.getSize(new THREE.Vector3());
            const center = box.getCenter(new THREE.Vector3());
            const s = 2.0 / (Math.max(size.x, size.y, size.z) || 1);
            obj.scale.multiplyScalar(s);
            obj.position.sub(center.clone().multiplyScalar(s));
            group.add(obj);

            // recolor safe models
            if (canTint) {
                obj.traverse((o) => {
                    const mesh = o as THREE.Mesh;
                    if (mesh.isMesh) {
                        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
                        mats.forEach((m) => {
                            const sm = m as THREE.MeshStandardMaterial;
                            if ('color' in sm) sm.color.set(color);
                        });
                    }
                });
            }

            addShadowDisc(group);

            applyDesign(group);
        };

        // Procedural drinkware (mug, tumbler, stein, …) — centered but never
        // rescaled, so an espresso reads smaller than a stein. The reference
        // artwork wraps around the wall as a curved print label.
        const finishVessel = () => {
            const built = buildVessel(viewerType, color);
            const vbox = new THREE.Box3().setFromObject(built.group);
            const vcenter = vbox.getCenter(new THREE.Vector3());
            built.group.position.sub(vcenter);
            group.add(built.group);
            addShadowDisc(group);

            if (!designUrl) return;
            new THREE.TextureLoader().load(
                designUrl,
                (tex) => {
                    if (cancelled) {
                        tex.dispose();
                        return;
                    }
                    tex.colorSpace = THREE.SRGBColorSpace;
                    designTexture = tex;
                    const img = tex.image as HTMLImageElement | undefined;
                    const aspect = img?.width && img?.height ? img.width / img.height : 1;
                    const avgR = (built.label.rTop + built.label.rBottom) / 2;
                    let lw = 2.0 * avgR;
                    let lh = lw / aspect;
                    if (lh > built.label.height) {
                        lh = built.label.height;
                        lw = lh * aspect;
                    }
                    const arc = Math.min(2.0, lw / (avgR || 1));
                    const mesh = new THREE.Mesh(
                        new THREE.CylinderGeometry(built.label.rTop, built.label.rBottom, lh, 32, 1, true, -arc / 2, arc),
                        new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false }),
                    );
                    mesh.position.set(-vcenter.x, built.label.y - vcenter.y, -vcenter.z);
                    group.add(mesh);
                },
                undefined,
                () => {
                    if (!cancelled) setLoadError('Could not load the reference image preview.');
                },
            );
        };

        const finishBag = () => {
            const built = buildBag(viewerType, color);
            const bbox = new THREE.Box3().setFromObject(built.group);
            const center = bbox.getCenter(new THREE.Vector3());
            built.group.position.sub(center);
            group.add(built.group);
            addShadowDisc(group);

            if (!designUrl) return;
            new THREE.TextureLoader().load(
                designUrl,
                (tex) => {
                    if (cancelled) { tex.dispose(); return; }
                    tex.colorSpace = THREE.SRGBColorSpace;
                    designTexture = tex;
                    const img = tex.image as HTMLImageElement | undefined;
                    const aspect = img?.width && img?.height ? img.width / img.height : 1;
                    let w = built.labelW;
                    let h = w / aspect;
                    if (h > built.labelH) { h = built.labelH; w = h * aspect; }
                    const mesh = new THREE.Mesh(
                        new THREE.PlaneGeometry(w, h),
                        new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false }),
                    );
                    // front face
                    const box2 = new THREE.Box3().setFromObject(built.group);
                    mesh.position.set(-center.x, -center.y, box2.max.z + 0.015 - center.z);
                    group.add(mesh);
                },
                undefined,
                () => { if (!cancelled) setLoadError('Could not load the reference image preview.'); },
            );
        };

        const finishShirtProcedural = () => {
            const built = buildShirt(viewerType, color);
            // scale with margin so sleeves/neck never touch the frame (fixes spout clipping)
            const preBox = new THREE.Box3().setFromObject(built.group);
            const preSize = preBox.getSize(new THREE.Vector3());
            const maxDim = Math.max(preSize.x, preSize.y, preSize.z);
            const fitScale = maxDim > 0 ? Math.min(1, 1.68 / maxDim) : 1;
            built.group.scale.setScalar(fitScale);
            const bbox = new THREE.Box3().setFromObject(built.group);
            const center = bbox.getCenter(new THREE.Vector3());
            built.group.position.sub(center);
            group.add(built.group);
            addShadowDisc(group);
            if (!designUrl) return;
            new THREE.TextureLoader().load(designUrl, (tex) => {
                if (cancelled) { tex.dispose(); return; }
                tex.colorSpace = THREE.SRGBColorSpace;
                tex.anisotropy = 8;
                designTexture = tex;
                const img = tex.image as HTMLImageElement | undefined;
                const aspect = img?.width && img?.height ? img.width / img.height : 1;
                // balanced sizing: uses builder's print area (torsoW*0.62) but keeps aspect
                let w = built.labelW * fitScale; let h = w / aspect;
                const maxH = built.labelH * fitScale;
                if (h > maxH) { h = maxH; w = h * aspect; }
                // high-res plane so the drape looks smooth, not faceted flat
                const geo = new THREE.PlaneGeometry(w, h, 22, 22);
                const box2 = new THREE.Box3().setFromObject(built.group);
                const frontZ = box2.max.z + 0.015 - center.z;
                // decal center Y is at group center (0 after centering) — same as torso center
                const worldTorsoW = built.torsoW * fitScale;
                const worldTorsoH = built.torsoH * fitScale;
                applyShirtDecalDrape(geo, { centerY: -center.y, frontZ: 0, torsoW: worldTorsoW, torsoH: worldTorsoH, isBoxyHeavy: built.isBoxyHeavy });
                // front face is slightly curved, so place mesh at frontZ and let draped vertices add bulge/wrinkle
                const mat = new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.85, metalness: 0.02, side: THREE.DoubleSide, alphaTest: 0.02 });
                const mesh = new THREE.Mesh(geo, mat);
                mesh.position.set(-center.x, -center.y, frontZ);
                group.add(mesh);
            }, undefined, () => { if (!cancelled) setLoadError('Could not load the reference image preview.'); });
        };

        const finishShirtFromGLB = (obj: THREE.Object3D) => {
            // This is the REAL shirt.glb — Shirt_adid with 6 materials. Use true GLB geometry,
            // not the procedural RoundedBox. Normalize like generic finish(), but keep shirt
            // camera + lighting and draped decal behaviour from the procedural path.
            const preBox = new THREE.Box3().setFromObject(obj);
            const preSize = preBox.getSize(new THREE.Vector3());
            const preCenter = preBox.getCenter(new THREE.Vector3());
            const maxDim = Math.max(preSize.x, preSize.y, preSize.z);
            // Adaptive scale: procedural tees are ~1.5 units (fitScale ~1), but shirt.glb is ~340k units
            // so we normalize to 2 units. Use 2.0 / maxDim when maxDim is huge, otherwise 1.68 margin.
            const fitScale = maxDim > 10 ? 2.0 / maxDim : Math.min(1, 1.68 / (maxDim || 1));
            obj.scale.setScalar(fitScale);
            obj.position.sub(preCenter.clone().multiplyScalar(fitScale));
            // Recompute after scale/center for final placement
            const bbox = new THREE.Box3().setFromObject(obj);
            const center = bbox.getCenter(new THREE.Vector3());
            // Recentering already done via preCenter scaled — nudge to origin for perfect center
            obj.position.sub(center);
            group.add(obj);

            // Plain only — same white isolated layout for every tee.
            // Tint the real Shirt_adid GLB to a uniform plain color (white default, or palette pick)
            // so it matches the procedural plain tees. Keeps inner hole dark.
            obj.traverse((o) => {
                const mesh = o as THREE.Mesh;
                if (!mesh.isMesh) return;
                const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
                mats.forEach((m) => {
                    const sm = m as THREE.MeshStandardMaterial;
                    if (!('color' in sm)) return;
                    // Keep inner cavity dark for realism; everything else plain
                    if (sm.name === '_crayfishdiffuse') {
                        sm.color.set(0x1a1c1e);
                        sm.roughness = 0.9;
                    } else {
                        sm.color.set(color);
                        sm.roughness = 0.82;
                        sm.metalness = 0.02;
                    }
                    sm.needsUpdate = true;
                });
            });

            addShadowDisc(group);

            if (!designUrl) return;
            new THREE.TextureLoader().load(designUrl, (tex) => {
                if (cancelled) { tex.dispose(); return; }
                tex.colorSpace = THREE.SRGBColorSpace;
                tex.anisotropy = 8;
                designTexture = tex;
                const img = tex.image as HTMLImageElement | undefined;
                const aspect = img?.width && img?.height ? img.width / img.height : 1;
                const finalBox = new THREE.Box3().setFromObject(obj);
                const finalSize = finalBox.getSize(new THREE.Vector3());
                const torsoW = finalSize.x;
                const torsoH = finalSize.y;
                // Shirt_adid front print area is ~55% of chest width, 42% of body height — matches procedural label
                let w = torsoW * 0.55; let h = w / aspect;
                const maxH = torsoH * 0.42;
                if (h > maxH) { h = maxH; w = h * aspect; }
                const geo = new THREE.PlaneGeometry(w, h, 22, 22);
                // Apply the same fabric drape as procedural so custom artwork hugs the Adidas shirt correctly
                applyShirtDecalDrape(geo, { centerY: 0, frontZ: 0, torsoW, torsoH, isBoxyHeavy: false });
                const box2 = new THREE.Box3().setFromObject(obj);
                const frontZ = box2.max.z + 0.015;
                const mat = new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.85, metalness: 0.02, side: THREE.DoubleSide, alphaTest: 0.02 });
                const mesh = new THREE.Mesh(geo, mat);
                mesh.position.set(0, 0, frontZ);
                group.add(mesh);
            }, undefined, () => { if (!cancelled) setLoadError('Could not load the reference image preview.'); });
        };

        if (isVessel) {
            finishVessel();
        } else if (isBag) {
            finishBag();
        } else if (isShirt) {
            // User requested: the T-Shirt — Regular — 3D (alias) design applied to every t-shirt type.
            // So every isShirt variant now renders the same regular shirt.glb (plain white isolated layout)
            // — same geometry, same lighting, same white background — but keeps its own viewer_type/category.
            const useGLBForPlain = !!glbUrl;
            if (useGLBForPlain) {
                setLoading(true);
                new GLTFLoader().load(
                    glbUrl,
                    (gltf) => {
                        if (cancelled) { setLoading(false); return; }
                        finishShirtFromGLB(gltf.scene as unknown as THREE.Group);
                        setLoading(false);
                    },
                    undefined,
                    () => {
                        // GLB failed — fall back to high-quality procedural so the t-shirt never shows empty
                        if (!cancelled) {
                            setLoadError('Could not load the shirt model — showing procedural tee.');
                            finishShirtProcedural();
                        }
                        setLoading(false);
                    },
                );
            } else {
                finishShirtProcedural();
            }
        } else if (glbUrl) {
            setLoading(true);
            new GLTFLoader().load(
                glbUrl,
                (gltf) => {
                    finish(gltf.scene);
                    setLoading(false);
                },
                undefined,
                () => {
                    setLoadError('Could not load the 3D model.');
                    setLoading(false);
                    if (viewerType === 'sticker' || !DEFAULT_GLB[viewerType]) {
                        finish(buildSticker(color));
                    }
                },
            );
        } else {
            finish(buildSticker(color));
        }

        const resize = () => {
            const w = mount.clientWidth || 1;
            const h = mount.clientHeight || 1;
            renderer.setSize(w, h);
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
        };
        resize();
        const ro = new ResizeObserver(resize);
        ro.observe(mount);

        let raf = 0;
        const animate = () => {
            raf = requestAnimationFrame(animate);
            if (!st.dragging) st.rotY += 0.008;
            group.rotation.y += (st.rotY - group.rotation.y) * 0.12;
            group.rotation.x += (st.rotX - group.rotation.x) * 0.12;
            renderer.render(scene, camera);
        };
        animate();

        const down = (e: PointerEvent) => {
            st.dragging = true;
            st.lastX = e.clientX;
            st.lastY = e.clientY;
            mount.setPointerCapture(e.pointerId);
        };
        const move = (e: PointerEvent) => {
            if (!st.dragging) return;
            st.rotY += (e.clientX - st.lastX) * 0.012;
            st.rotX = Math.max(-0.4, Math.min(0.6, st.rotX + (e.clientY - st.lastY) * 0.008));
            st.lastX = e.clientX;
            st.lastY = e.clientY;
        };
        const up = () => {
            st.dragging = false;
        };
        mount.addEventListener('pointerdown', down);
        mount.addEventListener('pointermove', move);
        mount.addEventListener('pointerup', up);
        mount.addEventListener('pointercancel', up);

        return () => {
            cancelled = true;
            designTexture?.dispose();
            cancelAnimationFrame(raf);
            ro.disconnect();
            mount.removeEventListener('pointerdown', down);
            mount.removeEventListener('pointermove', move);
            mount.removeEventListener('pointerup', up);
            mount.removeEventListener('pointercancel', up);
            scene.traverse((o) => {
                const mesh = o as THREE.Mesh;
                if (mesh.isMesh) {
                    mesh.geometry?.dispose();
                    const m = mesh.material as THREE.Material | THREE.Material[];
                    (Array.isArray(m) ? m : [m]).forEach((x) => {
                        const sm = x as THREE.MeshStandardMaterial;
                        sm.map?.dispose();
                        x.dispose();
                    });
                }
            });
            renderer.dispose();
            if (renderer.domElement.parentElement === mount) mount.removeChild(renderer.domElement);
        };
    }, [showCanvas, viewerType, glbUrl, designUrl, color, label, canTint]);

    const isHero = variant === 'hero';
    const canvasH = isHero ? 'h-[360px] sm:h-[420px] lg:h-[380px]' : 'h-[220px]';
    const placeholderH = isHero ? 'h-[360px] sm:h-[420px] lg:h-[380px]' : 'h-[200px]';

    if (!showCanvas) {
        return (
            <div
                className={`flex flex-col items-center justify-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-4 py-8 text-center ${placeholderH}`}
            >
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#F9FAFB] border border-[#E5E7EB]">
                    <Cuboid size={18} className="text-[#6B7280]" />
                </span>
                <div>
                    <p className="text-[13px] font-normal text-[#1A1C1E]">2D product — no 3D preview</p>
                    <p className="mx-auto mt-1 max-w-[280px] text-[11px] font-normal leading-relaxed text-[#6B7280]">
                        Pick a template in the controls to see the 3D model.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div>
            <div className={`relative overflow-hidden rounded-lg border border-[#E5E7EB] ${isShirt ? 'bg-white' : ''}`}>
                <div
                    ref={mountRef}
                    className={`${canvasH} w-full cursor-grab touch-none ${isShirt ? 'bg-white' : 'bg-gradient-to-b from-[#F4F5F9] to-white'} active:cursor-grabbing`}
                />
                {loading && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-[#F8F9FC]/70">
                        <p className="text-[13px] text-[#8A8FA3]">Loading 3D model…</p>
                    </div>
                )}
            </div>
            {loadError && <p className="mt-2 text-[13px] text-red-600">{loadError}</p>}
            {canTint && (
                <div className={`flex flex-wrap items-center gap-2 ${isHero ? 'mt-3' : 'mt-2'}`}>
                    <span className="text-[11px] font-normal text-[#6B7280]">Preview color:</span>
                    {PALETTE.map((c) => (
                        <button
                            key={c}
                            type="button"
                            onClick={() => setColor(c)}
                            title={c}
                            className={`h-6 w-6 rounded-full border transition ${color === c ? 'scale-110 border-[#1A1C1E] ring-2 ring-[#1A1C1E]/20' : 'border-[#E5E7EB]'}`}
                            style={{ backgroundColor: c }}
                        />
                    ))}
                </div>
            )}
            <p className={`font-normal text-[#6B7280] ${isHero ? 'mt-2 text-[11px]' : 'mt-2 text-[11px]'}`}>Drag to rotate • auto-spins when idle.</p>
            {!isHero && <p className="mt-1 text-[10px] font-normal text-[#9CA3AF]">Models: Kenney, Quaternius (CC0) • Tee: Poly by Google, Calendar: jeremy (CC-BY)</p>}
        </div>
    );
}
