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
   4. Stroke only, `currentColor`, no fills — the same language as the
      icon set (open paths, one weight, currentColor). An illustration in
      a different language from the icons around it looks pasted on.
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
  /** The section this limb grew from, for hit-testing and highlighting. */
  sectionId?: string;
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
  /** 0..1, how well this section is known. Drives foliage, and only foliage. */
  mastery: number;
}

export type Species = 'default' | 'winter' | 'banyan' | 'fig';

interface SpeciesTraits {
  /** Branch angle from vertical at the base and at the crown, in degrees. */
  spread: [number, number];
  /** How sharply a branch curves back toward vertical as it grows. */
  lift: number;
  /** Sideways drift of the trunk over its length, in viewBox units. */
  sway: number;
  twigs: [number, number];
  /** Leaves a fully-mastered section can carry. */
  foliage: number;
  leafLength: number;
  /** Winter keeps its branches bare however well you know it. */
  bare?: boolean;
}

/**
 * Four species, not four palettes. Winter is deliberately bare — the theme
 * has described itself as "bare branches, icy slate" since the palette was
 * written, and a winter tree in full leaf would contradict its own name.
 */
const SPECIES: Record<Species, SpeciesTraits> = {
  default: { spread: [74, 40], lift: 0.30, sway: 7, twigs: [2, 4], foliage: 7, leafLength: 7.5 },
  winter: { spread: [78, 46], lift: 0.22, sway: 10, twigs: [3, 5], foliage: 3, leafLength: 5, bare: true },
  banyan: { spread: [84, 58], lift: 0.16, sway: 4, twigs: [2, 4], foliage: 9, leafLength: 8.5 },
  fig: { spread: [66, 34], lift: 0.38, sway: 9, twigs: [2, 3], foliage: 6, leafLength: 10 },
};

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
function taperedLimb(points: Pt[], from: number, to: number, kind: LimbKind, sectionId?: string): Limb[] {
  const pieces = Math.min(4, Math.max(2, Math.floor(points.length / 2)));
  const out: Limb[] = [];
  const per = (points.length - 1) / pieces;
  for (let i = 0; i < pieces; i++) {
    const start = Math.floor(i * per);
    const end = Math.min(points.length - 1, Math.ceil((i + 1) * per));
    const slice = points.slice(start, end + 1);
    if (slice.length < 2) continue;
    const t = pieces === 1 ? 0 : i / (pieces - 1);
    out.push({ d: smooth(slice), weight: round(from + (to - from) * t), kind, sectionId });
  }
  return out;
}

/**
 * A leaf: two curves meeting at the tip, asymmetric about its own midrib.
 *
 * The asymmetry is the point. Two mirrored arcs give the pointed oval every
 * generated plant drawing uses; pulling one side fuller than the other is the
 * difference between a leaf and a lens.
 */
function leaf(at: Pt, angle: number, length: number, rand: () => number): string {
  const dx = Math.sin(angle);
  const dy = -Math.cos(angle);
  const tip = { x: at.x + dx * length, y: at.y + dy * length };
  const px = -dy;
  const py = dx;
  const belly = length * (0.34 + rand() * 0.1);
  const lean = 0.42 + rand() * 0.16;
  const near = { x: at.x + dx * length * lean, y: at.y + dy * length * lean };
  const c1 = { x: near.x + px * belly, y: near.y + py * belly };
  const c2 = { x: near.x - px * belly * (0.62 + rand() * 0.16), y: near.y - py * belly * (0.62 + rand() * 0.16) };
  return (
    `M${round(at.x)} ${round(at.y)}` +
    `Q${round(c1.x)} ${round(c1.y)},${round(tip.x)} ${round(tip.y)}` +
    `Q${round(c2.x)} ${round(c2.y)},${round(at.x)} ${round(at.y)}`
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
  ctx.limbs.push(...taperedLimb(pts, width, Math.max(0.55, width * 0.55), kind, ctx.sectionId));

  const tip = pts[pts.length - 1];
  if (depth <= 0 || length < 7) {
    ctx.anchors.push({ at: tip, angle: a });
    return;
  }

  // A leader that carries on, and one or two departures. Their angles and
  // lengths are drawn from the seed, never mirrored.
  const children = depth >= 3 ? 2 + (rand() < 0.45 ? 1 : 0) : 1 + (rand() < 0.62 ? 1 : 0);
  const spread = (traits.spread[1] * 0.55 + rand() * traits.spread[1] * 0.5) * RAD;
  let side = rand() < 0.5 ? -1 : 1;

  for (let c = 0; c < children; c++) {
    const lead = c === 0;
    const off = lead ? (rand() - 0.5) * spread * 0.5 : side * spread * (0.7 + rand() * 0.6);
    const ratio = lead ? 0.78 + rand() * 0.1 : 0.54 + rand() * 0.18;
    // Departures leave from partway down the limb, not all from the tip —
    // every child sharing one origin is the other machinery tell.
    const fromIdx = lead ? pts.length - 1 : Math.max(1, Math.round((0.55 + rand() * 0.4) * (pts.length - 1)));
    grow(ctx, pts[fromIdx], a + off, length * ratio, Math.max(0.6, width * 0.62), depth - 1);
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
export function growTree(seed: string, sections: TreeSection[], species: Species = 'default'): Tree {
  const traits = SPECIES[species];
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
  // recursive pass started branching almost at the ground.
  const trunkLen = 84 + rand() * 14;
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
  limbs.push(...taperedLimb(trunkPts, 5.2, 3.1, 'trunk'));

  /* ---- root flare: two unequal buttresses so the trunk meets the ground ---- */
  for (const dir of [-1, 1]) {
    const reach = (9 + rand() * 7) * dir;
    limbs.push(
      ...taperedLimb(
        [
          { x: baseX + dir * 1.2, y: baseY - 9 },
          { x: baseX + reach * 0.55, y: baseY - 3 + rand() * 1.5 },
          { x: baseX + reach, y: baseY + 2.5 },
        ],
        2.8,
        0.9,
        'trunk',
      ),
    );
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

  /* ---- foliage: the only thing study changes ---- */
  sections.forEach((section) => {
    const anchors = anchorsBySection.get(section.id) ?? [];
    if (!anchors.length) return;
    const mastery = Math.max(0, Math.min(1, section.mastery));
    if (mastery <= 0) return;

    if (traits.bare) {
      // Winter shows study as buds, never leaves — the theme has called
      // itself "bare branches" since the palette was written.
      const buds = Math.round(mastery * Math.min(6, anchors.length));
      for (let k = 0; k < buds; k++) {
        const host = anchors[Math.floor(rand() * anchors.length)];
        limbs.push({
          d: leaf(host.at, host.angle + (rand() - 0.5) * 1.1, traits.leafLength * 0.55, rand),
          weight: 0.8,
          kind: 'leaf',
          sectionId: section.id,
        });
      }
      return;
    }

    const capacity = Math.min(anchors.length, Math.round(traits.foliage * 2.2));
    const count = Math.round(mastery * capacity);
    // Shuffle the anchors deterministically so partial mastery doesn't always
    // leaf the same end of a branch first.
    const order = anchors.map((a, n) => ({ a, k: rand(), n })).sort((x, y) => x.k - y.k);
    for (let k = 0; k < count; k++) {
      const host = order[k % order.length].a;
      limbs.push({
        d: leaf(
          { x: host.at.x + (rand() - 0.5) * 2.5, y: host.at.y + (rand() - 0.5) * 2.5 },
          host.angle + (rand() - 0.5) * 1.6,
          traits.leafLength * (0.7 + rand() * 0.55),
          rand,
        ),
        weight: 0.85,
        kind: 'leaf',
        sectionId: section.id,
      });
    }
  });

  return { width, height, limbs };
}
