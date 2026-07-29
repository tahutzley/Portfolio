/* ╔══════════════════════════════════════════════════════════════════════╗
   ║  BOOT — the map's timelapse load sequence.                           ║
   ╚══════════════════════════════════════════════════════════════════════╝

   Two passes over all 28 masses in the order bootOrder.js declares:

     1. ink   — each island's border draws itself, stroke-dashoffset → 0
     2. fill  — each island's colour arrives, fill-opacity 0 → 1

   The fill pass starts FILL_LEAD before the ink pass finishes. A hard seam
   between the two reads as two separate animations; a slight overlap reads
   as one gesture that changes character partway through.

   ─── Why GSAP and not CSS keyframes ─────────────────────────────────────
   The CSS route is achievable — emit a per-mass `--i` index and delay off
   `calc(var(--i) * STEP)`. It was rejected for two reasons, neither of them
   performance: stroke-dashoffset and fill-opacity are paint properties that
   re-rasterise on the main thread whichever system drives them, so CSS buys
   nothing there.

   What it can't do is (a) scale each mass's duration by its own perimeter —
   that number is computed in JS regardless, so keeping the arithmetic in JS
   is strictly simpler than round-tripping it through a custom property into
   a calc() — and (b) tell anyone when it finished. main.js used to drop
   .boot on a hardcoded setTimeout(2600) that had to be hand-synced against
   delays spread across motion.css. That was already a latent bug with four
   timings to track; this sequence has closer to forty. onComplete makes the
   desync structurally impossible.

   ─── The one rule ──────────────────────────────────────────────────────
   This timeline tweens stroke-dashoffset, stroke-dasharray and fill-opacity.
   Nothing else. Ever.

   GSAP writes inline styles, and an inline style outranks every stylesheet
   rule permanently — clearProps at the end is a courtesy, not a guarantee,
   because anything that survives to a stray frame still wins. The hover
   system in hub.css drives `filter` on .mass, `opacity` on .glow-layer and
   `opacity` on .tag. Tweening any of those three here would silently kill
   hover for the rest of the session: `.region.is-hot .mass{filter:...}` and
   responsive.css's `.region.is-hot .mass{filter:none}` touch override would
   both stop applying, with no error anywhere.

   The two property sets are disjoint on purpose. Keep them that way.

   This is also why the old ink-bloom is gone. `mass-in` used to animate
   `filter: brightness(1.9) saturate(1.6)`, which was safe only because a
   finished CSS animation stops contributing to the cascade — a GSAP tween
   of the same property does not. It was also compensating for all 28 masses
   arriving at once, which is exactly what the stagger now replaces. */

import gsap from "gsap";
import { BOOT_GROUPS } from "./bootOrder.js";
import { prefersReducedMotion } from "../motion/reducedMotion.js";

/* ── Timing, in seconds ───────────────────────────────────────────────────
   Two constants drive the shape of the whole thing: STEP is the
   start-to-start gap between one mass and the next inside a group, and
   BEAT_GAP is the extra pause spent crossing a group boundary.

   28 masses in 7 groups → the start spread of either pass is
   27*STEP + 6*BEAT_GAP. For the ink pass that's 1134ms.

   The stagger is start-to-start, not end-to-start, so long masses overlap
   the few behind them. That overlap is what makes the sequence read as a
   continuous timelapse rather than 28 discrete events. */
const START        = 0.22;   /* lets the frame, ocean and vignette paint first */
const STEP         = 0.032;
const BEAT_GAP     = 0.045;

/* Per-mass ink duration scales with the SQUARE ROOT of that mass's
   perimeter, clamped at both ends.

   Constant duration was rejected first: the measured perimeters run from 30
   units (water-islet-s4) to 4045 (earth-mainland), so one duration for all
   makes the specks crawl and the continents crack like a whip.

   Constant speed — duration ∝ perimeter — was the obvious fix and is also
   wrong here, which only measuring showed. That 135× spread is bimodal:
   21 islets under 210 units, then a jump to 456 and up. Any divisor that
   gives the continents a sane duration puts every islet below the floor, so
   25 of 28 masses land on INK_MIN and the whole idea collapses back into a
   constant with extra steps.

   sqrt compresses 135× to 11.6×, which actually fits between a floor and a
   ceiling. Measured spread at these values:

     islets  30–113 units → INK_MIN          (~18 masses, indistinguishable
                                               ticks at this size anyway)
     islets 132–205       →  80–99ms
     air isles  456–613   → 147–171ms
     fire-main  1033      → 222ms
     water caps 1283–1421 → 247–260ms
     earth-main 4045      → 439ms            (the showpiece; nothing clamps
                                               at INK_MAX)

   INK_MIN is a legibility floor, not an aesthetic one: below roughly five
   frames a stroke reads as popping in rather than being drawn.

   INK_CURVE is the one number here tuned against measured output rather
   than derived. If the artwork changes enough to need re-tuning, the
   dev-only line at the bottom of bootMap() prints the spread and the clamp
   counts — aim for nothing at INK_MAX and only the specks at INK_MIN. */
const INK_CURVE    = 145;    /* duration = sqrt(perimeter) / INK_CURVE */
const INK_MIN      = 0.08;
const INK_MAX      = 0.44;

/* The fill pass runs a tighter stagger than the ink pass. The eye parses a
   colour appearing much faster than it parses a line drawing itself, so
   matching the two step values makes the fill feel like it is dragging. */
const FILL_LEAD    = -0.12;  /* negative = fill starts before ink finishes */
const FILL_STEP    = 0.024;
const FILL_BEAT_GAP = 0.034;
const FILL_DUR     = 0.26;

/* ── The CSS tail ─────────────────────────────────────────────────────────
   Two fades hang off the `.boot` class that this timeline does not own —
   `.boot .detail` and `.boot .seal-stamp` in motion.css — and finish AFTER
   the last fill tween does.

   That matters because dropping `.boot` unmatches those rules, and an
   element whose animation-name stops applying does not coast to a stop: the
   animation is cancelled and it snaps to its rest style on the next frame.
   With onComplete firing on the last fill (~2.43s) the inland detail was
   being cut two-thirds through its fade and the seals, which start at 2.4s,
   were cancelled roughly 30ms in — they appeared to pop rather than fade,
   which is exactly the symptom that made the corner stagger below look like
   it wasn't running at all.

   So the timeline holds itself open until the slowest of them lands. These
   four numbers are the CSS ones restated; there is no way to read a delay
   out of a stylesheet rule that hasn't matched anything yet, so this is the
   drift risk motion.css's comment points back at.

     detail  0.8s at 2.05s                        → 2.85s
     seals   0.55s at 2.4s + i*0.2s, i max 3      → 3.55s   ← the later one */
const SEAL_LAST_END = 2.4 + 3 * 0.2 + 0.55;
const DETAIL_END    = 2.05 + 0.8;
const CSS_TAIL_END  = Math.max(SEAL_LAST_END, DETAIL_END);

/* Properties this timeline is allowed to touch — see the header. */
const OWNED = "strokeDasharray,strokeDashoffset,fillOpacity";

/**
 * Runs the map's boot sequence and hands back the timeline (or null when
 * there was nothing to animate).
 *
 * @param {HTMLElement} mapFrame  the element buildMap() was rendered into
 * @param {HTMLElement} hub       the element carrying the .boot class
 */
export function bootMap(mapFrame, hub) {
  /* Order matters, and it is the reverse of what reads naturally.
     Removing .boot drops the CSS rule holding the initial state; clearProps
     drops the inline values GSAP has been writing over it. Both happen in
     one callback with no paint between them, so neither is ever visible
     alone. Doing clearProps first would expose a frame where the masses sit
     at their CSS start state — dashed and unfilled — after the animation
     has already shown them complete. */
  const finish = (masses) => {
    hub.classList.remove("boot");
    if (masses.length) gsap.set(masses, { clearProps: OWNED });
  };

  /* The staged load is the one piece of motion on this site that runs
     unprompted on arrival, so under reduced motion it is skipped outright
     rather than merely shortened — matching the stance motion.css already
     takes. Note this cannot be delegated to the media query: GSAP writes
     inline styles frame by frame and never goes through a CSS transition,
     which is the whole reason motion/reducedMotion.js exists.

     Collapsing the durations toward zero instead would still build and run
     56 tweens to produce no visible result. Building nothing is cheaper and
     harder to get subtly wrong. */
  if (prefersReducedMotion()) {
    finish([]);
    return null;
  }

  /* ── Schedule ───────────────────────────────────────────────────────────
     Walk the groups once, accumulating two independent clocks: `k` counts
     masses (multiplied by the per-pass step) and `gaps` counts boundaries
     crossed (multiplied by the per-pass beat gap). Keeping them separate is
     what lets the two passes share one ordering while running different
     rhythms.

     Both counters only advance for masses that actually resolved, so a
     missing element leaves no hole in the rhythm. bootOrder.js's dev audit
     is what catches the missing element itself; this just keeps the
     animation from limping in production if one ever slips through. */
  const plan = [];
  let k = 0, gaps = 0;

  BOOT_GROUPS.forEach((group, gi) => {
    if (gi > 0) gaps++;
    for (const id of group) {
      /* Attribute selector rather than '#' + id: these ids come from data
         and an id starting with a digit, or carrying a '.', would make a
         '#' selector throw rather than simply miss. */
      const el = mapFrame.querySelector(`[id="${id}"]`);
      if (!el) continue;

      const len = Number(el.dataset.len) || 0;
      plan.push({
        el,
        len,
        dur: Math.min(INK_MAX, Math.max(INK_MIN, Math.sqrt(len) / INK_CURVE)),
        inkAt: START + k * STEP + gaps * BEAT_GAP,
        fillOffset: k * FILL_STEP + gaps * FILL_BEAT_GAP,
      });
      k++;
    }
  });

  const masses = plan.map(p => p.el);
  if (!plan.length) { finish(masses); return null; }

  /* Derived, never hand-written: the ink pass ends when its LAST-FINISHING
     mass ends, which is not necessarily the last-starting one — durations
     vary, so a big mass started earlier can outlast a small one started
     later. Taking the max over the whole plan is the only correct read. */
  const inkEnd = Math.max(...plan.map(p => p.inkAt + p.dur));
  const fillStart = Math.max(START, inkEnd + FILL_LEAD);

  const tl = gsap.timeline({ onComplete: () => finish(masses) });

  for (const p of plan) {
    /* fromTo rather than to, for both passes. fromTo defaults to
       immediateRender, so every mass gets its start state written inline the
       moment the timeline is built — one synchronous step after the SVG is
       in the DOM, with no paint in between. That makes the animation correct
       on its own terms instead of depending on motion.css having resolved
       var(--ink-len) into a computed value GSAP can read back. The CSS rule
       still earns its keep as the frame-1 guarantee before this module runs;
       it just isn't load-bearing for the tween. */
    tl.fromTo(p.el,
      { strokeDasharray: p.len, strokeDashoffset: p.len },
      { strokeDashoffset: 0, duration: p.dur, ease: "none" },
      p.inkAt);

    /* Linear for ink, eased for fill. A drawn line wants constant ink flow —
       easing it makes the pen look like it is slowing down at the coast. A
       fill has no such physical reading and settles better with an ease. */
    tl.fromTo(p.el,
      { fillOpacity: 0 },
      { fillOpacity: 1, duration: FILL_DUR, ease: "power1.out" },
      fillStart + p.fillOffset);
  }

  /* An empty tween on a throwaway object: no target, no properties, purely
     duration. It exists so tl.duration() — and with it onComplete — extends
     to cover the CSS-driven fades described at CSS_TAIL_END. Cheaper and
     more legible than a second timer that would have to be cancelled
     alongside the timeline. */
  const hold = CSS_TAIL_END - tl.duration();
  if (hold > 0) tl.to({}, { duration: hold });

  /* Calibration readout for INK_CURVE. Healthy shape is nothing at max and
     only the specks at min — if `at max` climbs, the big landmasses have
     stopped being differentiated from each other and INK_CURVE needs
     raising. Stripped from production by Vite's constant folding. */
  if (import.meta.env.DEV) {
    const lens = plan.map(p => p.len).sort((a, b) => a - b);
    const raw = p => Math.sqrt(p.len) / INK_CURVE;
    console.info(
      `[boot] ${plan.length} masses | perimeter ${lens[0].toFixed(0)}–` +
      `${lens[lens.length - 1].toFixed(0)} units | ` +
      `${plan.filter(p => raw(p) > INK_MAX).length} at max, ` +
      `${plan.filter(p => raw(p) < INK_MIN).length} at min, ` +
      `${plan.filter(p => raw(p) >= INK_MIN && raw(p) <= INK_MAX).length} free | ` +
      `ink ends ${(inkEnd * 1000).toFixed(0)}ms, fill starts ` +
      `${(fillStart * 1000).toFixed(0)}ms, fill ends ` +
      `${((fillStart + plan[plan.length - 1].fillOffset + FILL_DUR) * 1000).toFixed(0)}ms, ` +
      `+${(hold * 1000).toFixed(0)}ms hold for the CSS tail, ` +
      `total ${(tl.duration() * 1000).toFixed(0)}ms`,
    );
  }

  return tl;
}
