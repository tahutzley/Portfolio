import { NATIONS } from "../config/nations.js";
import { SKIN } from "../data/skin.js";
import { $, esc, linkRow } from "./util.js";

let lastFocus = null;

export function openSheet(k, i) {
  const p = NATIONS[k].projects[i];
  lastFocus = document.activeElement;

  const sheet = $("#sheet");
  const panel = $("#panel");

  panel.style.cssText = `--bg:${SKIN[k].lift};--fg:var(--paper);
    --fg-soft:rgba(217,203,171,.74);--accent:${SKIN[k].accent};--hair:rgba(217,203,171,.22)`;

  panel.innerHTML = `<div class="sheet-inner">
    <button class="brushbtn" data-close style="color:var(--fg)"><span>&#8592;</span> Close</button>
    ${p.meta ? `<p class="meta" style="color:var(--accent);font-size:var(--t--1);
      letter-spacing:.2em;text-transform:uppercase;margin:2rem 0 0">${esc(p.meta)}</p>` : ""}
    <h2>${esc(p.title)}</h2>
    ${p.summary ? `<p class="lede">${esc(p.summary)}</p>` : ""}
    ${p.image ? `<div class="sheet-media"><img src="${esc(p.image)}" alt=""></div>` : ""}
    ${linkRow(p.links)}
    ${p.problem ? `<h4>The problem</h4><p>${esc(p.problem)}</p>` : ""}
    ${(p.decisions || []).length ? `<h4>Decisions</h4><ul>${
      p.decisions.map(d => `<li>${esc(d)}</li>`).join("")}</ul>` : ""}
    ${p.outcome ? `<h4>Outcome</h4><p>${esc(p.outcome)}</p>` : ""}
  </div>`;

  sheet.classList.add("on");
  document.body.style.overflow = "hidden";
  requestAnimationFrame(() => sheet.classList.add("in"));

  panel.querySelector("[data-close]").focus();
  panel.querySelectorAll("[data-close]").forEach(b =>
    b.addEventListener("click", () => closeSheet()));
}

export function closeSheet(instant) {
  const sheet = $("#sheet");
  if (!sheet.classList.contains("on")) return;
  sheet.classList.remove("in");
  document.body.style.overflow = "";
  const kill = () => { sheet.classList.remove("on"); $("#panel").innerHTML = ""; };
  instant ? kill() : setTimeout(kill, 380);
  lastFocus?.focus?.();
}

export function isSheetOpen() {
  return $("#sheet").classList.contains("on");
}

/** Wires every project card inside `root` to open its detail sheet. */
export function wireCards(root) {
  root.querySelectorAll("[data-all]").forEach(r => {
    const [nk, idx] = r.dataset.all.split(":");
    r.addEventListener("click", () => openSheet(nk, +idx));
  });
}
