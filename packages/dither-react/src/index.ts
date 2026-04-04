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
  DEFAULT_MOUSE_RADIUS,
  DEFAULT_MOUSE_FORCE_PEAK,
  DEFAULT_SHOCKWAVE_SPEED,
  DEFAULT_SHOCKWAVE_WIDTH,
  DEFAULT_SHOCKWAVE_STRENGTH,
  type DotSystem,
  type Shockwave,
  type RenderDotsOptions,
  type UpdateDotsOptions,
} from "./particle-system";
export { useIsMobile } from "./use-is-mobile";
