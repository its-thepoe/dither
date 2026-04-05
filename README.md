# Dither Playground

Interactive dithered dots that follow your pointer, ripple on tap, and keep your image’s colours. This repo ships a **React component you can drop into your own app**—the same renderer that powers the live demo.

---

## Use it in your project

Install from npm (React 18 or 19):

```bash
npm install @its-thepoe/dither-react
```

Minimal client component:

```tsx
"use client";

import { DitherCanvas, LOGO_PRESET_URLS, mergeDitherParams } from "@its-thepoe/dither-react";

export function MyHero() {
  return (
    <DitherCanvas
      imageSrc={LOGO_PRESET_URLS.linear}
      params={mergeDitherParams({ scale: 0.35 })}
      className="h-full w-full touch-none"
    />
  );
}
```

Use any image URL your browser can load (`https:`, `blob:` from a file input, `data:`, etc.). Tune algorithm, colours, blur, and dither settings via `params` (see defaults in the docs below).

**Full API:** props, Next.js App Router (`dynamic` / `transpilePackages`), Turbopack alias tips, uploads (JPEG / PNG / WebP), and CORS are documented in `**[packages/dither-react/README.md](packages/dither-react/README.md)`**.

---

## What you get

- **Dithering:** Floyd–Steinberg, Bayer, or blue-noise
- **Motion:** Pointer parallax + tap/click shockwaves (same feel as the demo)
- **Colour:** Solid dots or sampled colours from the source image
- **Mobile-friendly:** Layout-driven sizing; dot scale adjusts on small viewports

---

## Try the playground (optional)

This repository also runs a **local demo** with a control panel (DialKit) so you can tweak parameters and **copy the full preset JSON** to your clipboard.

```bash
git clone https://github.com/its-thepoe/dither.git
cd dither
npm install
npm run dev
```

Open [localhost:3000](http://localhost:3000).  
`npm run build` builds the library first, then the Next.js app.

---

## Features (demo app)

- Live controls for every parameter  
- Copy the current configuration as JSON to the clipboard  
- Built with Next.js 15, React 19, Tailwind CSS v4, DialKit

---

## Credits

- Fork of [lenxism/dither](https://github.com/lenxism/dither).  
- Inspired by the dither effect [Emil Kowalski](https://x.com/emilkowalski_) built for [linear.app/next](https://linear.app/next) — [original tweet](https://x.com/emilkowalski/status/2036778116748542220).

## Changelog

See [CHANGELOG.md](CHANGELOG.md) (includes **`@its-thepoe/dither-react`** releases).

## License

[MIT](LICENSE)