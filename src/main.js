/* ╔══════════════════════════════════════════════════════════════════════╗
   ║  MAIN — boot, wiring, and routing.                                   ║
   ╚══════════════════════════════════════════════════════════════════════╝ */

import "./styles/tokens.css";
import "./styles/hub.css";
import "./styles/spoke.css";
import "./styles/sheet.css";
import "./styles/motion.css";
import "./styles/responsive.css";

import { SITE } from "./config/site.js";
import { NATIONS, CARTOUCHE } from "./config/nations.js";
import { SKIN } from "./data/skin.js";
import { buildMap } from "./map/mapSvg.js";
import { bootMap } from "./map/boot.js";
import { initMapHover } from "./map/hover.js";
import { renderNation, renderAll } from "./render/nation.js";
import { closeSheet, isSheetOpen, wireCards } from "./render/sheet.js";
import { $, esc } from "./render/util.js";
import "./motion/reducedMotion.js";

/* ── Hub chrome ─────────────────────────────────────────────────────────── */
$("#hub-title").textContent  = SITE.name;
$("#hub-line").textContent   = SITE.line;
$("#hubFoot").innerHTML = SITE.links
  .map(l => `<a href="${esc(l.href)}" target="_blank" rel="noopener">${esc(l.label)}</a>`)
  .join("");

/* ── Map ────────────────────────────────────────────────────────────────── */
const mapFrame = $("#mapFrame");
mapFrame.innerHTML = buildMap();

/* Kick the timelapse the moment the SVG is in the DOM, and specifically
   BEFORE route() runs. The boot sequence owns removing the .boot class when
   it completes, and .boot is what holds every mass hidden — so anything
   that could throw between building the map and starting the animation is
   something that could strand the map permanently blank. Routing is the
   most complex thing in this file; it does not belong in that gap.

   GSAP schedules the first frame on rAF, so starting here rather than at
   the end of the module costs nothing in timing. */
bootMap(mapFrame, $("#hub"));

/* ── Routing ────────────────────────────────────────────────────────────── */
function go(k)   { location.hash = "/" + k; }
function home()  { location.hash = ""; }

const mapHover = initMapHover(mapFrame, go);

/* ── Map bar (<880px) ──────────────────────────────────────────────────────
   The map's regions and seals are the real navigation at every width now
   (see hover.js's tap-to-select); this bar is where a touch selection
   surfaces below 880px, since the map itself is too small there to read.
   hover.js knows nothing about this element — it just publishes selKey
   through onSelect, same shape as `clear`. */
const mapBar = $("#mapBar");
let barSel = null;

function fillBar(k) {
  barSel = k;
  mapBar.classList.toggle("has-sel", k !== null);
  if (!k) { mapBar.removeAttribute("aria-label"); return; }
  const desc = CARTOUCHE[k].lines.join(" ");
  mapBar.style.setProperty("--pk", SKIN[k].accent);
  mapBar.querySelector(".mb-name").textContent = NATIONS[k].name;
  mapBar.querySelector(".mb-desc").textContent = desc;
  mapBar.setAttribute("aria-label", `${NATIONS[k].name}: ${desc}`);
}

mapHover.onSelect(fillBar);
mapBar.addEventListener("click", () => { if (barSel) go(barSel); });

/* Two elements, one destination: the cartouche on the map frame and the
   plain text link below the map bar. The cartouche is an SVG <g>, not a
   <button>, so it needs its keyboard half spelled out — role and tabindex
   come from meander.js, but Enter/Space activation is not free the way it
   is on a real button element. Same shape as hover.js's region handler.
   #allBtn is a real <a href="#/all"> now, so the hash router already picks
   up its click — no listener needed here. */
function goAll() { location.hash = "/all"; }

const allWorkPlaque = mapFrame.querySelector("#allWork");
allWorkPlaque.addEventListener("click", goAll);
allWorkPlaque.addEventListener("keydown", e => {
  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); goAll(); }
});

function route() {
  const k = location.hash.replace(/^#\/?/, "");
  const spoke = $("#spoke");

  closeSheet(true);
  /* Navigating away while a region is hovered leaves no mouseleave behind,
     which would strand the map in its dimmed state on return. */
  mapHover.clear();

  if (k === "all") {
    $("#hub").style.display = "none";
    spoke.innerHTML = renderAll();
    spoke.className = "on allwork enter-all";
    spoke.removeAttribute("style");
    document.body.style.background = SKIN.air.bg;
    window.scrollTo(0, 0);
    $("#spoke .brushbtn")?.focus({ preventScroll: true });
    wireCards(spoke);
    spoke.querySelector("[data-home]")?.addEventListener("click", home);
    return;
  }

  if (!NATIONS[k]) {
    spoke.className = "";
    spoke.innerHTML = "";
    spoke.removeAttribute("style");
    $("#hub").style.display = "";
    document.body.style.background = "var(--paper)";
    return;
  }

  $("#hub").style.display = "none";
  spoke.innerHTML = renderNation(k);
  spoke.className = "on enter-" + k;
  document.body.style.background = SKIN[k].bg;
  spoke.style.setProperty("--bg",      SKIN[k].bg);
  spoke.style.setProperty("--bg-lift", SKIN[k].lift);
  spoke.style.setProperty("--accent",  SKIN[k].accent);
  spoke.style.setProperty("--fg",      "var(--paper)");
  spoke.style.setProperty("--fg-soft", "rgba(217,203,171,.72)");
  spoke.style.setProperty("--hair",    "rgba(217,203,171,.20)");
  window.scrollTo(0, 0);
  $("#spoke .brushbtn")?.focus({ preventScroll: true });

  wireCards(spoke);
  spoke.querySelector("[data-home]")?.addEventListener("click", home);
}

/* ── Global listeners ───────────────────────────────────────────────────── */
$("#sheet .scrim").addEventListener("click", () => closeSheet());

document.addEventListener("keydown", e => {
  if (e.key === "Escape") isSheetOpen() ? closeSheet() : home();
});

window.addEventListener("hashchange", route);

route();

/* The .boot class used to be dropped here on a hardcoded setTimeout(2600)
   that had to be kept in sync by hand with delays spread across motion.css.
   map/boot.js now owns that: its timeline knows when it has finished, and
   removes the class from its own onComplete. The magic number is gone, and
   with it the standing risk of retuning the animation and forgetting to
   retune the timeout. */
