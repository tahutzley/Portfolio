export const $ = (s, r = document) => r.querySelector(s);

export const esc = s =>
  String(s ?? "").replace(/[&<>"]/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/** Shared link-button row, used by timeline entries and the detail sheet. */
export const linkRow = links =>
  (links || []).length
    ? `<div class="link-row">${links.map(l =>
        `<a href="${esc(l.href)}" target="_blank" rel="noopener noreferrer">${esc(l.label)}</a>`
      ).join("")}</div>`
    : "";
