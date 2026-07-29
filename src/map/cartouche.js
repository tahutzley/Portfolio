import { ORDER, SKIN } from "../data/skin.js";
import { NATIONS, CARTOUCHE } from "../config/nations.js";
import { esc } from "../render/util.js";

/* ╔══════════════════════════════════════════════════════════════════════╗
   ║  NATION CARTOUCHES — the inward-unfolding plaque on each corner      ║
   ║  seal. Named buildNationCartouches to avoid colliding with           ║
   ║  meander.js's buildCartouches, which builds the frame plaques.       ║
   ║  See CARTOUCHE-PLAN.md §1 and §3 for the geometry this codes.        ║
   ╚══════════════════════════════════════════════════════════════════════╝ */

const W = 352, H = 140, PAD = 22;

/* Anchor point = the seal plate's inner edge (±74 from SEAL_POS in
   data/skin.js), so the plaque butts flush against the seal with no dead
   zone for the pointer to cross travelling seal → cartouche. `dir` is the
   direction the plaque unfolds. Authored anchor-at-local-origin: a
   right-growing plaque's content spans local x 0…W, a left-growing one
   spans −W…0, both span local y −H/2…H/2 — one CSS rule (transform-origin
   set per direction via --cart-anchor in hub.css) serves both. */
const CART = {
  air  : { anchor: [ 254, 160], dir: "right" },
  water: { anchor: [1346, 160], dir: "left"  },
  fire : { anchor: [ 254, 840], dir: "right" },
  earth: { anchor: [1346, 840], dir: "left"  }
};

/* A small filled arrowhead pointing outward (away from the seal), its tip
   sitting on the far padding edge — the "click here" end of the plaque.
   Coloured with the nation's own accent; everything else in the plaque is
   --ink. */
function arrow(cx, cy, sign, accent) {
  const tipX = cx, backX = cx - sign * 26;
  return `<path class="cart-arrow" fill="${accent}"
    d="M${tipX},${cy} L${backX},${cy - 13} L${backX},${cy + 13} Z"/>`;
}

function cartouche(k) {
  const { anchor, dir } = CART[k];
  const sign = dir === "right" ? 1 : -1;
  const plateX  = dir === "right" ? 0 : -W;
  const farX    = sign * W;
  const textX   = sign * PAD;
  const arrowX  = farX - sign * PAD;
  const align   = dir === "right" ? "start" : "end";
  const [lineA, lineB] = CARTOUCHE[k].lines;

  return `
    <g class="cart" data-cart="${k}" aria-hidden="true" transform="translate(${anchor[0]},${anchor[1]})">
      <g class="cart-body">
        <rect class="cart-plate" x="${plateX}" y="${-H / 2}" width="${W}" height="${H}"
              fill="var(--paper)" stroke="var(--ink)" stroke-width="4" stroke-opacity=".78"/>
        <rect x="${plateX + 8}" y="${-H / 2 + 8}" width="${W - 16}" height="${H - 16}"
              fill="none" stroke="var(--ink)" stroke-width="2" stroke-opacity=".45"/>
        <text class="cart-name" x="${textX}" y="-30" text-anchor="${align}">${esc(NATIONS[k].name).toUpperCase()}</text>
        <text class="cart-desc" text-anchor="${align}">
          <tspan x="${textX}" y="8">${esc(lineA)}</tspan>
          <tspan x="${textX}" y="38">${esc(lineB)}</tspan>
        </text>
        ${arrow(arrowX, 38, sign, SKIN[k].accent)}
      </g>
    </g>`;
}

/* @returns {string} one <g class="cart"> per nation, in ORDER. */
export function buildNationCartouches() {
  return ORDER.map(cartouche).join("");
}
