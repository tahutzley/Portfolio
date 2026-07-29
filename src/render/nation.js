import { NATIONS, PANEL_ORDER } from "../config/nations.js";
import { SITE } from "../config/site.js";
import { SKIN } from "../data/skin.js";
import { sealSVG, lotusSVG } from "../map/seals.js";
import { esc, linkRow } from "./util.js";

/* ── Nation body — the header, path timeline, and project cards for one
   nation. Shared by its own spoke page (renderNation) and by the all-work
   compilation (nationSection), so both render identically. ────────────── */
export function nationBody(k) {
  const n = NATIONS[k];
  const label = n.sectionLabel || "Work";

  const tl = (n.timeline || []).length ? `
    <h2 class="sec-label">Path</h2>
    <div class="timeline">${n.timeline.map(t => `
      <div class="tl-item">
        <div class="tl-when">${esc(t.when)}</div>
        <div>
          <h3>${esc(t.what)}</h3>
          <p>${esc(t.note)}</p>
          ${linkRow(t.links)}
        </div>
      </div>`).join("")}</div>` : "";

  const cards = (n.projects || []).length
    ? `<div class="grid">${n.projects.map((p, i) => `
        <button class="card" data-all="${k}:${i}">
          <div class="card-body">
            ${p.meta ? `<p class="meta">${esc(p.meta)}</p>` : ""}
            <h3>${esc(p.title)}</h3>
            ${p.summary ? `<p>${esc(p.summary)}</p>` : ""}
            ${(p.tags || []).length ? `<div class="tags">${p.tags.map(t =>
              `<span class="tag-chip">${esc(t)}</span>`).join("")}</div>` : ""}
          </div>
          <div class="card-media">${p.image ? `<img src="${esc(p.image)}" alt="" loading="lazy">` : ""}</div>
        </button>`).join("")}</div>`
    : `<div class="empty">No ${esc(label.toLowerCase())} filed under ${esc(n.name)} yet.
       Add entries to <code>NATIONS.${k}.projects</code>.</div>`;

  return `
    <header class="spoke-head">
      ${sealSVG(k)}
      <div>
        <p class="spoke-kicker">${esc(n.kicker)}</p>
        <h1 class="spoke-title">${esc(n.title)}</h1>
        <p class="spoke-blurb">${esc(n.blurb)}</p>
      </div>
    </header>
    ${tl}
    <h2 class="sec-label">${esc(label)}</h2>
    ${cards}`;
}

export function spokeTop(symbol, label) {
  return `<div class="spoke-top">
      <button class="brushbtn" data-home><span>&#8592;</span> Back to the map</button>
      <span class="spoke-symbol" role="img" aria-label="${esc(label)}">${symbol}</span>
    </div>`;
}

export function renderNation(k) {
  const n = NATIONS[k];
  return `<div class="wrap">
    ${spokeTop(sealSVG(k), n.name)}
    ${nationBody(k)}
  </div>`;
}

/* Each nation's block on the all-work page carries its own full-bleed
   background and foreground colors — exactly the palette route() applies
   to #spoke when you visit that nation on its own. An optional `topBar`
   is threaded onto the first section so the page opens straight into that
   nation's colors instead of a separate neutral strip of chrome. */
export function nationSection(k, topBar = "") {
  return `<section class="nation-block" style="--bg:${SKIN[k].bg};--bg-lift:${SKIN[k].lift};
    --accent:${SKIN[k].accent};--fg:var(--paper);--fg-soft:rgba(217,203,171,.72);
    --hair:rgba(217,203,171,.20)">
    <div class="wrap">${topBar}${nationBody(k)}</div>
  </section>`;
}

/* The mark stays — four accents in one glyph is a fair symbol for a page
   that is all four sections stacked. Its LABEL doesn't: "White Lotus" told a
   reader who already knew the show's lore something, and told everyone else
   nothing about what page they had landed on. */
export function renderAll() {
  const topBar = spokeTop(lotusSVG(), `${SITE.allWork.card} — ${SITE.allWork.sub}`);
  return PANEL_ORDER.map((k, i) => nationSection(k, i === 0 ? topBar : "")).join("");
}
