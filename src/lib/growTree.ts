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

  /* ---- the leader's share of the canopy ----
     It belongs to no section, so the per-section loop below never reached it
     and the top of every crown was left as a bare spike poking through the
     leaves. It leafs with the course's overall progress. ---- */
  const overall = sections.length
    ? sections.reduce((n, x) => n + Math.max(0, Math.min(1, x.mastery)), 0) / sections.length
    : 0;
  if (overall > 0 && leaderAnchors.length) {
    const order = leaderAnchors.map((a, n) => ({ a, k: rand(), n })).sort((x, y) => x.k - y.k);
    const clumps = Math.max(1, Math.round(overall * Math.max(2, leaderAnchors.length / 3)));
    for (let c = 0; c < clumps; c++) {
      const host = order[c % order.length].a;
      const spreadR = traits.clumpSize * (0.7 + rand() * 0.5);
      const leaves = traits.clumpDensity + Math.floor(rand() * traits.clumpDensity * 0.6);
      for (let k = 0; k < leaves; k++) {
        const fill = Math.sqrt(rand());
        const r = spreadR * fill * (0.6 + rand() * 0.7);
        const theta = rand() * Math.PI * 2;
        limbs.push({
          d: leafPath(
            { x: host.at.x + Math.cos(theta) * r, y: host.at.y + Math.sin(theta) * r * 0.85 },
            theta + Math.PI / 2 + (rand() - 0.5) * 2.4,
            traits.leafLength * (0.5 + fill * 0.5 + rand() * 0.4),
            rand,
          ),
          weight: 0.7,
          kind: 'leaf',
          solid: true,
        });
      }
    }
  }

  /* ---- foliage: the only thing study changes ----

     Built as CLUMPS, not as scattered leaves. A canopy is mass: many marks
     packed tightly enough to read as tone and to hide the wood behind them.
     The previous version hung a few dozen outlines on the whole tree, which
     is why every species still read as a winter skeleton however well the
     course was known. ---- */
  sections.forEach((section) => {
    const anchors = anchorsBySection.get(section.id) ?? [];
    if (!anchors.length) return;
    const mastery = Math.max(0, Math.min(1, section.mastery));
    if (mastery <= 0) return;

    // Clumps sit ON the anchors — the twig tips — so the canopy covers the
    // wood that made it rather than floating near it, and it scales with how
    // much wood there is. Taking anchors in a shuffled order without repeats
    // spreads the crown instead of piling several clumps on one twig.
    const order = anchors.map((a, n) => ({ a, k: rand(), n })).sort((x, y) => x.k - y.k);
    const clumps = Math.max(1, Math.round(mastery * Math.max(traits.clumps, anchors.length / 3)));
    for (let c = 0; c < clumps; c++) {
      const host = order[c % order.length].a;
      const spreadR = traits.clumpSize * (0.75 + rand() * 0.55);
      const leaves = traits.clumpDensity + Math.floor(rand() * traits.clumpDensity * 0.6);
      for (let k = 0; k < leaves; k++) {
        // Pack toward the centre so a clump has a dense middle and a ragged
        // edge, the way a mass of leaves actually reads.
        const fill = Math.sqrt(rand());
        const r = spreadR * fill * (0.6 + rand() * 0.7);
        const theta = rand() * Math.PI * 2;
        const at = {
          x: host.at.x + Math.cos(theta) * r,
          y: host.at.y + Math.sin(theta) * r * 0.85,
        };
        limbs.push({
          d: leafPath(
            at,
            // Leaves in a clump fan outward from its centre, with enough
            // scatter that no two sit parallel.
            theta + Math.PI / 2 + (rand() - 0.5) * 2.4,
            // Larger toward the outside of a clump: the big leaves draw the
            // silhouette, the small ones pack the shaded core.
            traits.leafLength * (0.5 + fill * 0.5 + rand() * 0.4),
            rand,
          ),
          weight: 0.7,
          kind: 'leaf',
          solid: true,
          sectionId: section.id,
        });
      }
    }
  });

  return { width, height, limbs };
}
