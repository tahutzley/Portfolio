/* ╔══════════════════════════════════════════════════════════════════════╗
   ║  SITE — name, tagline, and the footer linktree.                      ║
   ╚══════════════════════════════════════════════════════════════════════╝ */

export const SITE = {
  name   : "Hi, my name is Timothy and I'm a full stack developer.",
  line   : "",

  /* Top cartouche on the map frame: a plain name plate rather than a
     control — the all-work control lives on the bottom cartouche now (see
     `allWork` below). Two lines, both set in caps because they read as an
     inscription rather than a sentence. */
  nameplate: {
    title: "TIMOTHY HUTZLEY",
    sub  : "Full Stack Developer"
  },

  /* The one control on the map that isn't a nation: it opens every section
     on a single page. It lives on the bottom cartouche — previously just a
     decorative motif balancing the top one — as three inscription lines:
     `plaque` (what this is), `items` (a preview of what's current), `cta`
     (the action). Wording is deliberately plain — it exists for someone who
     wants the whole portfolio at once and shouldn't have to learn the map's
     metaphor first, so it says what it does and nothing else.

     `card`/`sub` are the small-screen fallback in the panel grid, in the
     same Title Case + kicker shape as the four nation cards. Change any of
     them here; nothing else hardcodes the copy. */
  allWork: {
    plaque: "CURRENT WORK",
    items : "OmniLead · Aimilytics · DataAnnotation",
    cta   : "VIEW ALL WORK",
    card  : "My Work",
    sub   : "Every section on one page"
  },

  links  : [
    { label: "Email",    href: "mailto:thutzley1@gmail.com" },
    { label: "GitHub",   href: "https://github.com/tahutzley" },
    { label: "LinkedIn", href: "https://linkedin.com/in/timothy-hutzley-063074340" },
    { label: "Resume",   href: "Timothy_Hutzley_Resume.pdf" }
  ]
};
