"use client";

import { useRef, useEffect, useCallback, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useDialKit } from "dialkit";
import {
  LOGO_PRESETS,
  type DitherPresetParamsV1,
  buildPresetPayload,
  presetToJsonString,
  presetToJsModuleString,
  downloadTextFile,
} from "@/lib/dither-preset";
import {
  type DitherAlgorithm,
  floydSteinberg,
  bayerDither,
  blueNoiseDither,
  generateBlueNoise,
  invertWithMask,
} from "@/lib/dither-algorithms";
import { processImage, loadImage } from "@/lib/image-processing";
import {
  attachDotRgb,
  createDotSystem,
  updateDots,
  renderDots,
  type DotSystem,
  type Shockwave,
} from "@/lib/particle-system";
import { useIsMobile } from "@/lib/use-is-mobile";

interface ParticleCanvasProps {
  imageSrc: string;
  onUploadRequest: () => void;
  onLogoPresetChange: (src: string) => void;
}

const GRID_SIZE = 205;

export default function ParticleCanvas({
  imageSrc,
  onUploadRequest,
  onLogoPresetChange,
}: ParticleCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const systemRef = useRef<DotSystem | null>(null);
  const mouseRef = useRef({ x: 0, y: 0, active: false });
  const shockwavesRef = useRef<Shockwave[]>([]);
  const animFrameRef = useRef<number>(0);
  const runningRef = useRef(false);
  const blueNoiseRef = useRef<Uint8Array | null>(null);
  const prevConfigRef = useRef<string>("");
  const gridDimsRef = useRef({ w: GRID_SIZE, h: GRID_SIZE });
  const prevLogoRef = useRef<string | null>(null);
  const exportRowRef = useRef<HTMLDivElement | null>(null);
  const [exportPortalHost, setExportPortalHost] = useState<HTMLDivElement | null>(null);
  const isMobile = useIsMobile();

  const params = useDialKit("Dither Playground", {
    algorithm: {
      type: "select",
      options: [
        { value: "floyd-steinberg", label: "Floyd–Steinberg" },
        { value: "bayer", label: "Bayer" },
        { value: "blue-noise", label: "Blue noise" },
      ],
      default: "floyd-steinberg",
    },
    scale: [0.35, 0.1, 2.0, 0.05],
    dotScale: [1, 0.5, 10, 0.5],
    invert: true,

    dotColorMode: {
      type: "select",
      options: [
        { value: "solid", label: "Solid" },
        { value: "sampled", label: "Sampled" },
      ],
      default: "solid",
      label: "Dot colour mode"
    },

    logo: {
      type: "select",
      options: [
        { value: "linear", label: "Linear" },
        { value: "cube", label: "Cube" },
      ],
      default: "linear",
    },

    image: {
      _collapsed: true,
      threshold: [181, 0, 255, 1],
      contrast: [0, -100, 100, 1],
      gamma: [1.03, 0.1, 3.0, 0.01],
      blur: [3.75, 0, 20, 0.25],
      highlightsCompression: [0, 0, 1, 0.01],
    },

    dither: {
      _collapsed: true,
      errorStrength: [1.0, 0, 2.0, 0.01],
      serpentine: true,
    },

    shape: {
      _collapsed: true,
      cornerRadius: [0.28, 0, 0.5, 0.01],
    },

    color: {
      _collapsed: true,
      label: "Colour",
      dotLight: { type: "color", default: "#000000", label: "Dot light" },
      bgLight: { type: "color", default: "#ffffff", label: "BG light" },
      dotDark: { type: "color", default: "#8a8f99", label: "Dot dark" },
      bgDark: { type: "color", default: "#0a0a0a", label: "BG dark" },
    },

    upload: { type: "action", label: "Upload image" },
  }, {
    onAction: (action) => {
      if (action === "upload") onUploadRequest();
    },
  });

  const algorithm = params.algorithm as DitherAlgorithm;

  const effDot = params.invert ? params.color.dotLight : params.color.dotDark;
  const effBg = params.invert ? params.color.bgLight : params.color.bgDark;
  const sampledDots = params.dotColorMode === "sampled";

  const snapshotPresetParams = useCallback((): DitherPresetParamsV1 => {
    return {
      algorithm: params.algorithm,
      scale: params.scale,
      dotScale: params.dotScale,
      invert: params.invert,
      logo: params.logo,
      image: {
        threshold: params.image.threshold,
        contrast: params.image.contrast,
        gamma: params.image.gamma,
        blur: params.image.blur,
        highlightsCompression: params.image.highlightsCompression,
      },
      dither: {
        errorStrength: params.dither.errorStrength,
        serpentine: params.dither.serpentine,
      },
      shape: { cornerRadius: params.shape.cornerRadius },
      color: {
        dotLight: params.color.dotLight,
        bgLight: params.color.bgLight,
        dotDark: params.color.dotDark,
        bgDark: params.color.bgDark,
      },
      dotColorMode: params.dotColorMode as "solid" | "sampled",
    };
  }, [
    params.algorithm,
    params.scale,
    params.dotScale,
    params.invert,
    params.logo,
    params.image.threshold,
    params.image.contrast,
    params.image.gamma,
    params.image.blur,
    params.image.highlightsCompression,
    params.dither.errorStrength,
    params.dither.serpentine,
    params.shape.cornerRadius,
    params.color.dotLight,
    params.color.bgLight,
    params.color.dotDark,
    params.color.bgDark,
    params.dotColorMode,
  ]);

  const handleExportJson = useCallback(async () => {
    try {
      const payload = await buildPresetPayload(snapshotPresetParams(), imageSrc);
      downloadTextFile("dither-preset.json", presetToJsonString(payload), "application/json");
    } catch (e) {
      console.error("[ParticleCanvas] Export JSON failed:", e);
      window.alert("Could not export JSON. See console for details.");
    }
  }, [snapshotPresetParams, imageSrc]);

  const handleExportJs = useCallback(async () => {
    try {
      const payload = await buildPresetPayload(snapshotPresetParams(), imageSrc);
      downloadTextFile("dither-preset.js", presetToJsModuleString(payload), "text/javascript");
    } catch (e) {
      console.error("[ParticleCanvas] Export JS failed:", e);
      window.alert("Could not export JS. See console for details.");
    }
  }, [snapshotPresetParams, imageSrc]);

  useLayoutEffect(() => {
    const ensureExportRow = () => {
      const inner = document.querySelector<HTMLElement>(".dialkit-panel-inner");
      if (!inner) return;

      if (inner.getAttribute("data-collapsed") === "true") {
        exportRowRef.current?.remove();
        exportRowRef.current = null;
        setExportPortalHost(null);
        return;
      }

      const buttons = inner.querySelectorAll("button.dialkit-button");
      const uploadBtn =
        Array.from(buttons).find((b) => /upload/i.test(b.textContent?.trim() ?? "")) ??
        buttons[buttons.length - 1];
      if (!uploadBtn) return;

      const anchorParent = uploadBtn.parentElement;
      if (!anchorParent || !inner.contains(uploadBtn)) return;

      let row = exportRowRef.current;
      if (!row || !row.isConnected) {
        row = document.createElement("div");
        row.className =
          "dither-preset-export-row flex w-full gap-1.5 mb-1.5 shrink-0";
        exportRowRef.current = row;
      }

      if (row.parentElement !== anchorParent || row.nextElementSibling !== uploadBtn) {
        anchorParent.insertBefore(row, uploadBtn);
      }

      setExportPortalHost((prev) => (prev === row ? prev : row));
    };

    ensureExportRow();
    const mo = new MutationObserver(() => {
      requestAnimationFrame(ensureExportRow);
    });
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      mo.disconnect();
      exportRowRef.current?.remove();
      exportRowRef.current = null;
      setExportPortalHost(null);
    };
  }, []);

  useEffect(() => {
    const presetPath =
      LOGO_PRESETS[params.logo as keyof typeof LOGO_PRESETS] ?? LOGO_PRESETS.linear;
    const logo = params.logo as string;

    if (prevLogoRef.current === null) {
      prevLogoRef.current = logo;
      const custom =
        imageSrc.startsWith("blob:") || imageSrc.startsWith("data:");
      if (!custom && imageSrc !== presetPath) {
        onLogoPresetChange(presetPath);
      }
      return;
    }

    if (prevLogoRef.current !== logo) {
      prevLogoRef.current = logo;
      onLogoPresetChange(presetPath);
    }
  }, [params.logo, imageSrc, onLogoPresetChange]);

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
      let gw = GRID_SIZE;
      let gh = GRID_SIZE;

      const img = await loadImage(src);

      const processed = processImage(
        img,
        GRID_SIZE,
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
          positions = blueNoiseDither(processed.grayscale, processed.width, processed.height, blueNoiseRef.current, 256, opts, processed.alpha);
          break;
        }
      }

      if (params.invert) {
        positions = invertWithMask(positions, processed.width, processed.height, params.shape.cornerRadius, processed.alpha);
      }

      gridDimsRef.current = { w: gw, h: gh };

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
    [algorithm, params.scale, params.dotScale, params.image.contrast, params.image.gamma, params.image.blur, params.image.threshold, params.image.highlightsCompression, params.dither.errorStrength, params.dither.serpentine, params.shape.cornerRadius, params.invert, params.dotColorMode, isMobile, startLoop]
  );

  useEffect(() => {
    const configKey = JSON.stringify([imageSrc, algorithm, params.scale, params.dotScale, params.image, params.dither, params.shape, params.invert, params.dotColorMode, isMobile]);
    if (configKey === prevConfigRef.current) return;
    prevConfigRef.current = configKey;
    void rebuildParticles(imageSrc).catch((err) => {
      console.error("[ParticleCanvas] Failed to load or process image:", imageSrc, err);
    });
  }, [imageSrc, algorithm, rebuildParticles, params.scale, params.dotScale, params.image, params.dither, params.shape, params.invert, params.dotColorMode, isMobile]);

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
    document.documentElement.style.background = effBg;
    document.body.style.background = effBg;
  }, [effBg]);

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
    <>
      {exportPortalHost
        ? createPortal(
            <>
              <button
                type="button"
                className="dialkit-button min-w-0 flex-1"
                onClick={() => void handleExportJson()}
              >
                Export JSON
              </button>
              <button
                type="button"
                className="dialkit-button min-w-0 flex-1"
                onClick={() => void handleExportJs()}
              >
                Export JS
              </button>
            </>,
            exportPortalHost
          )
        : null}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full block touch-none"
        style={{ cursor: "default", background: effBg }}
      />
    </>
  );
}
