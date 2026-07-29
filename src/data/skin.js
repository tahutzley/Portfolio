/* ── Nation visual identities. Change a hex in tokens.css and it
      propagates through everything below. ─────────────────────────────── */

export const SKIN = {
  water: { bg:"var(--water-ground)", lift:"#183449", accent:"var(--water-key)", mass:"var(--water-mass)" },
  earth: { bg:"var(--earth-ground)", lift:"#26311d", accent:"var(--earth-key)", mass:"var(--earth-mass)" },
  fire : { bg:"var(--fire-ground)",  lift:"#31130d", accent:"var(--fire-key)",  mass:"var(--fire-mass)"  },
  air  : { bg:"var(--air-ground)",   lift:"#36271a", accent:"var(--air-key)",   mass:"var(--air-mass)"   }
};

/* Literal hex values for the coastline glow.
   These are deliberately NOT `var(--water-glow)` etc. SVG filter
   primitives resolve custom properties inconsistently across browsers —
   Safari in particular has a history of dropping var() inside flood-color,
   which silently yields a black glow. Hardcoding is the safe call here.
   Keep these in sync with the --*-glow tokens in tokens.css. */
export const GLOW_HEX = {
  water: "#cfeff7",
  earth: "#ecdcab",
  fire : "#f8ae59",
  air  : "#fbf8f0"
};

/* Seal glyphs: an enso ring plus one abstract stroke per element.
   Original marks — deliberately not the show's insignia.

   These are the FALLBACK. map/sealGlyph.js picks up any hand-drawn artwork
   dropped into src/assets/seals/ and uses that instead, per nation — see
   the README in that folder. A nation with no file keeps the path below,
   so the two can coexist while the set is half-drawn. */
export const SEAL = {
  water: 'M -22 4 C -12 -8, -2 12, 10 0 M -18 16 C -8 4, 4 22, 18 10',
  earth: 'M -20 14 H 20 M 0 14 V -12 M -12 -2 H 12',
  fire : 'M 0 -20 C 12 -6, 14 8, 2 18 C -10 8, -12 -4, 0 -20 M 0 6 C 5 0, 4 -7, 0 -12',
  air  : 'M -22 -4 C -6 -16, 8 -12, 14 -2 C 18 6, 8 14, 2 8 M -20 10 C -6 2, 6 6, 16 12'
};

export const ORDER = ["air", "water", "fire", "earth"];

/* The sequence the four corner seals stamp themselves in during boot.
   motion.css reads it as `--seal-i` and turns it into an animation-delay.

   Stated rather than derived, for the same reason map/bootOrder.js states
   the landmass sequence: ORDER is a PAINT order — it drives allGlowFilters()
   and the region render loop, so it controls z-stacking. That it currently
   reads the same as this list is a coincidence worth not depending on, and
   the landmasses already disagree with both (bootOrder.js draws them
   air → water → earth → fire).

   The dev audit below is what makes a hand-written second list safe. */
export const SEAL_ORDER = ["air", "water", "fire", "earth"];

if (import.meta.env.DEV) {
  const missing = ORDER.filter(k => !SEAL_ORDER.includes(k));
  const strays  = SEAL_ORDER.filter(k => !ORDER.includes(k));
  if (missing.length || strays.length) {
    console.error(
      "[skin] SEAL_ORDER is not a permutation of ORDER.",
      "\n  never stamped:", missing,
      "\n  not a nation: ", strays,
    );
  }
}

/* PHASE 2 CHANGE — the seals used to sit at x=150/1450, y=180/700. Each
   draws a 148x148 plate (±74 from its origin), so at x=1450 it spanned
   1376–1524 and overhung the ocean rect's right edge at 1514 by 10 units.
   Half on the frame, half in the sea — the one reading that looks like a
   mistake rather than a choice.

   Now pulled fully inside the ocean field with a 20-unit margin off the
   frame: x 180/1420 (ocean is 86–1514), y 160/840 (ocean is 66–934).
   They read as seals stamped on the chart, not hardware falling off it. */
export const SEAL_POS = {
  air  : [ 180, 160],
  water: [1420, 160],
  fire : [ 180, 840],
  earth: [1420, 840]
};
