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
| `className` / `style` | — | — | Passed to the `<canvas>` after built-in cursor/background. Your `style` wins on duplicate keys. |
| `transparentCanvas` | `boolean` | `false` | Skips the default CSS `background` on the canvas (use on layered or gradient pages). |
| `syncPageBackground` | `boolean` | `false` | When `true`, sets `document.documentElement` and `body` background to the effective canvas colour. Ignored if `transparentCanvas` is `true`. |
| `layoutInsetPx` | `number` | `0` | Insets the dot field from the canvas edges (CSS px), reducing clipping when dots move with pointer/shockwaves. |
| `interactionScale` | `number` | `1` | Scales pointer radius, pointer force, and shockwave strength (clamped ~0.05–4). Lower on small embeds. |
| `respectPrefersReducedMotion` | `boolean` | `false` | Listens for `prefers-reduced-motion: reduce` and disables pointer + shockwave motion (static dither). |
| `fallbackImageSrc` | `string` | — | If `imageSrc` fails to load or process, the canvas rebuilds once from this URL. |
| `warmPresetLogosOnMount` | `boolean` | `false` | Prewarms bundled built-in logo requests (`LOGO_PRESET_URLS`). |
| `onLoadError` | `(err: unknown) => void` | — | Called on load/process failure (including if the fallback also fails). |

### Embedding small fixed-size canvases

Pointer and shockwave motion are computed in **canvas pixel space**. Dots that move outside the bitmap are **clipped**, which shows up as harsh edges on tight fixed-size heroes or cards.

Mitigations (combine as needed):

1. **`layoutInsetPx`** — Pulls the laid-out dot grid inward so motion has room before hitting the clip rect (same idea as oversized wrapper + lower scale, but explicit).
2. **`interactionScale`** — Use values like `0.5`–`0.85` to soften radius and forces on small surfaces.
3. **Larger canvas** — Give the element more layout size or overflow room if your design allows.

Default physics constants are exported if you need to document or mirror them: `DEFAULT_MOUSE_RADIUS`, `DEFAULT_MOUSE_FORCE_PEAK`, `DEFAULT_SHOCKWAVE_SPEED`, `DEFAULT_SHOCKWAVE_WIDTH`, `DEFAULT_SHOCKWAVE_STRENGTH`.

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
2. **Scope (fixes `404 Not Found` on `PUT …/@its-thepoe/dither-react`)** — npm only lets you publish `@its-thepoe/…` if you are logged in as the **npm user named `its-thepoe`** *or* your account is in the **`its-thepoe` org** with **publish** access. If your GitHub is `its-thepoe` but your **npm username is different**, create the org on [npmjs.com](https://www.npmjs.com/org/create) and add yourself, **or** change the `name` in this `package.json` to `@<your-npm-username>/dither-react` and update imports everywhere.
3. **Registry** — From the **repo root**, run `npm config get registry` (expect `https://registry.npmjs.org/`). If you are inside `packages/dither-react`, npm may error with **`ENOWORKSPACES`**; use `npm config get registry --workspaces=false` or `cd` to the monorepo root first.
4. Optional: run **`npm pkg fix`** in this folder if npm warns about `package.json` normalization (repository URL is already `git+https://…`).

**List packages you maintain:** `npm access list packages` (not `ls-packages`).

Adjust `name` / `--access` if you use a private registry or non-scoped package.

## Exports

Besides `DitherCanvas`, the package re-exports core helpers (`processImage`, `createDotSystem`, `updateDots`, `renderDots`, `UpdateDotsOptions`, default physics constants, etc.) for advanced integrations.
