# MAP POLISH — Border & Ocean

> **Status: implemented.** Cartouches shipped as option B (§2.5). Two things
> changed during the work and the sections below have been corrected to match
> the code: the fret glyph gained a rail and its runs now abut rather than
> sitting apart (§2.4), and the corner ornament is a filled bracket rather
> than nested strokes — both because the retile made the old detached zigzag
> read as a row of numeral 2s once it was large enough to see.

Goal: close the gap between the current map and the reference poster on two
axes only — **the frame** and **the fullness of the seigaiha water**. The
border stays a rectangle; the landmass geometry in `regions.js` is not
touched.

Files in scope: `src/map/mapSvg.js`, `src/map/meander.js`, `src/styles/tokens.css`.
Adjacent, optional: `src/map/seals.js`.

---

## Part 1 — The waves

### 1.1 The real defect: the pattern tile clips half its own motif

`defs()` in `mapSvg.js:137` builds the seigaiha as a 64×32 `userSpaceOnUse`
tile. Row A (the on-baseline row) draws four nested semicircles on `y=32`
with radii 32 / 23 / 14 / 5 — that row is fine, it fits the tile exactly.

Row B (the half-offset row) draws on baseline `y=16`, so its arcs span
`y = -16 … 16`. **A `<pattern>` clips its content to the tile**, so
everything above `y=0` is discarded and never reappears from the tile above.
What actually survives per tile:

| arc | authored | renders |
|---|---|---|
| r=32 @ y=16 | full semicircle | two ~4-unit stubs near x≈28 and x≈36 |
| r=23 @ y=16 | full semicircle | two ~6-unit stubs |
| r=14 @ y=16 | full semicircle | fully (top lands at y=2) |
| r=5 @ y=16 | **never authored** | — |

So every other row of scallops is a single thin arc plus a few disconnected
fragments, and it is missing its innermost ring entirely (`mapSvg.js:144-149`
has r=32/23/14 for the offset row but no r=5 counterpart). That is the whole
"the water looks empty" symptom — half the pattern isn't being drawn.

**Fix:** author one scallop as a reusable `<g>` and stamp it at every offset
whose bounding box intersects the tile, so clipped parts are supplied by a
neighbouring copy.

```
<g id="scallop">  <!-- baseline at y=0, centred on x=0, arcs rising -->
  ...nested semicircles...
</g>
```

Stamps required for a 64×32 tile with radius 32 and 16-unit row pitch:

- baseline y=32, cx ∈ {−32, 32, 96}
- baseline y=16, cx ∈ {0, 64}
- baseline y=48, cx ∈ {0, 64}

Seven `<use>` elements. Cost is nil — the tile rasterises once.

*(One-line alternative: `overflow="visible"` on the `<pattern>`. Browsers do
honour it, but the stamp approach has no support caveat and is explicit about
what the tile contains. Recommend stamps.)*

### 1.2 Ring density

Current: 4 rings at r = 32 / 23 / 14 / 5 — 9 units apart, 2.2 stroke, so
~6.8 units of dead space between every line, plus a 5-unit blank cap in the
middle of each scallop. The poster's scallops read as ~6 tightly packed rings
with almost no flat area.

Change to 6 rings: **r = 32, 26.5, 21, 15.5, 10, 4.5** (5.5 pitch, ~3.3
units of gap). Tune by eye after the first render.

### 1.3 Scale

Poster is ~25 scallops across the ocean; current tile gives 1428/64 ≈ 22.3.
Drop the tile to **56×28** (radius 28, pitch 14) → ~25.5 across. Radii scale
by 56/64: **28, 23.2, 18.4, 13.6, 8.75, 4**.

### 1.4 Line contrast and carved depth

- `--sea-line` `#5d5a8c` on `--sea-deep` `#2b2949` at `opacity .85` is a soft,
  low-contrast pair. Lift to roughly `#6f6ca6` and drop the group opacity to
  1 — the poster's arc lines are distinctly brighter than the field.
- Add an emboss: draw the same arc set twice inside `#scallop` — first in a
  darker tone (`--sea-shadow`, ≈`#1e1c35`) offset `translate(0,1.6)` at ~.5
  opacity, then the light lines on top. That single shadow pass is what gives
  the poster its quilted, three-dimensional scale texture.
- New tokens in `tokens.css`: `--sea-shadow`, and retune `--sea-line`.

### 1.5 Stop the vignette from eating the pattern

`#oceanVignette` (`mapSvg.js:155`) ramps to 38% black at the rim, which is the
main reason the field looks washed near the frame while the poster stays even
edge to edge. Take it to **`r 82%`, start 62%, end opacity `.22`**. Keeps the
inward pull, stops flattening the outer scallops.

`#oceanVeil` (hover recede) is unaffected.

---

## Part 2 — The border

### 2.1 Give the frame room — grow the viewBox, not the ocean

The ocean rect is `86,66,1428,868` and every landmass, tag and seal is
positioned against it, so the inner edge must not move. The frame band is
currently only 40 units (2.5% of the 1600 viewBox); the poster's is roughly
double that proportionally, which is most of why ours reads thin and printed
rather than carved.

Solution: keep the ocean fixed and expand the viewBox outward.

```
M = 150                                  // total paper margin
viewBox = (86 - M) (66 - M) (1428 + 2M) (868 + 2M)
        = "-64 -84 1728 1168"
```

`viewBox` appears only in `mapSvg.js:285` — nothing else in the codebase reads
it, and `.map-frame svg { width:100%; height:auto }` follows the new aspect
automatically. No responsive or JS changes.

### 2.2 Layer the 150 units, outside → in

Mirrors the poster's stack instead of the current two thin rects:

| band | width | treatment |
|---|---|---|
| trim | 14 | flat `--paper`, slight warm gradient (poster's paper margin) |
| step | 22 | `--paper-deep`, light bevel on top/left |
| **ornament** | **72** | `--paper-edge` ground — the carved band, carries everything in 2.3 |
| step | 26 | `--paper-deep`, dark bevel |
| rule | 16 | `--ink` at .86, hard edge against the water |

Plus one diagonal `#frameLight` wash over the whole stack, under the ocean.
Five flat fills with bevel hairlines still read as vector; the poster's
border is visibly lighter at the top-left and falls off toward the
bottom-right, and a single gradient rect buys that.

Existing bevel logic in `frame()` (`mapSvg.js:195-200`) is the right idea and
just gets re-anchored to the new band edges — light on top/left, shadow on
bottom/right, per band rather than only twice.

### 2.3 Ground/ornament contrast — the flatness fix

Right now the fret is `stroke="var(--paper)"` `#d9cbab` at `.8` opacity on a
`--paper-deep` `#c2b191` ground. Those two hexes are ~10% apart in luminance,
so the ornament effectively disappears and the border reads as a blank tan
rectangle. The poster is light raised shapes on a distinctly darker ground.

- ornament ground → `--paper-edge` `#a8916b`
- fret / brackets / bosses → `--paper` `#d9cbab` at full opacity
- each ornament gets a 2-unit `#7d6845` shadow line on its bottom/right

### 2.4 The ornament itself

`meander.js` already solves flush spacing and corner joints correctly —
`runOrigins()` and the `ARM` offset alignment are sound and stay. What changes
is scale and vocabulary:

- **Retile for the 72-unit band,** and give the glyph a rail. `BAND`,
  `GLYPH_W`, `GLYPH_H`, `INSET` are already named constants, so the retile
  itself is just new numbers — glyph 28×26 → 63×42, `#keyTile` redrawn to
  match. The rail is the substantive change: the old glyph was a detached
  zigzag with a gap to the next one, and at 1.8× size with the §2.3 contrast
  fix behind it, a row of detached zigzags reads as a row of numeral 2s
  rather than as a Greek key. A meander is a continuous line. `#keyTile`
  becomes `M0,42 H63 M13,42 V0 H48 V26 H28` — a full-width rail plus a hook
  spiralling off it — and the runs butt edge to edge so the rails join.
  That means `runOrigins`'s flush formula `spacing = (len - GLYPH_W)/(n - 1)`
  is replaced by `runLayout`, which divides the run into exactly `n` steps
  and scales the glyph along its own axis to fill one. The correction is
  0.7% between the two run lengths — invisible — and it buys an unbroken
  rail on any band length rather than only on ones that divide evenly.
- **Solid corner brackets.** The poster's corners are large filled L-blocks,
  not thin nested strokes, and there is a second reason to fill them: a
  stroked corner has line *ends*, which must land on something in the run or
  they read as unfinished — and the hook's upper horizontals only span part
  of each glyph, so there is nothing there to meet. A filled block has no
  ends. Its two edges sit at the glyph's own horizontals (band offsets 15 and
  41), so it reads as a solid version of what the run draws in line. The
  rail, being continuous, still turns the corner as a stroked elbow.
- **Mid-edge bosses.** The poster puts a ring medallion at the centre of the
  left and right bands. Add a `--paper` disc with a `--paper-edge` ring and an
  inner concentric ring at `(x=left band centre, y=500)` and its mirror. Two
  elements, and they are what stops the long vertical runs reading as
  wallpaper.
- **Stepped blocks top and bottom.** Optional second pass: break the top and
  bottom runs with a few raised rectangular blocks the way the poster does,
  rather than an unbroken fret.

### 2.5 Cartouches (decision needed)

The poster's strongest frame element is the cream plaque centred on the top
and bottom edges, overlapping the frame. It is what makes the whole thing read
as a printed chart rather than a bordered image.

Three ways to go, pick one:

- **A.** Site name in the top cartouche, tagline in the bottom — means moving
  `.hub-name` / `.hub-line` out of the HTML head block and into the SVG.
- **B.** Decorative only — empty plaques with a rule, no text. Zero page
  restructuring, most of the visual payoff.
- **C.** Skip.

Recommend **B** unless you want the name inside the frame.

### 2.6 Seal plates (small, adjacent)

`seals.js:9` draws each seal plate in `--paper-deep` with a `--paper-edge`
border, and `hub.css:93` holds them at `opacity .5` at rest — which is why
they read as muddy grey squares rather than stamps. The poster's are bright
cream plates with a hard dark border and a saturated disc. Change the plate to
`--paper`, border to `--ink` at .62 with an inset keyline, and lift the rest
opacity to .88. Same border vocabulary as 2.3, so it lands with the frame
work. The opacity has to go that high: seals sit on the seigaiha, so whatever
the plate does not cover is deep purple showing through, and anything much
below .85 turns bright paper back into grey-violet mud.

---

## Order of work

1. Wave motif rebuild — 1.1 stamps, 1.2 rings, 1.3 scale, 1.4 emboss.
   *Biggest visible gain, smallest diff, no coordinate churn.*
2. Vignette retune (1.5).
3. viewBox + band layering (2.1, 2.2) — the one step that moves coordinates.
4. Contrast + ornament retile (2.3, 2.4).
5. Cartouches (2.5) once A/B/C is decided.
6. Seal plates (2.6).

Steps 1–2 are independently shippable and don't block anything else.
