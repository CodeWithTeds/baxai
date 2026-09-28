import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { GLView } from 'expo-gl';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Lazy load native renderer to keep web DOM and HTML5 canvas untainted
let NativeRenderer: any = null;
if (Platform.OS !== 'web') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    NativeRenderer = require('expo-three').Renderer;
  } catch {}
}

// Polyfill global.THREE if needed
// @ts-ignore
global.THREE = (global as any).THREE || THREE;

// Suppress known non-fatal WebGL 1 deprecation warning from Three.js r153+ and EXGL notices
if (typeof console !== 'undefined' && console.warn) {
  const _origWarn = console.warn.bind(console);
  console.warn = (...args: any[]) => {
    const text = args.map((a) => (typeof a === 'string' ? a : a?.message || '')).join(' ');
    if (
      text.includes('WebGL 1 support was deprecated') ||
      text.includes("EXGL: gl.pixelStorei() doesn't support this parameter yet")
    ) {
      return;
    }
    _origWarn(...args);
  };
}

import { buildBag, isBagType } from './bag-builder';
import { buildPin, buildPinDecal, isPinType } from './pin-builder';
import {
  applyShirtDecalDrape,
  isShirtType,
  morphShirtGLB,
  SHIRT_TRIM_MATS,
  shirtTrimContrast,
} from './shirt-builder';
import { buildVessel, isVesselType, VesselLabel } from './vessel-builder';
import {
  build3DTextMesh,
  buildDecalImageMesh,
  loadUniversalTexture,
} from './model-customizer';
import { getApiBaseUrls } from '@/utils/api';

export const PALETTE = ['#FFFFFF', '#111827', '#0052CC', '#EF4444', '#22C55E', '#F59E0B'];

const TINTABLE = new Set(['mug', 'tote', 'pin', 'shirt', 'coffee_cup', 'coffee_mugs']);

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

export interface Product3DPreviewProps {
  viewerType: string;
  label?: string;
  modelUrl?: string;
  designImageUrl?: string;
  variant?: 'compact' | 'hero' | 'screen';
  minimal?: boolean;
  selectedColor?: string;
  onColorChange?: (color: string) => void;
  height?: number;
  customText?: string;
  customTextColor?: string;
  customFontFamily?: string;
  customFontSize?: number;
  customImageUri?: string;
  /** Y-axis offset for text on vessel/shirt surfaces (-0.5 to 0.5 world units) */
  customTextYOffset?: number;
}

export function Product3DPreview({
  viewerType,
  label = '',
  modelUrl,
  designImageUrl,
  variant = 'screen',
  minimal = false,
  selectedColor: controlledColor,
  onColorChange,
  height = 340,
  customText = '',
  customTextColor = '#111827',
  customFontFamily = 'system-ui, sans-serif',
  customFontSize = 64,
  customImageUri,
  customTextYOffset = 0,
}: Product3DPreviewProps) {
  const [internalColor, setInternalColor] = useState('#FFFFFF');
  const color = controlledColor !== undefined ? controlledColor : internalColor;

  const setColor = (c: string) => {
    setInternalColor(c);
    if (onColorChange) onColorChange(c);
  };

  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');

  const stateRef = useRef({
    rotY: 0.5,
    rotX: 0.1,
    dragging: false,
    lastX: 0,
    lastY: 0,
  });

  const webMountRef = useRef<HTMLDivElement | null>(null);
  const webRendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const nativeRendererRef = useRef<any | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const groupRef = useRef<THREE.Group | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rafRef = useRef<number | null>(null);
  const isShirtRef = useRef(false);
  const decalGroupRef = useRef<THREE.Group | null>(null);
  const shadowDiscRef = useRef<THREE.Mesh | null>(null);
  const modelBoxRef = useRef<THREE.Box3 | null>(null);
  const vcenterRef = useRef<THREE.Vector3 | null>(null);
  const vesselLabelRef = useRef<VesselLabel | null>(null);

  const normalizeViewerType = (vt: string): string => {
    const clean = (vt || '').toLowerCase().trim();
    if (clean === 'mugs' || clean === 'coffee_mugs' || clean === 'coffee_cup') return 'coffee_cup';
    if (clean === 'mug') return 'mug';
    if (clean === 'bag') return 'tote';
    return clean;
  };

  const resolvedViewerType = normalizeViewerType(viewerType);
  const isVessel = isVesselType(resolvedViewerType);
  const isBag = isBagType(resolvedViewerType);
  const isShirt = isShirtType(resolvedViewerType);
  const isPin = isPinType(resolvedViewerType);
  isShirtRef.current = isShirt;

  const canTint = TINTABLE.has(resolvedViewerType) || isVessel || isBag || isShirt || isPin;

  // Resolve GLB URL from backend API server with CORS route (only shirts/totes/custom models use GLBs)
  const getEffectiveGlbUrl = (): string => {
    if (modelUrl && modelUrl.trim()) return modelUrl.trim();
    const baseUrl = getApiBaseUrls()[0] || 'http://192.168.100.184:8082';

    if (isShirt) return `${baseUrl}/api/v1/models/shirt.glb`;
    if (resolvedViewerType === 'tote') return `${baseUrl}/api/v1/models/tote.glb`;
    if (resolvedViewerType === 'calendar') return `${baseUrl}/api/v1/models/calendar.glb`;
    if (resolvedViewerType === 'pin') return `${baseUrl}/api/v1/models/pin.glb`;
    return '';
  };

  const glbUrl = getEffectiveGlbUrl();

  // ─── Shared Scene Construction ─────────────────────────────────────────────
  const setupScene = (width: number, height: number) => {
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    if (!minimal) {
      scene.background = new THREE.Color(isShirt ? 0xffffff : 0xf9fafb);
    }

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    if (isShirt) {
      camera.position.set(0.35, 0.45, 3.9);
      camera.lookAt(0, -0.05, 0);
    } else {
      camera.position.set(0, 1.0, 4.4);
      camera.lookAt(0, 0, 0);
    }
    cameraRef.current = camera;

    // Studio Lighting matching web admin
    if (isShirt) {
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
      scene.add(new THREE.AmbientLight(0xffffff, 0.88));
      const key = new THREE.DirectionalLight(0xffffff, 1.5);
      key.position.set(2.5, 4, 2.5);
      scene.add(key);

      const fill = new THREE.DirectionalLight(0xdbeafe, 0.55);
      fill.position.set(-2.5, 1.5, -2);
      scene.add(fill);

      const rim = new THREE.DirectionalLight(0xffffff, 0.45);
      rim.position.set(0, 2, -3);
      scene.add(rim);
    }

    const group = new THREE.Group();
    scene.add(group);
    groupRef.current = group;

    return { scene, camera, group };
  };

  const addShadowDisc = (scene: THREE.Scene, target: THREE.Group) => {
    if (shadowDiscRef.current) {
      scene.remove(shadowDiscRef.current);
      shadowDiscRef.current.geometry?.dispose();
      (shadowDiscRef.current.material as THREE.Material)?.dispose();
      shadowDiscRef.current = null;
    }

    const b = new THREE.Box3().setFromObject(target);
    const sizeX = b.getSize(new THREE.Vector3()).x;
    const radius = Math.max(sizeX * (isShirt ? 0.36 : 0.48), 0.42);
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(radius, 32),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: isShirt ? 0.055 : 0.065 })
    );
    disc.rotation.x = -Math.PI / 2;
    disc.position.y = b.min.y + 0.05;
    scene.add(disc);
    shadowDiscRef.current = disc;
  };

  // ─── Custom Text & Logo Decal Projection ────────────────────────────────────
  // ─── Custom Text & Logo Decal Projection ────────────────────────────────────
  const applyCustomDecal = useCallback(
    (targetGroup: THREE.Group) => {
      // Guard: only project once model bounds are ready
      if (!modelBoxRef.current) return;

      // Always cleanly remove existing decal group
      if (decalGroupRef.current) {
        if (decalGroupRef.current.parent) {
          decalGroupRef.current.parent.remove(decalGroupRef.current);
        }
        decalGroupRef.current.traverse((o: any) => {
          if (o.isMesh) {
            o.geometry?.dispose();
            if (Array.isArray(o.material)) o.material.forEach((m: any) => m.dispose());
            else o.material?.dispose();
          }
        });
        decalGroupRef.current = null;
      }

      const effectiveText = customText?.trim() || '';
      const effectiveImage = (customImageUri || designImageUrl || '').trim();
      const hasText = effectiveText.length > 0;
      const hasImage = effectiveImage.length > 0;

      if (!hasText && !hasImage) return;

      const box = modelBoxRef.current;
      if (!box) return;

      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const maxZ = box.max.z;

      const decalGroup = new THREE.Group();
      decalGroup.userData = { isDecal: true };

      // ─── Drinkware (Mugs, Cups, Tumblers, Demitasse) ───────────────────────
      if (isVessel && vesselLabelRef.current && vcenterRef.current) {
        const label = vesselLabelRef.current;
        const vc = vcenterRef.current;
        const cylR = (label.rTop + label.rBottom) / 2;

        decalGroup.position.set(-vc.x, -vc.y, -vc.z);

        if (hasText) {
          const textY = hasImage
            ? label.y - label.height * 0.24 + customTextYOffset
            : label.y + customTextYOffset;
          const textScaleFactor = hasImage ? 0.75 : 1.0;
          const textMesh = build3DTextMesh({
            text: effectiveText,
            textColor: customTextColor,
            fontFamily: customFontFamily,
            fontSize: customFontSize * textScaleFactor,
            cylinderRadius: cylR,
            yOffset: textY,
          });
          decalGroup.add(textMesh);
        }

        if (hasImage) {
          const imgH = hasText
            ? Math.min(label.height * 0.48, cylR * 0.9)
            : Math.min(label.height * 0.82, cylR * 1.4);
          const imgW = imgH;
          const imgY = hasText ? label.y + label.height * 0.22 : label.y + customTextYOffset;

          loadUniversalTexture(effectiveImage, (tex) => {
            if (!tex || !decalGroupRef.current) return;
            const imgMesh = buildDecalImageMesh({
              texture: tex,
              width: imgW,
              height: imgH,
              cylinderRadius: cylR,
              yOffset: imgY,
            });
            decalGroup.add(imgMesh);
          });
        }

        targetGroup.add(decalGroup);
        decalGroupRef.current = decalGroup;
        return;
      }

      // ─── Apparel (T-Shirts) ────────────────────────────────────────────────
      if (isShirt) {
        const torsoW = size.x;
        const torsoH = size.y;

        if (hasText) {
          const textY = hasImage ? 0.05 + customTextYOffset : 0.2 + customTextYOffset;
          const textMesh = build3DTextMesh({
            text: effectiveText,
            textColor: customTextColor,
            fontFamily: customFontFamily,
            fontSize: customFontSize * (hasImage ? 0.75 : 1.0),
            yOffset: textY,
            zOffset: maxZ + 0.02,
          });
          decalGroup.add(textMesh);
        }

        if (hasImage) {
          const imgW = torsoW * (hasText ? 0.38 : 0.52);
          const imgH = imgW;
          const imgY = hasText ? 0.32 + customTextYOffset : 0.2 + customTextYOffset;

          loadUniversalTexture(effectiveImage, (tex) => {
            if (!tex || !decalGroupRef.current) return;
            const geo = new THREE.PlaneGeometry(imgW, imgH, 20, 20);
            applyShirtDecalDrape(geo, { centerY: 0, frontZ: 0, torsoW, torsoH, isBoxyHeavy: false });
            const mat = new THREE.MeshBasicMaterial({
              map: tex,
              transparent: true,
              side: THREE.DoubleSide,
              depthTest: true,
              depthWrite: false,
            });
            const shirtMesh = new THREE.Mesh(geo, mat);
            shirtMesh.userData = { isDecal: true };
            shirtMesh.renderOrder = 2;
            shirtMesh.position.set(0, imgY, maxZ + 0.015);
            decalGroup.add(shirtMesh);
          });
        }

        targetGroup.add(decalGroup);
        decalGroupRef.current = decalGroup;
        return;
      }

      // ─── Button Pins ───────────────────────────────────────────────────────
      if (isPin) {
        if (hasImage) {
          loadUniversalTexture(effectiveImage, (tex) => {
            if (!tex || !decalGroupRef.current) return;
            const decal = buildPinDecal(resolvedViewerType, tex);
            decal.userData = { isDecal: true };
            decal.renderOrder = 2;
            decalGroup.add(decal);
          });
        }

        if (hasText) {
          const textMesh = build3DTextMesh({
            text: effectiveText,
            textColor: customTextColor,
            fontFamily: customFontFamily,
            fontSize: customFontSize * (hasImage ? 0.6 : 0.85),
            yOffset: hasImage ? -0.25 : 0,
            zOffset: 0.12,
          });
          decalGroup.add(textMesh);
        }

        targetGroup.add(decalGroup);
        decalGroupRef.current = decalGroup;
        return;
      }

      // ─── Bags, Stickers, Calendars ─────────────────────────────────────────
      const baseW = Math.max(size.x * 0.55, 0.35);

      if (hasText) {
        const textY = hasImage ? center.y - baseW * 0.3 : center.y;
        const textMesh = build3DTextMesh({
          text: effectiveText,
          textColor: customTextColor,
          fontFamily: customFontFamily,
          fontSize: customFontSize * (hasImage ? 0.75 : 1.0),
          yOffset: textY,
          zOffset: maxZ + 0.02,
        });
        decalGroup.add(textMesh);
      }

      if (hasImage) {
        const imgW = hasText ? baseW * 0.75 : baseW;
        const imgH = imgW;
        const imgY = hasText ? center.y + baseW * 0.25 : center.y;

        loadUniversalTexture(effectiveImage, (tex) => {
          if (!tex || !decalGroupRef.current) return;
          const geo = new THREE.PlaneGeometry(imgW, imgH);
          const mat = new THREE.MeshBasicMaterial({
            map: tex,
            transparent: true,
            side: THREE.DoubleSide,
            depthTest: true,
            depthWrite: false,
          });
          const planeMesh = new THREE.Mesh(geo, mat);
          planeMesh.userData = { isDecal: true };
          planeMesh.renderOrder = 2;
          planeMesh.position.set(center.x, imgY, maxZ + 0.018);
          decalGroup.add(planeMesh);
        });
      }

      targetGroup.add(decalGroup);
      decalGroupRef.current = decalGroup;
    },
    [
      customText,
      customTextColor,
      customFontFamily,
      customFontSize,
      customTextYOffset,
      customImageUri,
      designImageUrl,
      isShirt,
      isVessel,
      isPin,
      resolvedViewerType,
    ]
  );

  // Re-apply decal whenever text, font, color, or image changes
  useEffect(() => {
    if (groupRef.current && modelBoxRef.current) {
      applyCustomDecal(groupRef.current);
    }
  }, [applyCustomDecal]);

  const populateGroup = (group: THREE.Group, scene: THREE.Scene, activeColor: string) => {
    // Clear old children
    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
    }
    decalGroupRef.current = null;

    const finish = (obj: THREE.Object3D) => {
      const box = new THREE.Box3().setFromObject(obj);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const s = 2.0 / (Math.max(size.x, size.y, size.z) || 1);
      obj.scale.multiplyScalar(s);
      obj.position.sub(center.clone().multiplyScalar(s));
      obj.updateMatrixWorld(true);
      // Compute unrotated local bounding box BEFORE adding to group
      modelBoxRef.current = new THREE.Box3().setFromObject(obj);
      group.add(obj);

      if (canTint) {
        obj.traverse((o) => {
          const mesh = o as THREE.Mesh;
          if (mesh.isMesh && !mesh.userData?.isDecal) {
            const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            mats.forEach((m) => {
              const sm = m as THREE.MeshStandardMaterial;
              if ('color' in sm) sm.color.set(activeColor);
            });
          }
        });
      }

      addShadowDisc(scene, group);
      applyCustomDecal(group);
      setLoading(false);
    };

    const finishVessel = () => {
      const targetType = resolvedViewerType;
      const built = buildVessel(targetType, activeColor);

      // Hero normalization: auto-scale smaller drinkware (e.g. espresso cup, teacup) to fill viewport
      const preBox = new THREE.Box3().setFromObject(built.group);
      const preSize = preBox.getSize(new THREE.Vector3());
      const maxDim = Math.max(preSize.x, preSize.y, preSize.z);
      if (maxDim < 1.65 && maxDim > 0) {
        const s = 1.85 / maxDim;
        built.group.scale.setScalar(s);
        built.label.rTop *= s;
        built.label.rBottom *= s;
        built.label.height *= s;
        built.label.y *= s;
      }

      vesselLabelRef.current = built.label;
      const vbox = new THREE.Box3().setFromObject(built.group);
      const vcenter = vbox.getCenter(new THREE.Vector3());
      vcenterRef.current = vcenter;
      built.group.position.sub(vcenter);
      built.group.updateMatrixWorld(true);
      // Compute unrotated local bounding box BEFORE adding to group
      modelBoxRef.current = new THREE.Box3().setFromObject(built.group);
      group.add(built.group);
      addShadowDisc(scene, group);
      applyCustomDecal(group);
      setLoading(false);
    };

    const finishBag = () => {
      const built = buildBag(viewerType, activeColor);
      const bbox = new THREE.Box3().setFromObject(built.group);
      const center = bbox.getCenter(new THREE.Vector3());
      built.group.position.sub(center);
      built.group.updateMatrixWorld(true);
      // Compute unrotated local bounding box BEFORE adding to group
      modelBoxRef.current = new THREE.Box3().setFromObject(built.group);
      group.add(built.group);
      addShadowDisc(scene, group);
      applyCustomDecal(group);
      setLoading(false);
    };

    const finishPin = () => {
      const built = buildPin(viewerType, activeColor);
      const preBox = new THREE.Box3().setFromObject(built.group);
      const preSize = preBox.getSize(new THREE.Vector3());
      const preCenter = preBox.getCenter(new THREE.Vector3());
      const maxDim = Math.max(preSize.x, preSize.y, preSize.z);
      const s = 1.9 / (maxDim || 1);
      built.group.scale.setScalar(s);
      built.group.position.sub(preCenter.clone().multiplyScalar(s));
      const bbox = new THREE.Box3().setFromObject(built.group);
      built.group.position.sub(bbox.getCenter(new THREE.Vector3()));
      built.group.updateMatrixWorld(true);
      // Compute unrotated local bounding box BEFORE adding to group
      modelBoxRef.current = new THREE.Box3().setFromObject(built.group);
      group.add(built.group);
      addShadowDisc(scene, group);
      applyCustomDecal(group);
      setLoading(false);
    };

    const finishShirtFromGLB = (obj: THREE.Object3D) => {
      const shirtGroup = obj as unknown as THREE.Group;
      const { fit, sizeRatio } = morphShirtGLB(shirtGroup, viewerType);
      const preBox = new THREE.Box3().setFromObject(obj);
      const preSize = preBox.getSize(new THREE.Vector3());
      const preCenter = preBox.getCenter(new THREE.Vector3());
      const maxDim = Math.max(preSize.x, preSize.y, preSize.z);
      const fitScale = maxDim > 10 ? (2.0 * sizeRatio) / maxDim : Math.min(1, 1.68 / (maxDim || 1));
      obj.scale.setScalar(fitScale);
      obj.position.sub(preCenter.clone().multiplyScalar(fitScale));
      const bbox = new THREE.Box3().setFromObject(obj);
      const center = bbox.getCenter(new THREE.Vector3());
      obj.position.sub(center);
      obj.updateMatrixWorld(true);
      // Compute unrotated local bounding box BEFORE adding to group
      modelBoxRef.current = new THREE.Box3().setFromObject(obj);
      group.add(obj);

      const trimContrast = fit.ringer ? shirtTrimContrast(activeColor) : null;
      obj.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach((m) => {
          const sm = m as THREE.MeshStandardMaterial;
          if (!('color' in sm)) return;
          if (trimContrast && SHIRT_TRIM_MATS.has(sm.name)) {
            sm.color.set(trimContrast);
            sm.roughness = 0.7;
          } else if (sm.name === 'PocketSeam') {
            // keep stitching
          } else {
            sm.color.set(activeColor);
            if (!fit.heavy) sm.roughness = 0.82;
            sm.metalness = 0.02;
          }
          sm.needsUpdate = true;
        });
      });

      addShadowDisc(scene, group);
      applyCustomDecal(group);
      setLoading(false);
    };

    // Route to appropriate builder or GLTF loader
    if (isVessel) {
      finishVessel();
    } else if (isShirt) {
      if (glbUrl) {
        setLoading(true);
        new GLTFLoader().load(
          glbUrl,
          (gltf) => {
            finishShirtFromGLB(gltf.scene as unknown as THREE.Group);
            setLoading(false);
          },
          undefined,
          (_err) => {
            // GLB not available — fall back to flat sticker preview silently
            finish(buildSticker(activeColor));
            setLoading(false);
          }
        );
      } else {
        finish(buildSticker(activeColor));
        setLoading(false);
      }
    } else if (resolvedViewerType === 'tote' && glbUrl) {
      setLoading(true);
      new GLTFLoader().load(
        glbUrl,
        (gltf) => {
          finish(gltf.scene);
          setLoading(false);
        },
        undefined,
        () => {
          finishBag();
        }
      );
    } else if (isBag) {
      finishBag();
    } else if (isPin && !glbUrl) {
      finishPin();
    } else if (glbUrl) {
      setLoading(true);
      new GLTFLoader().load(
        glbUrl,
        (gltf) => {
          finish(gltf.scene);
          setLoading(false);
        },
        undefined,
        (err) => {
          console.warn('[Product3DPreview] GLTF load error:', err);
          setLoadError('Could not load 3D model.');
          setLoading(false);
          finish(buildSticker(activeColor));
        }
      );
    } else {
      finish(buildSticker(activeColor));
      setLoading(false);
    }
  };

  // Color change update without reloading model
  useEffect(() => {
    if (!groupRef.current) return;
    const group = groupRef.current;

    group.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh && !mesh.userData?.isDecal) {
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach((m) => {
          const sm = m as THREE.MeshStandardMaterial;
          if ('color' in sm && sm.name !== 'PocketSeam') {
            if (isShirt && SHIRT_TRIM_MATS.has(sm.name)) {
              sm.color.set(shirtTrimContrast(color));
            } else {
              sm.color.set(color);
            }
            sm.needsUpdate = true;
          }
        });
      }
    });
  }, [color, isShirt]);

  // ─── Web Implementation ─────────────────────────────────────────────────────
  useEffect(() => {
    if (Platform.OS !== 'web' || !webMountRef.current) return;
    const mount = webMountRef.current;
    const st = stateRef.current;
    setLoadError('');

    const w = mount.clientWidth || 340;
    const h = mount.clientHeight || height;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    mount.innerHTML = '';
    mount.appendChild(renderer.domElement);
    webRendererRef.current = renderer;

    const { scene, camera, group } = setupScene(w, h);
    populateGroup(group, scene, color);

    const onResize = () => {
      const newW = mount.clientWidth || 340;
      const newH = mount.clientHeight || height;
      renderer.setSize(newW, newH);
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
    };

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(onResize);
      resizeObserver.observe(mount);
    }

    // Animation loop with damping/lerping
    let raf = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      group.rotation.y += (st.rotY - group.rotation.y) * 0.12;
      group.rotation.x += (st.rotX - group.rotation.x) * 0.12;
      renderer.render(scene, camera);
    };
    animate();

    // Universal rock-solid pointer dragging with window tracking
    const onPointerDown = (e: PointerEvent) => {
      e.preventDefault();
      st.dragging = true;
      st.lastX = e.clientX;
      st.lastY = e.clientY;
      try {
        mount.setPointerCapture(e.pointerId);
      } catch {}
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!st.dragging) return;
      e.preventDefault();
      const dx = e.clientX - st.lastX;
      const dy = e.clientY - st.lastY;
      st.rotY += dx * 0.012;
      st.rotX = Math.max(-0.4, Math.min(0.6, st.rotX + dy * 0.008));
      st.lastX = e.clientX;
      st.lastY = e.clientY;
    };

    const onPointerUp = (e: PointerEvent) => {
      st.dragging = false;
      try {
        mount.releasePointerCapture(e.pointerId);
      } catch {}
    };

    mount.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);

    return () => {
      cancelAnimationFrame(raf);
      if (resizeObserver) resizeObserver.disconnect();
      mount.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      renderer.dispose();
      if (renderer.domElement.parentElement === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [resolvedViewerType, glbUrl]);

  // ─── Native (iOS / Android) Implementation ──────────────────────────────────
  const prevDx = useRef(0);
  const prevDy = useRef(0);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        stateRef.current.dragging = true;
        prevDx.current = 0;
        prevDy.current = 0;
      },
      onPanResponderMove: (_, gestureState) => {
        const dx = gestureState.dx - prevDx.current;
        const dy = gestureState.dy - prevDy.current;
        stateRef.current.rotY += dx * 0.012;
        stateRef.current.rotX = Math.max(
          -0.4,
          Math.min(0.6, stateRef.current.rotX + dy * 0.008)
        );
        prevDx.current = gestureState.dx;
        prevDy.current = gestureState.dy;
      },
      onPanResponderRelease: () => {
        stateRef.current.dragging = false;
        prevDx.current = 0;
        prevDy.current = 0;
      },
      onPanResponderTerminate: () => {
        stateRef.current.dragging = false;
        prevDx.current = 0;
        prevDy.current = 0;
      },
    })
  ).current;

  const resetToFront = () => {
    stateRef.current.rotY = 0;
    stateRef.current.rotX = 0;
  };

  const onNativeContextCreate = useCallback(
    async (gl: any) => {
      try {
        // EXGL filter: suppress unhandled pixelStorei params (FLIP_Y, PREMULTIPLY_ALPHA)
        // that trigger console warnings in Expo Go
        const originalPixelStorei = gl.pixelStorei ? gl.pixelStorei.bind(gl) : null;
        if (originalPixelStorei) {
          gl.pixelStorei = (pname: number, param: any) => {
            if (pname === 0x0cf5) {
              return originalPixelStorei(pname, param);
            }
          };
        }

        const { drawingBufferWidth: w, drawingBufferHeight: h } = gl;
        const rendererClass = NativeRenderer || (THREE as any).WebGLRenderer;
        const renderer = new (rendererClass as any)({ gl, antialias: true, alpha: true });
        renderer.setSize(w, h);
        nativeRendererRef.current = renderer;

        const { scene, camera, group } = setupScene(w, h);
        populateGroup(group, scene, color);

        const animate = () => {
          rafRef.current = requestAnimationFrame(animate);
          const st = stateRef.current;
          group.rotation.y += (st.rotY - group.rotation.y) * 0.12;
          group.rotation.x += (st.rotX - group.rotation.x) * 0.12;
          renderer.render(scene, camera);
          gl.endFrameEXP();
        };
        animate();
      } catch (err) {
        console.warn('[Product3DPreview] native GL init error:', err);
      }
    },
    [resolvedViewerType, glbUrl]
  );

  return (
    <View style={styles.container}>
      {/* 3D Canvas Viewport */}
      <View
        style={[
          styles.canvasCard,
          { height },
          isShirt && styles.shirtCard,
          minimal && styles.minimalCard,
        ]}
        {...(Platform.OS !== 'web' ? panResponder.panHandlers : {})}>
        {Platform.OS === 'web' ? (
          <div
            ref={webMountRef as any}
            style={{
              width: '100%',
              height: '100%',
              position: 'relative',
              touchAction: 'none',
              cursor: 'grab',
              userSelect: 'none',
              WebkitUserSelect: 'none',
            }}
          />
        ) : (
          <GLView style={styles.glView} onContextCreate={onNativeContextCreate} />
        )}

        {/* Quick Reset to Front View Button */}
        <Pressable
          onPress={resetToFront}
          style={styles.frontViewBtn}
          hitSlop={8}>
          <Text style={styles.frontViewBtnText}>Front View</Text>
        </Pressable>

        {loading && (
          <View style={styles.loadingOverlay} pointerEvents="none">
            <ActivityIndicator size="small" color="#4B5563" />
            <Text style={styles.loadingText}>Loading 3D model…</Text>
          </View>
        )}
      </View>

      {/* Error Message */}
      {loadError ? <Text style={styles.errorText}>{loadError}</Text> : null}

      {/* Preview color swatches */}
      {canTint && !minimal && (
        <View style={styles.colorPaletteSection}>
          <Text style={styles.paletteLabel}>Preview color:</Text>
          <View style={styles.paletteRow}>
            {PALETTE.map((c) => (
              <Pressable
                key={c}
                onPress={() => setColor(c)}
                style={[
                  styles.swatch,
                  { backgroundColor: c },
                  color === c && styles.swatchActive,
                ]}
              />
            ))}
          </View>
        </View>
      )}

      {/* Instructions */}
      {!minimal && <Text style={styles.instructionText}>Drag to rotate.</Text>}

      {/* Credits attribution identical to web admin */}
      {!minimal && (
        <Text style={styles.creditsText}>
          Models: Kenney, Quaternius (CC0) • Tee: Poly by Google, Calendar: jeremy (CC-BY)
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  canvasCard: {
    width: '100%',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    overflow: 'hidden',
    position: 'relative',
  },
  shirtCard: {
    backgroundColor: '#FFFFFF',
  },
  minimalCard: {
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  glView: {
    width: '100%',
    height: '100%',
  },
  frontViewBtn: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    zIndex: 10,
    ...Platform.select({
      web: { boxShadow: '0 1px 3px rgba(0,0,0,0.10)' } as any,
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.10, shadowRadius: 2, elevation: 2 },
    }),
  },
  frontViewBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(248, 249, 252, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  errorText: {
    marginTop: 8,
    fontSize: 12,
    color: '#DC2626',
  },
  colorPaletteSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
  },
  paletteLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  paletteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  swatch: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  swatchActive: {
    borderWidth: 2,
    borderColor: '#111827',
    transform: [{ scale: 1.15 }],
  },
  instructionText: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '400',
    color: '#6B7280',
  },
  creditsText: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: '400',
    color: '#9CA3AF',
  },
});
