/** DialKit panel defaults from the Dither Playground (see playground `useDialKit` config). */
export interface DitherCanvasParams {
  algorithm: string;
  scale: number;
  dotScale: number;
  invert: boolean;
  /** Built-in logo id; host app should sync `imageSrc` to `LOGO_PRESET_URLS[logo]` when using bundled logos. */
  logo: string;
  image: {
    threshold: number;
    contrast: number;
    gamma: number;
    blur: number;
    highlightsCompression: number;
  };
  dither: {
    errorStrength: number;
    serpentine: boolean;
  };
  shape: {
    cornerRadius: number;
  };
  color: {
    dotLight: string;
    bgLight: string;
    dotDark: string;
    bgDark: string;
  };
  dotColorMode: "solid" | "sampled";
}

export const DEFAULT_PLAYGROUND_PARAMS: DitherCanvasParams = {
  algorithm: "floyd-steinberg",
  scale: 0.35,
  dotScale: 1,
  invert: true,
  logo: "linear",
  image: {
    threshold: 181,
    contrast: 0,
    gamma: 1.03,
    blur: 3.75,
    highlightsCompression: 0,
  },
  dither: {
    errorStrength: 1.0,
    serpentine: true,
  },
  shape: {
    cornerRadius: 0,
  },
  color: {
    dotLight: "#000000",
    bgLight: "#ffffff",
    dotDark: "#8a8f99",
    bgDark: "#0a0a0a",
  },
  dotColorMode: "solid",
};

/** Grid max dimension used when sampling the source image (playground constant). */
export const DITHER_GRID_SIZE = 205;

export function mergeDitherParams(partial?: Partial<DitherCanvasParams>): DitherCanvasParams {
  if (!partial) return { ...DEFAULT_PLAYGROUND_PARAMS };
  return {
    ...DEFAULT_PLAYGROUND_PARAMS,
    ...partial,
    image: { ...DEFAULT_PLAYGROUND_PARAMS.image, ...partial.image },
    dither: { ...DEFAULT_PLAYGROUND_PARAMS.dither, ...partial.dither },
    shape: { ...DEFAULT_PLAYGROUND_PARAMS.shape, ...partial.shape },
    color: { ...DEFAULT_PLAYGROUND_PARAMS.color, ...partial.color },
  };
}
