import { useCallback, useEffect, useRef } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';
import { GLView } from 'expo-gl';
import { Renderer } from 'expo-three';
import * as THREE from 'three';
// @ts-ignore
global.THREE = (global as any).THREE || THREE;

export type PinShape = 'round' | 'square' | 'rounded' | 'star' | 'heart' | 'shield';

export const PIN_SHAPES: { id: PinShape; label: string; icon: string; desc: string; price: string }[] = [
  { id: 'round', label: 'Round', icon: 'ellipse-outline', desc: '2.25" • Classic button', price: '₱1.50' },
  { id: 'square', label: 'Square', icon: 'square-outline', desc: '1.5" • Flat edge', price: '₱1.65' },
  { id: 'rounded', label: 'Rounded', icon: 'albums-outline', desc: '1.5" • Soft corners', price: '₱1.65' },
  { id: 'star', label: 'Star', icon: 'star-outline', desc: '45mm • 5-point', price: '₱1.90' },
  { id: 'heart', label: 'Heart', icon: 'heart-outline', desc: '40mm • Die-cut', price: '₱1.90' },
  { id: 'shield', label: 'Shield', icon: 'shield-outline', desc: '42mm • Crest', price: '₱2.00' },
];

const ENAMEL_COLORS: Record<PinShape, number> = {
  round: 0xffffff,
  square: 0xffffff,
  rounded: 0xffffff,
  star: 0xffffff,
  heart: 0xffffff,
  shield: 0xffffff,
};

const PIN_SCALE = 0.58;

// ─── Shape helpers ──────────────────────────────────────────────────────────
function createRoundedRectShape(w: number, h: number, r: number): THREE.Shape {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
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
function createStarShape(outer: number, inner: number, points = 5): THREE.Shape {
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
function createHeartShape(scale = 1): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(0, 0.6 * scale);
  s.bezierCurveTo(0.6 * scale, 0.9 * scale, 1.0 * scale, 0.5 * scale, 0, -0.5 * scale);
  s.bezierCurveTo(-1.0 * scale, 0.5 * scale, -0.6 * scale, 0.9 * scale, 0, 0.6 * scale);
  return s;
}
function createShieldShape(w: number, h: number): THREE.Shape {
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
function buildPinGeometry(shape: PinShape): THREE.BufferGeometry {
  const extrudeSettings: any = {
    depth: 0.14,
    bevelEnabled: true,
    bevelThickness: 0.025,
    bevelSize: 0.022,
    bevelSegments: 4,
    curveSegments: 24,
  };
  let shapeObj: THREE.Shape | null = null;
  if (shape === 'round') {
    const geo = new THREE.CylinderGeometry(0.98, 0.98, 0.14, 64);
    geo.rotateX(Math.PI / 2);
    return geo;
  }
  if (shape === 'square') shapeObj = createRoundedRectShape(1.7, 1.7, 0.06);
  else if (shape === 'rounded') shapeObj = createRoundedRectShape(1.7, 1.7, 0.28);
  else if (shape === 'star') shapeObj = createStarShape(0.95, 0.48, 5);
  else if (shape === 'heart') shapeObj = createHeartShape(0.85);
  else if (shape === 'shield') shapeObj = createShieldShape(1.55, 1.75);
  if (shapeObj) {
    const g = new THREE.ExtrudeGeometry(shapeObj, extrudeSettings);
    g.center();
    return g;
  }
  return new THREE.CylinderGeometry(0.9, 0.9, 0.14, 32);
}

// ─── Safety pin (matches reference image) ─────────────────────────────────
function buildSafetyPin(): THREE.Group {
  const g = new THREE.Group();
  const wireMat = new THREE.MeshStandardMaterial({ color: 0xaeb4c0 as any, metalness: 0.92, roughness: 0.18 });
  const plateMat = new THREE.MeshStandardMaterial({ color: 0xcbd1dc as any, metalness: 0.88, roughness: 0.22 });

  // Two rectangular anchor plates on back of button (like in image)
  const plateW = 0.26, plateH = 0.14, plateT = 0.018;
  const plateGeo = new THREE.BoxGeometry(plateW, plateH, plateT);
  // rounding not needed — flat
  const leftPlate = new THREE.Mesh(plateGeo, plateMat);
  leftPlate.position.set(-0.62, 0, 0.01);
  const rightPlate = new THREE.Mesh(plateGeo, plateMat);
  rightPlate.position.set(0.62, 0, 0.01);
  // small chamfer to look like stamped metal
  leftPlate.castShadow = true;
  rightPlate.castShadow = true;
  g.add(leftPlate);
  g.add(rightPlate);

  // Main pin wire — straight, spanning between plates (~1.48 long), slightly above back surface
  const pinLen = 1.44;
  const pinRad = 0.020;
  const wireGeo = new THREE.CylinderGeometry(pinRad, pinRad, pinLen, 12);
  wireGeo.rotateZ(Math.PI / 2);
  const wire = new THREE.Mesh(wireGeo, wireMat);
  wire.position.set(0.02, 0, 0.045);
  wire.castShadow = true;
  g.add(wire);

  // Wavy kink in middle (subtle U dip like reference)
  const kinkRad = 0.04;
  const kinkGeo = new THREE.TorusGeometry(kinkRad, pinRad, 8, 12, Math.PI);
  const kink = new THREE.Mesh(kinkGeo, wireMat);
  kink.rotation.z = Math.PI;
  kink.position.set(-0.06, -0.015, 0.045);
  g.add(kink);

  // Coil/Spring loop at right end (circular loop where pin hinges)
  const coilRadius = 0.072;
  const coilTube = 0.018;
  const coilGeo = new THREE.TorusGeometry(coilRadius, coilTube, 12, 20);
  const coil = new THREE.Mesh(coilGeo, wireMat);
  // Torus default in XY plane — rotate to YZ so loop is vertical and hinge along X
  coil.rotation.y = Math.PI / 2;
  coil.position.set(0.74, 0, 0.045);
  coil.castShadow = true;
  g.add(coil);
  // Second half of coil (double loop appearance) — smaller inner loop
  const coil2 = new THREE.Mesh(new THREE.TorusGeometry(coilRadius * 0.72, coilTube * 0.9, 10, 16), wireMat);
  coil2.rotation.y = Math.PI / 2;
  coil2.rotation.x = 0.35;
  coil2.position.set(0.745, 0, 0.045);
  g.add(coil2);

  // Hook keeper at left end — U-shaped catch where pin tip rests (like image blue callout)
  // Vertical wire loop under left plate + small hook
  const hookRadius = 0.055;
  const hookGeo = new THREE.TorusGeometry(hookRadius, pinRad, 8, 14, Math.PI);
  const hook = new THREE.Mesh(hookGeo, wireMat);
  hook.rotation.x = Math.PI / 2;
  hook.rotation.z = Math.PI;
  hook.position.set(-0.62, -0.065, 0.04);
  g.add(hook);
  // Tiny vertical post from hook up to wire level
  const postGeo = new THREE.CylinderGeometry(pinRad * 0.9, pinRad * 0.9, 0.07, 8);
  const post = new THREE.Mesh(postGeo, wireMat);
  post.position.set(-0.62, -0.03, 0.04);
  g.add(post);

  // Pin tip — slightly tapered where wire meets hook (small sharpened end)
  const tipGeo = new THREE.ConeGeometry(pinRad * 1.15, 0.07, 12);
  tipGeo.rotateZ(-Math.PI / 2);
  const tip = new THREE.Mesh(tipGeo, wireMat);
  tip.position.set(-0.70, 0, 0.045);
  g.add(tip);

  // Center the whole safety pin assembly slightly so it doesn't look off-center on smaller shapes
  // Already centered
  return g;
}

// ─── Round button pin — domed front like reference image ────────────────────
function buildRoundButtonPin(capMat: THREE.Material, rimMat: THREE.Material, backMat: THREE.Material): THREE.Group {
  const g = new THREE.Group();

  // Back plate — flat white disc (matte)
  const backGeo = new THREE.CylinderGeometry(0.94, 0.94, 0.05, 64);
  backGeo.rotateX(Math.PI / 2);
  const back = new THREE.Mesh(backGeo, backMat);
  back.position.z = -0.04;
  back.receiveShadow = true;
  g.add(back);

  // Mid rim cylinder — metal crimp edge (side wall)
  const midGeo = new THREE.CylinderGeometry(0.985, 0.985, 0.11, 64);
  midGeo.rotateX(Math.PI / 2);
  const mid = new THREE.Mesh(midGeo, rimMat);
  mid.position.z = 0.015;
  mid.castShadow = true;
  g.add(mid);

  // Outer torus rim highlight — thin glossy ring like image
  const rimGeo = new THREE.TorusGeometry(0.985, 0.045, 14, 64);
  const rimFront = new THREE.Mesh(rimGeo, rimMat);
  rimFront.position.z = 0.068;
  const rimBack = new THREE.Mesh(rimGeo, rimMat);
  rimBack.position.z = -0.055;
  g.add(rimFront);
  g.add(rimBack);

  // Front domed lens — shallow spherical cap for glossy button look (clear plastic)
  // Sphere radius 2.1 → dome height ~0.26 for r=0.985
  const domeR = 1.85;
  const thetaLen = 0.58; // radians
  const domeGeo = new THREE.SphereGeometry(domeR, 48, 24, 0, Math.PI * 2, 0, thetaLen);
  domeGeo.rotateX(Math.PI / 2); // cap facing +Z
  // Sphere cap base at y = R*cos(theta) → after rotate, base at Z = R*cos(theta) below top
  // Translate so base sits at z=0.07 (on top of rim)
  const baseOffset = domeR * Math.cos(thetaLen);
  domeGeo.translate(0, 0, -baseOffset + 0.07);
  // Gloss dome — MeshStandard to avoid EXT_color_buffer_float / transmission float-buffer on WebGL1
  const domeMat = new THREE.MeshStandardMaterial({
    color: 0xffffff as any,
    roughness: 0.16,
    metalness: 0.04,
  } as any);
  // add subtle env sheen via emissive? keep simple standard
  const dome = new THREE.Mesh(domeGeo, domeMat);
  dome.castShadow = false;
  g.add(dome);

  // Inner white disc under dome (enamel) — ensures dome edge doesn't show gap
  const innerGeo = new THREE.CircleGeometry(0.975, 64);
  const inner = new THREE.Mesh(innerGeo, capMat);
  inner.position.z = 0.0701;
  g.add(inner);

  // Safety pin assembly on back
  const safety = buildSafetyPin();
  safety.position.z = -0.068;
  safety.position.y = 0.02;
  g.add(safety);

  return g;
}

// ─── Reusable viewer ───────────────────────────────────────────────────────
type Props = {
  shape: PinShape;
  color?: string;
  style?: any;
  height?: number;
  autoRotate?: boolean;
  onLoad?: () => void;
};

export function Pin3DViewer({ shape, color, height = 380, autoRotate = true, onLoad, style }: Props) {
  const pinGroupRef = useRef<THREE.Group | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const requestRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);
  const prevDxRef = useRef(0);
  const autoRotateSpeedRef = useRef(0.006);

  const shapeRef = useRef(shape);
  shapeRef.current = shape;

  const buildPinMesh = useCallback((currentShape: PinShape) => {
    const capMat = new THREE.MeshStandardMaterial({
      color: color ? new THREE.Color(color as any) : ENAMEL_COLORS[currentShape],
      roughness: 0.28,
      metalness: 0.05,
    });
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0xcdd3de as any,
      roughness: 0.22,
      metalness: 0.78,
    });
    const backMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc as any,
      roughness: 0.85,
      metalness: 0.02,
    });

    if (currentShape === 'round') {
      const group = buildRoundButtonPin(capMat, rimMat, backMat);
      return group as unknown as THREE.Mesh;
    }

    // other shapes — extruded
    const geo = buildPinGeometry(currentShape);
    const sideMat = rimMat;
    const mesh = new THREE.Mesh(geo, [sideMat, capMat] as any);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const safety = buildSafetyPin();
    safety.position.z = -0.14;
    // scale safety slightly smaller for stars/hearts so it fits backing
    safety.scale.set(0.85, 0.85, 0.85);
    const wrap = new THREE.Group();
    wrap.add(mesh);
    wrap.add(safety);
    return wrap as unknown as THREE.Mesh;
  }, [color]);

  const onContextCreate = useCallback(async (gl: any) => {
    try {
      const { drawingBufferWidth: w, drawingBufferHeight: h } = gl;
      let renderer: any;
      // expo-gl is WebGL1 + no multisample — must disable antialias or EXGL throws renderbufferStorageMultisample
      try { renderer = new (Renderer as any)({ gl, antialias: false, alpha: false }); } catch { renderer = new (THREE as any).WebGLRenderer({ context: gl, antialias: false, alpha: false } as any); }
      if (renderer.setSize) renderer.setSize(w, h);
      else if (renderer.setSizeAsync) await renderer.setSizeAsync(w, h);
      if (renderer.setClearColor) renderer.setClearColor(0xf3f4f6);
      // shadows disabled on native to avoid EXT_color_buffer_float + float framebuffer
      if (renderer.shadowMap) { renderer.shadowMap.enabled = false; }
      rendererRef.current = renderer as unknown as THREE.WebGLRenderer;

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0xf3f4f6 as any);
      scene.fog = new THREE.Fog(0xf3f4f6 as any, 5, 10);

      const camera = new THREE.PerspectiveCamera(34, w / h, 0.1, 100);
      camera.position.set(0, 0, 3.35);
      camera.lookAt(0, 0, 0);

      const ambient = new THREE.AmbientLight(0xffffff, 0.92);
      scene.add(ambient);
      const dir = new THREE.DirectionalLight(0xffffff, 1.18);
      dir.position.set(2.4, 3.2, 2.6);
      dir.castShadow = true;
      dir.shadow.mapSize.set(1024, 1024);
      scene.add(dir);
      const fill = new THREE.DirectionalLight(0xdbeafe, 0.48);
      fill.position.set(-2.2, 1.1, -1.4);
      scene.add(fill);
      const point = new THREE.PointLight(0xffffff, 0.5, 10);
      point.position.set(0, 2.4, 2);
      scene.add(point);
      // soft rim light to catch dome gloss like reference
      const rimLight = new THREE.DirectionalLight(0xffffff, 0.35);
      rimLight.position.set(-1.5, 2.0, -2.0);
      scene.add(rimLight);

      const pinGroup = new THREE.Group();
      pinGroup.scale.set(PIN_SCALE, PIN_SCALE, PIN_SCALE);
      pinGroupRef.current = pinGroup;
      const pin = buildPinMesh(shapeRef.current);
      pinGroup.add(pin as any);
      scene.add(pinGroup);

      const groundGeo = new THREE.PlaneGeometry(8, 8);
      const groundMat = new THREE.MeshStandardMaterial({ color: 0xf3f4f6 as any, roughness: 1 });
      const ground = new THREE.Mesh(groundGeo, groundMat);
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = -1.2;
      ground.receiveShadow = true;
      scene.add(ground);
      const shadowGeo = new THREE.CircleGeometry(0.78, 32);
      const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.07 });
      const shadow = new THREE.Mesh(shadowGeo, shadowMat);
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.y = -1.195;
      scene.add(shadow);

      pinGroup.rotation.x = 0.52;
      pinGroup.rotation.y = -0.32;
      pinGroup.rotation.z = 0.03;

      onLoad?.();

      let lastTime = Date.now();
      const animate = () => {
        requestRef.current = requestAnimationFrame(animate as any);
        const now = Date.now();
        const dt = Math.min(32, now - lastTime) / 16.66;
        lastTime = now;
        if (!isDraggingRef.current && pinGroupRef.current && autoRotate) {
          pinGroupRef.current.rotation.y += autoRotateSpeedRef.current * dt;
        }
        if (pinGroupRef.current && !isDraggingRef.current) {
          pinGroupRef.current.position.y = Math.sin(now * 0.0011) * 0.045;
        }
        // @ts-ignore
        renderer.render(scene, camera);
        gl.endFrameEXP();
      };
      animate();
    } catch (e) {
      console.error('[Pin3D] onContextCreate failed', e);
    }
  }, [autoRotate, buildPinMesh, onLoad]);

  useEffect(() => {
    if (!pinGroupRef.current) return;
    const group = pinGroupRef.current;
    while (group.children.length > 0) {
      const c: any = group.children[0];
      group.remove(c);
      if (c.geometry) c.geometry.dispose?.();
      if (c.material) {
        if (Array.isArray(c.material)) c.material.forEach((m: any) => m.dispose?.());
        else c.material.dispose?.();
      }
      c.traverse?.((child: any) => {
        if (child.geometry) child.geometry.dispose?.();
        if (child.material) {
          if (Array.isArray(child.material)) child.material.forEach((m: any) => m.dispose?.());
          else child.material.dispose?.();
        }
      });
    }
    const newPin = buildPinMesh(shape);
    group.add(newPin as any);
  }, [shape, buildPinMesh]);

  useEffect(() => {
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current as any);
      try { (rendererRef.current as any)?.dispose?.(); } catch {}
    };
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        isDraggingRef.current = true;
        prevDxRef.current = 0;
        autoRotateSpeedRef.current = 0;
      },
      onPanResponderMove: (_, g) => {
        const dx = g.dx - prevDxRef.current;
        prevDxRef.current = g.dx;
        if (pinGroupRef.current) {
          pinGroupRef.current.rotation.y += dx * 0.012;
          pinGroupRef.current.rotation.x = Math.max(0.05, Math.min(1.15, pinGroupRef.current.rotation.x - g.vy * 0.004));
        }
      },
      onPanResponderRelease: (_, g) => {
        isDraggingRef.current = false;
        prevDxRef.current = 0;
        const vx = g.vx;
        autoRotateSpeedRef.current = Math.max(-0.025, Math.min(0.025, vx * 0.015 || 0.006));
        if (Math.abs(autoRotateSpeedRef.current) < 0.002) autoRotateSpeedRef.current = 0.006;
        setTimeout(() => (autoRotateSpeedRef.current = 0.006), 900);
      },
      onPanResponderTerminate: () => {
        isDraggingRef.current = false;
        prevDxRef.current = 0;
        autoRotateSpeedRef.current = 0.006;
      },
    })
  ).current;

  return (
    <View style={[styles.stage, { height }, style]} {...panResponder.panHandlers}>
      <GLView style={styles.gl} onContextCreate={onContextCreate} />
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { backgroundColor: '#F3F4F6', position: 'relative', overflow: 'hidden' },
  gl: { flex: 1 },
});
