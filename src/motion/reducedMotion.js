/* ╔══════════════════════════════════════════════════════════════════════╗
   ║  REDUCED MOTION — the JS half.                                       ║
   ╚══════════════════════════════════════════════════════════════════════╝

   styles/motion.css already zeroes CSS animation and transition duration
   under `prefers-reduced-motion: reduce`. That covers everything the site
   does today, but it will NOT cover GSAP once Phase 5/6 land: GSAP writes
   inline styles frame by frame and never goes through a CSS transition,
   so a media query can't touch it.

   Hence this module. Import `prefersReducedMotion()` anywhere a timeline
   is about to be built and branch to a plain cross-fade instead.

   This is an accessibility requirement, not a nicety — full-screen wipes
   of the kind Phase 6 describes are a known trigger for vestibular
   symptoms including nausea, dizziness, and migraine. */

const query = window.matchMedia("(prefers-reduced-motion: reduce)");

export function prefersReducedMotion() {
  return query.matches;
}

/** Duration helper: collapses any duration to near-zero when reduced. */
export function dur(seconds) {
  return query.matches ? 0.001 : seconds;
}

/** Re-run `fn` whenever the OS setting changes mid-session. */
export function onMotionPreferenceChange(fn) {
  query.addEventListener("change", () => fn(query.matches));
}

/* Mark the document so CSS can also branch on it without re-querying. */
if (query.matches) document.documentElement.classList.add("reduced-motion");
query.addEventListener("change", () =>
  document.documentElement.classList.toggle("reduced-motion", query.matches));
