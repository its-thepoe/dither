"use client";

import { useRef, useEffect, useCallback, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useDialKit } from "dialkit";
import { DitherCanvas } from "@its-thepoe/dither-react";
import {
  LOGO_PRESETS,
  type DitherPresetParamsV1,
  buildPresetPayload,
  presetToJsonString,
  presetToJsModuleString,
  downloadTextFile,
} from "@/lib/dither-preset";

interface ParticleCanvasProps {
  imageSrc: string;
  onUploadRequest: () => void;
  onLogoPresetChange: (src: string) => void;
}

export default function ParticleCanvas({
  imageSrc,
  onUploadRequest,
  onLogoPresetChange,
}: ParticleCanvasProps) {
  const prevLogoRef = useRef<string | null>(null);
  const exportRowRef = useRef<HTMLDivElement | null>(null);
  const [exportPortalHost, setExportPortalHost] = useState<HTMLDivElement | null>(null);

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
      label: "Dot colour mode",
    },

    logo: {
      type: "select",
      options: [
        { value: "linear", label: "Linear" },
        { value: "cursor", label: "Cursor" },
        { value: "dispensary", label: "Dispensary" },
        { value: "mockhaus", label: "Mockhaus" },
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
      cornerRadius: [0, 0, 0.5, 0.01],
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
      <DitherCanvas
        imageSrc={imageSrc}
        params={snapshotPresetParams()}
        className="absolute inset-0 w-full h-full block touch-none"
        syncPageBackground
        warmPresetLogosOnMount
      />
    </>
  );
}
