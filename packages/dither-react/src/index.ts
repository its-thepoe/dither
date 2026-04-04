export {
  DitherCanvas,
  type DitherCanvasProps,
} from "./dither-canvas";
export {
  DEFAULT_PLAYGROUND_PARAMS,
  DITHER_GRID_SIZE,
  mergeDitherParams,
  type DitherCanvasParams,
} from "./defaults";
export {
  LOGO_PRESET_URLS,
  LOGO_PRESET_IDS,
  type LogoPresetId,
} from "./logo-presets";
export type { DitherAlgorithm, DitherOptions } from "./dither-algorithms";
export {
  loadImageCached,
  warmImageCache,
  processImage,
  type ProcessedImage,
} from "./image-processing";
export {
  createDotSystem,
  updateDots,
  renderDots,
  attachDotRgb,
  type DotSystem,
  type Shockwave,
  type RenderDotsOptions,
} from "./particle-system";
export { useIsMobile } from "./use-is-mobile";
