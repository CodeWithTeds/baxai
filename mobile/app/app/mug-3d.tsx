import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { GLView } from 'expo-gl';
import { Renderer } from 'expo-three';
import * as THREE from 'three';
// expo-three polyfills document/window for THREE on RN
// @ts-ignore
global.THREE = (global as any).THREE || THREE;

import { BrandColors } from '@/constants/theme';

// ─── Component ────────────────────────────────────────────────────────────────
export default function Mug3DScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [loading, setLoading] = useState(true);
  const [webGLSupported, setWebGLSupported] = useState(true);

  // refs for three objects — mutable to allow gesture to mutate instantly
  const mugGroupRef = useRef<THREE.Group | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const requestRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);
  const prevDxRef = useRef(0);
  const autoRotateSpeedRef = useRef(0.006);
  const glRef = useRef<any>(null);

  const onContextCreate = useCallback(async (gl: any) => {
    glRef.current = gl;
    try {
      const { drawingBufferWidth: w, drawingBufferHeight: h } = gl;

      // Renderer via expo-three — expo-gl is WebGL1 + no multisample, so antialias must be false or EXGL throws renderbufferStorageMultisample
      let renderer: any;
      try {
        renderer = new (Renderer as any)({ gl, antialias: false, alpha: false });
      } catch (e) {
        console.warn('[Mug3D] expo-three Renderer failed, fallback to raw', e);
        renderer = new (THREE as any).WebGLRenderer({ context: gl, antialias: false, alpha: false } as any);
      }
      // expo-three Renderer uses setSize/clearColor like THREE
      if (renderer.setSize) renderer.setSize(w, h);
      else if (renderer.setSizeAsync) await renderer.setSizeAsync(w, h);
      if (renderer.setClearColor) renderer.setClearColor(0xf3f4f6);
      if (renderer.shadowMap) {
        renderer.shadowMap.enabled = false;
      }
      rendererRef.current = renderer as unknown as THREE.WebGLRenderer;

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0xf3f4f6 as any);
      // fog for depth
      scene.fog = new THREE.Fog(0xf3f4f6 as any, 6, 12);
      sceneRef.current = scene;

      const camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 100);
      camera.position.set(0, 1.6, 3.8);
      camera.lookAt(0, 0, 0);
      cameraRef.current = camera;

      // ── Lights ───────────────────────────────────────────────
      const ambient = new THREE.AmbientLight(0xffffff, 0.85);
      scene.add(ambient);

      const dir = new THREE.DirectionalLight(0xffffff, 1.1);
      dir.position.set(2.5, 4, 2);
      dir.castShadow = true;
      dir.shadow.mapSize.set(1024, 1024);
      scene.add(dir);

      const fill = new THREE.DirectionalLight(0xdbeafe, 0.5);
      fill.position.set(-2, 2, -2);
      scene.add(fill);

      const point = new THREE.PointLight(0xffffff, 0.6, 10);
      point.position.set(0, 3, 2);
      scene.add(point);

      // ── Mug Group — just the cup, no decal/texture ─────────────────────────
      const MUG_SCALE = 0.68;
      const mugGroup = new THREE.Group();
      mugGroup.scale.set(MUG_SCALE, MUG_SCALE, MUG_SCALE);
      mugGroupRef.current = mugGroup;

      // Ceramic material
      const ceramicMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.28,
        metalness: 0.02,
      });

      // 1) Outer body — lathe for subtle taper + bottom
      const bodyProfile: THREE.Vector2[] = [];
      const height = 1.9;
      const topR = 1.02;
      const bottomR = 0.92;
      const thickness = 0.08;
      // outer wall
      for (let i = 0; i <= 24; i++) {
        const t = i / 24;
        const y = -height / 2 + t * height;
        // slight bulge
        const r = THREE.MathUtils.lerp(bottomR, topR, t) + Math.sin(t * Math.PI) * 0.03;
        bodyProfile.push(new THREE.Vector2(r, y));
      }
      const outerGeo = new THREE.LatheGeometry(bodyProfile, 48);
      const outerMesh = new THREE.Mesh(outerGeo, ceramicMat);
      outerMesh.castShadow = true;
      outerMesh.receiveShadow = true;
      mugGroup.add(outerMesh);

      // inner wall (hollow look)
      const innerProfile: THREE.Vector2[] = [];
      for (let i = 0; i <= 24; i++) {
        const t = i / 24;
        const y = -height / 2 + thickness + t * (height - thickness * 2 + 0.12);
        const r = THREE.MathUtils.lerp(bottomR - thickness, topR - thickness, t) + Math.sin(t * Math.PI) * 0.02;
        innerProfile.push(new THREE.Vector2(r, y));
      }
      const innerGeo = new THREE.LatheGeometry(innerProfile, 48);
      // flip normals for inside
      innerGeo.scale(-1, 1, 1);
      const innerMat = new THREE.MeshStandardMaterial({
        color: 0xfafafa,
        roughness: 0.32,
        side: THREE.DoubleSide,
      });
      const innerMesh = new THREE.Mesh(innerGeo, innerMat);
      innerMesh.receiveShadow = true;
      mugGroup.add(innerMesh);

      // bottom cap
      const bottomGeo = new THREE.CircleGeometry(bottomR - 0.02, 48);
      const bottomMesh = new THREE.Mesh(bottomGeo, ceramicMat);
      bottomMesh.rotation.x = -Math.PI / 2;
      bottomMesh.position.y = -height / 2 + 0.01;
      bottomMesh.receiveShadow = true;
      mugGroup.add(bottomMesh);

      // rim torus for thickness highlight
      const rimGeo = new THREE.TorusGeometry(topR - thickness / 2, thickness / 2, 12, 48);
      const rimMesh = new THREE.Mesh(rimGeo, ceramicMat);
      rimMesh.rotation.x = Math.PI / 2;
      rimMesh.position.y = height / 2;
      mugGroup.add(rimMesh);

      // 2) Handle — C shape with inset to hide seam (no visible gap)
      const handleR = 0.50;
      const handleTube = 0.14;
      const handleGeo = new THREE.TorusGeometry(handleR, handleTube, 18, 36, Math.PI);
      const handleMesh = new THREE.Mesh(handleGeo, ceramicMat);
      // inset 0.07 into wall so tube penetrates and hides curved-wall gap
      handleMesh.position.set(topR - 0.07, 0, 0);
      handleMesh.rotation.z = -Math.PI / 2;
      handleMesh.castShadow = true;
      handleMesh.receiveShadow = true;
      mugGroup.add(handleMesh);
      // blend caps at top/bottom attachment to hide still-visible crescent
      const capGeo = new THREE.SphereGeometry(handleTube * 0.98, 16, 12);
      const capTop = new THREE.Mesh(capGeo, ceramicMat);
      capTop.position.set(topR - 0.02, handleR, 0);
      capTop.scale.set(1, 0.9, 0.9);
      mugGroup.add(capTop);
      const capBot = new THREE.Mesh(capGeo, ceramicMat);
      capBot.position.set(topR - 0.02, -handleR, 0);
      capBot.scale.set(1, 0.9, 0.9);
      mugGroup.add(capBot);

      // 3) Ground shadow catcher
      const groundGeo = new THREE.PlaneGeometry(6, 6);
      const groundMat = new THREE.MeshStandardMaterial({
        color: 0xf3f4f6,
        roughness: 1,
      });
      const ground = new THREE.Mesh(groundGeo, groundMat);
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = -1.05;
      ground.receiveShadow = true;
      scene.add(ground);

      // subtle shadow disc under mug (fake AO) — scaled with MUG_SCALE
      const shadowGeo = new THREE.CircleGeometry(0.92, 32);
      const shadowMat = new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.08,
      });
      const shadowDisc = new THREE.Mesh(shadowGeo, shadowMat);
      shadowDisc.rotation.x = -Math.PI / 2;
      shadowDisc.position.y = -1.04;
      scene.add(shadowDisc);

      scene.add(mugGroup);

      // initial tilt for nice presentation
      mugGroup.rotation.x = 0.08;
      mugGroup.rotation.y = 0.45;
      mugGroup.position.y = 0.05;

      setLoading(false);

      // ── Render loop ──────────────────────────────────────────
      let lastTime = Date.now();
      const animate = () => {
        requestRef.current = requestAnimationFrame(animate as any);
        const now = Date.now();
        const dt = Math.min(32, now - lastTime) / 16.66;
        lastTime = now;

        if (!isDraggingRef.current && mugGroupRef.current) {
          mugGroupRef.current.rotation.y += autoRotateSpeedRef.current * dt;
        }
        // gentle bob
        if (mugGroupRef.current && !isDraggingRef.current) {
          mugGroupRef.current.position.y = 0.05 + Math.sin(now * 0.0012) * 0.04;
          mugGroupRef.current.rotation.x = 0.08 + Math.sin(now * 0.0009) * 0.04;
        }

        // @ts-ignore renderer is expo-three Renderer
        renderer.render(scene, camera);
        gl.endFrameEXP();
      };
      animate();
    } catch (e) {
      console.error('[Mug3D] onContextCreate failed', e);
      setWebGLSupported(false);
      setLoading(false);
    }
  }, []);

  // cleanup
  useEffect(() => {
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current as any);
      // dispose three resources
      try {
        if (rendererRef.current) {
          // @ts-ignore
          rendererRef.current.dispose?.();
        }
      } catch {}
    };
  }, []);

  // ── Gestures: drag to rotate, pinch via two-finger not yet — vertical drag tilts x
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        isDraggingRef.current = true;
        prevDxRef.current = 0;
        autoRotateSpeedRef.current = 0;
      },
      onPanResponderMove: (_, gesture) => {
        const deltaX = gesture.dx - prevDxRef.current;
        const deltaY = gesture.dy - prevDxRef.current * 0.0;
        prevDxRef.current = gesture.dx;
        if (mugGroupRef.current) {
          mugGroupRef.current.rotation.y += deltaX * 0.012;
          // clamp x tilt
          const newX = mugGroupRef.current.rotation.x + deltaY * 0.000 * 0; // ignore y for now to keep stable
          // subtle tilt on vertical drag if you want:
          mugGroupRef.current.rotation.x = Math.max(-0.25, Math.min(0.5, mugGroupRef.current.rotation.x - gesture.vy * 0.002));
        }
        // vertical drag subtly moves camera
        if (cameraRef.current) {
          // optional dolly on vertical? keep simple
        }
      },
      onPanResponderRelease: (_, gesture) => {
        isDraggingRef.current = false;
        prevDxRef.current = 0;
        // resume auto-rotate with inertia from velocity
        const vx = gesture.vx;
        autoRotateSpeedRef.current = Math.max(-0.025, Math.min(0.025, vx * 0.015 || 0.006));
        // if almost still, set default
        if (Math.abs(autoRotateSpeedRef.current) < 0.002) autoRotateSpeedRef.current = 0.006;
        // slowly decay back to 0.006 if flung fast — lerp over time in loop? keep simple
        setTimeout(() => {
          autoRotateSpeedRef.current = 0.006;
        }, 900);
      },
      onPanResponderTerminate: () => {
        isDraggingRef.current = false;
        prevDxRef.current = 0;
        autoRotateSpeedRef.current = 0.006;
      },
    })
  ).current;

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color="#111827" />
        </Pressable>
        <Text style={styles.headerTitle}>Custom Mug — 3D Preview</Text>
        <Pressable onPress={() => router.push('/(tabs)/services' as any)} style={({ pressed }) => [styles.headerCart, pressed && { opacity: 0.6 }]}>
          <Ionicons name="bag-outline" size={20} color={BrandColors.primary} />
        </Pressable>
      </View>

      {/* 3D Stage */}
      <View style={styles.stage} {...panResponder.panHandlers}>
        {Platform.OS === 'web' ? (
          // Web fallback — GLView on web works, but if no WebGL show image
          <View style={styles.webFallback}>
            <Image source={require('@/assets/images/custom-mugs.jpeg')} style={styles.webImg} contentFit="cover" />
            <View style={styles.webBadge}>
              <Ionicons name="cube-outline" size={14} color="#fff" />
              <Text style={styles.webBadgeText}>3D — drag to spin (native)</Text>
            </View>
          </View>
        ) : !webGLSupported ? (
          <View style={styles.fallback}>
            <Image source={require('@/assets/images/custom-mugs.jpeg')} style={styles.fallbackImg} contentFit="contain" />
            <Text style={styles.fallbackText}>3D unavailable on this device</Text>
          </View>
        ) : (
          <>
            <GLView style={styles.gl} onContextCreate={onContextCreate} />
            {/* Loading overlay */}
            {loading && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color={BrandColors.primary} />
                <Text style={styles.loadingText}>Crafting your mug in 3D…</Text>
              </View>
            )}
            {/* Hint pill */}
            {!loading && (
              <View style={styles.hintPill}>
                <Ionicons name="hand-left-outline" size={14} color="#6B7280" />
                <Text style={styles.hintText}>Drag to rotate • flick to spin</Text>
              </View>
            )}
            {/* Price badge */}
            <View style={styles.pricePill}>
              <Text style={styles.priceText}>From ₱9.99</Text>
            </View>
          </>
        )}
      </View>

      {/* Details */}
      <View style={styles.sheet}>
        {/* Handle notch */}
        <View style={styles.notch} />
        <View style={styles.sheetHeader}>
          <View style={{ flex: 1 }}>
            <View style={styles.badgeRow}>
              <View style={[styles.badge, { backgroundColor: BrandColors.primary }]}>
                <Ionicons name="star" size={10} color="#fff" />
                <Text style={styles.badgeText}>Bestseller</Text>
              </View>
              <View style={styles.stockBadge}>
                <View style={styles.stockDot} />
                <Text style={styles.stockText}>In stock</Text>
              </View>
            </View>
            <Text style={styles.title}>Custom Ceramic Mug</Text>
            <Text style={styles.subtitle}>11oz • High-gloss • Dishwasher safe • Full-wrap print</Text>
          </View>
          <Pressable style={({ pressed }) => [styles.wishBtn, pressed && { opacity: 0.7 }]}>
            <Ionicons name="heart-outline" size={20} color="#6B7280" />
          </Pressable>
        </View>

        {/* Print area legend */}
        <View style={styles.legend}>
          <View style={styles.legendDot} />
          <Text style={styles.legendText}>Plain white ceramic — ready for your custom artwork</Text>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <View style={styles.priceBlock}>
            <Text style={styles.priceLabel}>Starting at</Text>
            <Text style={styles.price}>₱9.99</Text>
          </View>
          <Pressable style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.9 }]}>
            <Text style={styles.primaryText}>Customize</Text>
            <Ionicons name="color-palette-outline" size={16} color="#fff" />
          </Pressable>
          <Pressable style={({ pressed }) => [styles.cartBtn, pressed && { opacity: 0.85 }]}>
            <Ionicons name="cart-outline" size={18} color={BrandColors.primary} />
          </Pressable>
        </View>

        <Text style={styles.footnote}>Pinch not yet — drag horizontally. Tap back to return to services.</Text>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F3F4F6' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: Platform.OS === 'ios' ? 52 : 16,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 15, fontWeight: '700', color: '#111827', fontFamily: 'Manrope_700Bold' },
  headerCart: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stage: {
    height: 380,
    backgroundColor: '#F3F4F6',
    position: 'relative',
    overflow: 'hidden',
  },
  gl: { flex: 1 },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(243,244,246,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: { fontSize: 13, color: '#6B7280', fontFamily: 'Inter_400Regular' },
  hintPill: {
    position: 'absolute',
    bottom: 14,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  hintText: { fontSize: 11, color: '#6B7280', fontFamily: 'Inter_500Medium' },
  pricePill: {
    position: 'absolute',
    top: 14,
    left: 14,
    backgroundColor: '#111827',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  priceText: { color: '#fff', fontSize: 12, fontWeight: '700', fontFamily: 'Manrope_700Bold' },
  webFallback: { flex: 1, position: 'relative' },
  webImg: { width: '100%', height: '100%' },
  webBadge: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 6,
    backgroundColor: 'rgba(17,24,39,0.85)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    alignItems: 'center',
  },
  webBadgeText: { color: '#fff', fontSize: 11, fontFamily: 'Inter_500Medium' },
  fallback: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 16 },
  fallbackImg: { width: '70%', height: 220 },
  fallbackText: { color: '#9CA3AF', fontSize: 12, fontFamily: 'Inter_400Regular' },
  sheet: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    marginTop: -16,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
  },
  notch: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', marginBottom: 14 },
  sheetHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700', fontFamily: 'Manrope_700Bold' },
  stockBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F0FDF4', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  stockDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22C55E' },
  stockText: { color: '#15803D', fontSize: 11, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  title: { fontSize: 18, fontWeight: '800', color: '#111827', fontFamily: 'Manrope_700Bold', marginBottom: 4 },
  subtitle: { fontSize: 12, color: '#6B7280', fontFamily: 'Inter_400Regular', lineHeight: 16 },
  wishBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F9FAFB', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#F3F4F6' },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, backgroundColor: '#F9FAFB', padding: 10, borderRadius: 10 },
  legendDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB' },
  legendText: { fontSize: 11, color: '#6B7280', fontFamily: 'Inter_400Regular', flex: 1 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 18 },
  priceBlock: { flex: 1 },
  priceLabel: { fontSize: 11, color: '#9CA3AF', fontFamily: 'Inter_400Regular' },
  price: { fontSize: 22, fontWeight: '800', color: BrandColors.primary, fontFamily: 'Manrope_700Bold' },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: BrandColors.primary,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
  },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 14, fontFamily: 'Manrope_700Bold' },
  cartBtn: { width: 46, height: 46, borderRadius: 14, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
  footnote: { marginTop: 12, fontSize: 11, color: '#9CA3AF', textAlign: 'center', fontFamily: 'Inter_400Regular' },
});
