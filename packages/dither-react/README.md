# @its-thepoe/dither-react

React component that reproduces the **Dither Playground** canvas: image processing, ordered / error-diffusion dither, pointer parallax, tap/click shockwaves, sampled or solid dots, and mobile dot scaling.

## Install

```bash
npm install @its-thepoe/dither-react
```

Peer dependencies: `react` and `react-dom` **^18 or ^19**.

## Usage

```tsx
"use client";

import { useState, useCallback, useRef } from "react";
import {
  DitherCanvas,
  DEFAULT_PLAYGROUND_PARAMS,
  mergeDitherParams,
  LOGO_PRESET_URLS,
} from "@its-thepoe/dither-react";

export function Hero() {
  const [imageSrc, setImageSrc] = useState(LOGO_PRESET_URLS.linear);
  const inputRef = useRef<HTMLInputElement>(null);

  const onFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/i.test(file.type)) return;
    setImageSrc(URL.createObjectURL(file));
  }, []);

  return (
    <div className="fixed inset-0">
      <DitherCanvas
        imageSrc={imageSrc}
        params={mergeDitherParams({ scale: 0.5 })}
        className="absolute inset-0 h-full w-full touch-none"
        warmPresetLogosOnMount
      />
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        className="hidden"
        onChange={onFile}
      />
    </div>
  );
}
```

### Props (`DitherCanvas`)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `imageSrc` | `string` | (required) | Any URL the browser can load: `https:`, same-origin path, `blob:`, or `data:image/...`. |
| `params` | `Partial<DitherCanvasParams>` | — | Merged with `DEFAULT_PLAYGROUND_PARAMS` (algorithm, scale, colours, dither, etc.). |
| `className` / `style` | — | — | Passed to the `<canvas>`. Size the parent; the canvas uses `width`/`height` from layout × DPR. |
| `syncPageBackground` | `boolean` | `false` | When `true`, sets `document.documentElement` and `body` background to the effective canvas background (playground behaviour). |
| `warmPresetLogosOnMount` | `boolean` | `false` | Prewarms bundled built-in logo requests (`LOGO_PRESET_URLS`). |
| `onLoadError` | `(err: unknown) => void` | — | Decode / processing failures. |

### Built-in logos

`LOGO_PRESET_URLS` maps `linear` | `cursor` | `dispensary` | `mockhaus` to bundler-resolved URLs (works in Vite, Next, etc.). Use them for `imageSrc` or to sync a logo picker.

### Next.js App Router

The canvas requires the DOM. If you import it from a Server Component, load it on the client:

```tsx
import dynamic from "next/dynamic";

const DitherCanvas = dynamic(
  () =>
    import("@its-thepoe/dither-react").then((m) => m.DitherCanvas),
  { ssr: false }
);
```

Add `transpilePackages: ["@its-thepoe/dither-react"]` in `next.config.ts` when consuming the package from `node_modules`.

**Bundled logo URLs (`LOGO_PRESET_URLS`):** the package uses `new URL("./assets/…", import.meta.url)` and ships PNGs under `dist/assets/`. If your bundler still resolves those URLs incorrectly, alias the package to its **source** entry (this monorepo’s playground does this for both Turbopack and webpack):

```ts
import path from "path";

const ditherSrcAbs = path.join(__dirname, "node_modules/@its-thepoe/dither-react/src/index.ts");
// Workspace monorepo: path.join(__dirname, "packages/dither-react/src/index.ts")

// next.config.ts — Turbopack must use a path **relative to turbopack.root** (not an absolute
// filesystem path), or resolution breaks with `./Users/...` style errors.
turbopack: {
  root: __dirname,
  resolveAlias: {
    "@its-thepoe/dither-react": "./packages/dither-react/src/index.ts",
  },
},
webpack: (config) => {
  config.resolve.alias["@its-thepoe/dither-react"] = ditherSrcAbs;
  return config;
},
```

### CORS

`loadImage` uses `crossOrigin = "anonymous"`. Remote `imageSrc` URLs must respond with CORS headers that allow your origin, or use same-origin / `blob:` / `data:` URLs.

### Custom uploads

Validate types before `createObjectURL` (e.g. `image/jpeg`, `image/png`, `image/webp`). Revoke old blob URLs when replacing the file to avoid leaks.

## Versioning (semver)

- **Patch**: bug fixes, no visual change for the same `params` + image.
- **Minor**: new optional props or exports; default behaviour unchanged.
- **Major**: changed default params, dither output, or public type shapes.

### Publishing from this monorepo

```bash
# from repository root
npm run build -w @its-thepoe/dither-react
cd packages/dither-react && npm publish --access public
```

**Before publish**

1. **`npm whoami`** — must show your username. **401** means run **`npm login`** (token expired or never logged in).
2. **Scope** — `@its-thepoe` must be an npm user or org you control. **404 on `PUT`** usually means you cannot publish to that scope; rename the `name` field in this `package.json` to match your scope, or create/join the org on npm.
3. **Registry** — `npm config get registry` should be `https://registry.npmjs.org/` for the public registry.

**List packages you maintain:** `npm access list packages` (not `ls-packages`).

Adjust `name` / `--access` if you use a private registry or non-scoped package.

## Exports

Besides `DitherCanvas`, the package re-exports core helpers (`processImage`, `createDotSystem`, `updateDots`, `renderDots`, etc.) for advanced integrations.
