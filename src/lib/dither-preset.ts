import { DialStore } from "dialkit";
import {
  LOGO_PRESET_URLS,
  type DitherCanvasParams,
  type LogoPresetId,
} from "@its-thepoe/dither-react";

/** Bundled logo URLs from `@its-thepoe/dither-react` (single source of truth for export/import). */
export const LOGO_PRESETS = LOGO_PRESET_URLS;

export type { LogoPresetId };

export const PANEL_NAME = "Dither Playground";

/** Aligns with `DitherCanvasParams`; optional `color` / `dotColorMode` for older exported JSON. */
export type DitherPresetParamsV1 = Omit<DitherCanvasParams, "color" | "dotColorMode"> & {
  color?: DitherCanvasParams["color"];
  dotColorMode?: DitherCanvasParams["dotColorMode"];
};

export type DitherPresetImageV1 =
  | { kind: "preset"; preset: LogoPresetId }
  | { kind: "custom"; dataUrl: string };

export interface DitherPresetV1 {
  version: 1;
  exportedAt: string;
  image: DitherPresetImageV1;
  params: DitherPresetParamsV1;
}

function presetIdForSrc(src: string): LogoPresetId | null {
  for (const id of Object.keys(LOGO_PRESET_URLS) as LogoPresetId[]) {
    if (src === LOGO_PRESET_URLS[id]) return id;
  }
  return null;
}

/** Read blob: or http(s) image as data URL (large for big files — intentional for full round-trip). */
export async function urlToDataUrl(src: string): Promise<string> {
  const res = await fetch(src);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

export async function buildPresetPayload(
  params: DitherPresetParamsV1,
  imageSrc: string
): Promise<DitherPresetV1> {
  const presetId = presetIdForSrc(imageSrc);
  let image: DitherPresetImageV1;
  if (presetId) {
    image = { kind: "preset", preset: presetId };
  } else {
    image = { kind: "custom", dataUrl: await urlToDataUrl(imageSrc) };
  }

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    image,
    params: {
      algorithm: params.algorithm,
      scale: params.scale,
      dotScale: params.dotScale,
      invert: params.invert,
      logo: params.logo,
      image: { ...params.image },
      dither: { ...params.dither },
      shape: { ...params.shape },
      color: params.color
        ? { ...params.color }
        : {
            dotLight: "#000000",
            bgLight: "#ffffff",
            dotDark: "#8a8f99",
            bgDark: "#0a0a0a",
          },
      dotColorMode: params.dotColorMode ?? "solid",
    },
  };
}

const DEFAULT_PRESET_COLOR = {
  dotLight: "#000000",
  bgLight: "#ffffff",
  dotDark: "#8a8f99",
  bgDark: "#0a0a0a",
} as const;

/** Flat paths as used by DialKit `DialStore` for this panel's config. */
export function flatPathsFromPresetParams(params: DitherPresetParamsV1): Record<string, string | number | boolean> {
  const color = params.color ?? DEFAULT_PRESET_COLOR;
  const dotColorMode = params.dotColorMode ?? "solid";
  return {
    algorithm: params.algorithm,
    scale: params.scale,
    dotScale: params.dotScale,
    invert: params.invert,
    logo: params.logo,
    "image.threshold": params.image.threshold,
    "image.contrast": params.image.contrast,
    "image.gamma": params.image.gamma,
    "image.blur": params.image.blur,
    "image.highlightsCompression": params.image.highlightsCompression,
    "dither.errorStrength": params.dither.errorStrength,
    "dither.serpentine": params.dither.serpentine,
    "shape.cornerRadius": params.shape.cornerRadius,
    "color.dotLight": color.dotLight,
    "color.bgLight": color.bgLight,
    "color.dotDark": color.dotDark,
    "color.bgDark": color.bgDark,
    dotColorMode,
  };
}

export function presetToJsonString(preset: DitherPresetV1): string {
  return JSON.stringify(preset, null, 2);
}

export function presetToJsModuleString(preset: DitherPresetV1): string {
  const json = JSON.stringify(preset, null, 2);
  return `/** Auto-generated Dither Playground preset (ESM). */\nexport const ditherPlaygroundPreset = ${json};\n\nexport default ditherPlaygroundPreset;\n`;
}

export function downloadTextFile(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function getDitherPanelId(): string | undefined {
  return DialStore.getPanels().find((p) => p.name === PANEL_NAME)?.id;
}

export type ApplyPresetResult =
  | { ok: true; imageSrc: string }
  | { ok: false; error: string };

function isPresetImageV1(img: unknown): img is DitherPresetImageV1 {
  if (!img || typeof img !== "object" || !("kind" in img)) return false;
  const k = (img as { kind: unknown }).kind;
  if (k === "preset") {
    const preset = (img as { preset?: unknown }).preset;
    return typeof preset === "string" && preset in LOGO_PRESETS;
  }
  if (k === "custom") {
    const dataUrl = (img as { dataUrl?: unknown }).dataUrl;
    return typeof dataUrl === "string" && dataUrl.startsWith("data:");
  }
  return false;
}

/**
 * Applies preset to DialKit and returns the `imageSrc` to set in React state.
 * For custom images, skips updating `logo` in the store so the logo→preset sync effect does not overwrite the data URL.
 */
export function applyPreset(preset: unknown): ApplyPresetResult {
  if (!preset || typeof preset !== "object") {
    return { ok: false, error: "Invalid preset: not an object." };
  }
  const p = preset as Partial<DitherPresetV1>;
  if (p.version !== 1) {
    return { ok: false, error: `Unsupported preset version: ${String(p.version)}` };
  }
  if (!p.params || typeof p.params !== "object") {
    return { ok: false, error: "Invalid preset: missing params." };
  }
  if (!isPresetImageV1(p.image)) {
    return { ok: false, error: "Invalid preset: missing or invalid image." };
  }

  const panelId = getDitherPanelId();
  if (!panelId) {
    return { ok: false, error: "DialKit panel not ready. Try again in a moment." };
  }

  const panel = DialStore.getPanel(panelId);
  if (!panel) {
    return { ok: false, error: "DialKit panel not found." };
  }

  const params = p.params as DitherPresetParamsV1;
  const flat = flatPathsFromPresetParams(params);
  const allowed = new Set(Object.keys(panel.values));
  const skipLogo = p.image.kind === "custom";

  for (const [path, value] of Object.entries(flat)) {
    if (skipLogo && path === "logo") continue;
    if (!allowed.has(path)) continue;
    DialStore.updateValue(panelId, path, value);
  }

  let imageSrc: string;
  if (p.image.kind === "preset") {
    imageSrc = LOGO_PRESET_URLS[p.image.preset];
  } else {
    imageSrc = p.image.dataUrl;
  }

  return { ok: true, imageSrc };
}

export function parsePresetJson(text: string): unknown {
  return JSON.parse(text) as unknown;
}
