"use client";

import { useRef, useEffect, useCallback, type CSSProperties } from "react";
import type { DitherAlgorithm } from "./dither-algorithms";
import {
  floydSteinberg,
  bayerDither,
  blueNoiseDither,
  generateBlueNoise,
  invertWithMask,
} from "./dither-algorithms";
import { processImage, loadImageCached, warmImageCache } from "./image-processing";
import {
  attachDotRgb,
  createDotSystem,
  updateDots,
  renderDots,
  type DotSystem,
  type Shockwave,
} from "./particle-system";
import {
  mergeDitherParams,
  DITHER_GRID_SIZE,
  type DitherCanvasParams,
} from "./defaults";
import { LOGO_PRESET_URLS } from "./logo-presets";
import { useIsMobile } from "./use-is-mobile";

export interface DitherCanvasProps {
  imageSrc: string;
  /** Partial params are merged with `DEFAULT_PLAYGROUND_PARAMS`. */
  params?: Partial<DitherCanvasParams>;
  className?: string;
  style?: CSSProperties;
  /** When true, sets `document.documentElement` and `body` background to the effective canvas background (playground behavior). */
  syncPageBackground?: boolean;
  /** Prewarm bundled logo image requests. */
  warmPresetLogosOnMount?: boolean;
  /** Called when image load or processing fails. */
  onLoadError?: (error: unknown) => void;
}

export function DitherCanvas({
  imageSrc,
  params: paramsProp,
  className,
  style,
  syncPageBackground = false,
  warmPresetLogosOnMount = false,
  onLoadError,
}: DitherCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const systemRef = useRef<DotSystem | null>(null);
  const mouseRef = useRef({ x: 0, y: 0, active: false });
  const shockwavesRef = useRef<Shockwave[]>([]);
  const animFrameRef = useRef<number>(0);
  const runningRef = useRef(false);
  const blueNoiseRef = useRef<Uint8Array | null>(null);
  const prevConfigRef = useRef<string>("");
  const isMobile = useIsMobile();

  const params = mergeDitherParams(paramsProp);

  const algorithm = params.algorithm as DitherAlgorithm;

  const effDot = params.invert ? params.color.dotLight : params.color.dotDark;
  const effBg = params.invert ? params.color.bgLight : params.color.bgDark;
  const sampledDots = params.dotColorMode === "sampled";

  const startLoop = useCallback(() => {
    if (runningRef.current) return;
    runningRef.current = true;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;

    const tick = () => {
      const sys = systemRef.current;
      if (!sys) {
        runningRef.current = false;
        return;
      }

      const rect = canvas.getBoundingClientRect();
      const needsMore = updateDots(
        sys,
        mouseRef.current.x,
        mouseRef.current.y,
        mouseRef.current.active,
        shockwavesRef.current,
        performance.now()
      );

      renderDots(ctx, sys, rect.width, rect.height, dpr, {
        dotColorHex: effDot,
        sampled: sampledDots,
      });

      if (needsMore) {
        animFrameRef.current = requestAnimationFrame(tick);
      } else {
        runningRef.current = false;
      }
    };

    animFrameRef.current = requestAnimationFrame(tick);
  }, [effDot, sampledDots]);

  const rebuildParticles = useCallback(
    async (src: string) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      let positions: Float32Array;
      let gw = DITHER_GRID_SIZE;
      let gh = DITHER_GRID_SIZE;

      const img = await loadImageCached(src);

      const processed = processImage(
        img,
        DITHER_GRID_SIZE,
        1,
        params.image.contrast,
        params.image.gamma,
        params.image.blur,
        params.image.highlightsCompression
      );

      gw = processed.width;
      gh = processed.height;
      const opts = {
        threshold: params.image.threshold,
        serpentine: params.dither.serpentine,
        errorStrength: params.dither.errorStrength,
      };

      switch (algorithm) {
        case "floyd-steinberg":
          positions = floydSteinberg(processed.grayscale, processed.width, processed.height, opts, processed.alpha);
          break;
        case "bayer":
          positions = bayerDither(processed.grayscale, processed.width, processed.height, opts, processed.alpha);
          break;
        case "blue-noise": {
          if (!blueNoiseRef.current) blueNoiseRef.current = generateBlueNoise(256);
          positions = blueNoiseDither(
            processed.grayscale,
            processed.width,
            processed.height,
            blueNoiseRef.current,
            256,
            opts,
            processed.alpha
          );
          break;
        }
        default:
          positions = floydSteinberg(processed.grayscale, processed.width, processed.height, opts, processed.alpha);
      }

      if (params.invert) {
        positions = invertWithMask(
          positions,
          processed.width,
          processed.height,
          params.shape.cornerRadius,
          processed.alpha
        );
      }

      const s = Math.max(0.5, Math.min(rect.width, rect.height) * params.scale / Math.max(gw, gh));
      const ox = Math.round((rect.width - gw * s) / 2);
      const oy = Math.round((rect.height - gh * s) / 2);

      const dotScale = isMobile ? params.dotScale * 0.8 : params.dotScale;

      const sys = createDotSystem(positions, s, dotScale, ox, oy);
      if (params.dotColorMode === "sampled") {
        attachDotRgb(sys, positions, processed.rgb, gw, gh);
      }
      systemRef.current = sys;
      startLoop();
    },
    [
      algorithm,
      params.scale,
      params.dotScale,
      params.image.contrast,
      params.image.gamma,
      params.image.blur,
      params.image.threshold,
      params.image.highlightsCompression,
      params.dither.errorStrength,
      params.dither.serpentine,
      params.shape.cornerRadius,
      params.invert,
      params.dotColorMode,
      isMobile,
      startLoop,
    ]
  );

  const paramsKey = JSON.stringify([
    params.algorithm,
    params.scale,
    params.dotScale,
    params.image,
    params.dither,
    params.shape,
    params.invert,
    params.dotColorMode,
    isMobile,
  ]);

  useEffect(() => {
    if (!warmPresetLogosOnMount) return;
    warmImageCache(Object.values(LOGO_PRESET_URLS));
  }, [warmPresetLogosOnMount]);

  useEffect(() => {
    const configKey = JSON.stringify([imageSrc, paramsKey]);
    if (configKey === prevConfigRef.current) return;
    prevConfigRef.current = configKey;
    void rebuildParticles(imageSrc).catch((err) => {
      console.error("[DitherCanvas] Failed to load or process image:", imageSrc, err);
      onLoadError?.(err);
    });
  }, [imageSrc, paramsKey, rebuildParticles, onLoadError]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;

    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    let lastWidth = 0;
    let lastHeight = 0;

    const handleResize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      const sys = systemRef.current;
      if (sys) {
        renderDots(ctx, sys, rect.width, rect.height, dpr, {
          dotColorHex: effDot,
          sampled: sampledDots,
        });
      }

      const w = Math.round(rect.width);
      const h = Math.round(rect.height);
      if (lastWidth !== 0 && (w !== lastWidth || h !== lastHeight)) {
        if (resizeTimer) clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => rebuildParticles(imageSrc), 200);
      }
      lastWidth = w;
      lastHeight = h;
    };

    handleResize();
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(canvas);

    const handlePointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = e.clientX - rect.left;
      mouseRef.current.y = e.clientY - rect.top;
      mouseRef.current.active = true;
      startLoop();
    };

    const handlePointerLeave = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      mouseRef.current.active = false;
      startLoop();
    };

    const handlePointerCancel = () => {
      mouseRef.current.active = false;
      startLoop();
    };

    const handlePointerUp = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      shockwavesRef.current.push({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        start: performance.now(),
      });
      if (e.pointerType !== "mouse") {
        mouseRef.current.active = false;
      }
      startLoop();
    };

    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerleave", handlePointerLeave);
    canvas.addEventListener("pointercancel", handlePointerCancel);
    canvas.addEventListener("pointerup", handlePointerUp);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      runningRef.current = false;
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeObserver.disconnect();
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerleave", handlePointerLeave);
      canvas.removeEventListener("pointercancel", handlePointerCancel);
      canvas.removeEventListener("pointerup", handlePointerUp);
    };
  }, [effDot, sampledDots, startLoop, rebuildParticles, imageSrc]);

  useEffect(() => {
    if (!syncPageBackground) return;
    document.documentElement.style.background = effBg;
    document.body.style.background = effBg;
    return () => {
      document.documentElement.style.background = "";
      document.body.style.background = "";
    };
  }, [syncPageBackground, effBg]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const sys = systemRef.current;
    if (!canvas || !sys) return;
    const ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    renderDots(ctx, sys, rect.width, rect.height, dpr, {
      dotColorHex: effDot,
      sampled: sampledDots,
    });
  }, [effDot, sampledDots]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ cursor: "default", background: effBg, ...style }}
    />
  );
}
