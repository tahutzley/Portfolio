# CARTOUCHE PLAN — the map becomes the whole navigation

## What changes, in one sentence

The four `.panel-card` buttons under the map are deleted. Each corner seal grows an
inward-unfolding plaque carrying the nation's name, a one-line description and an
arrow; below 880px a single HTML strip beneath the map does that job instead.

---

## 0. Why the cards go

They restate what the continents and the corner seals already say, and they say it in a
rectangular dashboard vocabulary that nothing else on the page uses. Removing them costs
three things, and each is replaced rather than dropped:

| the card was carrying | replacement |
| --- | --- |
| the nation's name and subtitle | the SVG cartouche (≥880px) / the map bar (<880px) |
| the touch tap-target (`responsive.css` makes `.region`/`.seal` inert below 880px) | regions and seals become live again, driven by an explicit tap-select state |
| the `#allBtn` all-work fallback below 880px | a plain "All Work" text link under the map bar |

---

## 1. Geometry

All numbers are **map user units**. `.map-frame` is `min(100%,1180px)` against a
1728-unit viewBox, so at full width **1 unit = 0.683 CSS px**.

### The plaque box

```
W = 352 units  →  240 CSS px   (spec asked 220–260)
H = 140 units  →   96 CSS px   (deliberately just under the seal plate's 148,
                                so it reads as attached hardware, not a peer)
```

### Anchoring

The seal plate spans ±74 from its `SEAL_POS` origin. The cartouche butts flush against
the plate's inner edge — no gap, so there is no dead zone for the pointer to cross when
travelling seal → cartouche.

| nation | seal origin | anchor point | grows | occupies |
| --- | --- | --- | --- | --- |
| air | `180,160` | `254,160` | → right | x 254–606, y 90–230 |
| water | `1420,160` | `1346,160` | ← left | x 994–1346, y 90–230 |
| fire | `180,840` | `254,840` | → right | x 254–606, y 770–910 |
| earth | `1420,840` | `1346,840` | ← left | x 994–1346, y 770–910 |

All four sit inside the ocean rect (x 86–1514, y 66–934), clear of the frame bands, the
mid-edge bosses at `cx` 8 / 1592, and the all-work plaque on the top band.

**One known overlap to eyeball:** `water-cap-north` runs to about x 1055 at y 66–190, so
water's cartouche clips ~60 units of that continent's right tail. If it reads badly, the
fixes in order of preference are (a) drop `W` to 320, (b) nudge the top pair down to
`y 185`. Do not move the seals — `SEAL_POS` was placed deliberately (see the comment in
`data/skin.js`).

### Local coordinate system

Each cartouche is authored **anchor-at-local-origin**, so one stylesheet serves both
directions:

- right-growing (air, fire): content spans local x `0 … 352`
- left-growing (water, earth): content spans local x `-352 … 0`
- both: local y `-70 … 70`

The outer `<g>` carries the `transform="translate(...)"` **presentation attribute** for
placement. Every CSS transform goes on an inner `.cart-body` wrapper — the same
attribute/CSS split `#allWork` and `.seal-mark` already use, and for the same reason: a
CSS `transform` on the outer group would override the presentation attribute and fling
the plaque to the viewBox origin.

### Interior layout (local units, padding 22)

```
name        y = -30   30u (20.5px)  --face-emphasis, 600, letter-spacing .18em
desc line 1 y =   8   24u (16.4px)  --face-body
desc line 2 y =  38   24u
arrow       y =  38   26u, right-aligned at the far padding edge
```

Descriptions are **pre-split into two `<tspan>` lines in config** — SVG `<text>` does not
wrap, and there are only four strings, so hand-breaking them is cheaper and more
predictable than a `<foreignObject>`.

---

## 2. Copy — `src/config/nations.js`

`PANEL_SUBTITLE` dies with the grid. Replace it with:

```js
/* Cartouche copy. `lines` is pre-broken because SVG <text> does not wrap —
   see the interior-layout block in map/cartouche.js. Name comes from
   NATIONS[k].name so it can't drift. */
export const CARTOUCHE = {
  air  : { lines: ["About, background,",        "and approach"] },
  water: { lines: ["Data, research, and",       "analytical systems"] },
  fire : { lines: ["Experiments, games,",       "and personal builds"] },
  earth: { lines: ["Production applications",   "and full-stack systems"] }
};
```

`PANEL_ORDER` stays — `render/nation.js` still uses it for the all-work page.
`sealSVG` / `lotusSVG` stay for the same reason.

---

## 3. New file — `src/map/cartouche.js`

Exports `buildCartouches()` (name it `buildNationCartouches` to avoid colliding with
`meander.js`'s existing `buildCartouches`, which builds the frame plaques).

Emits, per nation in `ORDER`:

```html
<g class="cart" data-cart="air" aria-hidden="true" transform="translate(254,160)">
  <g class="cart-body">
    <rect class="cart-plate" .../>      <!-- --paper fill, --ink keyline @ .78 -->
    <rect .../>                          <!-- inset rule @ .45, same as .seal/.plate -->
    <text class="cart-name">AIR</text>
    <text class="cart-desc"><tspan .../><tspan .../></text>
    <path class="cart-arrow" d="..."/>   <!-- accent-coloured -->
  </g>
</g>
```

- Reuses the seal/frame border vocabulary exactly (`--paper` field, `--ink` keyline,
  inset rule) so it reads as the same object family. No new colours.
- The arrow takes `SKIN[k].accent`; everything else is `--ink`.
- `aria-hidden="true"` — the plaque is a visual label for a control the region already
  exposes via `role="link"` + `aria-label`. A second announcement of the same
  destination is noise, and this matches the existing decision not to give seals a
  `tabindex`.
- **No `vector-effect="non-scaling-stroke"`** on the plate. It would fix the transient
  horizontal thinning during the scaleX, but it also freezes the keyline at CSS-pixel
  width so it stops scaling with the map. A 200ms transient is the cheaper cost.

### Wiring into `mapSvg.js`

Append after `<g id="seals">` in `buildMap()` so the plaques paint over the seals, the
landmasses and the ocean:

```js
    <g id="seals">${buildSeals()}</g>
    <g id="cartouches-nation">${buildNationCartouches()}</g>
```

Do **not** give them `class="detail"` — that group is held at opacity 0 until 2.05s by
`motion.css`, and the cartouches are already invisible at rest by their own scale.

---

## 4. State — `src/map/hover.js`

Today there are four flags: `hoverKey`, `focusKey`, `allHover`, `allFocus`. Add one:

```js
let selKey = null;   // sticky tap-selection; only ever set on touch
```

**Resolution order in `paint()`:** `selKey ?? focusKey ?? hoverKey`, with the all-work
plaque still winning outright over everything.

`paint()` gains one line alongside the existing region/seal toggles:

```js
carts.forEach(c => c.classList.toggle("open", !all && c.dataset.cart === state));
```

The all-work plaque deliberately does **not** open any cartouche. It already lights all
four nations at once; four plaques unfolding simultaneously is the busy version of that,
not a clearer one.

### Cartouche as a hover source

Each `.cart` registers `mouseenter`/`mouseleave` on its own key, exactly as the seals
already do, so moving pointer → seal → plaque never closes it. It also takes a `click`
that calls `onActivate(k)`, which is what makes the drawn arrow real.

`pointer-events` is `none` at rest and `auto` on `.open`, so a collapsed plaque can never
intercept the ocean or a landmass beneath it.

### Optional refinement — close grace

Hovering a *continent* opens the plaque in its far corner, and the pointer has to cross
open ocean to reach it, which clears `hoverKey` on the way. A 150ms `setTimeout` on the
close (cancelled by any new enter) makes that trip survivable. Build it only if it
actually feels bad; the natural path — seal → plaque — has no gap and needs nothing.

### Touch: tap-to-select

`canHover` is already computed. When it is false:

- tapping a region or seal sets `selKey` to that nation → `.is-hot` + `.is-sel` on the
  region, `.lit` on the seal, `.open` on the cartouche, and the map bar fills.
- tapping the **same** region/seal again, or the plaque/bar arrow, calls `onActivate(k)`.
- tapping the ocean or anywhere in `#map` that is not a region/seal clears `selKey`.

Export `{ clear, onSelect }` instead of `{ clear }` — `onSelect(cb)` lets `main.js`
subscribe the map bar to selection changes without `hover.js` knowing the bar exists.

`clear()` must reset `selKey` too, or a route change strands the selection.

---

## 5. CSS — `src/styles/hub.css`

### Delete

`.panel-grid`, `.panel-card` and all its `:hover`/`:focus-visible` children,
`.allwork-card`, and both `@media` blocks that adjust them (lines ~125–182).

### Add

```css
.cart{pointer-events:none}
.cart.open{pointer-events:auto;cursor:pointer}

/* transform-box:fill-box is the same mechanism .seal-mark already uses — it
   makes transform-origin resolve against this group's own bounding box rather
   than the root viewBox, which is what lets one rule serve plaques that grow
   in opposite directions. */
.cart-body{
  transform-box:fill-box;
  transform-origin:var(--cart-anchor) center;
  transform:scaleX(0);
  transition:transform .2s var(--ease-ink);
}
.cart.open .cart-body{transform:scaleX(1)}

.cart[data-cart="air"],.cart[data-cart="fire"]  {--cart-anchor:left}
.cart[data-cart="water"],.cart[data-cart="earth"]{--cart-anchor:right}

/* Text fades in behind the leading edge rather than being stretched by it. */
.cart-name,.cart-desc,.cart-arrow{
  opacity:0;
  transition:opacity .14s var(--ease-ink) .07s;
}
.cart.open :is(.cart-name,.cart-desc,.cart-arrow){opacity:1}

.cart-name{font-family:var(--face-emphasis);font-weight:600;font-size:30px;
  letter-spacing:.18em;fill:var(--ink)}
.cart-desc{font-family:var(--face-body);font-size:24px;fill:var(--ink-soft)}
```

Font sizes are bare numbers because **lengths inside the SVG resolve to user units**, not
CSS pixels — the same note `#allWork text` already carries.

### `motion/reducedMotion.js` / `motion.css`

```css
@media (prefers-reduced-motion:reduce){
  .cart-body{transition:none}
  .cart-name,.cart-desc,.cart-arrow{transition:none}
}
```

---

## 6. The map bar (<880px) — new

`index.html`: replace `<div class="panel-grid" id="panelGrid"></div>` with

```html
<div class="map-bar" id="mapBar" hidden>
  <span class="mb-name"></span>
  <span class="mb-desc"></span>
  <span class="mb-arrow" aria-hidden="true">→</span>
</div>
<a class="map-all" id="allBtn" href="#/all">All Work</a>
```

- `#mapBar` is a real `<button>` in practice — render it as one so Enter/Space and the
  accessible name come free. It is `hidden` until a nation is selected; at rest a
  `.map-bar-hint` line reads "Tap a region on the map."
- Both are `display:none` above 880px. Above that the SVG plaque is the affordance and
  the all-work frame cartouche is already the route to `/all`.
- `main.js` subscribes: `mapHover.onSelect(k => fillBar(k))`, reading `NATIONS[k].name`
  and `CARTOUCHE[k].lines.join(" ")` — the bar has real text wrapping, so the pre-split
  lines are rejoined rather than honoured.

Style it in the frame's vocabulary, not the old card's: `--paper` field, `--ink` hairline,
no lift, no shadow, no per-nation background tint. The accent shows only on the arrow and
a 3px left border, so it stays quieter than the map above it.

---

## 7. `responsive.css`

The 880px block currently kills `.region`/`.seal` pointer events. Invert it:

```css
@media (max-width:880px){
  /* regions and seals are live again — the map is now the only navigation.
     They no longer navigate on first touch; they SELECT (see hover.js), which
     is what makes a target this irregular safe to tap. */
  .cart{display:none}        /* illegible at this scale; #mapBar carries it */
  .tl-item{...}  .card{...}  .card-media{...}  .spoke-head{...}   /* unchanged */
}
```

The `@media (hover:none)` block below it must be **narrowed, not deleted**. Its existing
suppressions exist because a scroll-turned-tap fires `mouseenter` with no `mouseleave`.
That hazard is unchanged — but a deliberate tap-selection now *should* light up. So every
rule in that block gets `:not(.is-sel)` added:

```css
@media (hover:none){
  .map-frame.dim .region:not(.is-hot):not(.is-sel){filter:none}
  .region.is-hot:not(.is-sel) .glow-layer{opacity:0}
  .region.is-hot:not(.is-sel) .mass{filter:none}
  .seal.lit:not(.sel){opacity:.88}
  .seal.lit:not(.sel) .seal-mark{transform:none}
  /* #oceanVeil and .region:focus-visible unchanged */
}
```

`#oceanVeil` is the exception — leave it suppressed on touch. It darkens the whole sea,
which on a small screen costs more legibility than it buys emphasis.

---

## 8. `main.js`

- Drop the `PANEL_SUBTITLE` and `sealSVG` imports and the whole `#panelGrid.innerHTML`
  block; import `CARTOUCHE` instead.
- `$("#allBtn")` becomes the `<a href="#/all">`, so its click handler can go — the hash
  router already picks it up. Keep `goAll()` for the frame plaque.
- Add `mapHover.onSelect(...)` → map bar fill, and a bar click → `go(selectedKey)`.
- `route()` already calls `mapHover.clear()`; that now also empties the bar, which is
  correct — returning from a spoke should not land on a stale selection.

---

## 9. Order of work

1. `config/nations.js` — swap `PANEL_SUBTITLE` for `CARTOUCHE`.
2. `map/cartouche.js` + the one line in `mapSvg.js`. Ship it **inert** (no JS state) and
   temporarily force `.open` on all four to check geometry, overlap and type sizes at
   1180px, 1000px and 880px. This is where the water/north-cap overlap gets judged.
3. `hub.css` — plaque styles; delete the card block.
4. `hover.js` — `selKey`, cartouche toggling, cartouche hover/click sources, `onSelect`.
5. `index.html` + `main.js` + map-bar CSS.
6. `responsive.css` — the `:not(.is-sel)` narrowing and the `.cart{display:none}`.
7. Reduced-motion, then a keyboard pass: Tab through the four regions and confirm each
   plaque opens, Enter routes, and Escape still goes home.

Step 2 is the checkpoint. Everything after it is cheap; the geometry is the only part
that can turn out to be wrong on sight.
