import { RefObject, forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { DesignerProductConfig } from './designer-config';

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
    }, [designVersion]);

    useEffect(() => {
        const mount = mountRef.current;
        const designCanvas = designCanvasRef.current;
        if (!mount || !designCanvas) return;
        const st = stateRef.current;
        matsRef.current = new Map();

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        mount.appendChild(renderer.domElement);
        rendererRef.current = renderer;

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

        // grid floor, Printonator-style
        const grid = new THREE.GridHelper(8, 16, 0x9aa0b4, 0xc9cede);
        grid.position.y = -1.25;
        (grid.material as THREE.Material).transparent = true;
        (grid.material as THREE.Material).opacity = 0.5;
        scene.add(grid);

        const group = new THREE.Group();
        scene.add(group);

        const tex = new THREE.CanvasTexture(designCanvas);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 8;
        texRef.current = tex;

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

            // print-area decal from the live design canvas
            const b2 = new THREE.Box3().setFromObject(obj);
            const sz = b2.getSize(new THREE.Vector3());
            const ct = b2.getCenter(new THREE.Vector3());
            const aspect = designCanvas.height / Math.max(designCanvas.width, 1);
            const w = sz.x * config.decalW;
            const decal = new THREE.Mesh(
                new THREE.PlaneGeometry(w, w * aspect),
                new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false }),
            );
            decal.position.set(ct.x, ct.y + sz.y * config.decalY, b2.max.z + 0.012);
            group.add(decal);
        };

        let cancelled = false;
        if (config.model.startsWith('procedural:')) {
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
