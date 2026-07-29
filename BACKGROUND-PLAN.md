# Hub Background Plan — filling the dead space

Three files, all openable straight from disk (no dev server — the real map SVG
is inlined):

| File | What it's for |
|---|---|
| `background-prototype.html` | The page, with a variant switcher and a strength slider |
| `stroke-sheet.html` | The strokes alone, full opacity on white, for judging the brush |
| `ink-generator.js` | The generator. Runs in Node or the browser; this is the artwork source |

---

## 1. What's actually blank

The hub is a single centred column, `width: min(100%, 1180px)`, on a flat
`--paper` field. Three regions read as empty:

| Region | Where | Size on a 1920px screen |
|---|---|---|
| **Side gutters** | left and right of the 1180px column | ~370px each — the biggest offender |
| **Header air** | between the top edge and the map's frame | ~120–200px of flat paper |
| **Tail** | around `.panel-grid` and below `.hub-foot` | grows on tall viewports |

The grain (`--grain-img` at 0.14, 260px tile) is the only thing working there,
and at that strength it's an *absence* of flatness, not a presence. Nothing
around the map has scale — the map is detailed and busy, everything else is
uniform. That contrast is what reads as blank.

---

## 2. The one structural idea

**Nothing is masked to avoid the map, and nothing needs to be.**

The map frame's outer band paints opaque `var(--paper)` (`FRAME.paper` in
`map/meander.js`). A stroke layer sitting *behind* the content is simply
occluded by the chart. So strokes run edge to edge, disappear under the map,
and surface again in the gutters — the ink reads as something the chart was
laid down on top of.

This is also the answer to "don't touch the water": the layer physically
cannot reach the ocean. It sits at `z-index: 0` under a fully opaque
`.map-frame`. *(The tinted sea in the first prototype was a bug in that
prototype's hand-trimmed CSS — it dropped `#oceanVeil{opacity:0}` and
`.region .glow-layer{opacity:0}`, so the hover veil painted `#0b0a18` over the
whole sea at rest. The current prototype inlines `hub.css` verbatim instead of
retyping it, and the seigaiha field renders correctly.)*

### Other constraints

1. **The map is the hero and already loud** — ornament band, opaque frame,
   near-black sea, four saturated landmasses. The ink has to read as tone, not
   as a subject.
2. **Hub only.** The spoke pages have dark grounds (`--fire-ground` is
   `#240d09`); black ink there is invisible at best. Scope to `#hub`, never
   `body`.
3. **Static.** `.map-frame.dim` desaturates three nations on hover; if the
   background animated or carried colour, that would read as a glitch. Static
   also means `prefers-reduced-motion` costs nothing.
4. **Inert during boot.** `map/boot.js` removes `.boot` from its own
   `onComplete`. The ink layer must never be a GSAP target or match a `.boot`
   selector.

---

## 3. How the strokes are made

The naïve approach — draw N tapered filaments side by side — was the first
attempt and it looks like cross-hatching, not ink. The mark is built the other
way round:

```
body      a filled bar, near-constant thickness, ragged top and bottom
streaks   thin voids CUT OUT by a mask, crowding toward the tail
tail      loose filaments running past the body where the brush lifted
spatter   flecks hugging the edges
```

Solid ink *minus* streaks is what gives the reference its hard black core with
sharp thin gaps. One mask for the entire layer, not one per stroke.

Parameters, in the order they matter (`stroke()` in `ink-generator.js`):

| Knob | Does |
|---|---|
| `w` | half-width of the bar |
| `dry` | how far back up the stroke the voids reach — the single most expressive one |
| `taper` | how much the tail thins. `0` = parallel-sided |
| `rough` | top/bottom edge wander. Ramps up along the stroke, because a dry finish is rougher than a wet start |
| `streaks` | void count |
| `tail` / `reach` | how many filaments run past the body, and how far |
| `blunt` | `1` = square landing. Set `0` for any stroke that both starts *and* ends on-screen — a squared end mid-canvas reads as a cut bar |

`stroke-sheet.html` shows eight settings side by side at full opacity.

All artwork is generated from these parameters. Nothing is traced from the
reference sheet you sent, so there's no license question hanging over it — that
sheet was used as a style target only.

---

## 4. The four compositions

Canvas is `viewBox="0 0 1600 1000"`, `preserveAspectRatio="xMidYMid slice"`, so
it always covers and crops rather than squashing. On a wide desktop the
left/right thirds land in the gutters; on a phone they crop away, which is
correct — a narrow screen has no dead space.

- **A · Horizontals** — two long bands top and bottom, two short ones in the
  gutters. Most like the reference sheet.
- **B · Gutter verticals** — the same brush turned upright, running the full
  page height. Reads like the mounting on a hanging scroll. Fits the shape of
  the dead space most directly.
- **C · Mixed — recommended** — a horizontal band behind the name, two verticals
  holding the gutters, a horizontal under the panel grid. Covers all three dead
  regions and reads as a deliberate composition rather than decoration.
- **D · Sparse** — one behind the name, one under the grid. The "how little
  works" answer, and the safest thing to ship.

**Strength: `.13`.** `.07` was too faint — the dry-brush detail washes out and
the strokes read as vague smudges rather than ink. Somewhere in `.10–.15` is
where they become brush strokes without competing with the map.

---

## 5. Implementation

```css
#hub{ position:relative; isolation:isolate; }

.hub-ink{
  position:absolute; inset:0; z-index:0;
  pointer-events:none; overflow:hidden;
  color:var(--ink);
  opacity:.13;                    /* the one number worth tuning */
}
.hub-ink svg{ width:100%; height:100%; display:block; }

/* Content steps over the ink; the opaque map frame does the occluding. */
.hub-head,.map-frame,.panel-grid,.hub-foot{ position:relative; z-index:1; }
```

`isolation:isolate` is safe — every blend in the codebase is
`background-blend-mode` (element-internal), so nothing depends on `#hub`
sharing the root stacking context.

**Payload**, generated, before minification:

| Variant | Raw | Gzipped | Elements |
|---|---|---|---|
| A | 70.6 KB | 21.3 KB | 284 paths, 41 flecks |
| B | 51.5 KB | 15.6 KB | 209 paths, 33 flecks |
| C | 65.3 KB | 20.2 KB | 258 paths, 39 flecks |
| D | 44.4 KB | 13.5 KB | 170 paths, 24 flecks |

Acceptable, but it is the one real cost and worth cutting before shipping:
drop `samples` from 34 to ~22 and round coordinates to whole units (they're at
one decimal now, which is meaningless at this opacity). That should roughly
halve it. If it's still too heavy, reduce `streaks` — the voids are the bulk of
the element count.

No filters are used, so there is no `feTurbulence` cost and no Safari
`mix-blend-mode` risk. The mask is plain luminance: a white rect with black
lines over it.

---

## 6. Steps

1. Open `background-prototype.html`. Pick a variant and a strength. *(you)*
2. Bake the chosen composition: `node -e "console.log(require('./ink-generator.js').inkSVG('C'))"`
   → a static `src/map/inkLayer.js` exporting the string, same shape as
   `seals.js`. Round the coordinates on the way through.
3. Add the `.hub-ink` block to `src/styles/hub.css` next to the `#hub` rule,
   with a comment explaining the occlusion (§2) — it is not obvious from the
   CSS alone why nothing masks the map.
4. Inject in `main.js` as the first child of `#hub`, before `bootMap()`.
5. Check: hover dim, boot sequence, a spoke page (no ink), 375px, 2560px.

### If you'd rather draw them yourself in Inkscape

Same spirit as `SVG-EXPORT-SPEC.md`:

- **Canvas 1600 × 1000 px**, matching the viewBox.
- **Fills, never strokes.** Calligraphy tool (Ctrl+F6), or draw and
  `Path → Stroke to Path` (Ctrl+Alt+C). A `stroke-width` line can't taper.
- **Flat `#000000` at 100% opacity.** All transparency lives in CSS so there's
  one number to tune.
- **Run off the canvas edge.** Anything that starts and stops inside the frame
  needs torn ends, not square ones.
- **`Path → Break Apart` (Ctrl+Shift+K)**, one `<path>` per stroke, ID each one.
- **Save as Plain SVG**, then `Path → Simplify` (Ctrl+L) until each `d` is a few
  hundred bytes. Precision 2.
- **4–6 strokes.** More stops reading as composition.

Paste the result over the `<g>` inside `.hub-ink` in the prototype to preview
against the real map before committing.

---

## 7. Rejected

- **Animating the strokes.** The boot sequence is already a 2.6s timeline; the
  map owns the page's motion budget.
- **Putting the layer on `body`.** Breaks all four spoke pages (§2.2).
- **Raster/PNG ink plate.** ~400 KB at 2× for something that renders at 13%.
- **Strengthening the grain instead.** Grain has no scale — doubling its
  opacity makes the paper look dirty, and does nothing for the gutters
  specifically, which is where the actual problem is.
