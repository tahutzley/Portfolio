import { esc } from "../render/util.js";

/* ╔══════════════════════════════════════════════════════════════════════╗
   ║  BORDER — frame geometry, the key-fret run, and the band ornaments.  ║
   ╚══════════════════════════════════════════════════════════════════════╝

   THE ORIGINAL BUG THIS REPLACES
   ──────────────────────────────
   The first generator tiled one glyph along each of the four sides with
   `spacing = len / round(len / 40)` and a loop of `i < count`, which left an
   ~18-unit hole at every corner: the run simply stopped short and picked up
   again after the turn. That is why the corners read as unfinished.

   THE FIX, still in force
   ───────────────────────
   Two parts.

   1. Solve for spacing that lands the runs FLUSH at both ends:

          spacing = (len - GLYPH_W) / (n - 1)

      so the first glyph starts at the run's start and the last one ENDS at
      the run's end. Nothing can fall off either edge regardless of what the
      band measures.

   2. Stop asking one glyph to turn a corner. Real key-fret borders don't;
      they use a distinct corner ornament. Each corner gets a BAND×BAND
      nested-L motif, and the side runs are computed BETWEEN those blocks.

   MAP-POLISH-PLAN.md §2.1–2.4 — THE RETILE
   ────────────────────────────────────────
   The band used to be 40 units of a 1600-unit viewBox: 2.5%, against the
   reference poster's ~5%, which is most of why the old border read as a
   printed rule rather than a carved frame. The ocean rect cannot move —
   every landmass, tag and seal in regions.js is positioned against it — so
   the frame grows OUTWARD instead, and the viewBox grows with it. See FRAME.

   The flush-spacing formula and the corner-joint alignment below survive the
   retile untouched; only the constants they consume changed. That is the
   whole point of having written them as formulas. */

/* ── FRAME ────────────────────────────────────────────────────────────────
   The five nested bands, outside → in. Each rect is the area that band's
   fill covers; every inner band paints over the one outside it, so the
   visible width of a band is the difference between its rect and the next.

   Derived from a single number. With the ocean fixed at (86,66,1428,868) and
   a total paper margin M = 150:

       paper = (86 - M, 66 - M, 1428 + 2M, 868 + 2M) = (-64, -84, 1728, 1168)

   and the inner rects step in by 14 / 22 / 72 / 26 / 16 = 150 exactly.
   `paper` doubles as the SVG viewBox — mapSvg.js reads it for that — which
   is why the numbers are stated once, here, rather than in two places that
   can drift.

   The 72-unit `orn` band is the carved one: it carries the fret, the corner
   brackets, the mid-edge bosses and the cartouches. */
export const FRAME = {
  paper: { x: -64, y: -84, w: 1728, h: 1168 },  // trim / viewBox
  step1: { x: -50, y: -70, w: 1700, h: 1140 },  // 14 in
  orn:   { x: -28, y: -48, w: 1656, h: 1096 },  // 22 in — ornament ground
  step2: { x:  44, y:  24, w: 1512, h:  952 },  // 72 in
  rule:  { x:  70, y:  50, w: 1460, h:  900 },  // 26 in
  ocean: { x:  86, y:  66, w: 1428, h:  868 }   // 16 in — UNCHANGED
};

const OUT = FRAME.orn;     // outer edge of the ornament band
const IN  = FRAME.step2;   // inner edge of the ornament band
const BAND = 72;           // (IN.x - OUT.x)

/* ── The glyph ────────────────────────────────────────────────────────────
   #keyTile in mapSvg.js is `M0,42 H63 M13,42 V0 H48 V26 H28`: a continuous
   RAIL along the bottom, plus a hook that rises off it and spirals in.

   The rail is the change that matters. The old glyph was a lone zigzag with
   a 12-unit gap to the next one, and once the retile scaled it up and the
   contrast fix (§2.3) made it actually visible, a row of detached zigzags
   read as a row of numeral 2s rather than as a Greek key. A meander is a
   CONTINUOUS line — that is what the ornament is. Giving every glyph a
   full-width rail and butting them edge to edge produces one unbroken band
   with hooks hanging off it, which is the real thing.

   Ink runs y 0→42 (horizontals at 0, 26, 42; verticals at x 13, 28, 48), so
   with INSET = 15 it sits centred in the 72 band and its three horizontals
   land at band offsets 15, 41 and 57. Those three numbers are load-bearing:
   CORNER_PATH is built from them, and they are what makes the corner meet
   the runs without a joint. */
const GLYPH_W = 63;
const GLYPH_H = 42;
const INSET = (BAND - GLYPH_H) / 2;   // 15 — centres the glyph in the band

const RAIL  = INSET + 42;             // 57 — the continuous line, nearest the water
const BLOCK = [INSET, INSET + 26];    // 15, 41 — the hook's other two horizontals

/* ── The corner ───────────────────────────────────────────────────────────
   MAP-POLISH-PLAN.md §2.4 — a solid bracket, not the old thin nested Ls.

   Two reasons it is filled. The poster's corners are large raised L-blocks,
   which is the look; and a stroked corner has line ENDS, which have to land
   exactly on something in the run or they read as unfinished. The hook's
   upper horizontals only span part of each glyph, so there is nothing at the
   corner's edge for a stroked arm to meet. A filled block has no ends — it
   terminates as a face against the run, and its two edges sit at BLOCK, so
   the block reads as a solid version of the outline the run draws in line.

   The rail still has to turn the corner as a line, since it is continuous:
   that is the second subpath, an elbow at RAIL.

   Authored for the top-left in a local BAND×BAND box — outer corner at
   (0,0), inner at (72,72) — and rotated about the centre into the other
   three. */
const CORNER_PATH =
  `M${BLOCK[0]},${BAND} H${BLOCK[1]} V${BLOCK[1]} H${BAND} ` +
  `V${BLOCK[0]} H${BLOCK[0]} Z`;

const CORNER_RAIL = `M${BAND},${RAIL} H${RAIL} V${BAND}`;

/**
 * Glyph origins along one run, butted edge to edge and flush at both ends.
 *
 * The old version solved `spacing = (len - GLYPH_W) / (n - 1)`, which put a
 * gap between glyphs and was correct for a detached motif. A railed glyph
 * has to ABUT its neighbour or the rail breaks, so the run divides exactly
 * into n steps instead and the glyph is scaled along its own axis to fill
 * one. The correction is tiny — 1512/24 is 63.0 exactly and 952/15 is
 * 63.47, so the two runs differ by 0.7% — and it buys an unbroken rail on
 * any band length rather than only on ones that happen to divide evenly.
 *
 * @param {number} len  run length between the two corner blocks
 * @returns {{scale:number, origins:number[]}}
 */
function runLayout(len) {
  const n = Math.max(2, Math.round(len / GLYPH_W));
  const step = len / n;
  return {
    scale: step / GLYPH_W,
    origins: Array.from({ length: n }, (_, i) => i * step)
  };
}

/**
 * Four corner brackets plus four flush runs of the key fret.
 * @param {string} paint  fill for the corner blocks. The runs are stroked
 *   and inherit the caller's stroke, but a filled block needs its own
 *   colour — mapSvg.js emits this twice, once in shadow and once in paper.
 * @returns {string} SVG markup
 */
export function buildMeander(paint = "var(--paper)") {
  const out = [];

  const c = BAND / 2;
  const corners = [
    { x: OUT.x,        y: OUT.y,        rot:   0 },  // top-left     (-28,-48)
    { x: IN.x + IN.w,  y: OUT.y,        rot:  90 },  // top-right    (1556,-48)
    { x: IN.x + IN.w,  y: IN.y + IN.h,  rot: 180 },  // bottom-right (1556,976)
    { x: OUT.x,        y: IN.y + IN.h,  rot: 270 }   // bottom-left  (-28,976)
  ];
  corners.forEach(k => {
    const t = `transform="translate(${k.x},${k.y}) rotate(${k.rot},${c},${c})"`;
    out.push(`<path class="fret-corner" fill="${paint}" stroke="none" d="${CORNER_PATH}" ${t}/>`);
    out.push(`<path class="fret-corner-rail" d="${CORNER_RAIL}" ${t}/>`);
  });

  /* ── Runs ─────────────────────────────────────────────────────────────
     Each side runs corner-block-edge to corner-block-edge. `place` maps a
     distance along the run to the glyph's translate origin, accounting for
     the rotation (a 90° turn swaps which extent points which way, so each
     side needs its own cross-axis constant).

       top    origin y = OUT.y + INSET               = -33
       right  origin x = OUT.x + OUT.w - INSET       = 1613
       bottom origin y = OUT.y + OUT.h - INSET       = 1033
       left   origin x = OUT.x + INSET               = -13

     `scale(s,1)` is applied INSIDE the rotation, so it always stretches the
     glyph along the run rather than across the band — putting it outside
     would fatten the vertical runs' stroke instead of lengthening them. */
  const runs = [
    { len: IN.w, rot:   0, place: d => [IN.x + d,               OUT.y + INSET] },
    { len: IN.h, rot:  90, place: d => [OUT.x + OUT.w - INSET,  IN.y + d] },
    { len: IN.w, rot: 180, place: d => [IN.x + IN.w - d,        OUT.y + OUT.h - INSET] },
    { len: IN.h, rot: 270, place: d => [OUT.x + INSET,          IN.y + IN.h - d] }
  ];

  runs.forEach(run => {
    const { scale, origins } = runLayout(run.len);
    origins.forEach(d => {
      const [x, y] = run.place(d);
      out.push(
        `<use href="#keyTile" transform="translate(${x.toFixed(2)},${y.toFixed(2)})` +
        ` rotate(${run.rot}) scale(${scale.toFixed(5)},1)"/>`
      );
    });
  });

  return out.join("");
}

/* ── Mid-edge bosses ──────────────────────────────────────────────────────
   MAP-POLISH-PLAN.md §2.4. The left and right runs are 952 units of an
   unbroken repeating glyph, which is the length at which a fret stops
   reading as an ornament and starts reading as wallpaper. The reference
   poster breaks both with a ring medallion at mid-height; so does this.

   The outermost disc is --paper-edge — the band's own ground colour — and
   is there to mask whatever fret glyphs the boss lands on top of, so the
   ornament sits in a clean well rather than colliding with the run. It is
   drawn after the fret for that reason. r=34 in a 72-wide band leaves a
   2-unit margin either side. */
export function buildBosses() {
  const cy = FRAME.ocean.y + FRAME.ocean.h / 2;   // 500
  const half = BAND / 2;
  return [OUT.x + half, OUT.x + OUT.w - half]     // 8 and 1592
    .map(cx => `
      <g class="boss" transform="translate(${cx},${cy})">
        <circle r="34" fill="var(--paper-edge)"/>
        <circle r="27" fill="var(--paper)" stroke="#7d6845" stroke-width="2"/>
        <circle r="17" fill="none" stroke="var(--paper-edge)" stroke-width="5"/>
        <circle r="6"  fill="var(--paper-edge)"/>
      </g>`)
    .join("");
}

/* ── Cartouches ───────────────────────────────────────────────────────────
   The reference poster's strongest single frame element is the cream plaque
   centred top and bottom, straddling the band — it is what makes the thing
   read as a printed chart rather than a bordered picture. Both shipped blank
   (MAP-POLISH-PLAN.md §2.5, option B); the top one carried the all-work
   control at first, then swapped roles with the bottom one: the top is now
   a plain name plate (two lines, no interaction) and the bottom is the
   all-work control (three lines: what this is, what's current, the action).
   A plaque in that bottom position, straddling the ocean's lower edge, reads
   as the chart's closing inscription — which is what "here's what I'm
   pointing you to on your way out" wants to be.

   96 tall against a 72 band, so each plaque overhangs into both adjoining
   steps the way the poster's does, but stops at y=36 and y=964 — clear of
   the ocean at 66..934. Deliberate: overlapping the water would put an
   opaque rectangle on top of the seigaiha for no gain.

   Opaque fill, drawn after the fret, so it masks the run beneath it.

   The interactive one wraps its contents in .cart-face and CSS animates
   THAT, never #allWork itself: the outer <g> carries a transform attribute
   positioning it on the frame, and a CSS `transform` would override the
   presentation attribute outright and fling the plaque to the origin. Same
   reason .seal has a .seal-mark inside it.

   @param {{title:string,sub:string}} name  top plaque's two lines; see
     SITE.nameplate in config.
   @param {{plaque:string,items:string,cta:string}} work  bottom plaque's
     three lines; see SITE.allWork in config. */
export function buildCartouches({ name, work }) {
  const cx = FRAME.ocean.x + FRAME.ocean.w / 2;   // 800
  const W = 460, H = 96;

  const plate = `
    <rect class="plate" x="${-W / 2}" y="${-H / 2}" width="${W}" height="${H}"
          fill="var(--paper)" stroke="var(--ink)" stroke-width="4" stroke-opacity=".78"/>
    <rect x="${-W / 2 + 8}" y="${-H / 2 + 8}" width="${W - 16}" height="${H - 16}"
          fill="none" stroke="var(--ink)" stroke-width="2" stroke-opacity=".45"/>`;

  /* Typeface and size come from CSS (.cartouche text in hub.css), not from
     font-family/font-size attributes here — same rule the rest of the map
     follows, and the reason the old nation tags ended up in a different face
     than the page. */
  const top = `
    <g class="cartouche nameplate" transform="translate(${cx},${OUT.y + BAND / 2})">
      <g class="cart-face">
        ${plate}
        <text x="0" y="-13" text-anchor="middle" dominant-baseline="central"
              class="cart-title" fill="var(--ink)">${esc(name.title)}</text>
        <text x="0" y="17" text-anchor="middle" dominant-baseline="central"
              class="cart-sub" fill="var(--ink)">${esc(name.sub)}</text>
      </g>
    </g>`;

  /* role="link"/tabindex live here instead of on the top plaque now — see
     hover.js and main.js, both of which find this control by #allWork and
     don't care which plaque carries the id. */
  const bottom = `
    <g id="allWork" class="cartouche" role="link" tabindex="0"
       aria-label="${esc(`${work.plaque}: ${work.items}. ${work.cta}.`)}"
       transform="translate(${cx},${OUT.y + OUT.h - BAND / 2})">
      <g class="cart-face">
        ${plate}
        <text x="0" y="-25" text-anchor="middle" dominant-baseline="central"
              class="cart-title" fill="var(--ink)">${esc(work.plaque)}</text>
        <text x="0" y="1" text-anchor="middle" dominant-baseline="central"
              class="cart-items" fill="var(--ink)">${esc(work.items)}</text>
        <text x="0" y="25" text-anchor="middle" dominant-baseline="central"
              class="cart-cta" fill="var(--ink)">${esc(work.cta)}</text>
      </g>
    </g>`;

  return top + bottom;
}
