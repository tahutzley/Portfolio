# Continent SVG Export Spec

**Read this before you draw.** Every requirement here exists because a specific animation breaks without it. Re-exporting is cheap; re-drawing is not.

---

## 1. Canvas

> **Changed since this doc was first written.** The frame retile (MAP-POLISH-PLAN.md §2.1–2.4) grew the border outward and the viewBox with it, so `#map` is now `viewBox="-64 -84 1728 1168"`, not `0 0 1600 1000`. **The drawable area did not move.** The ocean rect is still x 86–1514, y 66–934, every existing landmass coordinate is unchanged, and `FRAME` in `src/map/meander.js` is the one place those numbers live.

**Set your Inkscape document to 1428 × 868 px, then set the root `<svg>`'s viewBox to `86 66 1428 868`.**

That canvas *is* the ocean — the drawable area, exactly. Nothing you draw can land out of bounds by construction, and the coordinates Inkscape's toolbar shows you are the same numbers that end up in `regions.js`. You never draw the frame: it's generated in code from `FRAME`, it's regenerated at whatever size it's currently set to, and anything you drew under it would be painted over anyway.

**In Inkscape 1.x:**

1. **File → Document Properties → Custom size** — width `1428`, height `868`, units **px**. Set display units to px too.
2. **Ctrl+Shift+X** (XML editor) → select the root `<svg:svg>` node → set `viewBox` to `86 66 1428 868`. Inkscape honours it; the canvas origin moves to (86, 66) and your readouts now match map space.
3. **Edit → Preferences → Interface → "Y axis points down"** must be **on**. It's the default in 1.x and matches SVG. If it's off (0.92 behaviour) every Y you read is mirrored and the whole export lands upside down.
4. Draw. A coastline *touching* the canvas edge is good — it means touching the frame, and the border breaks around it deliberately. Plan one or two on purpose.

**If step 2 fights you:** make the document plain `1428 × 868` at the default `0 0` origin, draw as though the top-left corner is the ocean's top-left, and say so when you send it. That's a single flat `translate(86, 66)` applied once on import — a mechanical fix. What is *not* mechanical is a file drawn at some other size, because rescaling changes stroke-to-landmass proportion and point density. **The size matters; the origin doesn't much.**

Do not draw at 1600 × 1000, and do not draw at 1728 × 1168 — the first is the old viewBox and the second includes 150 units of frame margin on every side that you must not put art into.

Approximate territory of the **original placeholder** layout, if you want to keep the composition. Note `regions.js` no longer holds these — it holds the traced Inkscape artwork that replaced them — so treat this table as the composition brief it always was, not as a description of what's on screen today:

| Nation | Region | Current footprint |
|---|---|---|
| Water | Polar caps, top and bottom | north ~x 736–1032, y 88–190 · south ~x 704–992, y 812–920 |
| Earth | Great continent, east | mainland ~x 834–1386, y 246–808 · west lobe ~x 680–914, y 302–462 |
| Fire | Volcanic archipelago, west | main ~x 314–610, y 508–714 · chain ~x 606–780, y 528–584 · islet ~x 789–823, y 539–573 |
| Air | Scattered mountain isles | NW cluster ~x 400–622, y 276–406 · S cluster ~x 588–872, y 762–853 · E isle ~x 1394–1494, y 584–678 |

These are Bézier control-point hulls read off the path data, so the actual rendered curves sit a few units inside them. Close enough for planning, not for pixel-matching.

You are not bound to this. But keep the four **visually balanced** and keep the ocean readable between them — the seigaiha field is doing real work and shouldn't be crowded out.

---

## 2. Structure — the part that matters most

### One `<path>` per landmass. Never merge.

```xml
<!-- CORRECT -->
<g id="earth">
  <path id="earth-mainland" d="M902 306 C …Z"/>
  <path id="earth-peninsula" d="M690 358 C …Z"/>
</g>

<!-- WRONG — one path holding two disconnected shapes -->
<g id="earth">
  <path d="M902 306 C …Z M690 358 C …Z"/>
</g>
```

**Why:** the glow filter derives from each shape's alpha. Merged subpaths glow as one blob and can't be staggered, offset, or animated independently. Also kills any future per-island lift.

In Illustrator: select the landmasses and **Object → Compound Path → Release** before export.
In Figma: don't use *Flatten* across separate shapes. Export each as its own vector layer.
In Inkscape: **Path → Break Apart** (Ctrl+Shift+K), then check you haven't split donut holes into solid shapes.

### Group by nation, ID everything

```xml
<g id="water">
  <path id="water-cap-north" …/>
  <path id="water-cap-south" …/>
</g>
```

IDs get used directly in JS for hover targeting and per-island staggering. `Path_2847` is not an ID.

### Islands, lakes, and holes

- **Separate islands** → separate `<path>` elements.
- **Lakes / inland seas** → a compound path with an opposite-winding inner subpath, using `fill-rule="evenodd"`. This is the *one* case where a single path holds multiple subpaths, and it's correct.

---

## 3. Geometry rules

**Do not do these:**

| Don't | Why it breaks things |
|---|---|
| Convert strokes to outlines | Turns a coastline into a closed ribbon with two edges. `feMorphology` then glows the inside *and* outside. Strokes are applied in code. |
| Bake in `transform=` on groups or paths | Every coordinate in the plan assumes untransformed absolute values. Flatten transforms on export. |
| Use `<clipPath>` or `<mask>` | Conflicts with the glow and transition masks. Boolean the shapes properly instead. |
| Use `<image>` or embedded raster | Kills the glow filter entirely and bloats the file. Vector only. |
| Leave `style="…"` attributes on paths | Inline styles beat the CSS custom properties, so nations lose their palette. |
| Apply filters or effects in the editor | All filters are defined once in `<defs>` and applied in code. |
| Export at a different artboard size | Coordinates won't line up with the frame, seals, or tag placement. |

**Do do these:**

- **Close every landmass path** with `Z`.
- **Keep point counts modest.** 40–120 anchor points per landmass. Below ~30 it looks geometric; above ~200, `feMorphology` gets expensive and Safari starts dropping frames. If your drawing tool produces 800 points, run a simplify pass at low tolerance.
- **Consistent winding direction** on outer boundaries — all clockwise or all counter-clockwise. Mixed winding makes `fill-rule` behave unpredictably.
- **No self-intersecting paths.** Coastlines that cross themselves produce glow artifacts that are genuinely hard to debug.
- **Round coordinates to 1 decimal.** `M902.4 306.1` not `M902.41739 306.08812`. Halves file size, zero visual difference.

---

## 4. Fills and strokes

Export with **no fill and no stroke**, or with a flat placeholder fill you don't care about. The code assigns:

```xml
<path class="mass" fill="var(--earth-mass)" stroke="var(--ink)" stroke-width="4.5" d="…"/>
```

Stroke weight isn't uniform today — the file uses `4.5` on the Earth masses and Fire's main island, `4` on the Water caps, Fire's smaller shapes, and all five Air masses. Roughly: bigger landmass, heavier outline. Worth making that rule explicit rather than accidental when we rewire it; tell me if you'd rather it be one weight throughout.

If your export tool insists on writing fills, use `fill="#000"` — easy to find and replace, and obviously wrong so it can't ship by accident.

**Class names to apply** (I'll do this, but keeping them in mind while structuring helps):

- `.mass` — the landmass itself
- `.coast` — a landmass whose outline participates in the boot draw-in animation (currently only Earth's mainland; you may want two or three)
- `.detail` — inland decoration (mountains, city rings, smoke curls)

---

## 5. Inland detail — export separately

Mountains, volcanic peaks, city rings, smoke curls: **separate group per nation, not merged into the landmass paths.**

```xml
<g id="earth-detail">
  <path d="M950 372 l18 -25 …"/>
  <circle cx="1246" cy="392" r="46"/>
</g>
```

**Why:** detail strokes must *not* receive the glow filter — glowing every mountain range turns the hovered continent into a smear. They also fade in on their own delay during boot (line 356), and separating them is what will let the Phase 3 gray-out treat inland detail differently from the landmass. (Today it can't: line 149 desaturates the entire region `<g>` uniformly.)

Keep detail **unfilled, stroked only** — `fill="none"` with a visible `stroke`. The existing mountain glyphs are the model: `d="M950 372 l18 -25 l13 16 l14 -21 l22 30z"` (line 473). Note they *are* closed with `z` — that's fine and intentional for a mountain silhouette. The smoke curls (lines 513–515) are genuinely open paths. Either is correct; what matters is that nothing in this group is filled.

**Naming caution:** `class="detail"` is not nation-scoped in the current file — it's also on the frame, border bands, and meander (lines 421, 425, 428). I'll namespace these on integration, but don't assume `.detail` means "inland decoration."

---

## 6. Coastline character

The existing `#bleed` filter (line 409) displaces coastlines with fractal noise to produce a wet-ink edge:

```xml
<filter id="bleed" x="-8%" y="-8%" width="116%" height="116%">
  <feTurbulence type="fractalNoise" baseFrequency="0.028" numOctaves="3" seed="7" result="n"/>
  <feDisplacementMap in="SourceGraphic" in2="n" scale="5"
                     xChannelSelector="R" yChannelSelector="G"/>
</filter>
```

**So don't draw the wobble yourself.** Draw clean, confident curves. The filter adds the hand-drawn quality at render time, consistently across every coastline. If you also draw wobble, you get wobble-on-wobble — noisy, and the two never quite agree.

If you'd rather have full authorial control over the coastline character, say so and we'll drop `#bleed` — but then *every* landmass needs that treatment by hand, and it must be consistent across all four nations or the map falls apart.

---

## 7. Nation tag labels

The `WATER` / `EARTH` / `FIRE` / `AIR` labels are static markup in `<g class="tag">` blocks — lines 448–452 (Water), 484–488 (Earth), 517–521 (Fire), 555–559 (Air). Each is a bordered rect plus centered text.

**Don't include them in your export.** Just tell me roughly where each should sit relative to your new landmasses and I'll reposition them. They're also the elements carrying the hardcoded `font-family="Palatino, Georgia, serif"` that the redesign plan flags for replacement.

---

## 8. Delivery

**Preferred:** four separate files — `water.svg`, `earth.svg`, `fire.svg`, `air.svg` — each on the full 1428×868 canvas from §1 so they compose by direct overlay with no repositioning. Drop them in this folder.

**Also fine:** one `map.svg` with four top-level groups (`#water`, `#earth`, `#fire`, `#air`).

Run them through [SVGOMG](https://jakearchibald.github.io/svgomg/) before sending, with **"Prefer viewBox to width/height" ON** and **"Clean IDs" OFF** (it will happily delete the IDs the code depends on).

---

## 9. Quick self-check before you send

- [ ] Canvas is exactly 1428 × 868, viewBox `86 66 1428 868` (see §1 — this changed)
- [ ] Every landmass is its own `<path>` — no merged compound paths except intentional lakes
- [ ] Every path has a meaningful `id`
- [ ] Grouped by nation
- [ ] No `transform=` attributes anywhere
- [ ] No `<clipPath>`, `<mask>`, `<image>`, or editor filters
- [ ] No inline `style=` attributes
- [ ] Strokes are strokes, not outlined shapes
- [ ] All paths closed with `Z`
- [ ] 40–120 points per landmass
- [ ] Coordinates at 1 decimal place
- [ ] Inland detail in its own group, open paths, not merged into landmasses
- [ ] Nation labels excluded
- [ ] Nothing outside x 86–1514, y 66–934 (except deliberate frame contacts)

---

## If in doubt

Send one nation first — Fire is a good test case, since the archipelago exercises multi-island grouping. I'll wire it up through the full glow / gray-out / transition pipeline and confirm it behaves before you draw the other three.

**That's the single highest-value thing you can do.** Finding a structural problem on one nation costs an hour. Finding it on four costs an afternoon.
