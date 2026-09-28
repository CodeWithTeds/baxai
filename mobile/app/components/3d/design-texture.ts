import * as THREE from 'three';

export interface DesignTextureOptions {
  text?: string;
  textColor?: string;
  fontFamily?: string;
  fontSize?: number;
  imageUri?: string;
}

/**
 * Creates or updates a dynamic 2D texture containing custom text and uploaded image/logo.
 * Guaranteed crash-proof across Web browsers, Expo polyfills, and native runtimes.
 */
export function createDesignCanvasTexture(
  options: DesignTextureOptions,
  onLoaded: (texture: THREE.Texture | null) => void
): void {
  const {
    text = '',
    textColor = '#111827',
    fontFamily = 'system-ui, -apple-system, sans-serif',
    fontSize = 64,
    imageUri,
  } = options;

  const trimmedText = text.trim();
  const hasText = trimmedText.length > 0;
  const hasImage = Boolean(imageUri && imageUri.trim().length > 0);

  if (!hasText && !hasImage) {
    onLoaded(null);
    return;
  }

  // 1. Real HTML5 2D Canvas (Web & supported polyfill runtimes)
  let canvas: HTMLCanvasElement | null = null;
  let ctx: CanvasRenderingContext2D | null = null;

  try {
    const doc =
      typeof window !== 'undefined' && window.document
        ? window.document
        : typeof document !== 'undefined'
        ? document
        : null;

    if (doc && typeof doc.createElement === 'function') {
      canvas = doc.createElement('canvas');
      canvas.width = 1024;
      canvas.height = 1024;
      if (canvas && typeof canvas.getContext === 'function') {
        const c = canvas.getContext('2d');
        if (c && typeof c.fillText === 'function') {
          ctx = c as CanvasRenderingContext2D;
        }
      }
    }
  } catch (e) {
    console.warn('[DesignTexture] Canvas context check error:', e);
  }

  if (canvas && ctx) {
    try {
      // Clear canvas buffer safely
      if (typeof ctx.clearRect === 'function') {
        ctx.clearRect(0, 0, 1024, 1024);
      } else {
        canvas.width = 1024;
      }

      const drawText = (yPos: number) => {
        if (!hasText) return;
        if (typeof ctx.save === 'function') ctx.save();
        ctx.font = `bold ${fontSize}px ${fontFamily}`;
        ctx.fillStyle = textColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // High-contrast subtle outline/shadow
        ctx.shadowColor =
          textColor.toUpperCase() === '#FFFFFF' ? 'rgba(0,0,0,0.65)' : 'rgba(255,255,255,0.65)';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;

        const lines = trimmedText.split('\n');
        const lineHeight = fontSize * 1.25;
        const startY = yPos - ((lines.length - 1) * lineHeight) / 2;

        lines.forEach((line, index) => {
          ctx.fillText(line, 512, startY + index * lineHeight);
        });
        if (typeof ctx.restore === 'function') ctx.restore();
      };

      const finishCanvas = () => {
        const tex = new THREE.CanvasTexture(canvas!);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 8;
        tex.needsUpdate = true;
        onLoaded(tex);
      };

      // Case A: Image is present (either image-only or image + text)
      if (hasImage && imageUri) {
        const img =
          typeof window !== 'undefined' && (window as any).Image
            ? new (window as any).Image()
            : new Image();

        // ONLY set crossOrigin for remote http(s) URLs; setting it on data: or blob: triggers CORS errors
        if (
          typeof imageUri === 'string' &&
          (imageUri.startsWith('http://') || imageUri.startsWith('https://'))
        ) {
          img.crossOrigin = 'anonymous';
        }

        img.onload = () => {
          const maxDim = hasText ? 480 : 720;
          const aspect = img.width && img.height ? img.width / img.height : 1;
          let drawW = maxDim;
          let drawH = drawW / aspect;
          if (drawH > maxDim) {
            drawH = maxDim;
            drawW = drawH * aspect;
          }
          const imgY = hasText ? 360 : 512;
          ctx.drawImage(img, 512 - drawW / 2, imgY - drawH / 2, drawW, drawH);
          if (hasText) {
            drawText(imgY + drawH / 2 + fontSize * 1.15);
          }
          finishCanvas();
        };

        img.onerror = (err: any) => {
          console.warn('[DesignTexture] Image load error:', err);
          if (hasText) {
            drawText(512);
            finishCanvas();
          } else {
            onLoaded(null);
          }
        };

        img.src = imageUri;
        return;
      }

      // Case B: Text-only (no image)
      if (hasText) {
        drawText(512);
        finishCanvas();
        return;
      }
    } catch (e) {
      console.warn('[DesignTexture] Canvas rendering failed:', e);
    }
  }

  // 2. Direct TextureLoader fallback for image on native devices
  if (hasImage && imageUri) {
    try {
      new THREE.TextureLoader().load(
        imageUri,
        (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.needsUpdate = true;
          onLoaded(tex);
        },
        undefined,
        () => onLoaded(null)
      );
      return;
    } catch {}
  }

  onLoaded(null);
}
