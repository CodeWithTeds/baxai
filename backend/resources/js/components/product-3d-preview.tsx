import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Cuboid } from 'lucide-react';
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
}: {
    viewerType: string;
    label: string;
    modelUrl?: string;
    /** Reference artwork (uploaded photo) projected onto the template as a print decal. */
    designImageUrl?: string;
}) {
    const mountRef = useRef<HTMLDivElement>(null);
    const [color, setColor] = useState('#FFFFFF');
    const [loading, setLoading] = useState(false);
    const [loadError, setLoadError] = useState('');
    const stateRef = useRef({ rotY: 0.5, rotX: 0.1, dragging: false, lastX: 0, lastY: 0 });

    const showCanvas = viewerType !== 'none';
    const isVessel = isVesselType(viewerType);
    const glbUrl = (modelUrl || '').trim() || DEFAULT_GLB[viewerType] || '';
    const designUrl = (designImageUrl || '').trim();
    // Vessels take the tint as their ceramic/steel color at build time.
    const canTint = TINTABLE.has(viewerType) || isVessel;

    useEffect(() => {
        if (!showCanvas || !mountRef.current) return;
        const mount = mountRef.current;
        const st = stateRef.current;
        setLoadError('');

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        mount.appendChild(renderer.domElement);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
        camera.position.set(0, 1.0, 4.4);
        camera.lookAt(0, 0, 0);

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
            const disc = new THREE.Mesh(
                new THREE.CircleGeometry(Math.max(b.getSize(new THREE.Vector3()).x * 0.62, 0.7), 32),
                new THREE.MeshBasicMaterial({ color: 0x1a1c1e, transparent: true, opacity: 0.09 }),
            );
            disc.rotation.x = -Math.PI / 2;
            disc.position.y = b.min.y - 0.02;
            scene.add(disc);
        };

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

        if (isVessel) {
            finishVessel();
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

    if (!showCanvas) {
        return (
            <div className="flex h-[200px] flex-col items-center justify-center gap-2 rounded-lg bg-[#F8F9FC] text-center">
                <Cuboid size={24} className="text-[#B9BED1]" />
                <p className="text-[13px] text-[#8A8FA3]">2D product — no 3D preview</p>
                <p className="px-6 text-[12px] text-[#B9BED1]">Pick a 3D viewer below, upload a reference image, or generate with AI to enable it.</p>
            </div>
        );
    }

    return (
        <div>
            <div className="relative">
                <div ref={mountRef} className="h-[220px] w-full cursor-grab touch-none rounded-lg bg-[#F4F5F9] active:cursor-grabbing" />
                {loading && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-[#F8F9FC]/70">
                        <p className="text-[13px] text-[#8A8FA3]">Loading 3D model…</p>
                    </div>
                )}
            </div>
            {loadError && <p className="mt-2 text-[13px] text-red-600">{loadError}</p>}
            {canTint && (
                <div className="mt-2 flex items-center gap-2">
                    <span className="text-[12px] text-[#8A8FA3]">Preview color:</span>
                    {PALETTE.map((c) => (
                        <button
                            key={c}
                            type="button"
                            onClick={() => setColor(c)}
                            title={c}
                            className={`h-6 w-6 rounded-full border transition ${color === c ? 'scale-110 border-[#1A1C1E] ring-2 ring-[#1A1C1E]/20' : 'border-[#E9EBF3]'}`}
                            style={{ backgroundColor: c }}
                        />
                    ))}
                </div>
            )}
            <p className="mt-2 text-[12px] text-[#B9BED1]">Drag to rotate • auto-spins when idle.</p>
            <p className="mt-1 text-[11px] text-[#B9BED1]">Models: Kenney, Quaternius (CC0) • Tee: Poly by Google, Calendar: jeremy (CC-BY)</p>
        </div>
    );
}
