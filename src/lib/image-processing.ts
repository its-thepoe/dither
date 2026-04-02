export interface ProcessedImage {
  grayscale: Uint8Array;
  alpha: Uint8Array;
  /** Packed RGB per grid cell, length `width * height * 3` (un-premultiplied blurred sample). */
  rgb: Uint8Array;
  width: number;
  height: number;
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => {
      reject(new Error(`Failed to load image: ${src}`));
    };
    img.src = src;
  });
}

const imageElementCache = new Map<string, HTMLImageElement>();
const imageInflight = new Map<string, Promise<HTMLImageElement>>();

/** Resolves from cache when already loaded; dedupes concurrent loads for the same URL. */
export function loadImageCached(src: string): Promise<HTMLImageElement> {
  const cached = imageElementCache.get(src);
  if (cached && cached.complete && cached.naturalWidth > 0) {
    return Promise.resolve(cached);
  }
  const inflight = imageInflight.get(src);
  if (inflight) return inflight;

  const p = loadImage(src)
    .then((img) => {
      imageElementCache.set(src, img);
      imageInflight.delete(src);
      return img;
    })
    .catch((err) => {
      imageInflight.delete(src);
      throw err;
    });
  imageInflight.set(src, p);
  return p;
}

/** Start loading URLs early so first logo switch does not wait on cold network. */
export function warmImageCache(urls: readonly string[]): void {
  for (const url of urls) {
    void loadImageCached(url).catch(() => {});
  }
}

/**
 * Scale image to fit within maxDimension while preserving aspect ratio,
 * then sample at every `scale` pixels to create the dot grid.
 */
export function processImage(
  img: HTMLImageElement,
  maxDimension: number,
  scale: number,
  contrast: number,
  gamma: number,
  blur: number,
  highlightsCompression = 0
): ProcessedImage {
  const aspect = img.naturalWidth / img.naturalHeight;
  let outW: number, outH: number;
  if (aspect >= 1) {
    outW = maxDimension;
    outH = Math.round(maxDimension / aspect);
  } else {
    outH = maxDimension;
    outW = Math.round(maxDimension * aspect);
  }

  const srcW = img.naturalWidth;
  const srcH = img.naturalHeight;

  // Get alpha mask from the unblurred image so edges stay crisp
  const alphaCanvas = document.createElement("canvas");
  alphaCanvas.width = outW;
  alphaCanvas.height = outH;
  const alphaCtx = alphaCanvas.getContext("2d")!;
  alphaCtx.imageSmoothingEnabled = true;
  alphaCtx.imageSmoothingQuality = "high";
  alphaCtx.drawImage(img, 0, 0, outW, outH);
  const alphaData = alphaCtx.getImageData(0, 0, outW, outH).data;

  // Apply blur at source resolution with padding to avoid edge darkening
  const pad = Math.ceil(blur * 3);
  const srcCanvas = document.createElement("canvas");
  srcCanvas.width = srcW + pad * 2;
  srcCanvas.height = srcH + pad * 2;
  const srcCtx = srcCanvas.getContext("2d")!;

  if (blur > 0) {
    srcCtx.filter = `blur(${blur}px)`;
  }
  srcCtx.drawImage(img, pad, pad, srcW, srcH);
  srcCtx.filter = "none";

  // Downsample the blurred image to output grid
  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(srcCanvas, pad, pad, srcW, srcH, 0, 0, outW, outH);

  const imageData = ctx.getImageData(0, 0, outW, outH);
  const pixels = imageData.data;

  const sampledW = Math.ceil(outW / scale);
  const sampledH = Math.ceil(outH / scale);
  const grayscale = new Uint8Array(sampledW * sampledH);
  const alpha = new Uint8Array(sampledW * sampledH);
  const rgb = new Uint8Array(sampledW * sampledH * 3);

  const contrastFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));

  for (let sy = 0; sy < sampledH; sy++) {
    for (let sx = 0; sx < sampledW; sx++) {
      const px = Math.min(Math.round(sx * scale), outW - 1);
      const py = Math.min(Math.round(sy * scale), outH - 1);
      const idx = (py * outW + px) * 4;

      const r = pixels[idx];
      const g = pixels[idx + 1];
      const b = pixels[idx + 2];
      const blurredAlpha = pixels[idx + 3] / 255;

      alpha[sy * sampledW + sx] = alphaData[idx + 3];

      // Un-premultiply the blurred RGB so edge pixels retain their true color.
      // The separate alpha mask handles transparency cutoff in the dither step.
      let luma: number;
      if (blurredAlpha > 0.01) {
        luma = (0.299 * r + 0.587 * g + 0.114 * b) / blurredAlpha;
      } else {
        luma = 0;
      }

      if (contrast !== 0) {
        luma = contrastFactor * (luma - 128) + 128;
      }

      if (gamma !== 1.0) {
        luma = 255 * Math.pow(Math.max(0, luma / 255), 1 / gamma);
      }

      if (highlightsCompression > 0) {
        const norm = luma / 255;
        const compressed = norm < 0.5
          ? norm
          : 0.5 + (norm - 0.5) * (1 - highlightsCompression);
        luma = compressed * 255;
      }

      grayscale[sy * sampledW + sx] = Math.max(0, Math.min(255, Math.round(luma)));

      let ur = 0;
      let ug = 0;
      let ub = 0;
      if (blurredAlpha > 0.01) {
        ur = r / blurredAlpha;
        ug = g / blurredAlpha;
        ub = b / blurredAlpha;
      }
      const cell = (sy * sampledW + sx) * 3;
      rgb[cell] = Math.max(0, Math.min(255, Math.round(ur)));
      rgb[cell + 1] = Math.max(0, Math.min(255, Math.round(ug)));
      rgb[cell + 2] = Math.max(0, Math.min(255, Math.round(ub)));
    }
  }

  return { grayscale, alpha, rgb, width: sampledW, height: sampledH };
}
