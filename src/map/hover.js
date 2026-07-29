/* ╔══════════════════════════════════════════════════════════════════════╗
   ║  PHASE 3 — map hover state.                                          ║
   ╚══════════════════════════════════════════════════════════════════════╝

   All this module does is decide which nations are "hot" and put a class on
   things. Every visual consequence — the coastline glow fading up, the
   other nations desaturating, the ocean receding — lives in CSS (see the
   PHASE 3 block in styles/hub.css).

   Usually "hot" is one nation. The exception is the all-work cartouche on
   the bottom frame band, which lights all four at once: it leads to every
   nation's work, so hovering it previews every nation.

   Keeping it that way is deliberate: no JS runs during the animation, so
   the browser can hand the whole thing to the compositor.

   Why `.is-hot` instead of leaning on :hover
   ──────────────────────────────────────────
   One state, four ways in: mouse, keyboard focus, touch, and Phase 6's
   route transitions, which will want to light a nation up on the way out
   of the map. A class is the only thing all four can share. */

/* Hover and focus are tracked separately rather than collapsed into one
   "current" value. Collapsing them desynchronises: focus region A by
   keyboard, mouse over region B, mouse away — the shared value clears, A
   goes dark while still being the focused element, and A's eventual blur
   early-returns because the value is already null. Two sources, two flags,
   and focus wins when both are live. */
/* Touch-primary devices fire mouseenter on tap but frequently never fire
   the matching mouseleave, which would strand the map mid-hover. */
const canHover = window.matchMedia("(hover: hover)").matches;

export function initMapHover(mapFrame, onActivate) {
  /* Scoped to the call, not the module — module-level state would be
     shared if this were ever initialised for a second map. */
  let hoverKey = null;
  let focusKey = null;
  /* Sticky tap-selection. Only ever set on touch (see the region/seal click
     handlers below) — a hover-capable device never needs it, because hover
     itself is the reveal. CARTOUCHE-PLAN.md §4. */
  let selKey = null;
  /* The all-work cartouche gets the same two-source treatment as a region,
     for the same desynchronisation reason. */
  let allHover = false;
  let allFocus = false;

  const map = mapFrame.querySelector("#map");
  const regions = [...map.querySelectorAll(".region")];
  const seals = [...map.querySelectorAll(".seal")];
  const carts = [...map.querySelectorAll(".cart")];
  const plaque = map.querySelector("#allWork");

  /* Sentinel, not a nation key: `painted` memoises the last state, and
     "everything hot" has to be distinguishable from every single-nation
     value and from null. */
  const ALL = Symbol("all");

  let painted = null;
  /* selKey has to be tracked as its own memo key alongside `painted`: it's
     first in the resolution order below, so most of its changes already
     change `state` and get caught by that check — except the one where a
     selection is dropped right as focus or hover picks up the very same
     nation, and `state` comes out identical on both sides of the change. */
  let paintedSel = null;

  /* main.js wants to mirror the selection onto the small-screen map bar
     without this module knowing the bar exists — see CARTOUCHE-PLAN.md §4. */
  const selectListeners = [];
  const notifySelect = () => selectListeners.forEach(fn => fn(selKey));

  const paint = () => {
    /* The all-work plaque means every nation at once, so it wins outright
       over any region state underneath it — nothing is "other" to dim
       against. Resolution order below: a tap-selection outranks a stray
       focus or hover left over from before the selection was made. */
    const all = allFocus || allHover;
    const k = selKey ?? focusKey ?? hoverKey;
    const state = all ? ALL : k;
    if (state === painted && selKey === paintedSel) return;
    painted = state;
    paintedSel = selKey;

    mapFrame.classList.toggle("dim", all || k !== null);
    regions.forEach(r => {
      r.classList.toggle("is-hot", all || r.dataset.nation === k);
      r.classList.toggle("is-sel", r.dataset.nation === selKey);
    });
    seals.forEach(s => {
      s.classList.toggle("lit", all || s.dataset.seal === k);
      s.classList.toggle("sel", s.dataset.seal === selKey);
    });
    /* The all-work plaque deliberately opens no cartouche — it already
       lights all four nations at once, and four plaques unfolding together
       is the busy version of that, not a clearer one. */
    carts.forEach(c => c.classList.toggle("open", !all && c.dataset.cart === state));
  };

  /* Tap-to-select vs. hover-to-activate: on a hover-capable device a click
     always activates, because hovering already showed the destination. On
     touch there is no preview step, so the first tap has to stand in for
     hover — it selects (lights the region/seal, opens its cartouche, fills
     the map bar) — and only a second tap on the same target, or a tap on
     the now-open cartouche/bar, actually navigates. */
  const tapOrActivate = k => {
    if (canHover) { onActivate(k); return; }
    if (selKey === k) { onActivate(k); return; }
    selKey = k;
    paint();
    notifySelect();
  };

  regions.forEach(r => {
    const k = r.dataset.nation;

    if (canHover) {
      r.addEventListener("mouseenter", () => { hoverKey = k; paint(); });
      r.addEventListener("mouseleave", () => { hoverKey = null; paint(); });
    }

    r.addEventListener("focus", () => { focusKey = k; paint(); });
    r.addEventListener("blur",  () => { focusKey = null; paint(); });

    r.addEventListener("click", () => tapOrActivate(k));
    r.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onActivate(k); }
    });
  });

  /* A nation's corner seal is a 148-unit square stamped on the chart with
     that nation's mark in it, and until now it only ever answered a hover
     that started on the landmass. Reading one as a label for the region and
     not a way into it is a fair reading; reading it as a control that has
     gone dead is also a fair reading, and that one is a bug. So the square
     is now a second handle on exactly the same state — same `hoverKey`, so
     the landmass glows, the seal lights, and the other three recede, with
     no way for the two entry points to disagree.

     No tabindex: the region already carries this nation's keyboard route,
     and a second tab stop to the same destination is noise in the tab
     order rather than an extra affordance. Pointer only, deliberately. */
  seals.forEach(s => {
    const k = s.dataset.seal;

    if (canHover) {
      s.addEventListener("mouseenter", () => { hoverKey = k; paint(); });
      s.addEventListener("mouseleave", () => { hoverKey = null; paint(); });
    }

    s.addEventListener("click", () => tapOrActivate(k));
  });

  /* The nation cartouche is a third handle on the same state — see
     map/cartouche.js. It is inert (pointer-events:none) until its .open
     class lands, so on touch this click only ever fires once the region or
     seal tap above has already selected the same nation; on a hover-capable
     device it is a normal hover source like the seal, and its own click
     always activates outright, matching the region/seal behaviour there. */
  carts.forEach(c => {
    const k = c.dataset.cart;

    if (canHover) {
      c.addEventListener("mouseenter", () => { hoverKey = k; paint(); });
      c.addEventListener("mouseleave", () => { hoverKey = null; paint(); });
    }

    c.addEventListener("click", () => onActivate(k));
  });

  /* The all-work plaque lights the whole map rather than one nation: it
     goes everywhere, so it previews everything. Deliberately reusing
     `.is-hot`/`.lit` instead of a parallel "all-hot" class — one hot look,
     defined once in hub.css, and the touch-device neutralisation in
     responsive.css keeps applying to it for free.

     Activation (click, Enter/Space) stays in main.js next to the map bar
     link that shares its destination; only the visual state is ours.
     `plaque` is null-guarded because the map's frame ornament is optional
     to this module in a way the regions are not. */
  if (plaque) {
    if (canHover) {
      plaque.addEventListener("mouseenter", () => { allHover = true;  paint(); });
      plaque.addEventListener("mouseleave", () => { allHover = false; paint(); });
    }
    plaque.addEventListener("focus", () => { allFocus = true;  paint(); });
    plaque.addEventListener("blur",  () => { allFocus = false; paint(); });
  }

  /* Leaving the SVG entirely — including through a gap between two
     landmasses, which fires no region's own mouseleave — must always
     release the hover half. */
  if (canHover) {
    map.addEventListener("mouseleave", () => { hoverKey = null; allHover = false; paint(); });
  }

  /* Tapping anywhere in the map that isn't a region, seal or cartouche —
     the open ocean, the frame — drops a touch selection. Bubbling does the
     filtering for free: a tap that landed on one of those three already has
     it in its own click handler above (which, for a first tap, sets exactly
     the selKey this listener would otherwise clear), so `closest` finding
     it here is a no-op rather than a race. */
  map.addEventListener("click", e => {
    if (canHover || selKey === null) return;
    if (e.target.closest(".region, .seal, .cart")) return;
    selKey = null;
    paint();
    notifySelect();
  });

  /* Route changes hide the map outright, so no mouseleave or blur ever
     arrives. main.js calls this on every navigation. A stale selKey would
     otherwise strand the map bar showing a nation the visitor already left,
     so it's reset here alongside the hover/focus flags. */
  const clear = () => {
    hoverKey = focusKey = null;
    allHover = allFocus = false;
    const hadSel = selKey !== null;
    selKey = null;
    paint();
    if (hadSel) notifySelect();
  };

  /* Subscribe to selKey changes — main.js uses this to mirror the
     selection onto #mapBar without hover.js needing to know it exists. */
  const onSelect = fn => { selectListeners.push(fn); };

  return { clear, onSelect };
}
