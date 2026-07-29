/* ══════════════════════════════════════════════════════════════════════════
   INK — dry-brush calligraphy strokes, generated.

   Built the way the mark is actually made, which is the opposite of how it
   first looks. A dry stroke is not bristles drawn one by one — it is a
   SOLID slab of ink with streaks taken back out of it:

     body      a filled bar, near-constant thickness, ragged top and bottom
     streaks   thin voids cut out by a mask, crowding toward the tail
     tail      loose filaments running past the body where the brush lifted
     spatter   flecks thrown off the edges

   Drawing it in that order is what produces the reference's hard black core
   with sharp thin gaps, rather than the even cross-hatch you get from
   stacking N filaments and hoping they overlap.

   Everything is seeded. The same drawing renders every load, so two
   variants can be compared without the artwork moving underneath you.
   ═══════════════════════════════════════════════════════════════════════ */

function rng(seed){
  let s = (seed >>> 0) || 1;
  return () => (s ^= s << 13, s ^= s >>> 17, s ^= s << 5, (s >>> 0) / 4294967296);
}

/* Smooth periodic noise. Used for every irregularity here — the point is
   that edges wander CONTINUOUSLY. Per-sample randomness reads as sawtooth
   hatching, which was the first attempt's mistake. */
function noise1(seed, n = 96){
  const r = rng(seed), g = Array.from({ length: n }, r);
  return t => {
    const x = (((t % 1) + 1) % 1) * n, i = Math.floor(x), f = x - i;
    const u = f * f * (3 - 2 * f);
    return g[i % n] * (1 - u) + g[(i + 1) % n] * u - .5;
  };
}
/* Two octaves — a slow swell plus a finer tremor. */
function noise2(seed){
  const a = noise1(seed), b = noise1(seed * 7919 + 11);
  return t => a(t) + .45 * b(t * 3.1);
}

function spline(pts, samples){
  if (pts.length === 2){
    const out = [];
    for (let i = 0; i <= samples; i++){
      const t = i / samples;
      out.push([pts[0][0] + (pts[1][0] - pts[0][0]) * t,
                pts[0][1] + (pts[1][1] - pts[0][1]) * t]);
    }
    return out;
  }
  const P = [pts[0], ...pts, pts[pts.length - 1]], out = [];
  for (let i = 0; i < P.length - 3; i++){
    const [p0, p1, p2, p3] = [P[i], P[i + 1], P[i + 2], P[i + 3]];
    for (let s = 0; s < samples; s++){
      const t = s / samples, t2 = t * t, t3 = t2 * t;
      out.push([
        .5*((2*p1[0]) + (-p0[0]+p2[0])*t + (2*p0[0]-5*p1[0]+4*p2[0]-p3[0])*t2 + (-p0[0]+3*p1[0]-3*p2[0]+p3[0])*t3),
        .5*((2*p1[1]) + (-p0[1]+p2[1])*t + (2*p0[1]-5*p1[1]+4*p2[1]-p3[1])*t2 + (-p0[1]+3*p1[1]-3*p2[1]+p3[1])*t3)
      ]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

/* Frame: centreline samples plus unit normals, so body / streaks / tail all
   share one geometry and stay registered to each other. */
function frame(pts, samples){
  const c = spline(pts, samples), N = c.length, n = [];
  for (let i = 0; i < N; i++){
    const a = c[Math.max(0, i - 1)], b = c[Math.min(N - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1];
    const m = Math.hypot(dx, dy) || 1;
    n.push([-dy / m, dx / m]);
  }
  return { c, n, N };
}
const at = (F, i, off) => [F.c[i][0] + F.n[i][0] * off, F.c[i][1] + F.n[i][1] * off];
const fmt = p => p[0].toFixed(1) + ',' + p[1].toFixed(1);

/* ── one stroke ───────────────────────────────────────────────────────────
   w        half-width of the bar
   taper    how much the tail thins (0 = parallel-sided, 1 = to a point)
   rough    amplitude of the top/bottom edge wander, as a fraction of w
   streaks  how many dry voids get cut out
   dry      how far up the stroke the voids reach (0 = tail only, 1 = all of it)
   tail     how many loose filaments run past the body
   reach    how far past the body those filaments go, as a fraction of length
   blunt    1 = square landing at the start, 0 = the start is torn too
   spatter  fleck count
*/
function stroke(pts, opts = {}){
  const {
    w = 30, taper = .35, rough = .30, streaks = 46, dry = .55,
    tail = 26, reach = .10, blunt = 1, spatter = 12,
    seed = 1, samples = 34
  } = opts;

  const F = frame(pts, samples), { N } = F;
  const R = rng(seed);
  const eTop = noise2(seed * 13 + 1);
  const eBot = noise2(seed * 29 + 3);

  /* Width envelope. Deliberately NOT a sine swell — a real drag stays close
     to parallel and only gives up at the very end. The first attempt's
     almond silhouette came from swelling in the middle. */
  const halfW = t => w * (1 - taper * Math.pow(Math.max(0, t - .45) / .55, 1.8));

  /* ── body ──────────────────────────────────────────────────────────────
     One closed polygon: top edge forward, bottom edge back. Both edges
     wander independently, so the bar is never symmetric about its spine. */
  const top = [], bot = [];
  for (let i = 0; i < N; i++){
    const t = i / (N - 1);
    const hw = halfW(t);
    /* The start is squared off unless `blunt` says otherwise; the last 12%
       pulls in hard so the tail terminates instead of being cut. */
    const cap = Math.min(1, t / (blunt ? .012 : .10)) * Math.min(1, (1 - t) / .06);
    /* Edges get rougher as the brush empties — a wet start is smooth-sided,
       a dry finish is not. Without this ramp the raggedness reads as a
       uniform sawtooth applied to the whole bar. */
    const rr = rough * (.55 + .95 * t);
    top.push(at(F, i,  (hw * (1 + rr * eTop(t))) * cap));
    bot.push(at(F, i, -(hw * (1 + rr * eBot(t))) * cap));
  }
  const body = `<path d="M${top.map(fmt).join('L')}L${bot.reverse().map(fmt).join('L')}Z"/>`;

  /* ── tail filaments ───────────────────────────────────────────────────
     Where the brush lifts, the outer bristles keep going and separate. They
     run past the body end along the extrapolated tangent. */
  const tips = [];
  const endT = F.c[N - 1], endN = F.n[N - 1];
  const tx = -endN[1], ty = endN[0];
  const len = Math.hypot(F.c[N-1][0] - F.c[0][0], F.c[N-1][1] - F.c[0][1]);
  for (let k = 0; k < tail; k++){
    const u  = (R() * 2 - 1);
    /* Start late. The fray is a short zone at the very end of the drag —
       filaments that begin halfway down turn the whole back half into
       parallel hairlines, which is the one thing the reference never does. */
    const i0 = Math.floor(N * (.80 + R() * .17));
    const off = u * halfW(i0 / (N - 1)) * (.35 + R() * .85);
    const pts2 = [];
    for (let i = i0; i < N; i++) pts2.push(at(F, i, off * (i - i0) / Math.max(1, N - 1 - i0) * .6 + off * .4));
    const ext = len * reach * (.25 + R() * .95);
    const end = [F.c[N-1][0] + tx * ext + endN[0] * off * 1.25,
                 F.c[N-1][1] + ty * ext + endN[1] * off * 1.25];
    pts2.push(end);
    if (pts2.length > 1)
      tips.push(`<path fill="none" stroke="currentColor" stroke-linecap="round"` +
                ` stroke-width="${(.6 + R() * 1.7).toFixed(2)}"` +
                ` d="M${pts2.map(fmt).join('L')}"/>`);
  }

  /* ── spatter ──────────────────────────────────────────────────────────
     Along the whole stroke, not just past the tip — ink flicks off an edge
     wherever the brush changes speed. Kept close; strays read as dirt. */
  const flecks = [];
  for (let s = 0; s < spatter; s++){
    const i = Math.floor(N * (.25 + R() * .78) % N);
    const side = R() < .5 ? -1 : 1;
    const off = side * halfW(i / (N - 1)) * (1.05 + Math.pow(R(), 2) * .9);
    const p = at(F, i, off);
    flecks.push(`<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}"` +
                ` r="${(.5 + R() * 1.7).toFixed(2)}"/>`);
  }

  /* ── streaks (mask content) ───────────────────────────────────────────
     Thin voids running WITH the stroke. Two things make them read as dry
     brush rather than scratches: they follow the centreline exactly, and
     their density is biased toward the tail and toward the rim, because
     that is where a brush runs out first. */
  const cuts = [];
  for (let k = 0; k < streaks; k++){
    const bias = Math.pow(R(), 1 - dry * .75);      // dry → pushes t0 later
    const t0 = .04 + bias * .82;
    /* Short. A void is where a few bristles skipped for a moment, not a
       channel running the length of the stroke — R()³ keeps most of them
       brief and lets the occasional one run. */
    const t1 = Math.min(1.0, t0 + .05 + Math.pow(R(), 3) * .40 * (dry + .35));
    const i0 = Math.round(t0 * (N - 1)), i1 = Math.round(t1 * (N - 1));
    if (i1 - i0 < 2) continue;
    const rim = Math.pow(R(), .55);                  // crowd toward the edges
    const u = (R() < .5 ? -1 : 1) * rim;
    const wob = noise1(seed * 101 + k * 17);
    const pts2 = [];
    for (let i = i0; i <= i1; i++){
      const t = i / (N - 1);
      pts2.push(at(F, i, u * halfW(t) * .92 + wob(t * 2.2) * w * .10));
    }
    cuts.push(`<path d="M${pts2.map(fmt).join('L')}"` +
              ` stroke-width="${(.7 + R() * R() * 4.2).toFixed(2)}"/>`);
  }

  return { ink: body + tips.join('') + `<g stroke="none">${flecks.join('')}</g>`,
           cut: cuts.join('') };
}

/* ══ COMPOSITIONS ══════════════════════════════════════════════════════════
   Canvas 1600×1000, preserveAspectRatio="xMidYMid slice".

   Placement rule: strokes run off the canvas edge. The map frame's outer
   band is opaque paper, so the middle of a full-width stroke is simply
   COVERED by the chart and only its ends show, in the gutters — the ink
   reads as something the map was laid down on top of. Nothing is masked to
   avoid the map; the occlusion does that work by itself.
   ═══════════════════════════════════════════════════════════════════════ */

const COMPOSITIONS = {
  /* A — long horizontals top and bottom, two short ones holding the gutters. */
  A: [
    [[[-280, 122], [420, 108], [1120, 126], [1900, 112]],
     { w: 26, taper: .30, rough: .26, streaks: 54, dry: .55, tail: 30, seed: 101 }],
    [[[-240, 936], [560, 950], [1320, 930], [1900, 944]],
     { w: 31, taper: .26, rough: .24, streaks: 62, dry: .48, tail: 34, seed: 202 }],
    [[[1900, 452], [1430, 468], [1120, 450]],
     { w: 20, taper: .45, rough: .34, streaks: 32, dry: .70, tail: 22, seed: 303, spatter: 9 }],
    [[[-260, 690], [140, 704], [430, 688]],
     { w: 17, taper: .50, rough: .36, streaks: 26, dry: .74, tail: 20, seed: 404, spatter: 8 }],
  ],

  /* B — the same brush turned upright. Fits the gutters' shape better and
       reads more like a hanging scroll. */
  B: [
    [[[188, -260], [172, 300], [200, 700], [180, 1260]],
     { w: 26, taper: .28, rough: .26, streaks: 56, dry: .55, tail: 30, seed: 511 }],
    [[[1412, -240], [1436, 280], [1410, 700], [1430, 1260]],
     { w: 22, taper: .30, rough: .30, streaks: 46, dry: .62, tail: 26, seed: 622 }],
    [[[-240, 946], [420, 958], [980, 940]],
     { w: 18, taper: .48, rough: .34, streaks: 28, dry: .72, tail: 20, seed: 733, spatter: 9 }],
  ],

  /* C — mixed: two horizontals bracketing the page, two gutter verticals. */
  C: [
    [[[-280, 118], [520, 104], [1240, 124], [1900, 110]],
     { w: 25, taper: .30, rough: .26, streaks: 52, dry: .56, tail: 28, seed: 141 }],
    [[[-240, 940], [600, 954], [1360, 932], [1900, 948]],
     { w: 30, taper: .26, rough: .24, streaks: 60, dry: .48, tail: 32, seed: 242 }],
    /* blunt:0 — these two begin and end inside the canvas, and a squared-off
       landing there reads as a cut bar rather than a brush set down. The
       long horizontals above run off the edge, so they keep their blunt
       start; nobody ever sees it. */
    [[[186, 250], [170, 540], [198, 810]],
     { w: 16, taper: .42, rough: .34, streaks: 26, dry: .70, tail: 18, blunt: 0, seed: 343, spatter: 8 }],
    [[[1414, 800], [1434, 520], [1410, 280]],
     { w: 14, taper: .46, rough: .36, streaks: 22, dry: .74, tail: 16, blunt: 0, seed: 444, spatter: 7 }],
  ],

  /* D — sparse. One behind the name, one under the grid. The "how little
       works" answer, and the safest thing to ship. */
  D: [
    [[[-280, 124], [560, 110], [1300, 128], [1900, 114]],
     { w: 24, taper: .32, rough: .26, streaks: 50, dry: .58, tail: 28, seed: 909 }],
    [[[-240, 942], [640, 956], [1420, 934], [1900, 950]],
     { w: 29, taper: .26, rough: .24, streaks: 58, dry: .50, tail: 32, seed: 818 }],
  ]
};

/* The layer. `currentColor` so the ink colour is set once in CSS on
   .hub-ink, and a future dark surface could recolour it without a rebuild.

   One mask for the whole layer rather than one per stroke: masks are the
   expensive part, and the streaks never need to be addressed individually. */
function inkSVG(variant){
  const set = COMPOSITIONS[variant] || [];
  const parts = set.map(([pts, o]) => stroke(pts, o));
  const id = 'dry-' + variant;
  return `<svg viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice"
       aria-hidden="true" focusable="false">
  <defs>
    <mask id="${id}" maskUnits="userSpaceOnUse" x="-400" y="-400" width="2400" height="1800">
      <rect x="-400" y="-400" width="2400" height="1800" fill="#fff"/>
      <g fill="none" stroke="#000" stroke-linecap="round" stroke-linejoin="round">
        ${parts.map(p => p.cut).join('')}
      </g>
    </mask>
  </defs>
  <g fill="currentColor" mask="url(#${id})">
    ${parts.map(p => p.ink).join('')}
  </g>
</svg>`;
}

if (typeof module !== 'undefined') module.exports = { stroke, inkSVG, COMPOSITIONS };
