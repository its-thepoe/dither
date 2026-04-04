# Changelog

All notable changes to this repository are documented here. The playable app and the **`@its-thepoe/dither-react`** package share this history where relevant.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html) for the npm package.

## [Unreleased]

- Nothing yet.

## [0.2.0] – 2026-04-05

### `@its-thepoe/dither-react`

- **`transparentCanvas`** — optional prop to skip the default solid CSS background on the `<canvas>` for layered pages.
- **`layoutInsetPx`** — inset the dot layout from the canvas edges to reduce clipping when dots move with pointer/shockwaves.
- **`interactionScale`** — scale pointer radius, pointer force, and shockwave parameters (defaults unchanged at `1`).
- **`respectPrefersReducedMotion`** — when `true`, respects `prefers-reduced-motion: reduce` and disables pointer + shockwave physics (static dither).
- **`fallbackImageSrc`** — one automatic rebuild from a backup URL if `imageSrc` fails to load or process.
- **`syncPageBackground`** — no longer applies full-page background when `transparentCanvas` is `true`.
- **`updateDots`** — optional seventh argument `UpdateDotsOptions` (`interactionEnabled`, `interactionScale`); exported defaults `DEFAULT_MOUSE_RADIUS`, `DEFAULT_MOUSE_FORCE_PEAK`, `DEFAULT_SHOCKWAVE_*`.

### Docs

- Package README: expanded props table, **Embedding small fixed-size canvases** guidance, export notes.
- This changelog added at the repo root.

## [0.1.0] – 2026-04-04

### Added

- **`@its-thepoe/dither-react`** — new workspace package: `DitherCanvas`, dither pipeline, bundled logo assets (`LOGO_PRESET_URLS`), `DEFAULT_PLAYGROUND_PARAMS`, `mergeDitherParams`, core re-exports (`processImage`, `createDotSystem`, `updateDots`, `renderDots`, etc.).
- **npm workspaces** at the repo root; playground depends on `workspace:*`.
- **tsup** build for the package; post-build copy of `src/assets` → `dist/assets`; `new URL(…, import.meta.url)` for logo URLs.
- **Next.js** `transpilePackages` and **Turbopack/webpack** `resolveAlias` to compile the package from source (Turbopack uses a path relative to `turbopack.root`).

### Changed

- Playground **`ParticleCanvas`** now wraps **`DitherCanvas`** from the package (DialKit + export UI stay in-app).
- **`dither-preset`** uses package logo URLs and types; removed duplicate `src/lib` dither/image/particle modules (moved into the package).

### Fixed

- **Logo image loading** — cached loader and warm-up for preset URLs (see `docs/logo-image-loading-fix.md`).

## Earlier playground-only history (pre-package)

### 2026-04-02

- Cache and prefetch logo preset images; commit preset PNG assets; footer GitHub link; README / credits; British English copy; favicon and metadata; inversion logic fixes; DialKit colours, sampled dot RGB, footer wordmark.

### 2026-03-27

- DialKit mobile positioning; logo presets and `onLogoPresetChange`; object URL handling; responsive tweaks.

### 2026-03-27

- Initial import (`init`) — Dither Playground fork baseline.
