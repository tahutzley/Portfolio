/* ╔══════════════════════════════════════════════════════════════════════╗
   ║  SEAL GLYPHS — drop-in artwork for the four element marks.           ║
   ╚══════════════════════════════════════════════════════════════════════╝

   Drop `air.svg`, `water.svg`, `fire.svg` or `earth.svg` into
   src/assets/seals/ and it replaces that nation's built-in SEAL path
   everywhere the mark appears — the four corner seals on the map, the
   panel cards, and the spoke-page headers. Nothing else needs editing;
   see the README beside the files for the export rules.

   ── Why the file is inlined rather than <img>/<use> ─────────────────────
   The mark has to inherit colour. It paints in --ink-deep on the map's
   corner seals and in the nation's own accent on the panel cards, from one
   source file. An <img src="air.svg"> is an opaque replaced element — CSS
   inside this document cannot reach it, so that single file would have to
   become two files with baked-in fills. `?raw` + inline markup keeps it
   one file with `currentColor` doing the work.

   ── Why the glob rather than four named imports ─────────────────────────
   Four static imports would fail the build outright until all four files
   exist, which makes drawing them one at a time impossible. The glob
   resolves to whatever is actually there; missing nations fall back.

   Vite evaluates import.meta.glob at build time, so the artwork is bundled
   like any other module — there is no runtime fetch, and nothing here
   touches the DOM or parses XML with a real parser. */

import { SEAL } from "../data/skin.js";

const RAW = import.meta.glob("../assets/seals/*.svg", {
  eager : true,
  query : "?raw",
  import: "default",
});

/* Parsed artwork by nation key. Populated at module load; empty is fine. */
const ART = {};

for (const [path, raw] of Object.entries(RAW)) {
  const key = path.slice(path.lastIndexOf("/") + 1).replace(/\.svg$/i, "").toLowerCase();
  const art = parseSVG(raw);

  if (art) ART[key] = art;
  else if (import.meta.env.DEV) {
    console.error(
      `[sealGlyph] ${path} could not be used and the built-in ${key} mark is ` +
      `still being drawn. It needs a root <svg> with a viewBox and some ` +
      `content inside it. See src/assets/seals/README.md.`,
    );
  }

  /* Everything here lands in ONE document alongside the map's own defs,
     where ids are global. A file carrying `id="a"` from a design tool will
     happily shadow, or be shadowed by, something in mapSvg.js — and the
     failure shows up as a gradient or filter silently rendering wrong
     somewhere else entirely. Cheap to warn about, miserable to debug. */
  if (import.meta.env.DEV && art && /\bid\s*=/.test(art.body)) {
    console.warn(
      `[sealGlyph] ${path} contains id attributes. Ids are global to the ` +
      `page — prefix them (id="air-…") or strip them before shipping.`,
    );
  }
}

/* Pull the viewBox and the body out of an exported file.
   Regex rather than DOMParser on purpose: this runs at module scope during
   boot, and the input is a build-time asset the author controls, not
   arbitrary remote markup. */
function parseSVG(raw) {
  const open  = raw.match(/<svg\b[^>]*>/i);
  const close = raw.lastIndexOf("</svg>");
  if (!open || close < 0) return null;

  const vb = open[0].match(/viewBox\s*=\s*["']([^"']+)["']/i);
  if (!vb) return null;

  const n = vb[1].trim().split(/[\s,]+/).map(Number);
  if (n.length !== 4 || n.some(v => !Number.isFinite(v)) || n[2] <= 0 || n[3] <= 0) return null;

  const body = raw.slice(open.index + open[0].length, close)
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(title|desc|metadata)\b[\s\S]*?<\/\1\s*>/gi, "")
    .trim();
  if (!body) return null;

  return { x: n[0], y: n[1], w: n[2], h: n[3], body };
}

/**
 * Markup for one element's mark, centred on the origin.
 *
 * @param {string} k                 nation key
 * @param {object} o
 * @param {number} o.size            side of the square the ARTWORK is fitted
 *                                   into. Ignored by the fallback, which has
 *                                   its own authored proportions.
 * @param {number} o.fallbackScale   scale applied to the built-in SEAL path.
 *                                   Separate from `size` deliberately — the
 *                                   two glyph sources are not the same
 *                                   drawing and pretending one number covers
 *                                   both would silently resize the existing
 *                                   marks the day this shipped.
 * @param {string} o.color           ink for the mark
 * @param {number} o.weight          stroke weight, fallback only
 */
export function sealGlyph(k, { size, fallbackScale = 1, color, weight }) {
  const art = ART[k];

  if (!art) {
    return `<path class="seal-glyph" d="${SEAL[k]}" fill="none" stroke="${color}"
                  stroke-width="${weight}" stroke-linecap="round" stroke-linejoin="round"
                  transform="scale(${fallbackScale})"/>`;
  }

  /* Fit the longer axis, so a non-square drawing keeps its aspect ratio and
     stays inside the ring rather than being stretched to fill the box. */
  const s  = size / Math.max(art.w, art.h);
  const cx = art.x + art.w / 2;
  const cy = art.y + art.h / 2;

  /* Transforms apply right to left: recentre the artwork's own viewBox on
     the origin first, then scale about it.

     `color` as well as `fill` — a mark drawn as filled shapes with no fill
     attribute inherits `fill`, and one drawn with `fill="currentColor"` or
     `stroke="currentColor"` resolves against `color`. Both spellings work,
     which is what lets the README say "just use currentColor" without
     caveats. `stroke` is deliberately NOT set: inheriting a stroke would
     outline every filled shape that didn't ask for one. */
  return `<g class="seal-glyph" color="${color}" fill="${color}"
             transform="scale(${s.toFixed(4)}) translate(${(-cx).toFixed(2)},${(-cy).toFixed(2)})"
             >${art.body}</g>`;
}
