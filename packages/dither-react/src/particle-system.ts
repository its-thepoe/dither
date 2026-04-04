export interface Shockwave {
  x: number;
  y: number;
  start: number;
}

export interface DotSystem {
  count: number;
  baseX: Float32Array;
  baseY: Float32Array;
  dx: Float32Array;
  dy: Float32Array;
  brightness: Float32Array;
  tint: Float32Array;
  size: number;
  /** Per-dot RGB when `dotColorMode === 'sampled'`; length `count * 3`. */
  dotRgb?: Uint8Array;
}

export const DEFAULT_SHOCKWAVE_SPEED = 225;
export const DEFAULT_SHOCKWAVE_WIDTH = 37;
export const DEFAULT_SHOCKWAVE_STRENGTH = 20;
const SHOCKWAVE_DURATION = 675;
export const DEFAULT_MOUSE_RADIUS = 100;
export const DEFAULT_MOUSE_FORCE_PEAK = 40;
const EASING = 0.12;
const SNAP_THRESHOLD = 0.01;

export interface UpdateDotsOptions {
  /** When false, dots snap to rest and shockwaves are cleared (e.g. prefers-reduced-motion). */
  interactionEnabled?: boolean;
  /**
   * Scales pointer radius, pointer force, and shockwave speed/width/strength (default 1).
   * Use values &lt; 1 on small canvases to reduce edge clipping.
   */
  interactionScale?: number;
}

export function parseHexToRgb(hex: string): { r: number; g: number; b: number } {
  const s = hex.trim();
  if (!s.startsWith("#")) return { r: 0, g: 0, b: 0 };
  const h = s.slice(1);
  let r = 0;
  let g = 0;
  let b = 0;
  if (h.length === 3) {
    r = parseInt(h[0] + h[0], 16);
    g = parseInt(h[1] + h[1], 16);
    b = parseInt(h[2] + h[2], 16);
  } else if (h.length === 6 || h.length === 8) {
    r = parseInt(h.slice(0, 2), 16);
    g = parseInt(h.slice(2, 4), 16);
    b = parseInt(h.slice(4, 6), 16);
  }
  if (!Number.isFinite(r) || !Number.isFinite(g) || !Number.isFinite(b)) {
    return { r: 0, g: 0, b: 0 };
  }
  return {
    r: Math.max(0, Math.min(255, r)),
    g: Math.max(0, Math.min(255, g)),
    b: Math.max(0, Math.min(255, b)),
  };
}

export function createDotSystem(
  points: Float32Array,
  scaleFactor: number,
  dotScale: number,
  offsetX: number,
  offsetY: number
): DotSystem {
  const count = points.length / 2;
  const baseX = new Float32Array(count);
  const baseY = new Float32Array(count);
  const dx = new Float32Array(count);
  const dy = new Float32Array(count);
  const brightness = new Float32Array(count);
  const tint = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    baseX[i] = offsetX + points[i * 2] * scaleFactor;
    baseY[i] = offsetY + points[i * 2 + 1] * scaleFactor;
    brightness[i] = 1;
    tint[i] = 1;
  }

  return { count, baseX, baseY, dx, dy, brightness, tint, size: scaleFactor * dotScale };
}

export function attachDotRgb(
  sys: DotSystem,
  positions: Float32Array,
  rgb: Uint8Array,
  gw: number,
  gh: number
): void {
  const dotRgb = new Uint8Array(sys.count * 3);
  for (let i = 0; i < sys.count; i++) {
    const x = Math.round(positions[i * 2]);
    const y = Math.round(positions[i * 2 + 1]);
    const cx = Math.max(0, Math.min(gw - 1, x));
    const cy = Math.max(0, Math.min(gh - 1, y));
    const idx = (cy * gw + cx) * 3;
    dotRgb[i * 3] = rgb[idx];
    dotRgb[i * 3 + 1] = rgb[idx + 1];
    dotRgb[i * 3 + 2] = rgb[idx + 2];
  }
  sys.dotRgb = dotRgb;
}

export function updateDots(
  sys: DotSystem,
  mouseX: number,
  mouseY: number,
  mouseActive: boolean,
  shockwaves: Shockwave[],
  now: number,
  opts?: UpdateDotsOptions
): boolean {
  const { count, baseX, baseY, dx, dy } = sys;

  const interactionEnabled = opts?.interactionEnabled !== false;
  const scale = Math.max(0.05, Math.min(4, opts?.interactionScale ?? 1));

  const mouseRadius = DEFAULT_MOUSE_RADIUS * scale;
  const mouseRadiusSq = mouseRadius * mouseRadius;
  const mousePeak = DEFAULT_MOUSE_FORCE_PEAK * scale;
  const shockSpeed = DEFAULT_SHOCKWAVE_SPEED * scale;
  const shockWidth = DEFAULT_SHOCKWAVE_WIDTH * scale;
  const shockStrength = DEFAULT_SHOCKWAVE_STRENGTH * scale;

  if (!interactionEnabled) {
    shockwaves.length = 0;
    for (let i = 0; i < count; i++) {
      dx[i] = 0;
      dy[i] = 0;
    }
    return false;
  }

  let numActive = shockwaves.length;
  for (let k = shockwaves.length - 1; k >= 0; k--) {
    if (now - shockwaves[k].start >= SHOCKWAVE_DURATION) {
      shockwaves.splice(k, 1);
      numActive--;
    }
  }

  const shockMultiplier = numActive > 0 ? 1 + 0.5 * (numActive - 1) : 0;
  let hasMotion = false;

  for (let i = 0; i < count; i++) {
    let targetFx = 0;
    let targetFy = 0;

    if (mouseActive) {
      const vx = baseX[i] + dx[i] - mouseX;
      const vy = baseY[i] + dy[i] - mouseY;
      const dist2 = vx * vx + vy * vy;

      if (dist2 > 0.1 && dist2 < mouseRadiusSq) {
        const dist = Math.sqrt(dist2);
        const falloff = 1 - dist / mouseRadius;
        const force = falloff * falloff * falloff * mousePeak;
        targetFx += (vx / dist) * force;
        targetFy += (vy / dist) * force;
      }
    }

    for (let k = 0; k < shockwaves.length; k++) {
      const sw = shockwaves[k];
      const elapsed = now - sw.start;
      const radius = (elapsed / 1000) * shockSpeed;
      const life = 1 - elapsed / SHOCKWAVE_DURATION;

      const sx = baseX[i] - sw.x;
      const sy = baseY[i] - sw.y;
      const dist = Math.sqrt(sx * sx + sy * sy);

      if (dist >= 0.1) {
        const band = Math.abs(dist - radius);
        if (band < shockWidth) {
          const waveForce =
            (1 - band / shockWidth) * life * shockStrength * shockMultiplier;
          targetFx += (sx / dist) * waveForce;
          targetFy += (sy / dist) * waveForce;
        }
      }
    }

    dx[i] += (targetFx - dx[i]) * EASING;
    dy[i] += (targetFy - dy[i]) * EASING;

    if (Math.abs(dx[i]) < SNAP_THRESHOLD) dx[i] = 0;
    if (Math.abs(dy[i]) < SNAP_THRESHOLD) dy[i] = 0;

    if (dx[i] !== 0 || dy[i] !== 0) hasMotion = true;
  }

  return hasMotion || shockwaves.length > 0 || mouseActive;
}

export interface RenderDotsOptions {
  dotColorHex: string;
  sampled: boolean;
}

function bucketIndex(sys: DotSystem, i: number): number {
  const bucket = 6 * Math.round(20 * sys.brightness[i]) + Math.round(5 * sys.tint[i]);
  return Math.max(0, Math.min(125, bucket));
}

function makeSampleKey(z: number, r: number, g: number, b: number): number {
  const rq = r >> 3;
  const gq = g >> 3;
  const bq = b >> 3;
  return (z << 15) | (rq << 10) | (gq << 5) | bq;
}

function decodeSampleKey(key: number): { z: number; r: number; g: number; b: number } {
  const z = key >> 15;
  const rq = (key >> 10) & 31;
  const gq = (key >> 5) & 31;
  const bq = key & 31;
  return {
    z,
    r: (rq << 3) + 4,
    g: (gq << 3) + 4,
    b: (bq << 3) + 4,
  };
}

export function renderDots(
  ctx: CanvasRenderingContext2D,
  sys: DotSystem,
  canvasW: number,
  canvasH: number,
  dpr: number,
  options: RenderDotsOptions
): void {
  ctx.clearRect(0, 0, canvasW * dpr, canvasH * dpr);

  const size = sys.size * dpr;
  const pad = 0.25 * dpr;
  const padSize = 0.5 * dpr;

  if (options.sampled && sys.dotRgb && sys.dotRgb.length === sys.count * 3) {
    const bucketMap = new Map<number, number[]>();
    for (let i = 0; i < sys.count; i++) {
      const z = bucketIndex(sys, i);
      const r = sys.dotRgb[i * 3];
      const g = sys.dotRgb[i * 3 + 1];
      const b = sys.dotRgb[i * 3 + 2];
      const key = makeSampleKey(z, r, g, b);
      let arr = bucketMap.get(key);
      if (!arr) {
        arr = [];
        bucketMap.set(key, arr);
      }
      arr.push(i);
    }

    for (const [key, ids] of bucketMap) {
      if (ids.length === 0) continue;
      const { z, r, g, b } = decodeSampleKey(key);
      const alpha = Math.floor(z / 6) / 20;
      ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
      for (let j = 0; j < ids.length; j++) {
        const i = ids[j];
        const rx = (sys.baseX[i] + sys.dx[i]) * dpr;
        const ry = (sys.baseY[i] + sys.dy[i]) * dpr;
        ctx.fillRect(rx - pad, ry - pad, size + padSize, size + padSize);
      }
    }
    return;
  }

  const { r, g, b } = parseHexToRgb(options.dotColorHex);

  const buckets: number[][] = new Array(126);
  for (let z = 0; z < 126; z++) buckets[z] = [];

  for (let i = 0; i < sys.count; i++) {
    buckets[bucketIndex(sys, i)].push(i);
  }

  for (let z = 0; z < 126; z++) {
    const ids = buckets[z];
    if (ids.length === 0) continue;

    const alpha = Math.floor(z / 6) / 20;
    ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;

    for (let j = 0; j < ids.length; j++) {
      const i = ids[j];
      const rx = (sys.baseX[i] + sys.dx[i]) * dpr;
      const ry = (sys.baseY[i] + sys.dy[i]) * dpr;
      ctx.fillRect(rx - pad, ry - pad, size + padSize, size + padSize);
    }
  }
}
