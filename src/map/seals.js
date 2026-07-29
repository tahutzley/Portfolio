import { SKIN, SEAL_POS, ORDER, SEAL_ORDER } from "../data/skin.js";
import { sealGlyph } from "./sealGlyph.js";

/* Ring geometry. The dash is one deliberate break in an otherwise closed
   circle — an enso, not a dotted line — so the array is "everything but the
   gap, then the gap" and has to be derived from the real circumference or
   the break drifts every time the radius moves. */
const RING_R   = 52;
const RING_GAP = 20;
const RING_ON  = (2 * Math.PI * RING_R - RING_GAP).toFixed(1);

/* The four corner seals stamped on the chart itself. */
export function buildSeals() {
  return ORDER.map(k => {
    const [x, y] = SEAL_POS[k];

    /* Stamp index, not paint index — ORDER controls z-stacking and the two
       are allowed to disagree. motion.css turns this into a delay. */
    const i = SEAL_ORDER.indexOf(k);

    return `<g class="seal" data-seal="${k}" style="--seal-i:${i}" transform="translate(${x},${y})">
      <!-- .seal-stamp exists purely so the boot animation has a transform
           and an opacity of its own to drive. .seal carries the rest/dim
           opacity from hub.css and .seal-mark carries the hover scale;
           animating either of those would mean a CSS animation and a
           hover rule fighting over one property, which is how the seals
           previously ended up blinking out on mouse-away. -->
      <g class="seal-stamp">
      <g class="seal-mark">
        <!-- MAP-POLISH-PLAN.md §2.6. The plate was --paper-deep on
             --paper-edge — a mid tan on a slightly darker tan — and hub.css
             holds seals at reduced opacity at rest, which together rendered
             them as muddy grey squares rather than stamps. Same border
             vocabulary as the frame now: bright paper field, hard ink
             keyline, an inset rule inside it. -->
        <rect x="-74" y="-74" width="148" height="148" fill="var(--paper)"
              stroke="var(--ink)" stroke-width="5" stroke-opacity=".62"/>
        <rect x="-64" y="-64" width="128" height="128" fill="none"
              stroke="var(--ink)" stroke-width="2" stroke-opacity=".32"/>
        <circle r="${RING_R}" fill="${SKIN[k].mass}" opacity=".95"/>
        <!-- The ring reads as the edge of a struck seal, so it wants to be
             the hardest line in the group: --ink-deep at near-full opacity
             at nearly twice the old weight. It was 3.5 units of --ink at
             .55, which against the mass colour behind it came out as a
             soft grey circle competing with the plate's own keyline
             instead of framing the mark. -->
        <circle r="${RING_R}" fill="none" stroke="var(--ink-deep)" stroke-width="6.5"
                opacity=".96" stroke-dasharray="${RING_ON} ${RING_GAP}"
                transform="rotate(-42)"/>
        ${sealGlyph(k, {
          /* 66 across the diagonal of a 66² box is 46.7 — comfortably inside
             the 52 ring with room for the artwork's own stroke weight. */
          size: 66, fallbackScale: 1,
          color: "var(--ink-deep)", weight: 6.5,
        })}
      </g>
      </g>
    </g>`;
  }).join("");
}

/* The same mark at spoke-header scale, in the nation's own accent rather
   than ink. */
export function sealSVG(k) {
  return `<svg viewBox="-80 -80 160 160" aria-hidden="true">
    <circle r="60" fill="${SKIN[k].mass}" opacity=".16"/>
    <circle r="60" fill="none" stroke="${SKIN[k].accent}" stroke-width="6"
      stroke-dasharray="347 30" transform="rotate(-42)"/>
    ${sealGlyph(k, {
      size: 76, fallbackScale: 1.5,
      color: SKIN[k].accent, weight: 8,
    })}
  </svg>`;
}

/* The White Lotus — all four accents in one mark. Deliberately the sea's
   colour scheme rather than any single nation's. */
export function lotusSVG() {
  const cols = [SKIN.water.accent, SKIN.earth.accent, SKIN.fire.accent, SKIN.air.accent];
  const petal = i => `<path transform="rotate(${i * 45})"
      d="M0,-8 C 15,-30 15,-56 0,-68 C -15,-56 -15,-30 0,-8 Z"
      fill="${cols[i % 4]}" fill-opacity=".82" stroke="var(--ink)" stroke-width="2.4"/>`;
  return `<svg viewBox="-80 -80 160 160" aria-hidden="true">
    ${Array.from({ length: 8 }, (_, i) => petal(i)).join("")}
    <circle r="15" fill="var(--paper)" stroke="var(--ink)" stroke-width="3"/>
  </svg>`;
}
