export type LogoPresetId = "linear" | "cursor" | "dispensary" | "mockhaus";

/**
 * Asset URLs resolved relative to this module so they work in the browser after bundling.
 * Plain `./file.png` strings from static imports resolve against the page URL and break;
 * `new URL(..., import.meta.url)` resolves against the emitted chunk (Next, Vite, tsup).
 */
export const LOGO_PRESET_URLS: Record<LogoPresetId, string> = {
  linear: new URL("./assets/linear-app-icon.png", import.meta.url).href,
  cursor: new URL("./assets/cursor-2d-icon.png", import.meta.url).href,
  dispensary: new URL("./assets/dispensary-app-icon.png", import.meta.url).href,
  mockhaus: new URL("./assets/mockhaus-icon.png", import.meta.url).href,
};

export const LOGO_PRESET_IDS: LogoPresetId[] = ["linear", "cursor", "dispensary", "mockhaus"];
