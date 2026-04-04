import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

// Next otherwise picks the nearest parent lockfile (/Users/MAC/pnpm-lock.yaml) as the
// workspace root, emits Turbopack SSR chunks for that root, and ENOENTs when loading
// `.next/server/chunks/ssr/*.js` for this app.
const projectRoot = path.dirname(fileURLToPath(import.meta.url));

/** Webpack accepts absolute paths. */
const ditherReactSrcAbs = path.join(projectRoot, "packages/dither-react/src/index.ts");
/**
 * Turbopack joins alias targets as server-relative imports; absolute filesystem paths break
 * (e.g. `./Users/...`). Use a path relative to `turbopack.root` (this project root).
 */
const ditherReactSrcTurbopackRelative = "./packages/dither-react/src/index.ts";

const nextConfig: NextConfig = {
  transpilePackages: ["@its-thepoe/dither-react"],
  turbopack: {
    root: projectRoot,
    resolveAlias: {
      // Compile package from source so `new URL(..., import.meta.url)` + PNGs resolve like app assets.
      "@its-thepoe/dither-react": ditherReactSrcTurbopackRelative,
    },
  },
  webpack: (config) => {
    config.resolve.alias["@its-thepoe/dither-react"] = ditherReactSrcAbs;
    return config;
  },
  outputFileTracingRoot: projectRoot,
};

export default nextConfig;
