export type DitherAlgorithm = "floyd-steinberg" | "bayer" | "blue-noise";

export interface DitherOptions {
  threshold: number;
  serpentine: boolean;
  errorStrength: number;
}

// prettier-ignore
const BAYER_8X8 = [
   0, 32,  8, 40,  2, 34, 10, 42,
  48, 16, 56, 24, 50, 18, 58, 26,
  12, 44,  4, 36, 14, 46,  6, 38,
  60, 28, 52, 20, 62, 30, 54, 22,
   3, 35, 11, 43,  1, 33,  9, 41,
  51, 19, 59, 27, 49, 17, 57, 25,
  15, 47,  7, 39, 13, 45,  5, 37,
  63, 31, 55, 23, 61, 29, 53, 21,
];

/**
 * Floyd-Steinberg error-diffusion dithering.
 * Returns packed Float32Array of [x,y, x,y, ...] for every "on" pixel.
 */
export function floydSteinberg(
  grayscale: Uint8Array,
  width: number,
  height: number,
  opts: DitherOptions,
  alpha?: Uint8Array
): Float32Array {
  const errors = new Float32Array(width * height);
  for (let i = 0; i < grayscale.length; i++) {
    errors[i] = grayscale[i];
  }

  const positions: number[] = [];
  const strength = opts.errorStrength;
  const hasAlpha = alpha && alpha.length === grayscale.length;

  for (let y = 0; y < height; y++) {
    const leftToRight = !opts.serpentine || y % 2 === 0;
    const startX = leftToRight ? 0 : width - 1;
    const endX = leftToRight ? width : -1;
    const step = leftToRight ? 1 : -1;

    for (let x = startX; x !== endX; x += step) {
      const idx = y * width + x;

      if (hasAlpha && alpha[idx] < 128) continue;

      const oldVal = errors[idx];
      const newVal = oldVal > opts.threshold ? 255 : 0;
      const err = (oldVal - newVal) * strength;

      if (newVal > 0) {
        positions.push(x, y);
      }

      const diffuse = (nx: number, ny: number, weight: number) => {
        if (nx < 0 || nx >= width || ny >= height) return;
        const ni = ny * width + nx;
        if (hasAlpha && alpha[ni] < 128) return;
        errors[ni] += err * weight;
      };

      diffuse(x + step, y, 7 / 16);
      diffuse(x - step, y + 1, 3 / 16);
      diffuse(x, y + 1, 5 / 16);
      diffuse(x + step, y + 1, 1 / 16);
    }
  }

  return new Float32Array(positions);
}

/**
 * Bayer ordered dithering with 8x8 matrix.
 */
export function bayerDither(
  grayscale: Uint8Array,
  width: number,
  height: number,
  opts: DitherOptions,
  alpha?: Uint8Array
): Float32Array {
  const positions: number[] = [];
  const bias = (opts.threshold - 128) / 255;
  const hasAlpha = alpha && alpha.length === grayscale.length;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (hasAlpha && alpha[idx] < 128) continue;
      const luma = grayscale[idx] / 255;
      const bayerVal = (BAYER_8X8[(y & 7) * 8 + (x & 7)] + 1) / 65;
      if (luma + bias > bayerVal) {
        positions.push(x, y);
      }
    }
  }

  return new Float32Array(positions);
}

/**
 * Blue noise threshold dithering.
 * `noiseData` is a Uint8Array of grayscale blue noise values (256x256 tiled).
 */
export function blueNoiseDither(
  grayscale: Uint8Array,
  width: number,
  height: number,
  noiseData: Uint8Array,
  noiseSize: number,
  opts: DitherOptions,
  alpha?: Uint8Array
): Float32Array {
  const positions: number[] = [];
  const bias = (opts.threshold - 128) / 255;
  const hasAlpha = alpha && alpha.length === grayscale.length;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (hasAlpha && alpha[idx] < 128) continue;
      const luma = grayscale[idx] / 255;
      const nx = x % noiseSize;
      const ny = y % noiseSize;
      const noiseVal = noiseData[ny * noiseSize + nx] / 255;
      if (luma + bias > noiseVal) {
        positions.push(x, y);
      }
    }
  }

  return new Float32Array(positions);
}

/**
 * Returns a Set of grid indices inside a rounded square.
 * radiusPct is the corner radius as a fraction of min(w, h).
 */
export function roundedSquareMask(w: number, h: number, radiusPct = 0.22): Set<number> {
  const r = Math.round(radiusPct * Math.min(w, h));
  const mask = new Set<number>();

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let inside = false;
      if (x >= r && x < w - r) {
        inside = y >= 0 && y < h;
      } else if (y >= r && y < h - r) {
        inside = x >= 0 && x < w;
      } else {
        const cx = x < r ? r : w - r - 1;
        const cy = y < r ? r : h - r - 1;
        const dx = x - cx;
        const dy = y - cy;
        inside = dx * dx + dy * dy <= r * r;
      }
      if (inside) mask.add(y * w + x);
    }
  }

  return mask;
}

/**
 * Invert a point set within a rounded-square mask.
 * Returns all mask points that are NOT in the original logo set,
 * matching Linear's pre-baked inversion approach.
 */
export function invertWithMask(
  positions: Float32Array,
  gridW: number,
  gridH: number,
  radiusPct = 0.22,
  alpha?: Uint8Array
): Float32Array {
  const mask = roundedSquareMask(gridW, gridH, radiusPct);
  const logoSet = new Set<number>();
  for (let i = 0; i < positions.length; i += 2) {
    logoSet.add(Math.round(positions[i + 1]) * gridW + Math.round(positions[i]));
  }

  const inverted: number[] = [];
  for (const idx of mask) {
    if (!logoSet.has(idx)) {
      if (alpha && alpha[idx] < 128) continue;
      inverted.push(idx % gridW, Math.floor(idx / gridW));
    }
  }

  return new Float32Array(inverted);
}

/**
 * Generate a procedural blue-noise-like texture when no image is available.
 * Uses a simple void-and-cluster approximation.
 */
export function generateBlueNoise(size: number): Uint8Array {
  const data = new Uint8Array(size * size);
  for (let i = 0; i < data.length; i++) {
    data[i] = Math.floor(Math.random() * 256);
  }

  for (let pass = 0; pass < 3; pass++) {
    const blurred = new Float32Array(data.length);
    const radius = 2;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        let sum = 0;
        let count = 0;
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const nx = (x + dx + size) % size;
            const ny = (y + dy + size) % size;
            sum += data[ny * size + nx];
            count++;
          }
        }
        blurred[y * size + x] = sum / count;
      }
    }
    for (let i = 0; i < data.length; i++) {
      const diff = data[i] - blurred[i];
      data[i] = Math.max(0, Math.min(255, Math.round(data[i] + diff * 0.5)));
    }
  }

  return data;
}
