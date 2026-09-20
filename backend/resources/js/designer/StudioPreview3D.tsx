import { RefObject, forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { DesignerProductConfig } from './designer-config';
import { applyShirtDecalDrape, buildShirt, isShirtType } from '@/components/shirt-builder';

export interface StudioPart {
    id: string;
    label: string;
    color: string;
}

export interface StudioApi {
    snapshot: () => string | null;
    setPartColor: (id: string, color: string) => void;
    startRecord: () => boolean;
    stopRecord: () => void;
}

interface Props {
    config: DesignerProductConfig;
    designCanvasRef: RefObject<HTMLCanvasElement | null>;
    designVersion: number;
    onParts: (parts: StudioPart[]) => void;
    onRecordEnd: (blob: Blob) => void;
}

const StudioPreview3D = forwardRef<StudioApi, Props>(function StudioPreview3D(
    { config, designCanvasRef, designVersion, onParts, onRecordEnd },
    ref,
) {
    const mountRef = useRef<HTMLDivElement>(null);
    const texRef = useRef<THREE.CanvasTexture | null>(null);
    const matsRef = useRef(new Map<string, THREE.MeshStandardMaterial[]>());
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const recorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const stateRef = useRef({ rotY: 0.5, rotX: 0.12, dragging: false, lastX: 0, lastY: 0 });
    const decalRef = useRef<THREE.Mesh | null>(null);
    const cbRef = useRef({ onParts, onRecordEnd });
    cbRef.current = { onParts, onRecordEnd };

    useImperativeHandle(ref, () => ({
        snapshot: () => {
            const r = rendererRef.current;
            if (!r) return null;
            return r.domElement.toDataURL('image/png');
        },
        setPartColor: (id, color) => {
            matsRef.current.get(id)?.forEach((m) => m.color.set(color));
        },
        startRecord: () => {
            const r = rendererRef.current;
            if (!r) return false;
            try {
                const stream = r.domElement.captureStream(60);
                const rec = new MediaRecorder(stream, { mimeType: 'video/webm' });
                chunksRef.current = [];
                rec.ondataavailable = (e) => {
                    if (e.data.size) chunksRef.current.push(e.data);
                };
                rec.onstop = () => cbRef.current.onRecordEnd(new Blob(chunksRef.current, { type: 'video/webm' }));
                rec.start();
                recorderRef.current = rec;
                return true;
            } catch {
                return false;
            }
        },
        stopRecord: () => {
            recorderRef.current?.stop();
            recorderRef.current = null;
        },
    }));

    // live texture refresh when the design changes
    useEffect(() => {
        if (texRef.current) texRef.current.needsUpdate = true;
        // also bump decal opacity if needed
        if (decalRef.current) {
            const m = decalRef.current.material as THREE.MeshStandardMaterial;
            m.needsUpdate = true;
        }
    }, [designVersion]);

    useEffect(() => {
        const mount = mountRef.current;
        const designCanvas = designCanvasRef.current;
        if (!mount || !designCanvas) return;
        const st = stateRef.current;
        matsRef.current = new Map();
        decalRef.current = null;

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        mount.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
        const isShirtStudio = config.type === 'shirt' || isShirtType(config.type);

        if (isShirtStudio) {
            camera.position.set(0.35, 0.48, 3.9);
            camera.lookAt(0, -0.05, 0);
            scene.add(new THREE.AmbientLight(0xffffff, 0.92));
            const key = new THREE.DirectionalLight(0xffffff, 1.15);
            key.position.set(2.2, 3.5, 2.8);
            scene.add(key);
            const fill = new THREE.DirectionalLight(0xffffff, 0.55);
            fill.position.set(-2.0, 1.2, 2.0);
            scene.add(fill);
            const rim = new THREE.DirectionalLight(0xffffff, 0.35);
            rim.position.set(0, 2.5, -2.5);
            scene.add(rim);
        } else {
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
        }

        // grid floor, Printonator-style — hidden for shirt (screenshot is isolated floating)
        let grid: THREE.GridHelper | null = null;
        if (!isShirtStudio) {
            grid = new THREE.GridHelper(8, 16, 0x9aa0b4, 0xc9cede);
            grid.position.y = -1.25;
            (grid.material as THREE.Material).transparent = true;
            (grid.material as THREE.Material).opacity = 0.5;
            scene.add(grid);
        }

        const group = new THREE.Group();
        scene.add(group);

        const tex = new THREE.CanvasTexture(designCanvas);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 8;
        texRef.current = tex;

        const addShadowDisc = (target: THREE.Group) => {
            if (!isShirtStudio) return;
            const b = new THREE.Box3().setFromObject(target);
            const sizeX = b.getSize(new THREE.Vector3()).x;
            const radius = Math.max(sizeX * 0.36, 0.42);
            const disc = new THREE.Mesh(
                new THREE.CircleGeometry(radius, 32),
                new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.055 }),
            );
            disc.rotation.x = -Math.PI / 2;
            disc.position.y = b.min.y + 0.07;
            scene.add(disc);
        };

        const finish = (obj: THREE.Object3D) => {
            const box = new THREE.Box3().setFromObject(obj);
            const size = box.getSize(new THREE.Vector3());
            const center = box.getCenter(new THREE.Vector3());
            const s = 2.0 / (Math.max(size.x, size.y, size.z) || 1);
            obj.scale.multiplyScalar(s);
            obj.position.sub(center.clone().multiplyScalar(s));
            group.add(obj);

            // collect colorable parts
            const seen = new Map<string, string>();
            obj.traverse((o) => {
                const mesh = o as THREE.Mesh;
                if (!mesh.isMesh) return;
                const ms = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
                ms.forEach((m) => {
                    const sm = m as THREE.MeshStandardMaterial;
                    if (!('color' in sm)) return;
                    const name = sm.name || 'part';
                    if (!matsRef.current.has(name)) matsRef.current.set(name, []);
                    matsRef.current.get(name)!.push(sm);
                    if (!seen.has(name)) seen.set(name, '#' + sm.color.getHexString());
                });
            });
            cbRef.current.onParts(
                [...seen.entries()].map(([id, color]) => ({
                    id,
                    label: config.partLabels[id] ?? id,
                    color,
                })),
            );

            // print-area decal from the live design canvas — NOT FLAT: draped to follow fabric
            const b2 = new THREE.Box3().setFromObject(obj);
            const sz = b2.getSize(new THREE.Vector3());
            const ct = b2.getCenter(new THREE.Vector3());
            const aspect = designCanvas.height / Math.max(designCanvas.width, 1);
            const w = sz.x * config.decalW;
            const h = w * aspect;
            // high subdiv for smooth drape, like product preview
            const geo = new THREE.PlaneGeometry(w, h, 20, 20);
            // for generic GLB we apply a light sine drape that mimics shirt builder's wrinkle
            // centerY is decal center world Y before centering adjustment (ct.y + offset)
            const decalCenterY = ct.y + sz.y * config.decalY;
            const pos = geo.attributes.position as THREE.BufferAttribute;
            for (let i = 0; i < pos.count; i++) {
                const lx = pos.getX(i);
                const ly = pos.getY(i);
                const worldY = decalCenterY + ly;
                const ny = (worldY + 1) / 2; // approx normalize
                const wr = Math.sin(lx * 3.8) * 0.014 * Math.sin(Math.max(0, Math.min(1, ny)) * Math.PI) + Math.cos(worldY * 2.8) * 0.004;
                const bulge = (1 - Math.pow(lx / (w / 2 || 1), 2)) * 0.02;
                pos.setZ(i, pos.getZ(i) + wr + bulge);
            }
            geo.computeVertexNormals();
            const mat = new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.82, metalness: 0.02, side: THREE.DoubleSide, alphaTest: 0.02 });
            const decal = new THREE.Mesh(geo, mat);
            decal.position.set(ct.x, decalCenterY, b2.max.z + 0.015);
            decalRef.current = decal;
            group.add(decal);
        };

        const finishShirtProcedural = () => {
            // PLAIN ONLY — same white isolated layout as product preview, not blue screenshot
            const built = buildShirt('shirt', '#FFFFFF'); // plain white, recolorable via parts
            // but we want the first shirt color to be whatever the user picks via parts — so start with #FFFFFF and let setPartColor handle
            // Reset to shirt's true material handling: we rebuild with white and collect parts
            // Rebuild group with correct scaling: match finish() normalization (2 units)
            const preBox = new THREE.Box3().setFromObject(built.group);
            const preSize = preBox.getSize(new THREE.Vector3());
            const preCenter = preBox.getCenter(new THREE.Vector3());
            const s = 2.0 / (Math.max(preSize.x, preSize.y, preSize.z) || 1);
            built.group.scale.setScalar(s);
            built.group.position.sub(preCenter.clone().multiplyScalar(s));
            group.add(built.group);

            // collect colorable parts from procedural group (fabric mat)
            const seen = new Map<string, string>();
            built.group.traverse((o) => {
                const mesh = o as THREE.Mesh;
                if (!mesh.isMesh) return;
                const ms = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
                ms.forEach((m) => {
                    const sm = m as THREE.MeshStandardMaterial;
                    if (!('color' in sm)) return;
                    const name = sm.name || 'fabric';
                    if (!matsRef.current.has(name)) matsRef.current.set(name, []);
                    matsRef.current.get(name)!.push(sm);
                    if (!seen.has(name)) seen.set(name, '#' + sm.color.getHexString());
                });
            });
            // fabric is single material but we still expose it
            if (seen.size === 0) {
                // fallback: torso material
                const anyMesh = built.group.children.find((c) => (c as THREE.Mesh).isMesh) as THREE.Mesh | undefined;
                if (anyMesh) {
                    const m = anyMesh.material as THREE.MeshStandardMaterial;
                    seen.set('fabric', '#' + m.color.getHexString());
                    matsRef.current.set('fabric', [m]);
                }
            }
            cbRef.current.onParts(
                [...seen.entries()].map(([id, color]) => ({
                    id,
                    label: config.partLabels[id] ?? id,
                    color,
                })),
            );

            addShadowDisc(group);

            // draped decal from live design canvas — matches product-3d-preview logic
            const b2 = new THREE.Box3().setFromObject(built.group);
            const ct = b2.getCenter(new THREE.Vector3());
            const sz = b2.getSize(new THREE.Vector3());
            const aspect = designCanvas.height / Math.max(designCanvas.width, 1);
            // screenshot: small left-chest logo; if design is small, it will naturally be small.
            // We keep config decalW but clamp to built print area so it never exceeds shirt
            const targetW = Math.min(sz.x * config.decalW, built.torsoW * s * 0.62);
            let w = targetW;
            let h = w * aspect;
            const maxH = built.torsoH * s * 0.42;
            if (h > maxH) {
                h = maxH;
                w = h / aspect;
            }
            const geo = new THREE.PlaneGeometry(w, h, 22, 22);
            applyShirtDecalDrape(geo, {
                centerY: ct.y + sz.y * config.decalY,
                frontZ: 0,
                torsoW: built.torsoW * s,
                torsoH: built.torsoH * s,
                isBoxyHeavy: built.isBoxyHeavy,
            });
            const mat = new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.85, metalness: 0.02, side: THREE.DoubleSide, alphaTest: 0.02 });
            const decal = new THREE.Mesh(geo, mat);
            const frontZ = b2.max.z + 0.015;
            decal.position.set(ct.x, ct.y + sz.y * config.decalY, frontZ);
            decalRef.current = decal;
            group.add(decal);
        };

        const finishShirtGLBStudio = (obj: THREE.Object3D) => {
            // Real shirt.glb (Shirt_adid) — PLAIN ONLY: tint to uniform white like procedural plain tees.
            // Same white isolated layout for every category, not the old Adidas multi-color.
            const preBox = new THREE.Box3().setFromObject(obj);
            const preSize = preBox.getSize(new THREE.Vector3());
            const preCenter = preBox.getCenter(new THREE.Vector3());
            const maxDim = Math.max(preSize.x, preSize.y, preSize.z);
            const s = maxDim > 10 ? 2.0 / maxDim : 2.0 / (Math.max(preSize.x, preSize.y, preSize.z) || 1);
            obj.scale.setScalar(s);
            obj.position.sub(preCenter.clone().multiplyScalar(s));
            // recenter to origin after scale
            const bboxInner = new THREE.Box3().setFromObject(obj);
            const centerOffset = bboxInner.getCenter(new THREE.Vector3());
            obj.position.sub(centerOffset);
            // Plain only — recolor every fabric part to white (keep inner hole dark)
            obj.traverse((o) => {
                const mesh = o as THREE.Mesh;
                if (!mesh.isMesh) return;
                const ms = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
                ms.forEach((m) => {
                    const sm = m as THREE.MeshStandardMaterial;
                    if (!('color' in sm)) return;
                    if (sm.name === '_crayfishdiffuse') {
                        sm.color.set(0x1a1c1e);
                    } else {
                        sm.color.set(0xffffff);
                    }
                    sm.roughness = 0.82;
                    sm.metalness = 0.02;
                    sm.needsUpdate = true;
                });
            });
            group.add(obj);

            // Expose each GLB material as a recolorable part (Body, Sleeves, Collar etc.) — now all plain white initially
            const seen = new Map<string, string>();
            obj.traverse((o) => {
                const mesh = o as THREE.Mesh;
                if (!mesh.isMesh) return;
                const ms = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
                ms.forEach((m) => {
                    const sm = m as THREE.MeshStandardMaterial;
                    if (!('color' in sm)) return;
                    const name = sm.name || 'part';
                    if (!matsRef.current.has(name)) matsRef.current.set(name, []);
                    matsRef.current.get(name)!.push(sm);
                    if (!seen.has(name)) seen.set(name, '#' + sm.color.getHexString());
                });
            });
            cbRef.current.onParts(
                [...seen.entries()].map(([id, color]) => ({
                    id,
                    label: config.partLabels[id] ?? id,
                    color,
                })),
            );

            addShadowDisc(group);

            // Live design canvas decal — draped so artwork follows the Adidas shirt folds (not flat)
            const b2 = new THREE.Box3().setFromObject(obj);
            const ct = b2.getCenter(new THREE.Vector3());
            const sz = b2.getSize(new THREE.Vector3());
            const aspect = designCanvas.height / Math.max(designCanvas.width, 1);
            // Use same print-area math as product-3d-preview's Shirt GLB path (0.55 chest, 0.42 height)
            let w = Math.min(sz.x * config.decalW, sz.x * 0.55);
            let h = w * aspect;
            const maxH = sz.y * 0.42;
            if (h > maxH) { h = maxH; w = h / aspect; }
            const geo = new THREE.PlaneGeometry(w, h, 22, 22);
            applyShirtDecalDrape(geo, {
                centerY: ct.y + sz.y * config.decalY,
                frontZ: 0,
                torsoW: sz.x,
                torsoH: sz.y,
                isBoxyHeavy: false,
            });
            const mat = new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.85, metalness: 0.02, side: THREE.DoubleSide, alphaTest: 0.02 });
            const decal = new THREE.Mesh(geo, mat);
            const frontZ = b2.max.z + 0.015;
            decal.position.set(ct.x, ct.y + sz.y * config.decalY, frontZ);
            decalRef.current = decal;
            group.add(decal);
        };

        let cancelled = false;
        if (isShirtStudio) {
            // User wants backend/shirt.glb design visible in the T-Shirt + layout.
            // For shirt, the GLB is the Shirt_adid model (6 materials). Load it directly
            // instead of the procedural RoundedBox tee, so the Adidas design appears.
            if (config.model.startsWith('procedural:')) {
                // Fallback sticker-like procedural if no GLB is configured
                const g = new THREE.Group();
                const std = (c: string) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.5, metalness: 0.02 });
                const rimM = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.08, 48), std('#FFFFFF'));
                const face = new THREE.Mesh(new THREE.CylinderGeometry(0.82, 0.82, 0.1, 48), std('#FFFFFF'));
                rimM.rotation.x = Math.PI / 2;
                face.rotation.x = Math.PI / 2;
                g.add(rimM, face);
                if (!cancelled) finish(g);
            } else {
                new GLTFLoader().load(
                    config.model,
                    (gltf) => {
                        if (!cancelled) finishShirtGLBStudio(gltf.scene);
                    },
                    undefined,
                    () => {
                        // GLB failed — show procedural tee so layout never goes blank
                        if (!cancelled) finishShirtProcedural();
                    },
                );
            }
        } else if (config.model.startsWith('procedural:')) {
            const g = new THREE.Group();
            const std = (c: string) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.5, metalness: 0.02 });
            const rimM = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.08, 48), std('#FFFFFF'));
            const face = new THREE.Mesh(new THREE.CylinderGeometry(0.82, 0.82, 0.1, 48), std('#FFFFFF'));
            rimM.rotation.x = Math.PI / 2;
            face.rotation.x = Math.PI / 2;
            g.add(rimM, face);
            if (!cancelled) finish(g);
        } else {
            new GLTFLoader().load(
                config.model,
                (gltf) => {
                    if (!cancelled) finish(gltf.scene);
                },
                undefined,
                () => {
                    if (!cancelled) cbRef.current.onParts([]);
                },
            );
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
            cancelAnimationFrame(raf);
            ro.disconnect();
            mount.removeEventListener('pointerdown', down);
            mount.removeEventListener('pointermove', move);
            mount.removeEventListener('pointerup', up);
            mount.removeEventListener('pointercancel', up);
            tex.dispose();
            texRef.current = null;
            decalRef.current = null;
            scene.traverse((o) => {
                const mesh = o as THREE.Mesh;
                if (mesh.isMesh) {
                    mesh.geometry?.dispose();
                    const m = mesh.material as THREE.Material | THREE.Material[];
                    (Array.isArray(m) ? m : [m]).forEach((x) => x.dispose());
                }
            });
            renderer.dispose();
            if (renderer.domElement.parentElement === mount) mount.removeChild(renderer.domElement);
            rendererRef.current = null;
            if (recorderRef.current?.state !== 'inactive') recorderRef.current?.stop();
            recorderRef.current = null;
        };
    }, [config, designCanvasRef]);

    return <div ref={mountRef} className="h-full w-full cursor-grab touch-none active:cursor-grabbing" />;
});

export default StudioPreview3D;
