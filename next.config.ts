import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

// Next otherwise picks the nearest parent lockfile (/Users/MAC/pnpm-lock.yaml) as the
// workspace root, emits Turbopack SSR chunks for that root, and ENOENTs when loading
// `.next/server/chunks/ssr/*.js` for this app.
const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    root: projectRoot,
  },
  outputFileTracingRoot: projectRoot,
};

export default nextConfig;
