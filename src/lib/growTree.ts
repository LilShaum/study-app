/* ============================================================
   GROW TREE — a course, drawn.

   CONSTRUCTION CONTRACT (hold this; it is why the drawing reads as
   drawn rather than generated):

   1. No primitives. Every mark is a path of placed curves. There is no
      <circle>, <rect> or <ellipse> anywhere in the output — nothing a
      person draws is a perfect circle, and a circle-plus-rectangle tree
      is the clip-art tell.
   2. No mirror symmetry. Sides alternate imperfectly, angles and lengths
      carry seeded jitter, and even a single leaf is asymmetric about its
      own midrib. A shape that is exactly its own reflection reads as
      machinery.
   3. Three weights, never one: TRUNK heaviest, BRANCH lighter, TWIG and
      LEAF lightest. This is what makes a flat line drawing sit in front
      of itself.
   4. `currentColor` everywhere, so the drawing belongs to whatever theme
      it is rendered in. The WOOD is stroke-only like the icon set. The
      FOLIAGE is filled with the surface colour so it occludes the branches
      behind it — an earlier version made every leaf a transparent outline
      and the result was that a tree in full leaf still read as a bare
      winter skeleton with leaves stuck on, because nothing ever hid
      anything.
   5. Deterministic. The same course always grows the same tree; only
      what the student has learned changes.

   Taper is done by splitting a spine into consecutive sub-paths of
   decreasing stroke width rather than by filling an outline, because a
   filled silhouette would break rule 4.
   ============================================================ */

export type LimbKind = 'trunk' | 'branch' | 'twig' | 'leaf';

export interface Limb {
  d: string;
  /** Stroke width in viewBox units. */
  weight: number;
  kind: LimbKind;
  /**
   * True for marks that must HIDE what is behind them rather than tint it.
   * The renderer fills these with the surface colour.
   *
   * Without this every leaf was a transparent outline with branches showing
   * straight through it, so a tree in full leaf still read as a bare winter
   * skeleton with decoration attached. Draw order alone does not occlude.
   */
  solid?: boolean;
  /** The section this limb grew from, for hit-testing and highlighting. */
  sectionId?: string;
  /**
   * True for the limbs on a section's MAIN LINE — the unbroken chain from
   * where it leaves the trunk out to its own tip.
   *
   * `kind` cannot stand in for this, because kind comes from depth: a
   * section's depth-3 limb and every depth-2 child it throws are all
   * `branch`, so a section is about nine separate strokes fanning across
   * the crown. Sampling all of them for hit-testing made a section's
   * target a wide, ragged region that overlapped its neighbours' — aiming
   * at one branch could land two over. The main line is one stroke, which
   * is what a person means when they point at a branch.
   */
  spine?: boolean;
  /**
   * A filled shape in the line colour rather than a stroke. Only the trunk:
   * a stroke cannot widen toward its end, and a trunk that does not widen
   * into the ground is a pole stuck in it.
   */
  ink?: boolean;
  /**
   * A leaf this section has lost to forgetting, drawn where it grew. Not
   * shown on the tree; the renderer outlines them when the section is
   * pointed at, so the shape of what was known is visible against what is
   * still held.
   */
  ghost?: boolean;
  /** A lost leaf lying on the ground under the branch it fell from. */
  fallen?: boolean;
}

export interface Tree {
  width: number;
  height: number;
  limbs: Limb[];
}

export interface TreeSection {
  id: string;
  /** Relative size — drives how long and thick this branch is. */
  weight: number;
  /**
   * 0..1, how much of this section is held NOW — what it has learned, times
   * how much of that it would still recall today. Drives the leaves on the
   * tree, and only foliage.
   */
  mastery: number;
  /**
   * 0..1, how much of it was ever learned. The gap between this and `mastery`
   * is what has faded: those leaves lie on the ground under the section, and
   * the ones next to fall droop. Defaults to `mastery` — nothing faded.
   */
  learned?: number;
}

/**
 * How this tree grows.
 *
 * One set of traits, not four. There were four "species" — Winter, Banyan,
 * Fig and a default — and they could not be told apart, because a line
 * drawing with no colour has only silhouette to work with and silhouette
 * alone cannot carry a species. Six attempts produced a scribble, a fishbone,
 * a five-pointed star and a rosette before that was accepted.
 *
 * The variety that matters survives and is better: every course grows its own
 * tree, seeded from the course, and what the student has learned decides how
 * much of it is in leaf.
 */
const TRAITS = {
  /** Attachment angle from vertical, at the base of the trunk and at the crown. */
  spread: [70, 38] as [number, number],
  /** Positive curves a limb back toward vertical as it rises. */
  lift: 0.3,
  /**
   * Apical dominance. High means one leader dominates and the tree is
   * upright; low means the trunk dissolves into equals and the crown
   * spreads.
   */
  leader: 0.55,
  /** How many limbs come off a limb, at the coarse and fine scales. */
  children: [3, 2] as [number, number],
  /** Trunk length before the crown begins. */
  bole: [84, 14] as [number, number],
  /** How many clumps of foliage a fully-known section carries. */
  clumps: 5,
  /** Leaves packed into one clump — this is what turns marks into mass. */
  clumpDensity: 16,
  /** Radius of a clump, in viewBox units. */
  clumpSize: 11,
  leafLength: 7.5,
};

type SpeciesTraits = typeof TRAITS;

/** Cheap, stable string hash — the same course id always seeds the same tree. */
function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32 — small, fast, good enough spread for jitter. */
function rng(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Pt {
  x: number;
  y: number;
}

const round = (n: number) => Math.round(n * 10) / 10;

/**
 * A smooth path through points, as a Catmull-Rom spline converted to cubic
 * beziers. Straight line segments are what make a generated branch look like
 * a wire diagram; a spline through jittered points looks like it was drawn in
 * one stroke.
 */
function smooth(points: Pt[]): string {
  if (points.length < 2) return '';
  if (points.length === 2) {
    return `M${round(points[0].x)} ${round(points[0].y)}L${round(points[1].x)} ${round(points[1].y)}`;
  }
  let d = `M${round(points[0].x)} ${round(points[0].y)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    d += `C${round(c1.x)} ${round(c1.y)},${round(c2.x)} ${round(c2.y)},${round(p2.x)} ${round(p2.y)}`;
  }
  return d;
}

/**
 * One spine drawn as several sub-paths of decreasing width.
 *
 * This is how a stroke-only drawing tapers. Overlapping the segments by a
 * point and using round caps hides the joins, so it reads as one continuous
 * limb that thins toward its tip.
 */
function taperedLimb(
  points: Pt[],
  from: number,
  to: number,
  kind: LimbKind,
  sectionId?: string,
  spine?: boolean,
): Limb[] {
  const pieces = Math.min(4, Math.max(2, Math.floor(points.length / 2)));
  const out: Limb[] = [];
  const per = (points.length - 1) / pieces;
  for (let i = 0; i < pieces; i++) {
    const start = Math.floor(i * per);
    const end = Math.min(points.length - 1, Math.ceil((i + 1) * per));
    const slice = points.slice(start, end + 1);
    if (slice.length < 2) continue;
    const t = pieces === 1 ? 0 : i / (pieces - 1);
    out.push({ d: smooth(slice), weight: round(from + (to - from) * t), kind, sectionId, spine });
  }
  return out;
}

/**
 * Leaves, in two shapes — a narrow pointed one and a broad blunt one —
 * varied further by size and by how many a limb carries.
 *
 * There was a third, a lobed fig leaf, and it is gone. Three attempts drew a
 * five-pointed star, then a rosette, then crumpled paper: at the ~19px a leaf
 * actually renders at, lobe geometry has no room to read. A shape only
 * identifiable at 4x zoom was not doing a job here.
 *
 * Both are asymmetric about their own midrib. Two mirrored arcs give the
 * pointed oval every generated plant drawing uses; pulling one side fuller
 * than the other is the difference between a leaf and a lens.
 */
function leafPath(
  at: Pt,
  angle: number,
  length: number,
  rand: () => number,
): string {
  const dx = Math.sin(angle);
  const dy = -Math.cos(angle);
  // Leaf-local frame: u runs along the midrib, v across it.
  const to = (u: number, v: number): Pt => ({
    x: at.x + dx * length * u - dy * length * v,
    y: at.y + dy * length * u + dx * length * v,
  });
  const P = (p: Pt) => `${round(p.x)} ${round(p.y)}`;

  const belly = 0.32 + rand() * 0.1;
  const tipU = 0.97 + rand() * 0.03;
  const shoulder = 0.46 + rand() * 0.08;
  const skew = 0.66 + rand() * 0.2;
  return (
    `M${P(to(0, 0))}` +
    `Q${P(to(shoulder, belly))},${P(to(tipU, 0))}` +
    `Q${P(to(shoulder, -belly * skew))},${P(to(0, 0))}`
  );
}

const RAD = Math.PI / 180;

interface Anchor {
  at: Pt;
  angle: number;
}

/**
 * One limb, drawn, and then the limbs that come off it.
 *
 * Recursive and self-similar, because that is what separates a tree from a
 * fishbone. The first attempt had three fixed tiers — trunk, branch, twig —
 * and produced regular spacing and a triangular silhouette no amount of
 * jitter could rescue. Here every limb is grown by the same routine at a
 * smaller scale, which is how real branching actually works.
 *
 * Children are never a symmetric pair: one takes the lead and continues near
 * the parent's direction, the other departs at a wider angle and is shorter.
 * That single asymmetry does more for realism than any other parameter.
 */
function grow(
  ctx: {
    limbs: Limb[];
    anchors: Anchor[];
    rand: () => number;
    traits: SpeciesTraits;
    sectionId?: string;
  },
  origin: Pt,
  angle: number,
  length: number,
  width: number,
  depth: number,
  /** Whether this limb continues its section's main line. */
  spine = false,
): void {
  const { rand, traits } = ctx;

  // Walk the limb as a curve, bending back toward vertical as it rises.
  const STEPS = depth >= 3 ? 6 : 4;
  const pts: Pt[] = [origin];
  let p = origin;
  let a = angle;
  for (let i = 1; i <= STEPS; i++) {
    a *= 1 - traits.lift / STEPS;
    a += (rand() - 0.5) * 0.06;
    const step = length / STEPS;
    p = {
      x: p.x + Math.sin(a) * step + (rand() - 0.5) * width * 0.5,
      y: p.y - Math.cos(a) * step,
    };
    pts.push(p);
  }

  const kind: LimbKind = depth >= 4 ? 'trunk' : depth >= 2 ? 'branch' : 'twig';
  ctx.limbs.push(...taperedLimb(pts, width, Math.max(0.55, width * 0.55), kind, ctx.sectionId, spine));

  const tip = pts[pts.length - 1];
  if (depth <= 0 || length < 7) {
    ctx.anchors.push({ at: tip, angle: a });
    return;
  }

  // A leader that carries on, and one or two departures. Their angles and
  // lengths are drawn from the seed, never mirrored.
  const [coarse, fine] = traits.children;
  const base = depth >= 3 ? coarse : fine;
  const children = Math.max(1, base + (rand() < 0.4 ? 1 : 0) - (rand() < 0.2 ? 1 : 0));
  const spread = (traits.spread[1] * 0.55 + rand() * traits.spread[1] * 0.5) * RAD;
  let side = rand() < 0.5 ? -1 : 1;

  for (let c = 0; c < children; c++) {
    const lead = c === 0;
    // Apical dominance: a strong leader makes a conical, upright tree; a weak
    // one lets the limb dissolve into equals and the crown spread. This is
    // what makes the four species read as different trees rather than the
    // same tree with different leaf counts.
    const off = lead
      ? (rand() - 0.5) * spread * (1.1 - traits.leader)
      : side * spread * (0.7 + rand() * 0.6);
    const ratio = lead
      ? 0.6 + traits.leader * 0.3 + rand() * 0.08
      : 0.44 + (1 - traits.leader) * 0.3 + rand() * 0.16;
    // Departures leave from partway down the limb, not all from the tip —
    // every child sharing one origin is the other machinery tell.
    const fromIdx = lead ? pts.length - 1 : Math.max(1, Math.round((0.55 + rand() * 0.4) * (pts.length - 1)));
    grow(ctx, pts[fromIdx], a + off, length * ratio, Math.max(0.6, width * 0.62), depth - 1, spine && lead);
    side *= -1;
  }

  // Leaf anchors along the outer part of any limb thin enough to bear them.
  if (depth <= 2) {
    for (let i = Math.ceil(pts.length * 0.5); i < pts.length; i++) {
      ctx.anchors.push({ at: pts[i], angle: a + (rand() - 0.5) * 0.7 });
    }
  }
}

/**
 * Grows the tree for one course.
 *
 * Structure comes from the course — a limb per section, its scale set by how
 * much that section holds — so the silhouette is a property of the material
 * and does not move as you study. What study changes is foliage: a section
 * you have never opened is a bare branch, and that is the honest signal the
 * picture exists to give.
 */
/**
 * The trunk as one filled outline: the spine offset either side by a width
 * that tapers from foot to crown and swells in the last few units above the
 * ground — each side by its own amount, because a real flare is lopsided.
 */
function trunkOutline(spine: Pt[], foot: number, top: number, flareL: number, flareR: number): Limb {
  // Resampled finer than the spine: the flare happens in the lowest few
  // units, and the spine's first segment alone is longer than that.
  const pts: Pt[] = [];
  const PER = 4;
  for (let i = 0; i < spine.length - 1; i++) {
    for (let j = 0; j < PER; j++) {
      const t = j / PER;
      pts.push({
        x: spine[i].x + (spine[i + 1].x - spine[i].x) * t,
        y: spine[i].y + (spine[i + 1].y - spine[i].y) * t,
      });
    }
  }
  pts.push(spine[spine.length - 1]);

  const base = spine[0];
  const left: Pt[] = [];
  const right: Pt[] = [];
  pts.forEach((p, i) => {
    const q = pts[Math.min(pts.length - 1, i + 1)];
    const o = pts[Math.max(0, i - 1)];
    const len = Math.hypot(q.x - o.x, q.y - o.y) || 1;
    // Unit normal to the spine, pointing to its left.
    const nx = -(q.y - o.y) / len;
    const ny = (q.x - o.x) / len;
    const along = i / (pts.length - 1);
    const half = (foot + (top - foot) * along) / 2;
    const rise = Math.max(0, base.y - p.y);
    // The swell dies away over about six units: wide at the ground, trunk
    // width by the height of a person's knee on a tree this size.
    const swell = Math.exp(-rise / 2.6);
    left.push({ x: p.x - nx * (half + flareL * swell), y: p.y - ny * (half + flareL * swell) });
    right.push({ x: p.x + nx * (half + flareR * swell), y: p.y + ny * (half + flareR * swell) });
  });

  const tip = spine[spine.length - 1];
  const ring = [...left, { x: tip.x, y: tip.y - top * 0.35 }, ...right.reverse()];
  // Weight is the width at the foot: not stroked, but still the heaviest
  // mark in the drawing, and what anything comparing weights should see.
  return { d: `${smooth(ring)}Z`, weight: foot, kind: 'trunk', ink: true };
}

export function growTree(seed: string, sections: TreeSection[]): Tree {
  const traits = TRAITS;
  const rand = rng(hashSeed(seed));
  const width = 200;
  const height = 260;
  const baseY = height - 14;
  const baseX = width / 2 + (rand() - 0.5) * 6;

  const limbs: Limb[] = [];

  /* ---- trunk: leans, and dissolves into the crown rather than ending in a
     spike. It is short, because in a mature tree most of the height is
     branching, not bole. ---- */
  // Enough bole that it reads as a tree rather than a bouquet — the first
  // recursive pass started branching almost at the ground. How much is a
  // species trait: a banyan is nearly all crown, a winter tree nearly all
  // trunk.
  const trunkLen = traits.bole[0] + rand() * traits.bole[1];
  const trunkLean = (rand() - 0.5) * 0.22;
  const trunkPts: Pt[] = [];
  const TSTEPS = 7;
  let tp: Pt = { x: baseX, y: baseY };
  let ta = trunkLean;
  for (let i = 0; i <= TSTEPS; i++) {
    trunkPts.push(tp);
    ta += (rand() - 0.5) * 0.09 - trunkLean * 0.06;
    tp = { x: tp.x + Math.sin(ta) * (trunkLen / TSTEPS), y: tp.y - Math.cos(ta) * (trunkLen / TSTEPS) };
  }
  /* ---- the base ----

     The first version drew the trunk as four strokes of stepping width
     standing on two stick roots that left it partway up: a pole on a tripod,
     with a round cap poking out underneath and notches down its length where
     the widths changed. A trunk is one mass that swells into the ground, so
     it is drawn as one filled outline, flaring at the foot; surface roots run
     out of that swelling along the ground, and a broken ground line gives it
     something to stand on.

     All of it draws from a stream of its own. The four draws the old roots
     took from the main stream are still taken, in the same order, so the
     crown above — seeded from that stream — is exactly the tree it was. ---- */
  const kept = [rand(), rand(), rand(), rand()];
  const br = rng(hashSeed(`${seed}/base`));
  limbs.push(trunkOutline(trunkPts, 5.2, 3.1, 3.4 + br() * 2.4, 3.4 + br() * 2.4));

  const footW = 5.2 / 2;
  /** Where the ground line runs: a fraction below the foot, so the trunk sits in it. */
  const GROUND = baseY + 0.4;
  for (const [n, dir] of [
    [0, -1],
    [1, 1],
  ] as const) {
    // Reach and dip come from the old roots' own draws, so a course keeps the
    // proportions its roots always had.
    const reach = (11 + kept[n * 2] * 8) * dir;
    const dip = kept[n * 2 + 1];
    // Out of the swelling, arching a little above the ground, and sinking
    // into it at the end — a root lying flat along the ground reads as part
    // of the ground line.
    limbs.push(
      ...taperedLimb(
        [
          { x: baseX + dir * (footW + 0.4), y: baseY - 2.8 },
          { x: baseX + reach * 0.4, y: baseY - 1.3 - dip * 0.4 },
          { x: baseX + reach * 0.75, y: baseY - 0.3 },
          { x: baseX + reach, y: GROUND },
        ],
        2.0,
        0.45,
        'trunk',
      ),
    );
  }
  // A third, shorter root on one side only: two matched roots are a pair of
  // feet. It never goes below the ground line — one that did read as a stray
  // tick rather than a root.
  {
    const dir = br() < 0.5 ? -1 : 1;
    const reach = (6 + br() * 4) * dir;
    limbs.push(
      ...taperedLimb(
        [
          { x: baseX + dir * footW * 0.7, y: baseY - 1.6 },
          { x: baseX + reach * 0.55, y: baseY - 0.5 },
          { x: baseX + reach, y: GROUND },
        ],
        1.3,
        0.4,
        'trunk',
      ),
    );
  }

  // The ground: a hairline in a few broken pieces, never one ruled line.
  for (const [a0, a1] of [
    [-46 - br() * 8, -30 + br() * 4],
    [-26 + br() * 3, 24 + br() * 3],
    [29 + br() * 4, 44 + br() * 8],
  ]) {
    const pts: Pt[] = [];
    const steps = 4;
    for (let i = 0; i <= steps; i++) {
      pts.push({ x: baseX + a0 + ((a1 - a0) * i) / steps, y: GROUND + (br() - 0.5) * 0.6 });
    }
    limbs.push({ d: smooth(pts), weight: 0.55, kind: 'twig' });
  }

  const totalWeight = sections.reduce((n, s) => n + Math.max(1, s.weight), 0) || 1;
  const anchorsBySection = new Map<string, Anchor[]>();

  /* Attachment heights are irregular on purpose: some sections cluster, some
     stand alone. Evenly spaced branches are the strongest machinery tell
     there is, and the first pass had exactly that. */
  const heights = sections.map((_, i) => {
    const even = sections.length === 1 ? 0.5 : i / (sections.length - 1);
    return Math.min(0.99, Math.max(0.55, 0.55 + even * 0.45 + (rand() - 0.5) * 0.14));
  });

  let side = rand() < 0.5 ? -1 : 1;
  sections.forEach((section, i) => {
    const t = heights[i];
    const idx = Math.min(trunkPts.length - 1, Math.max(2, Math.round(t * TSTEPS)));
    const origin = trunkPts[idx];

    const share = Math.max(1, section.weight) / totalWeight;
    const vigour = 0.6 + Math.min(1, share * sections.length * 0.85) * 0.5;

    // Lower limbs leave the trunk nearer the horizontal and are longer; upper
    // ones are steeper and shorter. That is what gives a crown its shape
    // instead of a triangle.
    const spread = traits.spread[0] + (traits.spread[1] - traits.spread[0]) * t;
    const angle = side * (spread + (rand() - 0.5) * 16) * RAD;
    const length = (30 + 18 * vigour) * (1.2 - 0.45 * t);

    const anchors: Anchor[] = [];
    grow(
      { limbs, anchors, rand, traits, sectionId: section.id },
      origin,
      angle,
      length,
      2.4 * vigour,
      3,
      true,
    );
    anchorsBySection.set(section.id, anchors);

    // Mostly alternate, occasionally repeat a side — a strict alternation is
    // a pattern the eye reads immediately.
    side = rand() < 0.22 ? side : -side;
  });

  /* ---- the leader: the trunk carries on as one more limb, so the crown
     closes over instead of leaving a bare spike ---- */
  const leaderAnchors: Anchor[] = [];
  grow(
    { limbs, anchors: leaderAnchors, rand, traits },
    trunkPts[trunkPts.length - 1],
    ta + (rand() - 0.5) * 0.3,
    36 + rand() * 10,
    2.6,
    3,
  );

  /* ---- foliage: the only thing study changes ----

     Built as CLUMPS, not as scattered leaves. A canopy is mass: many marks
     packed tightly enough to read as tone and to hide the wood behind them.

     Every clump a section could ever carry is laid out first, from a random
     stream of its OWN, and how well the section is held decides how many of
     them show. Two reasons. Leaves drawn from the tree's shared stream moved
     every time any section's count changed — one answer re-scattered the
     whole canopy. And a leaf that falls has to grow back where it fell from,
     or regrowth is not visibly the reverse of loss. ---- */
  const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

  const leafy = (
    key: string,
    anchors: Anchor[],
    minClumps: number,
    held: number,
    learned: number,
    sectionId: string | undefined,
    sizes: [number, number],
  ) => {
    if (!anchors.length || learned <= 0) return;
    const r = rng(hashSeed(`${seed}/leaves/${key}`));
    const capacity = Math.max(minClumps, Math.round(anchors.length / 3));
    // A section that has been studied is never bare: forgetting thins it to
    // its last clump, and the ground under it says what it had.
    const shown = Math.min(capacity, Math.max(1, Math.round(held * capacity)));
    const had = Math.min(capacity, Math.max(shown, Math.round(learned * capacity)));
    // How far along it is in losing the next clump — 0 when nothing has
    // faded, which is what keeps a small, freshly studied section upright.
    const fading = clamp01(((learned - held) * capacity) / 1.5);

    const order = anchors.map((a) => ({ a, k: r() })).sort((x, y) => x.k - y.k);
    for (let c = 0; c < had; c++) {
      const host = order[c % order.length].a;
      const spreadR = traits.clumpSize * (sizes[0] + r() * sizes[1]);
      const leaves = traits.clumpDensity + Math.floor(r() * traits.clumpDensity * 0.6);
      const onTree = c < shown;
      // The last clumps still on the branch are the next to go; they droop,
      // the outermost most.
      const droop = onTree ? fading * clamp01(1 - (shown - 1 - c) / 1.5) : 0;
      for (let k = 0; k < leaves; k++) {
        // Pack toward the centre so a clump has a dense middle and a ragged
        // edge, the way a mass of leaves actually reads.
        const fill = Math.sqrt(r());
        const radius = spreadR * fill * (0.6 + r() * 0.7);
        const theta = r() * Math.PI * 2;
        // Leaves in a clump fan outward from its centre, with enough scatter
        // that no two sit parallel. Larger toward the outside: the big leaves
        // draw the silhouette, the small ones pack the shaded core.
        const own = theta + Math.PI / 2 + (r() - 0.5) * 2.4;
        const length = traits.leafLength * (0.5 + fill * 0.5 + r() * 0.4);
        const shape = r();
        const fallX = r();
        const fallY = r();
        const fallTurn = r();
        // Every leaf consumes the same draws whether it shows, droops or
        // lies on the ground, so no state moves any other leaf.
        const leafRand = rng(hashSeed(`${key}/${c}/${k}/${shape}`));

        if (!onTree) {
          // Where it grew, unturned: the outline of what was known.
          limbs.push({
            d: leafPath(
              { x: host.at.x + Math.cos(theta) * radius, y: host.at.y + Math.sin(theta) * radius * 0.85 },
              own,
              length,
              rng(hashSeed(`${key}/${c}/${k}/${shape}`)),
            ),
            weight: 0.7,
            kind: 'leaf',
            ghost: true,
            sectionId,
          });
        }

        if (onTree) {
          // Droop turns each leaf part of the way from ITS OWN angle toward
          // hanging straight down. Not a shared rotation: a clump of leaves
          // all swung to one angle reads as a clump drawn upside down.
          const down = Math.PI;
          const delta = Math.atan2(Math.sin(down - own), Math.cos(down - own));
          limbs.push({
            d: leafPath(
              { x: host.at.x + Math.cos(theta) * radius, y: host.at.y + Math.sin(theta) * radius * 0.85 },
              own + delta * 0.7 * droop,
              length,
              leafRand,
            ),
            weight: 0.7,
            kind: 'leaf',
            solid: true,
            sectionId,
          });
        } else if (k % 8 === 0) {
          // Fallen: one leaf in eight, lying flat on the ground under where it
          // grew. Enough to read as leaf litter, not so many that a
          // badly-faded course is a carpet — one in four was.
          const x = Math.min(width - 8, Math.max(8, host.at.x + (fallX - 0.5) * 18));
          const y = baseY + 1 + fallY * (height - baseY - 4);
          limbs.push({
            d: leafPath(
              { x, y },
              (fallTurn < 0.5 ? -1 : 1) * (Math.PI / 2 + (fallTurn - 0.5) * 0.5),
              length * 0.8,
              leafRand,
            ),
            weight: 0.7,
            kind: 'leaf',
            solid: true,
            fallen: true,
            sectionId,
          });
        }
      }
    }
  };

  // The leader belongs to no section. It leafs with the course as a whole,
  // or the top of every crown is a bare spike poking through the leaves.
  const overall = (pick: (x: TreeSection) => number) =>
    sections.length ? sections.reduce((n, x) => n + clamp01(pick(x)), 0) / sections.length : 0;
  leafy(
    '~leader',
    leaderAnchors,
    2,
    overall((x) => x.mastery),
    overall((x) => Math.max(x.mastery, x.learned ?? x.mastery)),
    undefined,
    [0.7, 0.5],
  );

  sections.forEach((section) => {
    const held = clamp01(section.mastery);
    const learned = Math.max(held, clamp01(section.learned ?? held));
    leafy(section.id, anchorsBySection.get(section.id) ?? [], traits.clumps, held, learned, section.id, [0.75, 0.55]);
  });

  return { width, height, limbs };
}
