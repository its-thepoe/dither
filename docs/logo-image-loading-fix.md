# Logo preset image loading: issue and fix

## Symptoms

- Switching between logo presets in the dither playground felt slow or stalled on the first use of each asset.
- Each logo change triggered a full decode/load path as if the image had never been seen before.

## Root cause

`ParticleCanvas` called `loadImage(src)` from `image-processing.ts` for every rebuild when the logo source changed. That helper always created a **new** `Image()`, set `src`, and waited for `onload`.

Consequences:

1. **No reuse** — The browser could not reuse an already-decoded `HTMLImageElement` for the same URL; we paid fetch/decode cost again when revisiting a preset.
2. **Cold switches** — The first time you picked a preset after load, work waited on network + decode with no prior warm-up.
3. **Duplicate work** — Rapid toggles or overlapping effects could start **multiple parallel loads** for the same URL because there was no in-flight deduplication.

## Fix

### 1. Cached loader (`src/lib/image-processing.ts`)

- **`loadImageCached(src)`** — Keeps a `Map` from URL to the loaded `HTMLImageElement`. If the entry exists and `complete` with `naturalWidth > 0`, returns it immediately.
- **`imageInflight`** — If a load for that URL is already in progress, all callers share the same `Promise` so concurrent requests do not spawn duplicate `Image()` loads.
- On success, the element is stored in the cache; on failure, the inflight entry is cleared so retries are possible.

### 2. Warm-up on mount (`src/components/particle-canvas.tsx`)

- **`warmImageCache(urls)`** — Starts `loadImageCached` for every preset URL (via `Object.values(LOGO_PRESETS)`) inside a `useEffect` on mount.
- Failures are swallowed in the warmer so a broken asset does not break the app; the normal load path still surfaces errors when that preset is actually used.

### 3. Use the cached API in the processing pipeline

- The effect that loads the logo for dithering now awaits **`loadImageCached(src)`** instead of **`loadImage(src)`**.

## Result

- Re-selecting a logo preset is fast because the same decoded image instance is reused.
- Preset images begin loading as soon as the canvas mounts, so the first switch is often already warm.
- Concurrent loads for one URL collapse to a single network/decode pass.

## Files touched

- `src/lib/image-processing.ts` — `loadImageCached`, `warmImageCache`
- `src/components/particle-canvas.tsx` — mount warm-up; `loadImageCached` for logo loads
