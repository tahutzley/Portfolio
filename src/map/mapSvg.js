import { REGIONS } from "./regions.js";
import { GLOW_HEX, ORDER } from "../data/skin.js";
import { FRAME, buildMeander, buildBosses, buildCartouches } from "./meander.js";
import { buildSeals } from "./seals.js";
import { buildNationCartouches } from "./cartouche.js";
import { SITE } from "../config/site.js";

/* ══════════════════════════════════════════════════════════════════════
   PHASE 3 — the coastline glow filter.

   Derives entirely from the shape's own alpha channel, so it traces the
   actual coastline instead of approximating it with a blurred ellipse the
   way the old `.halo` elements did.

     feMorphology  dilate  → fatten the silhouette outward
     feGaussianBlur        → soften that fattened edge into a halo
     feFlood + feComposite → tint the halo the nation's glow colour

   There is no feMerge pulling SourceGraphic back in. The output is *only*
   the halo — the real, unfiltered landmass paints on top of it, so what
   you see is a rim of light escaping from behind the coast.

   flood-color is a literal hex rather than var(--water-glow): SVG filter
   primitives resolve custom properties inconsistently, and Safari has
   historically dropped var() inside flood-color, silently yielding a
   black halo. See GLOW_HEX in data/skin.js.

   ─── On the filter region ───────────────────────────────────────────────
   One filter PER MASS, not per nation, and sized in user space.

   The filter has to hang off each individual path: filtering the wrapping
   group would rasterise all of a nation's islands together and dilate them
   as one image, which is exactly the merged-blob behaviour regions.js
   warns about. Fire proves it — its chain ends at x≈780 and its islet
   starts at x=789, nine units apart.

   But a per-path filter using the default objectBoundingBox units makes
   the region relative to that one small shape, while radius and
   stdDeviation stay in user units. A percentage margin that's ample for
   Earth's 552×562 mainland is nowhere near enough for the 34×34 islet, and
   the halo gets cropped to a hard rectangle. So: filterUnits="userSpaceOnUse"
   with an explicit box derived from the path itself.

   REACH is what the halo actually needs. dilate(6) plus a Gaussian of
   stdDeviation 12 — which the SVG spec approximates with three box blurs
   of d = floor(12 × 3√(2π)/4 + 0.5) = 23, giving 3 × (23−1)/2 = 33 — comes
   to 39 units. 40 is that with margin.
   ══════════════════════════════════════════════════════════════════════ */

const REACH = 40;

/* Coastline outline capability — `w` per mass in regions.js is the actual
   stroke-width authored in the source SVG (scaled into map space), so it's
   already the real border weight. Flip SHOW off to drop the stroke entirely
   with no data changes needed. */
const SHOW_COAST_STROKE = true;

/* Exact bounding box from a path's control points.
   Valid ONLY because every mass in regions.js uses M / C / Z exclusively,
   so each number pair is a real coordinate and a Bézier never escapes the
   convex hull of its own control points. Introducing an A, H, V or relative
   command to a mass would silently break this. */
function hullBox(d) {
  const nums = (d.match(/-?\d*\.?\d+/g) || []).map(Number);
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (let i = 0; i + 1 < nums.length; i += 2) {
    if (nums[i]     < minX) minX = nums[i];
    if (nums[i]     > maxX) maxX = nums[i];
    if (nums[i + 1] < minY) minY = nums[i + 1];
    if (nums[i + 1] > maxY) maxY = nums[i + 1];
  }
  return { minX, minY, maxX, maxY };
}

/* Arc length of a mass's own path, in the same user units as its `d`.
   Feeds the boot draw-in: every mass carries its own length twice over — as
   --ink-len (the dash pair motion.css sets while .boot is up) and as
   data-len (which map/boot.js reads to scale that mass's stroke duration).
   Both derive from the real perimeter rather than a hand-tuned magic number
   that drifts every time the artwork is redrawn. Cubic segments are
   flattened to 24-point polylines — accurate to a fraction of a percent,
   plenty for an animation timing value. Same M/C/Z-only requirement as
   hullBox.

   `Z` gets a real branch rather than falling through to the catch-all. Two
   bugs died there. It used to consume a token twice — once in the command
   test, once again in the `else` — which was invisible only because Z is
   always the last token and no mass has a second subpath; one added `M`
   would have silently eaten a coordinate. And the closing segment Z implies
   (last point back to the subpath's origin) contributed nothing, so any
   mass whose trace didn't land back on its start measured short. */
function pathLength(d) {
  const tokens = d.match(/[MCZ]|-?\d*\.?\d+/g) || [];
  let i = 0, cmd = "", cx = 0, cy = 0, sx = 0, sy = 0, len = 0;
  const SAMPLES = 24;
  const bez = (t, p0, p1, p2, p3) => {
    const mt = 1 - t;
    return mt * mt * mt * p0 + 3 * mt * mt * t * p1 + 3 * mt * t * t * p2 + t * t * t * p3;
  };
  while (i < tokens.length) {
    const t = tokens[i];
    if (t === "M" || t === "C" || t === "Z") { cmd = t; i++; }
    if (cmd === "M") {
      cx = Number(tokens[i++]); cy = Number(tokens[i++]);
      sx = cx; sy = cy;                     /* subpath origin — what Z closes to */
      cmd = "";
    } else if (cmd === "C") {
      const x1 = Number(tokens[i++]), y1 = Number(tokens[i++]);
      const x2 = Number(tokens[i++]), y2 = Number(tokens[i++]);
      const x  = Number(tokens[i++]), y  = Number(tokens[i++]);
      let px = cx, py = cy;
      for (let s = 1; s <= SAMPLES; s++) {
        const nt = s / SAMPLES;
        const nx = bez(nt, cx, x1, x2, x), ny = bez(nt, cy, y1, y2, y);
        len += Math.hypot(nx - px, ny - py);
        px = nx; py = ny;
      }
      cx = x; cy = y;
    } else if (cmd === "Z") {
      len += Math.hypot(sx - cx, sy - cy);
      cx = sx; cy = sy;
      cmd = "";
    } else {
      i++;
    }
  }
  return len;
}

function glowFilter(k, mass) {
  const b = hullBox(mass.d);
  return `<filter id="glow-${mass.id}" filterUnits="userSpaceOnUse"
                  x="${(b.minX - REACH).toFixed(1)}" y="${(b.minY - REACH).toFixed(1)}"
                  width="${(b.maxX - b.minX + REACH * 2).toFixed(1)}"
                  height="${(b.maxY - b.minY + REACH * 2).toFixed(1)}"
                  color-interpolation-filters="sRGB">
    <feMorphology in="SourceAlpha" operator="dilate" radius="6" result="fat"/>
    <feGaussianBlur in="fat" stdDeviation="12" result="soft"/>
    <feFlood flood-color="${GLOW_HEX[k]}" flood-opacity="1" result="tint"/>
    <feComposite in="tint" in2="soft" operator="in"/>
  </filter>`;
}

function allGlowFilters() {
  return ORDER
    .flatMap(k => REGIONS[k].masses.map(m => glowFilter(k, m)))
    .join("\n    ");
}

/* ══════════════════════════════════════════════════════════════════════
   SEIGAIHA — the wave-scale field that carries the ocean.
   MAP-POLISH-PLAN.md §1.

   THE BUG THIS REPLACES
   ─────────────────────
   The old tile was 64×32 and drew its arcs inline. The on-baseline row (four
   nested semicircles standing on y=32) was fine — it fits the tile exactly.
   The half-offset row did not: authored on baseline y=16 with radius 32, it
   spans y = −16…16, and **a <pattern> clips its content to the tile**. The
   part above y=0 was discarded and never reappeared from the tile above, so
   per tile what actually rendered was:

       r=32 @ y=16   two ~4-unit stubs near x≈28 and x≈36
       r=23 @ y=16   two ~6-unit stubs
       r=14 @ y=16   the whole arc (its top lands at y=2, just inside)
       r= 5 @ y=16   never authored at all — the inline offset row had
                     r=32/23/14 and no innermost counterpart

   So every second row of scallops was one thin arc plus a few disconnected
   fragments. That, not the palette, is why the water read as empty: roughly
   half the pattern was not being painted.

   THE FIX
   ───────
   Author ONE scallop as a reusable group, then stamp it at every offset
   whose bounding box intersects the tile, so a part clipped off one copy is
   supplied by a neighbouring one. A scallop at baseline `by` centred on `cx`
   occupies [cx−R, cx+R] × [by−R, by]; intersect that with the tile and the
   seven stamps in WAVE_STAMPS are exactly the ones that survive. Anything
   outside contributes nothing; anything missing leaves a hole.

   (`overflow="visible"` on the <pattern> is the one-attribute alternative
   and browsers do honour it, but the stamps are explicit about what the tile
   contains and carry no support caveat.)

   Tile is 56×28 rather than 64×32 — ~25.5 scallops across the ocean instead
   of 22.3, matching the reference poster's density — and six nested rings on
   a 4.8 pitch instead of four on a 9, which closes the flat dead space that
   sat between every line and inside every scallop's blank r=5 cap.
   ══════════════════════════════════════════════════════════════════════ */

const WAVE = { w: 56, h: 28, r: 28 };
const WAVE_RADII = [28, 23.2, 18.4, 13.6, 8.8, 4];

/* [cx, baselineY] per stamp, in tile space. Three rows are in play: the
   on-baseline row at y=28, and the half-offset rows above and below it at
   y=14 and y=42 — the latter two are what the old tile was losing. */
const WAVE_STAMPS = [
  [-28, 28], [28, 28], [84, 28],
  [  0, 14], [56, 14],
  [  0, 42], [56, 42]
];

/* One scallop: baseline on y=0, centred on x=0, arcs rising into −y.
   `A r,r 0 0,1` from the left endpoint to the right one sweeps upward — the
   same convention the old inline arcs used.

   Drawn twice. The first pass is a fatter, darker copy nudged 1.4 units down
   and sitting under the light one, which is what gives the field the quilted
   relief of the printed poster instead of a flat line drawing. */
function waveScallop() {
  const arcs = WAVE_RADII
    .map(r => `<path d="M${-r},0 A${r},${r} 0 0,1 ${r},0"/>`)
    .join("");
  return `<g id="scallop-arcs" fill="none">${arcs}</g>
    <g id="scallop">
      <use href="#scallop-arcs" transform="translate(0,1.4)"
           stroke="var(--sea-shadow)" stroke-width="2.2" opacity=".45"/>
      <use href="#scallop-arcs" stroke="var(--sea-line)" stroke-width="1.9"/>
    </g>`;
}

function defs() {
  return `<defs>
    <!-- Seigaiha: the traditional wave-scale field that carries the ocean -->
    ${waveScallop()}
    <pattern id="waves" width="${WAVE.w}" height="${WAVE.h}" patternUnits="userSpaceOnUse">
      <rect width="${WAVE.w}" height="${WAVE.h}" fill="var(--sea-deep)"/>
      ${WAVE_STAMPS.map(([x, y]) =>
        `<use href="#scallop" transform="translate(${x},${y})"/>`).join("\n      ")}
    </pattern>

    <!-- PHASE 2: ocean vignette. The seigaiha field was flat edge to edge,
         which let the eye wander off the map. This pulls it inward.

         Softened from r=72%/.38 — MAP-POLISH-PLAN.md §1.5. At 38% black the
         rim was eating the outer two or three rows of scallops, so the field
         went washed exactly where the poster stays even, and it was doing
         that on top of the clipping bug above. Same inward pull, no longer
         at the pattern's expense. -->
    <radialGradient id="oceanVignette" cx="50%" cy="50%" r="82%">
      <stop offset="62%" stop-color="#000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000" stop-opacity=".22"/>
    </radialGradient>

    <!-- Raking light across the whole frame. The five band fills are flat
         colour, and five flat rectangles with bevel hairlines still read as
         vector rather than as a printed object — the reference poster's
         border is visibly lighter at the top-left and falls off toward the
         bottom-right. One diagonal wash over the lot, under the ocean, is
         the cheapest way to buy that. -->
    <linearGradient id="frameLight" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0"   stop-color="#fff" stop-opacity=".14"/>
      <stop offset=".55" stop-color="#fff" stop-opacity="0"/>
      <stop offset="1"   stop-color="#000" stop-opacity=".14"/>
    </linearGradient>

    <!-- Brush-edge: displaces a coastline into a bled, wet-ink border.
         Unused since the coastlines became hand-drawn (see region() below)
         — left defined so it's a one-line re-application, not a redraw,
         if the map ever wants that texture back. -->
    <filter id="bleed" x="-8%" y="-8%" width="116%" height="116%">
      <feTurbulence type="fractalNoise" baseFrequency="0.028" numOctaves="3" seed="7" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="5"
                         xChannelSelector="R" yChannelSelector="G"/>
    </filter>

    ${allGlowFilters()}

    <!-- Single key-fret tile, tiled around all four sides by meander.js.
         Two subpaths: a full-width RAIL along the bottom, and a hook that
         rises off it and spirals in. Adjacent tiles butt edge to edge so the
         rails join into one unbroken line — see meander.js's glyph block for
         why a detached zigzag read as a row of numeral 2s.

         Runs x 0→63, y 0→42, horizontals at y = 0, 26, 42. meander.js
         derives RAIL and BLOCK (and from those, the corner bracket) from
         those same three offsets, so they have to move together. -->
    <path id="keyTile" d="M0,42 H63 M13,42 V0 H48 V26 H28"/>
  </defs>`;
}

/* ── Frame ────────────────────────────────────────────────────────────────
   MAP-POLISH-PLAN.md §2. Was two stroked rects, a band path and the meander,
   all inside 40 units of band. Now five nested bands across 150, with the
   ornament carried on the widest of them. FRAME (meander.js) owns the
   geometry; both halves below read it rather than restating coordinates.

   Split in two on purpose:

     frameBase()      the five band FILLS. Substrate, deliberately NOT
                      .detail — motion.css holds every .detail group at
                      opacity 0 until 2.05s, and a frame that isn't there for
                      the first two seconds leaves the ocean floating on bare
                      page background. Drawn before the ocean.

     frameOrnament()  bevels, fret, bosses, cartouches. All .detail, all
                      drawn after the ocean, in that order — the bosses and
                      cartouches are opaque and are what mask the fret runs
                      they sit on top of. */

const rect = (r, attrs) =>
  `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" ${attrs}/>`;

function frameBase() {
  return `<g id="frame-base">
    ${rect(FRAME.paper, 'fill="var(--paper)"')}
    ${rect(FRAME.step1, 'fill="var(--paper-deep)"')}
    ${rect(FRAME.orn,   'fill="var(--paper-edge)"')}
    ${rect(FRAME.step2, 'fill="var(--paper-deep)"')}
    ${rect(FRAME.rule,  'fill="var(--ink)" opacity=".86"')}
    ${rect(FRAME.paper, 'fill="url(#frameLight)"')}
  </g>`;
}

const BEVEL_LIGHT = "#f0e6cf";
const BEVEL_DARK  = "#7d6845";

/* Light catches the top and left of a raised edge, shadow falls on the
   bottom and right. `sunk` flips it, and the flip is the whole point: the
   outer bands step UP out of the paper and the inner ones step DOWN toward
   the water, so lighting them all the same way would render five flat
   rectangles rather than a carved stack. */
function bevel(r, w, sunk = false) {
  const a = sunk ? BEVEL_DARK : BEVEL_LIGHT;
  const b = sunk ? BEVEL_LIGHT : BEVEL_DARK;
  const x2 = r.x + r.w, y2 = r.y + r.h;
  return `<path d="M${r.x} ${r.y} H${x2} M${r.x} ${r.y} V${y2}" stroke="${a}" stroke-width="${w}"/>
    <path d="M${x2} ${r.y} V${y2} M${r.x} ${y2} H${x2}" stroke="${b}" stroke-width="${w}"/>`;
}

function frameOrnament() {
  return `
    <g class="detail" fill="none" stroke-linecap="square" opacity=".62">
      ${bevel(FRAME.step1, 2.5)}
      ${bevel(FRAME.orn,   3)}
      ${bevel(FRAME.step2, 3, true)}
      ${bevel(FRAME.rule,  2, true)}
    </g>

    <!-- The fret, twice. MAP-POLISH-PLAN.md §2.3: it used to be
         stroke=var(--paper) #d9cbab at .8 opacity on a --paper-deep #c2b191
         ground — two hexes about 10% apart in luminance, which is why the
         border read as a blank tan rectangle with something faint happening
         on it. The ground is --paper-edge now, the fret is full-opacity
         --paper, and a dropped copy underneath gives it the raised edge the
         poster's carving has. -->
    <g class="detail" id="meander-shadow" fill="none" stroke="${BEVEL_DARK}"
       stroke-width="6" opacity=".55"
       transform="translate(3,3)">${buildMeander(BEVEL_DARK)}</g>
    <g class="detail" id="meander" fill="none" stroke="var(--paper)"
       stroke-width="6">${buildMeander("var(--paper)")}</g>

    <g class="detail" id="bosses">${buildBosses()}</g>
    <g class="detail" id="cartouches">${buildCartouches({ name: SITE.nameplate, work: SITE.allWork })}</g>`;
}

/* ── One nation ───────────────────────────────────────────────────────────
   Layer order inside a region matters:

     1. .glow-layer  — duplicated masses, glow filter, opacity 0 at rest
     2. .region-ink  — the real masses
     3. .detail      — inland decoration, NO glow (see regions.js)

   .region-ink no longer wears #bleed (the turbulence/displacement filter
   defined in defs(), still there but unused) — the hand-drawn coastlines
   already carry their own wobble from being traced freehand, and the filter
   displacing that a second time read as noisy "wobble-on-wobble" rather
   than the wet-ink texture it gave the old placeholder geometry. Re-apply
   filter="url(#bleed)" to this group to bring it back if wanted. */
function region(k) {
  const r = REGIONS[k];

  /* Each mass wears its own filter — see the glowFilter block above for
     why per-path, and why the region is sized in user space. */
  const glowLayer = r.masses
    .map(m => `<path d="${m.d}" fill="#fff" filter="url(#glow-${m.id})"/>`)
    .join("");

  const inkLayer = r.masses
    .map(m => {
      /* Every mass draws its own border now, so every mass needs its length —
         the old `coast: true` flag that gated this down to seven has been
         dropped from regions.js entirely. That also retires the `.coast`
         class, and with it the .mass/.coast specificity trap documented in
         motion.css: two selectors at identical (0,2,0) fighting over the
         `animation` shorthand. One class, nothing to lose to.

         --ink-len feeds motion.css's `.boot .mass` rule, which is the only
         place stroke-dasharray/-dashoffset get set. Setting them here as
         plain attributes instead would hide the coastline permanently once
         .boot is removed — CSS only applies the dash pattern for the boot
         window, so outside it the stroke falls back to a normal solid line.

         data-len is the same number for map/boot.js, which scales each
         mass's stroke duration by its perimeter. Emitting it beside the
         custom property costs a few bytes and saves boot.js either a
         getComputedStyle round-trip or a second pass over every path. */
      const len = pathLength(m.d).toFixed(1);
      return `<path id="${m.id}" class="mass" data-len="${len}" style="--ink-len:${len}"
                    fill="var(--${k}-mass)" stroke="var(--ink)"
                    stroke-width="${SHOW_COAST_STROKE ? m.w : 0}"
                    d="${m.d}"/>`;
    })
    .join("");

  const d = r.detail || {};
  const detailPaths = (d.paths || []).map(p => `<path d="${p}"/>`).join("");
  const detailCircles = (d.circles || [])
    .map(c => `<circle cx="${c.cx}" cy="${c.cy}" r="${c.r}" stroke-width="${c.w}"/>`)
    .join("");
  /* class="detail" is load-bearing — it's what the boot sequence's
     `.boot .detail` fade-in hooks. Without it these paint at full opacity
     from frame one while every other piece of inland detail is still
     waiting to fade in at 0.95s. */
  const openPaths = d.open
    ? `<g class="detail" fill="none" stroke="var(--ink)" stroke-width="${d.open.w}"
           stroke-linecap="round" opacity="${d.open.opacity}">
         ${d.open.paths.map(p => `<path d="${p}"/>`).join("")}
       </g>`
    : "";

  return `
    <g class="region" data-nation="${k}" tabindex="0" role="link" aria-label="${r.label}">
      <g class="glow-layer" aria-hidden="true">${glowLayer}</g>
      <g class="region-ink">${inkLayer}</g>
      <g class="detail" fill="none" stroke="var(--ink)" stroke-width="${d.w || 3}"
         stroke-linejoin="round" opacity="${d.opacity ?? .78}">
        ${detailPaths}${detailCircles}
      </g>
      ${openPaths}
    </g>`;
}

/* The viewBox IS the outermost frame band — stated once in FRAME and read
   here, not restated. It grew from "0 0 1600 1000" to "-64 -84 1728 1168" so
   the border could widen without the ocean moving: every landmass, seal and
   detail path in regions.js is positioned against the ocean rect, and any
   change to that rect would mean redrawing all of them. Nothing else in the
   codebase reads the viewBox, and .map-frame svg{width:100%;height:auto}
   follows the new aspect on its own. */
export function buildMap() {
  const vb = FRAME.paper;
  const sea = FRAME.ocean;
  return `<svg id="map" viewBox="${vb.x} ${vb.y} ${vb.w} ${vb.h}" role="group"
       aria-label="Interactive map. Four regions lead to four sections of work.">
    ${defs()}
    ${frameBase()}

    <!-- Ocean -->
    ${rect(sea, 'fill="url(#waves)"')}
    ${rect(sea, 'fill="url(#oceanVignette)" pointer-events="none"')}

    <!-- PHASE 3: ocean recede. Transparent at rest; fades in when a nation
         is hovered so the whole sea drops back a step behind it. -->
    ${rect(sea, 'id="oceanVeil" fill="#0b0a18" pointer-events="none"')}

    ${frameOrnament()}
    ${ORDER.map(region).join("")}

    <g id="seals">${buildSeals()}</g>
    <g id="cartouches-nation">${buildNationCartouches()}</g>
  </svg>`;
}
