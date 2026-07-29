# Element Seal SVGs

Drop your four exported marks in this folder:

```
src/assets/seals/air.svg
src/assets/seals/water.svg
src/assets/seals/fire.svg
src/assets/seals/earth.svg
```

That's the whole install. The filename is the wiring — `air.svg` becomes Air's
mark everywhere it appears, with no code change and no import to add. Any
nation without a file keeps drawing the built-in `SEAL` path from
`src/data/skin.js`, so you can do them one at a time.

Each mark renders in three places from this one file:

| Where | Size | Colour |
|---|---|---|
| The four corner seals on the map | fitted to a **66-unit** box | `--ink-deep` (near-black) |
| Panel cards on the hub | fitted to a **76-unit** box | that nation's `--*-key` accent |
| Spoke-page headers | same as the cards | same |

---

## The two rules that actually matter

### 1. Give it a `viewBox`

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"> … </svg>
```

The viewBox is how the mark gets positioned and scaled — it is read, the
artwork's centre is moved to the origin, and the longer axis is fitted to the
target box. Without one the file is skipped and the fallback path keeps
drawing (with a console error in `npm run dev` saying so).

`width`/`height` attributes are ignored, so leave them or don't.

**Author on a square canvas — `0 0 100 100` is the recommended one.** The fit
preserves aspect ratio, so a 100×60 drawing renders 66×40 on the map rather
than being stretched. That's correct behaviour, but it means a wide mark sits
smaller inside the ring than you'd expect. Square canvas, mark roughly filling
it, is the predictable case.

### 2. Colour it with `currentColor`

```xml
<path d="…" fill="currentColor"/>
<path d="…" fill="none" stroke="currentColor" stroke-width="7"/>
```

The same file has to paint near-black on the map and the nation's accent on
the cards, so nothing may hard-code a colour. `currentColor` works for both
`fill` and `stroke`. A shape with **no** `fill` attribute at all also inherits
correctly — the wrapper sets `fill`.

A hex like `fill="#000"` will ship and will be wrong on the panel cards.

---

## Sizing your strokes

The whole mark is scaled by `66 / <the longer viewBox axis>` on the map, so
stroke widths scale with it. On the recommended `0 0 100 100` canvas that's
**0.66×**:

| Authored width | Renders at (map) | Reads as |
|---|---|---|
| 5 | 3.3 | thin |
| 8 | 5.3 | about the current mark |
| 11 | 7.3 | heavy |

The ring around your mark is **6.5 units** — matching or slightly under it is
a good default. Aim for **8–10** on a 100-unit canvas.

If you'd rather not do that arithmetic, outline your strokes to filled paths
in the editor and forget about it. That's fine here — unlike the landmasses in
`SVG-EXPORT-SPEC.md`, these marks get no glow filter, so there's nothing that
outlined strokes break.

---

## Keep out

| Don't | Why |
|---|---|
| `id="…"` on anything | These inline into the same document as the map. Ids are page-global, so a bare `id="a"` from an export tool can shadow one of the map's own gradients or filters. Prefix them (`id="air-glow"`) if you genuinely need one — `npm run dev` warns when it finds any. |
| `<style>` blocks or `class="cls-1"` | Illustrator's default export mode. The classes have no rules here, so the mark renders as flat black at best. Set **Styling: Presentation Attributes** on export. |
| `fill="#000"` and friends | Breaks the accent colouring on panel cards. |
| `<image>`, embedded raster, base64 | Vector only. |
| Filters, blend modes, masks | The map has its own filter stack; these are inlined into it. |
| A background rect | The mark sits on a coloured disc that's already drawn. A white square behind it will show. |

`<title>`, `<desc>`, `<metadata>` and comments are stripped automatically — no
need to clean those out yourself.

---

## Composition notes

The mark is centred inside a **52-unit-radius ring** on the map. The 66-unit
fit box has a 46.7-unit diagonal, so a mark that fills its own corners still
clears the ring by about 5 units. You have room; the built-in marks are
noticeably smaller than the fit box and look a little lost inside it — filling
more of the square is an improvement, not a risk.

Keep the four legible at the size they're actually seen. The corner seals are
148 units on a 1728-unit-wide map — roughly 100 CSS pixels on a desktop
viewport. Fine interior detail disappears; these want to read as struck
stamps.

---

## Optimising

[SVGOMG](https://jakearchibald.github.io/svgomg/) with:

- **Prefer viewBox to width/height** — ON
- **Clean IDs** — ON is fine here (unlike the landmass files, nothing in the
  code references ids inside these)
- **Remove style elements / Inline styles** — ON

Then check the file still says `currentColor` — some optimiser configurations
will resolve it away.

---

## Verifying

`npm run dev`, then look at the console. Silence means all four loaded. The
loader reports:

- `[sealGlyph] … could not be used` — no `<svg>` root, no `viewBox`, or the
  file is empty. The built-in mark is still being drawn.
- `[sealGlyph] … contains id attributes` — see the table above.

Visually: the map's four corners, and the four cards below it, should show
your marks — near-black in the corners, coloured on the cards. If the corners
changed but the cards didn't, something in the file is hard-coding a fill.
