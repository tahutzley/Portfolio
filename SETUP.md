# Setup — one time

## 1. Move the assets into `public/`

**This step is required.** Skip it and the site works in `npm run dev` but every image and PDF 404s in the production build.

Vite only copies files it can statically discover. Your images and PDFs are referenced as plain strings inside JS template literals (`image: "Tableau.png"`), which the bundler never sees — so they have to live in `public/`, which is copied verbatim to `dist/`.

The dev server happens to serve the project root too, which is exactly why this bug hides until you deploy.

Run once from `D:\Portfolio` in PowerShell:

```powershell
New-Item -ItemType Directory -Force -Path .\public | Out-Null
Move-Item -Path .\*.png, .\*.pdf -Destination .\public
```

No code changes needed — the filenames stay identical, and `public/Tableau.png` is served at `/Tableau.png` in both dev and build.

## 2. Install and run

```powershell
npm install
npm run dev
```

Opens at `http://localhost:5173`.

## 3. Build for your host

```powershell
npm run build
```

Output lands in `dist/`. Upload its **contents** (not the folder) to your web root. `base: './'` is already set in `vite.config.js`, so it also works from a subdirectory like `example.com/portfolio/`.

Sanity-check the build before uploading:

```powershell
npm run preview
```

That serves `dist/` exactly as a static host would — it's the only way to catch the asset problem in step 1.

---

## Where things live now

| You want to… | Edit |
|---|---|
| Add or change a project | `src/config/nations.js` — the only file you should need |
| Change your name, tagline, footer links | `src/config/site.js` |
| Change a nation's colours | `src/styles/tokens.css` |
| Swap in the hand-drawn continents | `src/map/regions.js` — see `SVG-EXPORT-SPEC.md` |
| Adjust the map border | `src/map/meander.js` |
| Adjust hover behaviour | `src/styles/hub.css` (the PHASE 3 block) and `src/map/hover.js` |

`timothyhutzley.html` is the original single-file version. It still works standalone. Keep it until you've confirmed the new build behaves, then delete it — Vite ignores it either way.

---

## Two known follow-ups

**The display font loads from Google Fonts.** `index.html` pulls Cormorant Garamond over the network, which costs a round-trip and a flash of fallback text. Self-hosting it as `.woff2` in `public/fonts/` with a local `@font-face` is strictly better; it just needs the file downloaded.

**`gsap` is installed but unused.** It's staged for Phase 5 (elemental card hovers) and Phase 6 (page transitions). Nothing imports it yet, so it isn't in the bundle. Remove it from `package.json` if you'd rather add it when it's actually needed.
