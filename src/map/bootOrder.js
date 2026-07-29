/* ╔══════════════════════════════════════════════════════════════════════╗
   ║  BOOT ORDER — the sequence the timelapse draws the world in.         ║
   ╚══════════════════════════════════════════════════════════════════════╝

   Authored explicitly, not derived from REGIONS. Three things make
   derivation the wrong tool here:

     1. The nation order is air → water → earth → fire. ORDER in data/skin.js
        is air → water → fire → earth. Reusing it would mean mutating ORDER,
        which also drives allGlowFilters() and the region render loop — so it
        controls SVG paint order and z-stacking. Changing that to fix an
        animation would be a real regression risk for no gain.

     2. Array order inside `water` disagrees with the draw order in two
        places: regions.js lists cap-south FIRST, and strands islet-n5 after
        the entire s1..s7 run. Deriving would mean partitioning islets on an
        n/s infix, sorting numerically within each, then interleaving
        cap-north → n-islets → cap-south → s-islets. That is ID-string
        parsing encoding a convention only one of the four nations has.

     3. "The cap, then immediately its islets" is an authored beat, not a
        structural fact. Nothing in the geometry says the north islets belong
        to the north cap — that grouping is a claim this file makes.

   Grouped rather than flat because the grouping carries timing: boot.js
   spends BEAT_GAP crossing a group boundary and only STEP inside one, which
   is what makes a cap and its islets read as a single gesture instead of
   six evenly-spaced events.

   The cost of an explicit list is that adding a mass to regions.js would
   silently never draw. The dev-only audit at the bottom is what buys that
   back — it is the reason this list is safe to hand-maintain. */

import { REGIONS } from "./regions.js";

export const BOOT_GROUPS = [
  /* Air first — three separate islands, three separate beats. */
  ["air-isle-nw"],
  ["air-isle-s"],
  ["air-isle-e"],

  /* Water reads north-to-south: each cap pulls its own islets in behind it. */
  ["water-cap-north",
   "water-islet-n1", "water-islet-n2", "water-islet-n3",
   "water-islet-n4", "water-islet-n5"],

  ["water-cap-south",
   "water-islet-s1", "water-islet-s2", "water-islet-s3", "water-islet-s4",
   "water-islet-s5", "water-islet-s6", "water-islet-s7"],

  /* Earth is one continent and one beat. */
  ["earth-mainland"],

  /* Fire closes the sequence — the long tail of isles is the outro. */
  ["fire-main",
   "fire-isle-1", "fire-isle-2", "fire-isle-3", "fire-isle-4", "fire-isle-5",
   "fire-isle-6", "fire-isle-7", "fire-isle-8", "fire-isle-9"],
];

export const BOOT_ORDER = BOOT_GROUPS.flat();

/* ── Dev-only audit ───────────────────────────────────────────────────────
   Asserts BOOT_ORDER is an exact permutation of every mass in REGIONS.
   Stripped from production builds — `import.meta.env.DEV` is a literal Vite
   substitutes at build time, so the whole block dead-codes away.

   Without this, the failure mode of a hand-maintained list is silent: draw
   a new island in regions.js, forget this file, and it simply never appears
   during boot — visible only as a mass that pops in at the end when .boot
   is removed, which is easy to mistake for a timing bug. */
if (import.meta.env.DEV) {
  const declared = Object.values(REGIONS).flatMap(r => r.masses.map(m => m.id));
  const missing = declared.filter(id => !BOOT_ORDER.includes(id));
  const strays  = BOOT_ORDER.filter(id => !declared.includes(id));
  const dupes   = BOOT_ORDER.filter((id, i) => BOOT_ORDER.indexOf(id) !== i);

  if (missing.length || strays.length || dupes.length) {
    console.error(
      "[bootOrder] BOOT_GROUPS is out of sync with REGIONS.",
      "\n  in REGIONS but never drawn:", missing,
      "\n  drawn but not in REGIONS:  ", strays,
      "\n  listed more than once:     ", dupes,
    );
  }
}
