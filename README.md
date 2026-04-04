# Dither Playground

Interactive dithered particles that react to your touch. Upload a logo and watch it come alive with its original colours preserved. Hover to push, click to shatter. Minimalist, high-performance, and beautiful.

Support for Floyd-Steinberg, Bayer, and Blue-Noise dithering with a live control panel to tweak everything in real time.

## Running locally

This repo is an npm workspace: the app lives at the root and the installable library is `[packages/dither-react](packages/dither-react/README.md)`.

```bash
npm install
npm run dev
```

Opens at [localhost:3000](http://localhost:3000).

Production build compiles the package first: `npm run build` runs `build:package` then `next build`.

## npm package

Installable React library: **`@its-thepoe/dither-react`** ([package README](packages/dither-react/README.md)) — `DitherCanvas`, presets, Next.js / Turbopack notes, uploads, and CORS.

### Publishing the package

From the repo root (builds `dist/` + `dist/assets/` first):

```bash
npm run build -w @its-thepoe/dither-react
cd packages/dither-react && npm publish --access public
```

**Registry auth:** `npm whoami` must print your username. If you see **401 Unauthorized**, run `npm login` (or `npm login --auth-type=web` with 2FA). Ensure `npm config get registry` is `https://registry.npmjs.org/` unless you use a private registry.

**Scoped name:** You can only publish `@its-thepoe/...` if the **`its-thepoe` scope is yours** (npm user named `its-thepoe`) or you are a **member of the `its-thepoe` org** with publish access. Otherwise npm returns **404** on publish — use a scope that matches your account (e.g. `@yourusername/dither-react`) and rename the package in `packages/dither-react/package.json` plus imports, or create the org on [npmjs.com](https://www.npmjs.com/).

**List your packages** (after login):

```bash
npm access list packages
```

## Features

- **Interactive Physics**: Particles follow your mouse and react to clicks with explosive force.
- **Colour Preservation**: Modified to allow your logo's original colour to shine through the dithered effect.
- **Export Configurations**: Save your favorite looks as JSON or plug-and-play JS code snippets.
- **Modern Stack**: Built with Next.js 15, React 19, Tailwind CSS v4, Motion, and DialKit.

## Stack

Next.js 15 &middot; React 19 &middot; Tailwind CSS v4 &middot; Motion &middot; DialKit

## Credits

- This project is a fork of [lenxism/dither](https://github.com/lenxism/dither).
- Originally inspired by the dithered particle effect [Emil Kowalski](https://x.com/emilkowalski_) built for [linear.app/next](https://linear.app/next). See his [original tweet](https://x.com/emilkowalski/status/2036778116748542220).

## License

[MIT](LICENSE)