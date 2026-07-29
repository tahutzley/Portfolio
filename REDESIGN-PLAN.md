# Four Nations Portfolio — UI/UX Polish Plan

**Baseline:** `timothyhutzley.html`, single file, 1,134 lines, zero dependencies
**Date:** July 2026

---

## Decisions locked

| Question | Answer |
|---|---|
| Build tooling | Move to **Vite**, stay **vanilla JS** |
| Art direction | **Ink-and-parchment.** No photoreal shaders. |
| Map hover | **Border glow + gray-out siblings.** Lift is cut. |
| Mobile | Map stays decorative; **panel cards are the navigation** |
| Deploy | Self-hosted — plain static `dist/` you upload |

---

## Library stack

Deliberately small. Every addition has to earn its bundle size.

| Library | Size (gz) | What it does here |
|---|---|---|
| **GSAP** + DrawSVG, MorphSVG | ~25 KB | Everything. Timelines for page transitions, coastline stroke draws, card hover choreography. [Fully free since April 2025](https://webflow.com/blog/gsap-becomes-free), commercial use included, all former Club plugins unlocked. |
| **Vite** | dev only | Hot reload, module splitting, minified static build |
| ~~Three.js / WebGL~~ | — | **Cut.** Ink-and-parchment direction means SVG masks and filters do this job at 1/50th the weight. |
| ~~Framer Motion / anime.js~~ | — | **Cut.** Redundant with GSAP. |

**Optional later:** [Rive](https://unicornicons.com/learn/rive-vs-lottie) for the four elemental card animations. You'd draw them in Rive's editor with hover state machines baked into the `.riv` file, ~15 KB runtime. Better-looking than hand-coded SVG and easier to iterate visually — but it's a new tool to learn. Recommend building Phase 5 in SVG first, then evaluating whether Rive is worth it.

**Total added weight: ~25 KB gzipped.** Currently you ship 0 KB of JS libraries. This is a real but small cost.

---

## Phase 1 — Vite migration

Mechanical, no visual change. Do this first so everything after is pleasant to work on.

```
portfolio/
├── index.html                 # markup shell only
├── src/
│   ├── main.js                # entry, routing, boot
│   ├── config/
│   │   ├── site.js            # SITE
│   │   └── nations.js         # NATIONS — the part you actually edit
│   ├── data/
│   │   ├── skin.js            # SKIN, SEAL, SEAL_POS, ORDER
│   ├── map/
│   │   ├── map.svg.js         # map markup + defs
│   │   ├── meander.js         # border generator (rewritten, Phase 2)
│   │   ├── seals.js
│   │   └── hover.js           # glow + gray-out (Phase 3)
│   ├── render/
│   │   ├── nation.js          # nationBody, renderNation, spokeTop
│   │   ├── allwork.js         # renderAll
│   │   └── sheet.js           # openSheet, closeSheet
│   ├── transitions/
│   │   ├── index.js           # dispatcher
│   │   ├── water.js  earth.js  fire.js  air.js
│   └── styles/
│       ├── tokens.css         # the :root block, unchanged
│       ├── hub.css  spoke.css  sheet.css  motion.css
└── public/                    # PDFs and project PNGs, copied verbatim
```

**Notes**

- Your CSS custom-property token system (`tokens.css`) transfers untouched. It's the strongest part of the current file — don't refactor it.
- The `NATIONS` config stays one file with the same copy-paste comment block at the top. That ergonomic is worth preserving.
- `vite.config.js` needs `base: './'` for self-hosting from a subdirectory. Easy to forget, breaks all asset paths if you do.
- Everything currently rendered via template strings (`renderNation`, `nationBody`, `openSheet`) keeps working as-is. No rewrite.

**Also fix here:** the note you left yourself at lines 59–60 — *"Swap these two lines for real webfonts when you go to production."* `--face-display` (line 61) is `"Palatino Linotype", "Book Antiqua", Palatino, "Iowan Old Style", Georgia, serif`. Palatino Linotype ships on Windows, Iowan on macOS, and Linux/Android have none of them — not even Georgia — so those visitors fall all the way through to the generic `serif` keyword. Three different typographic identities depending on OS.

Self-host one real display serif as `.woff2` with `font-display: swap`. Candidates that suit woodblock-and-parchment: **Cormorant Garamond**, **EB Garamond**, **Spectral**.

**Catch:** swapping the token alone won't fix the map. The four nation labels hardcode `font-family="Palatino, Georgia, serif"` as an SVG attribute (lines 451, 487, 520, 558) and never reference `--face-display`. Those need updating too, or the map will be in a different typeface than the page.

---

## Phase 2 — Map frame and border

### The corners

Lines 870–890 tile `#keyTile` along four sides. `#keyTile` is `M0,0 h20 v14 h-12 v12 h20` — 28 units wide, 26 tall. The top run starts at `[86, 34]`, the right run at `[1546, 66]` rotated 90°.

The *cross-axis* placement is fine — the 26-tall tile is deliberately centered in the 40-wide band. The problem is the **along-axis** placement at run ends. Working the top run: `count = round(1428/40) = 36`, `spacing = 1428/36 = 39.67`. The loop is `i < count`, so the last tile is `i = 35`, origin `x = 86 + 35 × 39.67 = 1474.3`, and being 28 wide it ends at **x ≈ 1502.3**. The first right-side tile occupies x 1520–1546. So there's a **~18-unit horizontal gap**, plus a 6-unit vertical one (the top band's tiles end at y=60, the right run starts at y=66).

**All four corners are gaps, not overlaps** — I checked each. The border simply stops short of every corner and picks up again after it, which is exactly why they read as unfinished.

**Fix:** stop trying to make a single tile turn a corner. Traditional key-fret borders don't — they use a **distinct corner motif**. Draw four corner blocks (a small square spiral, ~40×40), place them at the four corners, then tile each side *between* the corners with per-side computed spacing:

```js
const INSET = 44;                    // corner block footprint
const run   = sideLength - INSET*2;
const n     = Math.round(run / 40);  // whole tiles only
const gap   = run / n;               // absorb remainder into spacing
```

Because `gap` is derived from the actual run length, no side ever ends mid-tile. This is both the correct fix and the more authentic one.

### The border itself

Currently two stroked `<rect>`s (lines 422–423), a `<path>` drawing four band segments (line 426), and the meander group (line 428) — all flat, which is why it reads dull. Give it depth without leaving the ink idiom:

- **Bevel the frame band.** A 1px light line on the top/left inner edge, 1px dark on bottom/right. Reads as carved woodblock rather than printed rectangle.
- **Commit the corner seals to the border.** `SEAL_POS` puts them at `[150,180]`, `[1450,180]`, `[150,700]`, `[1450,700]`, and each draws a 148×148 plate (line 857) — so at x=1450 a seal spans 1376–1524 and already overhangs the ocean rect's 1514 edge by 10 units. They're *half* on the frame, which is the worst of both readings: neither floating in the sea nor mounted on the border. Push them fully onto the frame band (or fully inside) so the relationship is deliberate.
- **Break the frame line where landmasses touch it.** The single strongest "this is a real map" cue. Any coastline within ~20px of the frame slightly interrupts it.
- **Deepen the ocean.** Your seigaiha pattern (line 390) is uniform across the whole field. Add a very subtle radial gradient — darker at the edges, lighter toward center — so the eye is pulled inward. One `<radialGradient>` overlay rect at ~12% opacity.
- **Corner damage.** Optional: a faint irregular edge on the outermost rect via `feTurbulence` + `feDisplacementMap` (you already have `#bleed` at line 409 doing exactly this for coastlines — reuse the technique at lower `scale`).

---

## Phase 3 — Hover system

### Why the current glow reads as a circle

Because it *is* a circle. Line 432:

```xml
<ellipse class="halo" cx="880" cy="126" rx="180" ry="70"
         fill="var(--water-glow)" filter="url(#soft)"/>
```

A blurred ellipse sitting behind the landmass (`#soft` is just `feGaussianBlur stdDeviation="14"`, line 405). It can never trace a coastline. There are **seven** of these across the map — water ×2, earth ×1, fire ×1, air ×3 — and Earth's is `rx="290" ry="270"`, essentially a plain circle. All seven get deleted.

### Real border glow

Derive the glow from the landmass alpha:

```svg
<filter id="glow-water" x="-30%" y="-30%" width="160%" height="160%"
        color-interpolation-filters="sRGB">
  <feMorphology in="SourceAlpha" operator="dilate" radius="4" result="fat"/>
  <feGaussianBlur in="fat" stdDeviation="9" result="soft"/>
  <feFlood flood-color="#d8ecf8" flood-opacity="0.9" result="tint"/>
  <feComposite in="tint" in2="soft" operator="in" result="glow"/>
  <feMerge>
    <feMergeNode in="glow"/>
    <feMergeNode in="glow"/>       <!-- doubled = hotter core -->
    <feMergeNode in="SourceGraphic"/>
  </feMerge>
</filter>
```

One per nation, swapping `flood-color` for that nation's `--*-glow` token.

**Two gotchas that will bite:**

1. **Filters don't stack on one element.** Your landmasses already sit inside `<g filter="url(#bleed)">`. The glow filter must go on a *parent* group: `<g filter="url(#glow-water)"><g filter="url(#bleed)">…paths…</g></g>`. Otherwise one silently replaces the other.
2. **CSS `filter` overrides the SVG `filter=""` presentation attribute.** Line 143 currently does `.region:hover .mass,.region:focus-visible .mass{filter:brightness(1.13) saturate(1.1)}`. That works today *only* because `#bleed` lives on the parent `<g>` wrappers (lines 434, 458, 494, 529) and never on a `.mass` element. Preserve that separation or the coastline bleed silently disappears on hover.

Animate the glow's intensity by tweening `stdDeviation` and `flood-opacity` via GSAP rather than toggling a class — filter attribute tweens are smooth and cheap here since the filter region is small.

### Gray-out

Line 149 currently does `opacity: .55` on non-hovered regions. **Change this.** Lowering opacity lets the seigaiha wave pattern show *through* the landmasses, which turns them muddy rather than recessed. Desaturate instead:

```css
.dim .region:not(:hover):not(:focus-visible) {
  filter: saturate(0.10) brightness(0.78);
  transition: filter .45s var(--ease-ink);
}
```

Landmasses stay fully opaque, drop to near-grayscale, and the hovered nation is the only color on screen. Much stronger read, and it's exactly the "blue or gray" effect you described.

Add a matching ocean recede — nudge `--sea-deep` a few percent darker on `.dim` — so the whole field settles back and the hovered island sits forward. **This is what will sell the depth without the lift.**

### On cutting the lift

You asked for islands lifting. I'd hold it in reserve rather than delete it: glow + desaturate + ocean-recede may already read as depth, and adding a translate on top risks the busy feeling. Build these three, look at it, and add a 3–4px lift only if it still feels flat. Easy to add later, hard to un-see if it's too much.

---

## Phase 4 — Your continent SVGs

**See `SVG-EXPORT-SPEC.md`.** Read it before you draw. Every requirement in it exists because one of the Phase 3 or 6 effects breaks without it, and re-exporting is much cheaper than re-drawing.

---

## Phase 5 — Elemental card hover

The panel buttons are generated at lines 914–924 and styled from line 173. Current hover is `translateY(-5px)` (line 191) + border color + tinted background — clean, generic. Replace with per-element motion, all rendered in the flat ink style.

**Watch out:** there are **five** elements carrying `.panel-card`, not four — the White Lotus button is `class="panel-card lotus-card"` (line 919). Any blanket `.panel-card:hover` restyle hits it too. Scope the elemental effects to `[data-nation]` and give Lotus its own treatment (see the open question in *What I need from you*).

Each card gets an absolutely-positioned SVG overlay layer inside it, `pointer-events: none`, animated by a GSAP timeline paused at 0 and played on `mouseenter` / reversed on `mouseleave`.

| Nation | Effect | Technique |
|---|---|---|
| **Water** | Seigaiha arcs draw themselves around the card perimeter, then a slow drift | GSAP DrawSVG on stroke-dashoffset, staggered per arc |
| **Fire** | Ink flame-licks rise along the bottom edge and flicker | 5–7 hand-drawn flame paths, staggered scaleY + opacity, randomized timing offsets |
| **Earth** | Stone slabs slide in from the card edges and settle with a hard stop | Small rect group, `translate` with a `power4.out` ease and no bounce — earth doesn't bounce |
| **Air** | Thin curl lines drift diagonally across and dissipate | MotionPath along shallow bezier curves, opacity fade at both ends |

**Discipline:** all four share the same duration (~450ms in, ~300ms out) and the same trigger. Only the *character* differs. That's what makes a set of effects read as a system rather than four demos.

**Reverse on leave, don't restart.** `tl.reverse()` — so fast mouse movement doesn't stack timelines.

---

## Phase 6 — Elemental page transitions

Currently four CSS keyframes at lines 335–344 (`air-in`, `water-in`, `earth-in`, `fire-in`), applied to `.wrap` by the `.enter-*` rules at lines 345–348. They're fine, but they're all "content slides in." You want the *reveal itself* to be elemental.

There's also a fifth, `plain-in` (line 329), used by the All Work page via `.enter-all .wrap` (line 330) — which is the neutral one, and part of why that page will start to feel like an outlier.

**Structure:** a full-viewport fixed overlay above everything, `pointer-events: none`, driven by one GSAP timeline per nation with an `onComplete` that swaps the route. Three beats: **cover → swap DOM → uncover.** Target ~900ms total; longer than that and it stops being delightful on the second visit.

| Nation | Reveal |
|---|---|
| **Water** | A seigaiha wave front sweeps left-to-right. An SVG `<mask>` whose edge is a scalloped wave-scale path translates across the viewport; the new page is revealed in its wake. Trailing foam = a few small arcs that fade behind the front. |
| **Earth** | Two woodblock rock slabs part from the vertical centerline, revealing the page between them. `clip-path: polygon()` on two halves, jagged split edge, `power4.inOut`. Land with a hard stop, no easing tail. |
| **Fire** | Paper-burn. A mask circle expands from center, its edge roughened by `feTurbulence` + `feDisplacementMap`, with a hot glowing rim (`feFlood` in `--fire-key` composited to the mask edge) that leads the burn. |
| **Air** | Rice-paper sheets. Three or four large translucent panels drift apart at different speeds with a slight blur, dissolving to reveal the page. Slowest and softest of the four. |

**Direction consistency:** the same transition should run *in reverse* on back-navigation. The wave that washed in should wash back out. Skipping this is the single most common thing that makes elaborate transitions feel cheap.

All four reuse `#bleed`-style turbulence you already have — this is your existing visual vocabulary applied at full-screen scale, not a new language.

---

## Phase 7 — Mobile, accessibility, performance

- **Mobile (`@media (max-width:880px)`):** the four region `<g>` elements keep `pointer-events: none` (line 371 — it's `.region`, not the map itself, so the SVG still renders and boots normally). Panel cards become the navigation and get **tap-triggered** versions of the Phase 5 elemental effects, fired on `touchstart` and played once. Page transitions run but at reduced complexity — skip the turbulence filters, which are the expensive part on mobile GPUs.
- **`prefers-reduced-motion`:** your block at lines 363–367 sets `animation-duration`, `animation-delay`, and `transition-duration` on `*`, plus `stroke-dashoffset:0` on `.boot .coast`. The `transition-duration` override genuinely matters today, since every current hover effect is a CSS transition — **keep it.** But it will not catch anything GSAP does, because GSAP writes inline styles directly rather than going through CSS transitions. So it needs a second layer: read the media query in JS, and branch to a plain 150ms cross-fade in place of every elemental transition. **Non-negotiable** — full-screen wipes are precisely the trigger for vestibular symptoms.
- **Keyboard:** every effect currently bound to `mouseenter` must also bind to `focus`. You already do this correctly for map regions (lines 933–936) — carry the same discipline into cards.
- **Performance budget:** transform/opacity/filter only. `feTurbulence` is the one genuinely expensive thing here — rasterize it once into a static mask image rather than animating its `baseFrequency`. Target 60fps on a mid-range Android; test with CPU throttled 4×.
- **Verification:** Lighthouse before and after, screen recordings of all four transitions at 4× throttle, keyboard-only walkthrough of every route, and a reduced-motion pass with the OS setting enabled.

---

## Sequencing

| Phase | Work | Risk |
|---|---|---|
| 1 — Vite migration | Mechanical | Low |
| 2 — Border + corners | Contained | Low |
| 3 — Hover system | The highest-value change in the whole plan | Low |
| 4 — Continent integration | **Blocked on your drawings** | Medium |
| 5 — Card hover | Four independent effects, ship one at a time | Medium |
| 6 — Page transitions | The expensive part. Water first as the template. | **High** |
| 7 — Mobile / a11y / perf | Ongoing, not a phase you do once | Low |

Phases 1–3 are independent of your artwork and are where most of the perceived improvement lives. **Start there.** Phase 6 is where effort balloons — if time gets short, ship two great transitions (water, earth) and give air and fire refined versions of the existing CSS keyframes. Nobody will notice; four mediocre transitions is worse than two excellent ones.

---

## What I need from you

**Blocking:**

1. **Continent SVGs per `SVG-EXPORT-SPEC.md`.** Phase 4 and 6 can't start without them. Phases 1–3 can.

**Non-blocking, but decide before Phase 1:**

2. **Display typeface.** Cormorant Garamond, EB Garamond, or Spectral — or point me at one you like.
3. **The `--*-glow` tokens** (line 45–48) were picked to look right behind a blurred ellipse. They'll need retuning for the coastline glow — probably brighter and less saturated. I'll propose values; you'll want to eyeball them.
4. **Does the White Lotus / All Work page stay?** It currently renders every nation stacked in one scroll with a neutral parchment skin. It's the one page with no elemental identity, which will look increasingly odd as the other four get richer.

**Nice to have:**

5. Any reference sites whose motion you actually like. Two or three links is worth more than a page of description for calibrating "dynamic."

---

## Risks

- **Busy-ness.** The biggest one. Mitigation: build Phase 3 fully, then live with it a few days before starting Phase 5.
- **Phase 6 scope.** Full-screen masked reveals are the hardest thing here by a wide margin. Mitigated by building water first as the template and reusing its structure.
- **Safari filter rendering.** SVG filters — especially `feMorphology` and `feTurbulence` — render differently and slower in Safari, and CSS `var()` inside `flood-color` has historically been inconsistent. Test in Safari early, and hardcode hex values in filter definitions rather than using tokens if it misbehaves.
- **Bundle creep.** 25 KB is fine. Adding Rive, Lottie, and a physics library later is how a fast site becomes a slow one. Every addition should have to justify itself against this plan.

---

*Sources: [Webflow — GSAP is now 100% free](https://webflow.com/blog/gsap-becomes-free) · [Rive vs Lottie comparison, 2026](https://unicornicons.com/learn/rive-vs-lottie)*
