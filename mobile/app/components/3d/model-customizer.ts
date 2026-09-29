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

export type CustomizationPlacement = 'front' | 'back' | 'left' | 'right' | 'wrap';

export interface PlacementOption {
  id: CustomizationPlacement;
  label: string;
  shortLabel: string;
  icon: string;
  description: string;
}

/**
 * Returns available printable areas and placement options tailored to each product's 3D geometry.
 */
export function getProductPlacementOptions(
  viewerType: string,
  category?: string
): {
  options: PlacementOption[];
  supportsWrap: boolean;
  defaultPlacement: CustomizationPlacement;
  wrapLabel: string;
} {
  const vt = (viewerType || '').toLowerCase();
  const cat = (category || '').toLowerCase();

  const isShirt =
    vt.includes('shirt') ||
    cat.includes('apparel') ||
    cat.includes('shirt') ||
    cat.includes('clothing');

  const isPin = vt.includes('pin') || cat.includes('pin');
  const isTote = vt.includes('tote') || cat.includes('bag');
  const isSticker = vt.includes('sticker');
  const isCalendar = vt.includes('calendar');

  // Drinkware / Cylindrical & Conical vessels (mugs, cups, tumblers, steins, demitasse, etc.)
  if (!isShirt && !isPin && !isTote && !isSticker && !isCalendar) {
    return {
      options: [
        { id: 'front', label: 'Front Center', shortLabel: 'Front', icon: 'square-outline', description: 'Placed centered on the front face' },
        { id: 'back', label: 'Back Center', shortLabel: 'Back', icon: 'tablet-landscape-outline', description: 'Placed on the opposite side' },
        { id: 'left', label: 'Left Profile', shortLabel: 'Left Side', icon: 'chevron-back-circle-outline', description: 'Placed on the left wall' },
        { id: 'right', label: 'Right (Handle)', shortLabel: 'Right Side', icon: 'chevron-forward-circle-outline', description: 'Placed near the handle side' },
        { id: 'wrap', label: 'Wrap Around', shortLabel: '🔄 Wrap Around', icon: 'sync-outline', description: 'Continuous all-around wrap hugging vessel curves' },
      ],
      supportsWrap: true,
      defaultPlacement: 'front',
      wrapLabel: 'Cylindrical Wrap Label',
    };
  }

  // Apparel / T-Shirts (all fits: regular, oversized, boxy, slim, etc.)
  if (isShirt) {
    return {
      options: [
        { id: 'front', label: 'Front Chest', shortLabel: 'Front', icon: 'shirt-outline', description: 'Centered on the chest surface' },
        { id: 'back', label: 'Back Print', shortLabel: 'Back', icon: 'swap-horizontal-outline', description: 'Upper back print surface' },
        { id: 'left', label: 'Left Chest (Pocket)', shortLabel: 'Left Chest', icon: 'bookmark-outline', description: 'Left chest / crest placement' },
        { id: 'right', label: 'Right Chest', shortLabel: 'Right Chest', icon: 'bookmark-outline', description: 'Right chest placement' },
        { id: 'wrap', label: 'Torso Band Wrap', shortLabel: '🔄 Torso Wrap', icon: 'sync-outline', description: 'Wrap band around the torso body' },
      ],
      supportsWrap: true,
      defaultPlacement: 'front',
      wrapLabel: 'Torso Band Wrap',
    };
  }

  // Tote Bags
  if (isTote) {
    return {
      options: [
        { id: 'front', label: 'Front Face', shortLabel: 'Front', icon: 'bag-outline', description: 'Front panel print area' },
        { id: 'back', label: 'Back Face', shortLabel: 'Back', icon: 'swap-horizontal-outline', description: 'Back panel print area' },
        { id: 'wrap', label: 'Wrap Around', shortLabel: '🔄 Wrap Around', icon: 'sync-outline', description: 'Continuous band wrap around the bag' },
      ],
      supportsWrap: true,
      defaultPlacement: 'front',
      wrapLabel: 'Full Bag Wrap',
    };
  }

  // Button Pins
  if (isPin) {
    return {
      options: [
        { id: 'front', label: 'Pin Face', shortLabel: 'Face', icon: 'disc-outline', description: 'Front circular face' },
      ],
      supportsWrap: false,
      defaultPlacement: 'front',
      wrapLabel: '',
    };
  }

  // Flat Products (Stickers, Calendars)
  return {
    options: [
      { id: 'front', label: 'Front Face', shortLabel: 'Front', icon: 'document-outline', description: 'Primary front surface' },
      { id: 'back', label: 'Back Side', shortLabel: 'Back', icon: 'swap-horizontal-outline', description: 'Reverse side' },
    ],
    supportsWrap: false,
    defaultPlacement: 'front',
    wrapLabel: '',
  };
}

export interface Build3DTextOptions {
  text: string;
  textColor?: string;
  fontFamily?: string;
  fontSize?: number; // baseline 48 - 104 from UI
  cylinderRadius?: number | null; // e.g. 1.025 for mugs
  cylinderRadiusTop?: number | null;
  cylinderRadiusBottom?: number | null;
  cylinderHeight?: number | null;
  yOffset?: number;
  xOffset?: number;
  zOffset?: number;
  rotation?: number; // 2D in-plane rotation in degrees
  scale?: number;
  placement?: CustomizationPlacement;
  angleOffset?: number;
  surfaceMeshes?: THREE.Mesh[]; // Optional meshes for shirt chest
  isShirt?: boolean;
}

/**
 * Generates true 3D vector text meshes that reliably render in any WebGL/EXGL environment
 * without requiring 2D HTML5 canvas. Curves naturally along cylinder bodies or fabric drape.
 */
export function build3DTextMesh(options: Build3DTextOptions): THREE.Group {
  const {
    text,
    textColor = '#111827',
    fontFamily,
    fontSize = 64,
    cylinderRadius = null,
    cylinderRadiusTop = null,
    cylinderRadiusBottom = null,
    yOffset = 0,
    xOffset = 0,
    zOffset = 0,
    rotation = 0,
    scale = 1.0,
    placement = 'front',
    angleOffset = 0,
    surfaceMeshes = null,
    isShirt = false,
  } = options;

  const group = new THREE.Group();
  group.userData = { isDecal: true };

  const trimmed = text.trim();
  if (!trimmed) return group;

  const font = resolveTypefaceFont(fontFamily);
  const lines = trimmed.split('\n');

  // Convert pixel UI size (48-104) to Three.js world scale, modified by user scale
  const baseSize = Math.max(0.06, Math.min(0.28, (fontSize / 64) * 0.15 * scale));
  const textDepth = 0.012;
  const lineHeight = baseSize * 1.35;
  const totalHeight = lines.length * lineHeight;
  const startY = yOffset + totalHeight / 2 - baseSize * 0.8;

  // Use MeshBasicMaterial for bright, unattenuated text colors across EXGL & WebGL1
  const textMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(textColor),
    side: THREE.DoubleSide,
    depthTest: true,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });

  const rad = (rotation * Math.PI) / 180;
  const cosR = Math.cos(rad);
  const sinR = Math.sin(rad);

  // Base angle around cylinder
  let baseTheta = 0;
  if (placement === 'back') baseTheta = Math.PI;
  else if (placement === 'left') baseTheta = -Math.PI / 2;
  else if (placement === 'right') baseTheta = Math.PI / 2;
  else if (placement === 'wrap') baseTheta = 0;

  baseTheta += angleOffset + (xOffset ? xOffset * Math.PI * 0.6 : 0);

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
    const maxArcWidth = cylinderRadius ? cylinderRadius * 1.45 : 1.35;
    const rawWidth = geo.boundingBox.max.x - geo.boundingBox.min.x;
    if (rawWidth > maxArcWidth && rawWidth > 0) {
      const s = maxArcWidth / rawWidth;
      geo.scale(s, s, 1);
    }

    const currentLineY = startY - idx * lineHeight;

    // 1. Surface placement on Apparel / T-Shirt
    if ((surfaceMeshes && surfaceMeshes.length > 0) || isShirt) {
      const pos = geo.attributes.position;
      const baseZ = zOffset || 0.38;
      const isBack = placement === 'back';
      const pocketShift = placement === 'left' ? -0.22 : placement === 'right' ? 0.22 : 0;

      for (let i = 0; i < pos.count; i++) {
        const lx = pos.getX(i);
        const ly = pos.getY(i);
        const z = pos.getZ(i);

        // In-plane 2D rotation
        const rx = lx * cosR - ly * sinR;
        const ry = lx * sinR + ly * cosR;

        const finalX = rx + pocketShift + xOffset;
        if (isBack) {
          // Curved back drape facing backwards (-Z)
          const curveZ = -baseZ + finalX * finalX * 0.45;
          pos.setXYZ(i, -finalX, ry, curveZ - z);
        } else {
          // Curved chest drape facing front (+Z)
          const curveZ = baseZ - finalX * finalX * 0.45;
          pos.setXYZ(i, finalX, ry, curveZ + z);
        }
      }
      geo.computeVertexNormals();
    } else if (cylinderRadius && cylinderRadius > 0) {
      // 2. Cylindrical & Conical projection wrapping around drinkware wall
      const R_nominal = cylinderRadius + 0.009;
      const rTop = (cylinderRadiusTop || cylinderRadius) + 0.009;
      const rBot = (cylinderRadiusBottom || cylinderRadius) + 0.009;
      const pos = geo.attributes.position;

      for (let i = 0; i < pos.count; i++) {
        const lx = pos.getX(i);
        const ly = pos.getY(i);
        const z = pos.getZ(i);

        // Apply in-plane rotation
        const rx = lx * cosR - ly * sinR;
        const ry = lx * sinR + ly * cosR;

        const localR = R_nominal;
        const theta = baseTheta + rx / localR;
        pos.setXYZ(i, (localR + z) * Math.sin(theta), ry, (localR + z) * Math.cos(theta));
      }
      geo.computeVertexNormals();
    } else {
      // 3. Flat placement (tote bag, pin, sticker)
      const pos = geo.attributes.position;
      const isBack = placement === 'back';
      const effZ = zOffset || 0.02;

      for (let i = 0; i < pos.count; i++) {
        const lx = pos.getX(i);
        const ly = pos.getY(i);
        const z = pos.getZ(i);

        const rx = lx * cosR - ly * sinR;
        const ry = lx * sinR + ly * cosR;

        if (isBack) {
          pos.setXYZ(i, -rx + xOffset, ry, -effZ - z);
        } else {
          pos.setXYZ(i, rx + xOffset, ry, effZ + z);
        }
      }
      geo.computeVertexNormals();
    }

    const mesh = new THREE.Mesh(geo, textMat);
    mesh.userData = { isDecal: true };
    mesh.renderOrder = 10;
    mesh.position.y = currentLineY;
    group.add(mesh);
  });

  return group;
}

export interface BuildCylinderWrapOptions {
  texture?: THREE.Texture | null;
  radiusTop: number;
  radiusBottom: number;
  height: number;
  y: number;
  spanDegrees?: number; // e.g. 270 or 360
  rotationDegrees?: number; // start angle in degrees
  side?: THREE.Side;
}

/**
 * Builds a curved cylindrical/conical wrap band directly adhering to drinkware walls.
 * Hugs the physical surface with zero floating and zero clipping inside.
 */
export function buildCylinderWrapMesh(options: BuildCylinderWrapOptions): THREE.Mesh {
  const {
    texture,
    radiusTop,
    radiusBottom,
    height,
    y,
    spanDegrees = 270,
    rotationDegrees = 0,
    side = THREE.DoubleSide,
  } = options;

  const spanRad = (Math.max(30, Math.min(360, spanDegrees)) / 360) * Math.PI * 2;
  const startRad = -spanRad / 2 + (rotationDegrees * Math.PI) / 180;

  const geo = new THREE.CylinderGeometry(
    radiusTop,
    radiusBottom,
    height,
    64,
    4,
    true,
    startRad,
    spanRad
  );

  const mat = new THREE.MeshBasicMaterial({
    map: texture || null,
    transparent: true,
    side,
    depthTest: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.userData = { isDecal: true, isWrap: true };
  mesh.position.y = y;
  mesh.renderOrder = 9;
  return mesh;
}

export interface BuildDecalImageOptions {
  texture: THREE.Texture;
  width?: number;
  height?: number;
  cylinderRadius?: number | null;
  cylinderRadiusTop?: number | null;
  cylinderRadiusBottom?: number | null;
  cylinderHeight?: number | null;
  yOffset?: number;
  xOffset?: number;
  zOffset?: number;
  rotation?: number; // degrees
  scale?: number;
  placement?: CustomizationPlacement;
  wrapSpan?: number; // degrees (90 to 360)
  wrapRotation?: number; // degrees
  isWrap?: boolean;
  isShirt?: boolean;
  shirtTorsoW?: number;
}

/**
 * Builds a curved or flat decal mesh for user-uploaded logo or artwork,
 * supporting Front, Back, Left, Right, and Wrap Around across all products.
 */
export function buildDecalImageMesh(options: BuildDecalImageOptions): THREE.Mesh {
  const {
    texture,
    width = 0.72,
    height = 0.72,
    cylinderRadius = null,
    cylinderRadiusTop = null,
    cylinderRadiusBottom = null,
    yOffset = 0,
    xOffset = 0,
    zOffset = 0,
    rotation = 0,
    scale = 1.0,
    placement = 'front',
    wrapSpan = 270,
    wrapRotation = 0,
    isWrap = false,
    isShirt = false,
  } = options;

  const effW = width * scale;
  const effH = height * scale;

  if (rotation !== 0) {
    texture.center.set(0.5, 0.5);
    texture.rotation = (rotation * Math.PI) / 180;
  }

  // 1. Wrap Around on Drinkware
  if ((isWrap || placement === 'wrap') && cylinderRadius && cylinderRadius > 0) {
    const rTop = (cylinderRadiusTop || cylinderRadius) + 0.008;
    const rBot = (cylinderRadiusBottom || cylinderRadius) + 0.008;
    return buildCylinderWrapMesh({
      texture,
      radiusTop: rTop,
      radiusBottom: rBot,
      height: effH,
      y: yOffset,
      spanDegrees: wrapSpan,
      rotationDegrees: wrapRotation + (xOffset ? xOffset * 180 : 0),
    });
  }

  // 2. Directional Decal on Drinkware (Front, Back, Left, Right)
  if (cylinderRadius && cylinderRadius > 0) {
    const R = cylinderRadius + 0.008;
    let baseTheta = 0;
    if (placement === 'back') baseTheta = Math.PI;
    else if (placement === 'left') baseTheta = -Math.PI / 2;
    else if (placement === 'right') baseTheta = Math.PI / 2;

    baseTheta += xOffset ? xOffset * Math.PI * 0.6 : 0;
    const arc = Math.min(Math.PI * 0.9, effW / R);
    const startRad = baseTheta - arc / 2;

    const rTop = (cylinderRadiusTop || cylinderRadius) + 0.008;
    const rBot = (cylinderRadiusBottom || cylinderRadius) + 0.008;

    const geo = new THREE.CylinderGeometry(rTop, rBot, effH, 32, 2, true, startRad, arc);

    const mat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
      depthTest: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.userData = { isDecal: true };
    mesh.position.y = yOffset;
    mesh.renderOrder = 9;
    return mesh;
  }

  // 3. Apparel / T-Shirt
  if (isShirt) {
    const geo = new THREE.PlaneGeometry(effW, effH, 16, 16);
    const pos = geo.attributes.position;
    const isBack = placement === 'back';
    const pocketShift = placement === 'left' ? -0.22 : placement === 'right' ? 0.22 : 0;
    const baseZ = zOffset || 0.38;

    for (let i = 0; i < pos.count; i++) {
      const lx = pos.getX(i);
      const ly = pos.getY(i);
      const finalX = lx + pocketShift + xOffset;

      if (isBack) {
        const curveZ = -baseZ + finalX * finalX * 0.45;
        pos.setXYZ(i, -finalX, ly, curveZ);
      } else {
        const curveZ = baseZ - finalX * finalX * 0.45;
        pos.setXYZ(i, finalX, ly, curveZ);
      }
    }
    geo.computeVertexNormals();

    const mat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
      depthTest: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.userData = { isDecal: true };
    mesh.position.y = yOffset;
    mesh.renderOrder = 9;
    return mesh;
  }

  // 4. Flat Decal (Tote Bag, Pin, Sticker, Calendar)
  const geo = new THREE.PlaneGeometry(effW, effH);
  const isBack = placement === 'back';
  const effZ = zOffset || 0.02;

  if (isBack) {
    geo.rotateY(Math.PI);
    geo.translate(-xOffset, 0, -effZ);
  } else {
    geo.translate(xOffset, 0, effZ);
  }

  const mat = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    side: THREE.DoubleSide,
    depthTest: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.userData = { isDecal: true };
  mesh.position.y = yOffset;
  mesh.renderOrder = 9;
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
