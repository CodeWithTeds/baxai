import { Platform } from 'react-native';
import * as THREE from 'three';
import { Font, FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';

// Pre-packaged Typeface JSON fonts from Three.js examples (zero external network requests)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const helvetikerBoldJson = require('three/examples/fonts/helvetiker_bold.typeface.json');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const droidSerifBoldJson = require('three/examples/fonts/droid/droid_serif_bold.typeface.json');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const optimerBoldJson = require('three/examples/fonts/optimer_bold.typeface.json');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const droidSansMonoJson = require('three/examples/fonts/droid/droid_sans_mono_regular.typeface.json');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const gentilisBoldJson = require('three/examples/fonts/gentilis_bold.typeface.json');

const fontLoader = new FontLoader();

const fontCache: Record<string, Font> = {
  modern: fontLoader.parse(helvetikerBoldJson),
  serif: fontLoader.parse(droidSerifBoldJson),
  bold: fontLoader.parse(optimerBoldJson),
  mono: fontLoader.parse(droidSansMonoJson),
  playful: fontLoader.parse(gentilisBoldJson),
};

export function resolveTypefaceFont(familyOrId?: string): Font {
  if (!familyOrId) return fontCache.modern;
  const lower = familyOrId.toLowerCase();
  if (lower.includes('serif') || lower.includes('georgia') || lower.includes('times')) {
    return fontCache.serif;
  }
  if (lower.includes('impact') || lower.includes('black') || lower.includes('bold')) {
    return fontCache.bold;
  }
  if (lower.includes('mono') || lower.includes('courier') || lower.includes('retro')) {
    return fontCache.mono;
  }
  if (lower.includes('cursive') || lower.includes('brush') || lower.includes('caveat') || lower.includes('playful') || lower.includes('comic')) {
    return fontCache.playful;
  }
  return fontCache.modern;
}

export interface Build3DTextOptions {
  text: string;
  textColor?: string;
  fontFamily?: string;
  fontSize?: number; // baseline 48 - 104 from UI
  cylinderRadius?: number | null; // e.g. 1.025 for mugs
  yOffset?: number;
  zOffset?: number;
}

/**
 * Generates true 3D vector text meshes that reliably render in any WebGL/EXGL environment
 * without requiring 2D HTML5 canvas. Curves naturally along cylinder bodies.
 */
export function build3DTextMesh(options: Build3DTextOptions): THREE.Group {
  const {
    text,
    textColor = '#111827',
    fontFamily,
    fontSize = 64,
    cylinderRadius = null,
    yOffset = 0,
    zOffset = 0,
  } = options;

  const group = new THREE.Group();
  group.userData = { isDecal: true };

  const trimmed = text.trim();
  if (!trimmed) return group;

  const font = resolveTypefaceFont(fontFamily);
  const lines = trimmed.split('\n');

  // Convert pixel UI size (48-104) to Three.js world scale (0.10 - 0.22)
  const baseSize = Math.max(0.09, Math.min(0.24, (fontSize / 64) * 0.15));
  const textDepth = 0.018;
  const lineHeight = baseSize * 1.35;
  const totalHeight = lines.length * lineHeight;
  const startY = yOffset + (totalHeight / 2) - baseSize * 0.8;

  // Use MeshBasicMaterial for bright, unattenuated text colors across EXGL & WebGL1
  const textMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(textColor),
    side: THREE.DoubleSide,
    depthTest: true,
  });

  lines.forEach((line, idx) => {
    const cleanLine = line.trim();
    if (!cleanLine) return;

    const geo = new TextGeometry(cleanLine, {
      font,
      size: baseSize,
      height: textDepth,
      curveSegments: 3,
      bevelEnabled: true,
      bevelThickness: 0.002,
      bevelSize: 0.002,
      bevelOffset: 0,
      bevelSegments: 2,
    });

    geo.computeBoundingBox();
    if (!geo.boundingBox) return;

    // Center geometry on its local origin
    const center = geo.boundingBox.getCenter(new THREE.Vector3());
    geo.translate(-center.x, -center.y, -geo.boundingBox.min.z);

    // Auto-fit long lines so they stay within visible front arc
    const maxArcWidth = cylinderRadius ? cylinderRadius * 1.35 : 1.15;
    const rawWidth = geo.boundingBox.max.x - geo.boundingBox.min.x;
    if (rawWidth > maxArcWidth && rawWidth > 0) {
      const scale = maxArcWidth / rawWidth;
      geo.scale(scale, scale, 1);
    }

    // Cylindrical projection wrapping around mug curvature
    if (cylinderRadius && cylinderRadius > 0) {
      const R = cylinderRadius + 0.008;
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        const z = pos.getZ(i);
        const theta = x / R;
        pos.setXYZ(i, (R + z) * Math.sin(theta), y, (R + z) * Math.cos(theta));
      }
      geo.computeVertexNormals();
    } else {
      // Flat placement (shirt chest, tote bag, pin)
      geo.translate(0, 0, zOffset);
    }

    const mesh = new THREE.Mesh(geo, textMat);
    mesh.userData = { isDecal: true };
    mesh.renderOrder = 3;
    mesh.position.y = startY - idx * lineHeight;
    group.add(mesh);
  });

  return group;
}

export interface BuildDecalImageOptions {
  texture: THREE.Texture;
  width?: number;
  height?: number;
  cylinderRadius?: number | null;
  yOffset?: number;
  zOffset?: number;
}

/**
 * Builds a curved or flat decal mesh for user-uploaded logo or artwork.
 */
export function buildDecalImageMesh(options: BuildDecalImageOptions): THREE.Mesh {
  const {
    texture,
    width = 0.72,
    height = 0.72,
    cylinderRadius = null,
    yOffset = 0,
    zOffset = 0,
  } = options;

  let geo: THREE.BufferGeometry;

  if (cylinderRadius && cylinderRadius > 0) {
    // 24 segments horizontally to smoothly hug the cylindrical wall
    const planeGeo = new THREE.PlaneGeometry(width, height, 24, 1);
    const R = cylinderRadius;
    const pos = planeGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const theta = x / R;
      pos.setXYZ(i, R * Math.sin(theta), y, R * Math.cos(theta));
    }
    planeGeo.computeVertexNormals();
    geo = planeGeo;
  } else {
    geo = new THREE.PlaneGeometry(width, height);
    if (zOffset !== 0) {
      geo.translate(0, 0, zOffset);
    }
  }

  const mat = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    side: THREE.DoubleSide,
    depthTest: true,
    depthWrite: false,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.userData = { isDecal: true };
  mesh.renderOrder = 2;
  mesh.position.y = yOffset;
  return mesh;
}

/**
 * Universal texture loader: loads image from Web or Native Expo EXGL safely.
 */
export function loadUniversalTexture(
  uri: string,
  onLoaded: (texture: THREE.Texture | null) => void
): void {
  if (!uri || !uri.trim()) {
    onLoaded(null);
    return;
  }

  const cleanUri = uri.trim();

  if (Platform.OS === 'web') {
    const loader = new THREE.TextureLoader();
    // Do not apply crossOrigin to base64 data URLs
    if (cleanUri.startsWith('http://') || cleanUri.startsWith('https://')) {
      loader.setCrossOrigin('anonymous');
    }
    loader.load(
      cleanUri,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.needsUpdate = true;
        onLoaded(tex);
      },
      undefined,
      (err) => {
        console.warn('[Decal] Web texture load error:', err);
        onLoaded(null);
      }
    );
    return;
  }

  // Native (iOS/Android Expo) via expo-three loadTextureAsync
  try {
    let loaderFn: any = null;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const exp3 = require('expo-three');
      loaderFn = exp3.loadTextureAsync;
    } catch {}
    if (!loaderFn) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        loaderFn = require('expo-three/build/loaders/loadTextureAsync').loadTextureAsync;
      } catch {}
    }

    if (loaderFn) {
      loaderFn({ asset: cleanUri })
        .then((tex: any) => {
          if (tex) {
            tex.colorSpace = THREE.SRGBColorSpace;
            tex.needsUpdate = true;
          }
          onLoaded(tex || null);
        })
        .catch((err: any) => {
          console.warn('[Decal] Native loadTextureAsync error:', err);
          onLoaded(null);
        });
    } else {
      console.warn('[Decal] loadTextureAsync could not be resolved');
      onLoaded(null);
    }
  } catch (err) {
    console.warn('[Decal] expo-three loadTextureAsync unavailable:', err);
    onLoaded(null);
  }
}
