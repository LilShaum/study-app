import { Fragment, memo, useCallback, useEffect, useId, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Course } from '@/schema/course';
import type { ItemResult } from '@/store/progress';
import { sortedSections } from '@/lib/sortedSections';
import { sectionStats } from '@/lib/sectionStats';
import { growTree, type Limb, type Tree } from '@/lib/growTree';
import { sectionMemory } from '@/lib/sectionMemory';
import { placeTreeKeys, plateTop } from '@/lib/treeKeys';
import { useFallenStore } from '@/store/fallen';
import { examRule } from '@/lib/exam';
import { prefersReducedMotion } from '@/lib/motion';
import { usePaperFill } from '@/lib/usePaperFill';

interface CourseTreeProps {
  courseId: string;
  course: Course;
  progress: Record<string, ItemResult>;
  /**
   * Sizing classes. The svg carries a viewBox and no width/height, so it
   * takes whatever box CSS gives it — which is how the same tree can be
   * small on a phone and large on a desktop. Below about 96px tall the
   * twigs merge into a smudge, so do not go under `h-24`.
   */
  className?: string;
  /**
   * Limbs become live: any touch raises a number on every branch, the branch
   * under the finger picked out, and a tap on a number opens its section
   * (docs/proposals/tree.md §2). Off by default: a thumbnail on a library
   * card is a picture of a course, not a way into its eleventh section.
   *
   * There was a second way, a large tree in a sheet of its own, from when
   * the tree on the page could not be used; it did nothing the page cannot,
   * and a stray tap opened it (the owner, 2026-11-25, Testing 11). Gone.
   */
  interactive?: boolean;
  /** Which branch is picked, or null, for the words under the drawing. */
  onPoint?: (sectionId: string | null) => void;
  /** Draw this section's limbs at full strength and dim everything else. */
  highlight?: string | null;
  /**
   * Start the sheet at the crown (lib/treeKeys plateTop): most trees leave a
   * blank stretch above it that a large drawing should not spend.
   */
  crop?: boolean;
  /**
   * Draw the tree on, once, as it appears.
   *
   * Growth-shaped because that is the one thing this drawing is about: the
   * wood inks itself in and the leaves come after it. Reserved for the end
   * of a session, where something has actually been earned; a tree that
   * redraws itself every time a page loads is a loading spinner with extra
   * steps.
   */
  animate?: boolean;
  /**
   * The course's progress when a session began. Given, the tree shows what
   * the session changed: leaves won back and newly learned grow in place.
   * For the end of a session.
   */
  grewFrom?: Record<string, ItemResult>;
  /**
   * The lecture page's arrival (docs/proposals/design-update.md, the phone).
   * The leaves lost since the student last looked fall now, on opening the
   * lecture, with a small shake of the tree; the first opening of a lecture
   * in a visit also draws the tree on first. Pointing at a branch no longer
   * drops anything: it names the branch (the owner, 2026-11-22: "thats when
   * the leaves fall rather than when you run your fingers over them").
   */
  arrive?: boolean;
  /**
   * A sitting's tree: the progress the sitting began with. A section's
   * leaves never go below what they were then (a miss drops no leaf: the
   * owner, 2026-11-24, "the leaves are meant to fall when the person hasn't
   * practiced it in a while"), and a leaf the tree's measure newly counts
   * as learned buds where it grows, while you watch.
   */
  growOnly?: Record<string, ItemResult>;
  /**
   * Opening a section from the drawing (a tapped number, a picked branch).
   * Given, it is called instead of going to the section's page: the
   * computer's lecture page opens it beside the ways to study.
   */
  onOpenSection?: (sectionId: string) => void;
  /**
   * At rest: no branch picked, the numbers put away, nothing faded. The
   * first run sets it while a question is open and while the leaves its
   * right answer grew come in (the branches growing are the point there).
   */
  quiet?: boolean;
}

/**
 * Lectures already drawn on in this visit to the app. The drawing-on is the
 * lecture arriving; coming back to it from a sitting a minute later is not
 * an arrival, and a tree that redraws itself every time is a spinner.
 */
const arrivedThisVisit = new Set<string>();

/**
 * How the tree draws itself on. 'stitch': every stroke inks in at once, and
 * since a branch is many short strokes, mid-way it reads as a dashed line
 * closing up. 'outward': each stroke starts when growth from the foot of the
 * trunk reaches it, so the tree grows from the ground up and out. Both are
 * shown to the owner (2026-11-25: "that looks kinda interesting, the dashes").
 */
const GROWTH = 'outward' as 'stitch' | 'outward';
/** Outward growth: how long the wood takes to reach the furthest tip, and each stroke to ink in. */
const OUTWARD_SPAN_MS = 900;
const OUTWARD_STROKE_MS = 420;

/** How the arrival brings the leaves down: with a shake of the tree, or a plain fall. */
const ARRIVAL_FALL = 'shake' as 'shake' | 'plain';
/** When the arrival's fall begins: after the drawing-on, or almost at once. */
const FALL_AFTER_UNFURL_MS = GROWTH === 'outward' ? 1700 : 1250;
const FALL_AFTER_OPEN_MS = 350;
/** How long the shiver lasts (styles/index.css, branch-shiver). */
const SHAKE_MS = 1800;
/** How long the drawing-on lasts, wood then leaves (styles/index.css, tree-grow). */
const UNFURL_MS = GROWTH === 'outward' ? 2100 : 1400;

/** A small stable hash, to give each moving leaf its own path and timing. */
function leafHash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** The clump a leaf belongs to, from its key: section/clump/leaf. */
const clumpOf = (key: string) => Number(key.split('/').at(-2)) || 0;

/** The most leaves that move at once. Past this the motion reads as noise, and costs frames on a phone. */
const MAX_MOVING = 60;

/**
 * How close the pointer must come to a branch, in SCREEN PIXELS, to be on it.
 * In pixels rather than viewBox units because the same drawing renders at a
 * thumbnail and at 68vh; converted through the CTM at the moment of the test.
 */
const REACH_PX = 11;

/** A fingertip is blunter than a cursor and cannot see what it covers. */
const REACH_PX_COARSE = 20;

/** How far a neighbouring limb swings aside, in degrees, at its closest. */
const PIVOT = 5;

/** Falloff of that swing with distance across the crown, in viewBox units. */
const PIVOT_REACH = 60;

/**
 * How much nearer a different branch must be before the selection moves to
 * it. Without this, crossing the crown flickers between sections.
 */
const STICK = 1.2;

/* The reveal's timing. A press raises the numbers once the finger has
   rested this long without setting off a scroll; a sideways move further
   than the slop raises them at once; once the finger lifts they stay long
   enough to tap one; a mouse that leaves puts them away a little after. */
const HOLD_MS = 180;
const SLOP_PX = 8;
const LINGER_MS = 5000;
const LEAVE_MS = 700;
/** How close a tap must land to a number, in screen pixels, to mean it. */
const KEY_REACH_PX = 26;
/** Paper either side of the drawing for the ring of numbers, in viewBox units. */
const KEY_PAD = 24;

/** A hairline from `a` toward `b`, stopping `gap` short of it. */
function shortOf(a: { x: number; y: number }, b: { x: number; y: number }, gap: number): string {
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const k = Math.max(0, len - gap) / len;
  return `M${a.x} ${a.y}L${(a.x + (b.x - a.x) * k).toFixed(1)} ${(a.y + (b.y - a.y) * k).toFixed(1)}`;
}

/** The first point of a path — where a limb leaves the wood it grew from. */
function startOf(d: string): [number, number] | null {
  const m = /^M\s*(-?[\d.]+)[\s,]+(-?[\d.]+)/.exec(d);
  return m ? [Number(m[1]), Number(m[2])] : null;
}

interface Sample {
  x: number;
  y: number;
  sectionId: string;
}

/** No limbs, one array, so the memo below sees the same props twice. */
const NONE: Limb[] = [];

/**
 * A limb's own attributes. Nothing here depends on which branch is picked
 * except its weight, and only for the picked branch's own paths: dimming is
 * the section group's ink (styles/index.css, `[data-dim]`), so picking a
 * branch re-renders two sections, not the drawing.
 */
function paintLimb(limb: Limb, held: boolean, animate: boolean, pointable: boolean) {
  return {
    d: limb.d,
    // The picked limb is drawn heavier as well as left in full ink. Dimming
    // alone had to be so deep to register that the whole crown went to a
    // ghost, and a tree you cannot see is not locating anything.
    strokeWidth: held ? limb.weight * 1.5 : limb.weight,
    // Every leaf, on the branch or on the ground, is the same: outline, vein,
    // and filled with the paper itself, colour and grain (the owner,
    // 2026-11-26; styles/index.css .lf, lib/usePaperFill).
    className: limb.solid ? 'lf' : limb.ink ? 'ink' : 'wd',
    // The trunk is a filled outline in the line colour (see growTree).
    fill: limb.ink ? 'currentColor' : undefined,
    stroke: limb.ink ? 'none' : undefined,
    // Normalised length, so one dash rule can draw on a path of any size.
    pathLength: animate && !limb.solid && !limb.ink ? 1 : undefined,
    // Only a section's MAIN LINE, at branch weight, is a target: every
    // stroke of a section sampled made a wide ragged region that overlapped
    // its neighbours', and the hair-thin tip wanders in among other limbs.
    'data-section': pointable && limb.spine && limb.kind === 'branch' ? limb.sectionId : undefined,
  };
}

/** A leaf budding at the end of a session: its class and where and when it unfurls. */
type Motion = { className: string; style: Record<string, string> };

/**
 * One limb's paths: the limb, and after a leaf its vein (lib/growTree,
 * `Limb.vein`). Straight after its own leaf, so that leaf's paper fill
 * cannot hide it while the next leaf over can, as it hides the rest of the
 * leaf. At half the leaf's weight, never a target, and budding with its
 * leaf: the same stalk to unfurl from, at the same moment.
 */
function limbWithVein(
  limb: Limb,
  key: number | string,
  held: boolean,
  animate: boolean,
  pointable: boolean,
  motion?: Motion,
  growDelay?: Record<string, string>,
) {
  const paint = paintLimb(limb, held, animate, pointable);
  // Growing outward: no bud of its own, so the drawing-on's timing for where it is.
  if (!motion && growDelay) motion = { className: '', style: growDelay };
  const className = motion?.className ? `${paint.className} ${motion.className}` : paint.className;
  if (!limb.vein) return <path key={key} {...paint} className={className} style={motion?.style} />;
  return (
    <Fragment key={key}>
      <path {...paint} className={className} style={motion?.style} />
      <path d={limb.vein} strokeWidth={paint.strokeWidth / 2} className={motion?.className ? `vn ${motion.className}` : 'vn'} style={motion?.style} />
    </Fragment>
  );
}

/**
 * One section's paths in one layer, drawn once and kept.
 *
 * Every finger move that changed the picked branch used to re-render all
 * ~1200 paths of the drawing, because the dimming and the weight were
 * written onto each; slowed to a phone's pace that was frames of 100 to
 * 230 ms mid-swipe (docs/proposals/tree.md, finding 2). Kept apart, a change
 * of branch re-renders the branch left and the branch picked.
 */
export const LimbPaths = memo(function LimbPaths({
  limbs,
  held,
  animate,
  pointable,
  grow,
  growDelays,
}: {
  limbs: Limb[];
  held: boolean;
  animate: boolean;
  pointable: boolean;
  grow?: Map<string, Motion>;
  /** Growing outward: each path's own start in the drawing-on (CourseTree GROWTH). */
  growDelays?: Map<Limb, Record<string, string>>;
}) {
  return (
    <>
      {limbs.map((limb, i) =>
        limbWithVein(limb, i, held, animate, pointable, limb.leafKey ? grow?.get(limb.leafKey) : undefined, growDelays?.get(limb)),
      )}
    </>
  );
});

/**
 * The course, drawn.
 *
 * Structure comes from the course and never moves; foliage comes from what
 * has been studied. A section never opened is a bare branch, which is the
 * one thing a percentage cannot show you at a glance.
 *
 * The drawing carries no caption of its own. Where words sit beside it, on the
 * lecture page, LectureTree sets them from the same reading of the sections.
 */
export function CourseTree({
  courseId,
  course,
  progress,
  className = 'h-40',
  interactive = false,
  highlight = null,
  crop = false,
  animate = false,
  grewFrom,
  arrive = false,
  growOnly,
  onOpenSection,
  quiet = false,
  onPoint,
}: CourseTreeProps) {
  const [pointed, setPointed] = useState<string | null>(null);
  // Reveal: whether the numbers are up.
  const [revealed, setRevealed] = useState(false);
  // Fading is judged as of when the tree was drawn: rendering must not read
  // the clock, and a canopy that shed leaves while you looked at it would be
  // a strange thing to watch.
  const [now] = useState(Date.now);

  const reveal = interactive;
  /* The pointer picks branches while the numbers are up: a tree that
     followed every pass of the pointer flickered between sections for
     nothing. */
  const tracking = interactive && revealed && !quiet;
  const active = (tracking ? pointed : null) ?? highlight;

  const { tree, sections } = useMemo(() => {
    const sections = sortedSections(course).map((section) => {
      const stats = sectionStats(section, progress);
      const live = sectionMemory(section, progress, now, examRule(course, progress, now));
      // A sitting's tree never loses what the sitting began with.
      const floor = growOnly ? sectionMemory(section, growOnly, now, examRule(course, growOnly, now)) : null;
      const memory = floor
        ? { ...live, held: Math.max(live.held, floor.held), learned: Math.max(live.learned, floor.learned) }
        : live;
      const heldPct = memory.learned ? Math.round((memory.held / memory.learned) * 100) : 100;
      return {
        id: section.id,
        title: section.title,
        items: section.items.length,
        accuracy: stats.accuracy,
        weight: section.items.length,
        learned: memory.learned,
        mastery: memory.held,
        studied: memory.studied,
        due: memory.due,
        heldPct,
        // As lib/treeWords reads it, so a number and the words agree.
        state: memory.studied === 0 ? ('bare' as const) : heldPct < 100 ? ('fading' as const) : ('held' as const),
      };
    });
    return { tree: growTree(courseId, sections), sections };
  }, [courseId, course, progress, now, growOnly]);

  // The wood never moves with what is learned, so the crop and the numbers'
  // places come from the tree already grown: the lecture page grew a second
  // tree just to crop the first.
  const top = useMemo(() => (crop ? plateTop(tree) : 0), [crop, tree]);
  const pad = reveal ? KEY_PAD : 0;
  const keys = useMemo(() => (reveal ? placeTreeKeys(tree, sections.map((s) => s.id)) : []), [reveal, tree, sections]);
  const sectionById = useMemo(() => new Map(sections.map((s) => [s.id, s])), [sections]);

  /*
   * What a session changed, leaf by leaf: the same tree grown from the
   * progress it started with, compared by each leaf's stable key. Leaves on
   * the branch now that were not then bud from their own stems; the
   * section's fallen leaves that are no longer fallen fade from the pile.
   */
  const motion = useMemo(() => {
    const grow = new Map<string, Motion>();
    const clearing: { d: string; vein?: string; style: Record<string, string> }[] = [];
    const changed = new Set<string>();
    if (!grewFrom) return { grow, clearing, changed };
    const before = growTree(
      courseId,
      sortedSections(course).map((section) => {
        const m = sectionMemory(section, grewFrom, now, examRule(course, grewFrom, now));
        return { id: section.id, weight: section.items.length, learned: m.learned, mastery: m.held };
      }),
    );
    const was = new Set<string>();
    const nowFallen = new Set<string>();
    for (const l of before.limbs) if (l.leafKey && l.solid && !l.fallen) was.add(l.leafKey);
    for (const l of tree.limbs) if (l.leafKey && l.fallen) nowFallen.add(l.leafKey);

    const budding = tree.limbs.filter((l) => l.leafKey && l.solid && !l.fallen && !was.has(l.leafKey));
    const step = Math.max(1, Math.ceil(budding.length / MAX_MOVING));
    for (const l of budding) if (l.sectionId) changed.add(l.sectionId);
    budding.forEach((l, i) => {
      if (i % step) return;
      const h = leafHash(l.leafKey!);
      const at = startOf(l.d);
      grow.set(l.leafKey!, {
        className: 'leaf-bud',
        style: {
          // Unfurl from the stem, not from the leaf's middle.
          transformOrigin: at ? `${at[0]}px ${at[1]}px` : 'center',
          // Clump by clump, each leaf a little after its neighbours.
          animationDelay: `${400 + clumpOf(l.leafKey!) * 140 + (h % 260)}ms`,
        },
      });
    });

    const cleared = before.limbs.filter((l) => l.leafKey && l.fallen && !nowFallen.has(l.leafKey));
    const cstep = Math.max(1, Math.ceil(cleared.length / MAX_MOVING));
    for (const l of cleared) if (l.sectionId) changed.add(l.sectionId);
    cleared.forEach((l, i) => {
      if (i % cstep) return;
      clearing.push({ d: l.d, vein: l.vein, style: { animationDelay: `${200 + (leafHash(l.leafKey!) % 600)}ms` } });
    });
    return { grow, clearing, changed };
  }, [grewFrom, courseId, course, now, tree]);

  /*
   * While a session's regrowth plays, the sections it did not touch step
   * back, so the branch filling in is the thing you see. Once it has grown,
   * the rest of the tree comes back up.
   */
  const [spotlight, setSpotlight] = useState(true);
  useEffect(() => {
    if (!grewFrom) return;
    const t = setTimeout(() => setSpotlight(false), 2800);
    return () => clearTimeout(t);
  }, [grewFrom]);
  /** Stepping back while a session's regrowth plays: the group's opacity, eased (styles/index.css). */
  const stepsBack = (sid: string) => !!grewFrom && spotlight && motion.changed.size > 0 && !motion.changed.has(sid);
  /** Set in the lighter ink because another branch is picked. */
  const dim = (sid: string) => !!active && sid !== active;
  /**
   * The picked branch, drawn again in front of the whole drawing. Every leaf
   * is painted after every branch, so a canopy hides the wood behind it; in
   * the paler ink that left the other sections' leaves lying over the very
   * branch you were pointing at. Not while the tree grows or a session's
   * regrowth plays: a finished copy would stand over leaves still coming in.
   */

  /*
   * The limbs, grouped twice: by layer, then by section. By layer because
   * paint order is load-bearing — every leaf is drawn after every branch so a
   * canopy hides the wood behind it. By section inside that, because a
   * section is the thing that moves and dims, and a group is what can carry
   * a transform and an ink.
   */
  const layers = useMemo(() => {
    const wood = new Map<string, Limb[]>();
    const foliage = new Map<string, Limb[]>();
    const ghosts = new Map<string, Limb[]>();
    // On the ground, so it never swings with its branch; it still dims and
    // lights with its section, which is how you tell whose litter is whose.
    const litter = new Map<string, Limb[]>();
    const structural: Limb[] = [];
    const structuralFoliage: Limb[] = [];
    const add = (into: Map<string, Limb[]>, id: string, limb: Limb) => {
      const list = into.get(id);
      if (list) list.push(limb);
      else into.set(id, [limb]);
    };
    for (const limb of tree.limbs) {
      if (limb.fallen) {
        add(litter, limb.sectionId ?? '', limb);
        continue;
      }
      if (limb.ghost) {
        // The leader's lost leaves belong to no section and are never
        // pointed at, so they are never drawn.
        if (limb.sectionId) add(ghosts, limb.sectionId, limb);
        continue;
      }
      if (!limb.sectionId) {
        (limb.solid ? structuralFoliage : structural).push(limb);
        continue;
      }
      add(limb.solid ? foliage : wood, limb.sectionId, limb);
    }

    const geometry = new Map<string, { anchor: [number, number]; cx: number }>();
    for (const [id, limbs] of wood) {
      const starts = limbs.map((l) => startOf(l.d)).filter((p): p is [number, number] => !!p);
      if (!starts.length) continue;
      // The limb nearest the ground is the one the rest of the section hangs
      // off, so it is what the section turns about.
      const anchor = starts.reduce((low, p) => (p[1] > low[1] ? p : low));
      const cx = starts.reduce((n, p) => n + p[0], 0) / starts.length;
      geometry.set(id, { anchor, cx });
    }
    // Every section with wood or leaves: each has a group in front of the
    // drawing, for when it is picked.
    const ids = [...new Set([...wood.keys(), ...foliage.keys()])];
    // The foot of the trunk: what the whole tree turns about when it shakes.
    const foot = [...structural, ...[...wood.values()].flat()]
      .map((l) => startOf(l.d))
      .reduce<[number, number] | null>((low, p) => (p && (!low || p[1] > low[1]) ? p : low), null);
    return { wood, foliage, ghosts, litter, structural, structuralFoliage, geometry, ids, foot };
  }, [tree]);

  /** How far each section swings while another is being pointed at. */
  const pivots = useMemo(() => {
    const out = new Map<string, string>();
    if (!interactive || !active) return out;
    const focus = layers.geometry.get(active);
    if (!focus) return out;
    for (const [id, geo] of layers.geometry) {
      if (id === active) continue;
      const dx = geo.cx - focus.cx;
      // Away from the section pointed at, hardest for its nearest neighbours.
      // A tie goes left, so two limbs at the same centroid never both sit still.
      const away = dx === 0 ? -1 : Math.sign(dx);
      const angle = away * PIVOT * Math.exp(-Math.abs(dx) / PIVOT_REACH);
      out.set(id, `rotate(${angle.toFixed(2)}deg)`);
    }
    return out;
  }, [interactive, active, layers]);

  const svgRef = useRef<SVGSVGElement>(null);
  const paper = usePaperFill(svgRef);
  const paperId = `paper${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  /*
   * The paper as a fill: the page's colour with its grain over it, at the
   * page's own scale, one tile of the coarser grain with the finer repeated
   * across it. A leaf filled with it hides the lines behind it and still
   * looks cut from the page.
   */
  const paperDefs = useMemo(() => {
    if (!paper) return null;
    const tile = paper.tile.px * paper.unitsPerPx;
    return (
      <defs>
        <pattern id={paperId} patternUnits="userSpaceOnUse" width={tile} height={tile}>
          <image href={paper.tile.href} width={tile} height={tile} preserveAspectRatio="none" />
        </pattern>
      </defs>
    );
  }, [paper, paperId]);
  const cloud = useRef<Sample[]>([]);
  /**
   * What the last press came from. A tap fires `click` with no pointermove
   * before it, and React's synthetic click carries no pointerType.
   */
  const lastPointer = useRef('mouse');
  const navigate = useNavigate();

  /*
   * Pointing at a limb is decided by DISTANCE, not by stacking: the main
   * lines are sampled into a point cloud and the pointer picks the nearest
   * sample (65% right at the expanded size, against 54% for stacked hit
   * areas, measured over 1737 probes). Sampled when the page is idle, or at
   * the first touch if that comes sooner, not before the first paint: the
   * cloud is only wanted once a finger arrives, and building it in a layout
   * effect held up the large tree's first frame.
   */
  const sampled = useRef<Tree | null>(null);
  const sample = useCallback(() => {
    const svg = svgRef.current;
    if (!svg || sampled.current === tree) return;
    sampled.current = tree;
    const samples: Sample[] = [];
    for (const el of svg.querySelectorAll<SVGPathElement>('path[data-section]')) {
      // jsdom has no SVG geometry, so the cloud stays empty under test.
      if (typeof el.getTotalLength !== 'function') return;
      const sectionId = el.dataset.section!;
      const length = el.getTotalLength();
      const steps = Math.max(2, Math.ceil(length / 2));
      for (let i = 0; i <= steps; i++) {
        const { x, y } = el.getPointAtLength((length * i) / steps);
        samples.push({ x, y, sectionId });
      }
    }
    // A branch in leaf is its leaves too: a pointer over a clump is on that
    // branch, though it may be far from the wood under it (the owner,
    // 2026-11-27: a sweep across a leafy branch skipped it). Each standing
    // leaf counts at its centre, so the clump's whole span picks it.
    for (const g of svg.querySelectorAll<SVGGElement>('g[data-sid]')) {
      const sectionId = g.dataset.sid!;
      for (const leaf of g.querySelectorAll<SVGPathElement>('path.lf')) {
        if (typeof leaf.getBBox !== 'function') return;
        const b = leaf.getBBox();
        samples.push({ x: b.x + b.width / 2, y: b.y + b.height / 2, sectionId });
      }
    }
    cloud.current = samples;
  }, [tree]);
  useEffect(() => {
    if (!interactive) return;
    const idle = window.requestIdleCallback ?? ((fn: () => void) => window.setTimeout(fn, 300));
    const cancel = window.cancelIdleCallback ?? window.clearTimeout;
    const handle = idle(() => sample());
    return () => cancel(handle);
  }, [interactive, sample]);

  const nearest = useCallback(
    (event: { clientX: number; clientY: number; pointerType?: string }, holding: string | null): string | null => {
      const svg = svgRef.current;
      // jsdom draws nothing, so it has no screen to map a point from.
      if (!svg || typeof svg.getScreenCTM !== 'function') return null;
      sample();
      const ctm = svg.getScreenCTM();
      if (!ctm) return null;
      const point = svg.createSVGPoint();
      point.x = event.clientX;
      point.y = event.clientY;
      const { x, y } = point.matrixTransform(ctm.inverse());
      // One screen pixel is this many viewBox units at the size we are drawn.
      const perPx = Math.hypot(ctm.a, ctm.b) || 1;
      // Ask the event what is pointing, not the device: a touchscreen laptop
      // reports a fine pointer.
      const wantPx = event.pointerType === 'touch' ? REACH_PX_COARSE : REACH_PX;
      const reach = wantPx / perPx;
      let best: string | null = null;
      let bestDist = reach * reach;
      let heldDist = Infinity;
      for (const s of cloud.current) {
        const d = (s.x - x) * (s.x - x) + (s.y - y) * (s.y - y);
        if (s.sectionId === holding && d < heldDist) heldDist = d;
        if (d < bestDist) {
          bestDist = d;
          best = s.sectionId;
        }
      }
      // Keep what is already selected unless the new one is clearly nearer.
      if (holding && best !== holding && heldDist < bestDist * STICK * STICK && heldDist < reach * reach) {
        return holding;
      }
      return best;
    },
    [sample],
  );

  const inLeaf = useMemo(() => new Set(tree.limbs.filter((l) => l.solid && !l.fallen).map((l) => l.sectionId)).size, [tree]);

  const label = `${course.metadata.title}: ${inLeaf} of ${course.sections.length} sections in leaf`;

  /*
   * The fall playing now, on arriving at the lecture. A leaf falls once: only
   * leaves lost since you last saw that branch, kept per course
   * (store/fallen).
   */
  const FALL_LASTS_MS = 4500;
  type Falling = { d: string; vein?: string; wither?: boolean; style: Record<string, string> };
  const fellFrom = useFallenStore((s) => s.byCourse[courseId]);
  const fell = useFallenStore((s) => s.fell);
  const syncFallen = useFallenStore((s) => s.sync);

  // Where each section's lost leaves begin now: the first clump not on the
  // branch, or null when it has lost nothing.
  const shownBySection = useMemo(() => {
    const out: Record<string, number | null> = {};
    for (const sid of layers.foliage.keys()) out[sid] = null;
    for (const [sid, ghosts] of layers.ghosts) {
      out[sid] = Math.min(...ghosts.map((l) => clumpOf(l.leafKey ?? '')));
    }
    return out;
  }, [layers]);
  useEffect(() => {
    syncFallen(courseId, shownBySection);
  }, [courseId, shownBySection, syncFallen]);

  /** A branch's lost leaves, each with where it lands and how it gets there. */
  const fallingFor = useCallback(
    (ghosts: Limb[], after = 0): Falling[] => {
      const step = Math.max(1, Math.ceil(ghosts.length / MAX_MOVING));
      return ghosts
        .map((l, i) => {
          const h = leafHash(l.leafKey ?? l.d);
          const letGo = `${after + 60 + Math.round(1300 * ((h % 1000) / 1000) ** 2)}ms`;
          // Past the few that are shown moving, a leaf withers where it is,
          // at its own moment, rather than leaving the branch before the rest.
          if (i % step) return { d: l.d, vein: l.vein, wither: true, style: { animationDelay: letGo } };
          const at = startOf(l.d);
          // Into the thin band along the ground where the fallen leaves lie
          // (lib/growTree), not below it.
          const ground = tree.height - 13 + (h % 3);
          return {
            d: l.d,
            vein: l.vein,
            style: {
              // Each leaf its own drift, swing, turn and speed.
              '--dx': `${((h >> 3) % 41) - 20}px`,
              '--sway': `${(h & 1 ? 1 : -1) * (6 + ((h >> 9) % 10))}px`,
              '--dy': `${at ? ground - at[1] : 60}px`,
              // A tilt to land at, not a spin: leaves flutter, they do not tumble.
              '--rot': `${((h >> 6) % 70) - 35}deg`,
              animationDuration: `${2200 + ((h >> 12) % 800)}ms`,
              // The first off with the first tremble, the rest let go one by
              // one while the shiver goes on, more early than late (the owner,
              // 2026-11-25: "very soon after it starts shaking the leaves should
              // start falling and continuing to do so while the shake continues").
              animationDelay: letGo,
            } as Record<string, string>,
          };
        });
    },
    [tree.height],
  );

  /*
   * The arrival. What fell since the student last looked is decided once, as
   * the page opens, and kept: recording the fall changes the store, and the
   * leaves landing must not change their minds half way down.
   */
  const [arrival] = useState(() => {
    if (!arrive) return null;
    const still = prefersReducedMotion();
    const unfurl = !still && !arrivedThisVisit.has(courseId);
    const fresh: Limb[] = [];
    const landing = new Map<string, Motion>();
    const from: Record<string, number> = {};
    for (const [sid, ghosts] of layers.ghosts) {
      const seenFrom = fellFrom?.[sid] ?? Infinity;
      const lost = ghosts.filter((l) => clumpOf(l.leafKey ?? '') < seenFrom);
      if (!lost.length) continue;
      fresh.push(...lost);
      from[sid] = shownBySection[sid] ?? 0;
    }
    const startAt = unfurl ? FALL_AFTER_UNFURL_MS : FALL_AFTER_OPEN_MS;
    if (!still) {
      // The leaves already lying on the ground under a branch that has just
      // lost them come into the pile as the falling ones land.
      for (const [sid, litter] of layers.litter) {
        const seenFrom = fellFrom?.[sid] ?? Infinity;
        for (const l of litter) {
          if (!l.leafKey || clumpOf(l.leafKey) >= seenFrom) continue;
          landing.set(l.leafKey, {
            className: 'leaf-land',
            style: { animationDelay: `${startAt + 1900 + (leafHash(l.leafKey) % 1500)}ms` },
          });
        }
      }
    }
    return { unfurl, still, fresh, landing, from, startAt };
  });
  /*
   * Opening on a tree already drawn (no drawing-on), the leaves about to
   * fall are there from the first frame, on their branch, each letting go at
   * its own moment: drawn only once the fall began, they were missing for
   * the wait before it and then came back to fall (the owner, 2026-11-27:
   * "they first disappear completely and then reappear quickly and then
   * fall"). After a drawing-on they come with the fall, as the tree has only
   * just drawn itself.
   */
  const [falls, setFalls] = useState<{ sid: string; at: number; leaves: Falling[] }[]>(() =>
    arrival && arrival.fresh.length && !arrival.still && !arrival.unfurl
      ? [{ sid: 'arrival', at: 0, leaves: fallingFor(arrival.fresh, arrival.startAt) }]
      : [],
  );
  const [unfurling, setUnfurling] = useState(() => !!arrival?.unfurl);
  const [shaking, setShaking] = useState(false);

  useEffect(() => {
    if (!arrival) return;
    arrivedThisVisit.add(courseId);
    const timers: number[] = [];
    if (arrival.unfurl) timers.push(window.setTimeout(() => setUnfurling(false), UNFURL_MS));
    if (arrival.fresh.length) {
      // Seen now, whether or not it is shown moving.
      for (const [sid, from] of Object.entries(arrival.from)) fell(courseId, sid, from);
      if (!arrival.still) {
        timers.push(
          window.setTimeout(() => {
            if (ARRIVAL_FALL === 'shake') {
              setShaking(true);
              timers.push(window.setTimeout(() => setShaking(false), SHAKE_MS));
            }
            if (arrival.unfurl) setFalls([{ sid: 'arrival', at: Date.now(), leaves: fallingFor(arrival.fresh, 0) }]);
            timers.push(window.setTimeout(() => setFalls([]), FALL_LASTS_MS + 600));
          }, arrival.startAt),
        );
      }
    }
    return () => timers.forEach((t) => window.clearTimeout(t));
    // Once, as the page opens: the arrival is decided at mount and kept.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /*
   * A sitting's tree (growOnly): the leaves the tree's measure newly counts,
   * budding where they grow as it happens. Compared with the tree last drawn,
   * in render, so the bud is on the very frame the leaf appears.
   */
  const [lastTree, setLastTree] = useState(tree);
  const [buds, setBuds] = useState<Map<string, Motion>>(() => new Map());
  if (growOnly && lastTree !== tree) {
    const was = new Set(lastTree.limbs.filter((l) => l.leafKey && l.solid && !l.fallen).map((l) => l.leafKey!));
    const next = new Map<string, Motion>();
    const fresh = tree.limbs.filter((l) => l.leafKey && l.solid && !l.fallen && !was.has(l.leafKey));
    fresh.slice(0, MAX_MOVING).forEach((l) => {
      const at = startOf(l.d);
      next.set(l.leafKey!, {
        className: 'leaf-bud',
        style: {
          transformOrigin: at ? `${at[0]}px ${at[1]}px` : 'center',
          animationDelay: `${clumpOf(l.leafKey!) * 90 + (leafHash(l.leafKey!) % 200)}ms`,
        },
      });
    });
    setLastTree(tree);
    setBuds(next);
  }
  /** What buds in the foliage: a sitting's new leaves, or the end of a session's regrowth. */
  const grow = growOnly ? buds : motion.grow;
  const drawOn = animate || unfurling;
  /*
   * Growing outward: each path starts when growth from the foot of the
   * trunk would reach it, wood first and its leaves just after.
   */
  const growDelays = useMemo(() => {
    if (GROWTH !== 'outward' || !layers.foot) return undefined;
    const [fx, fy] = layers.foot;
    const out = new Map<Limb, Record<string, string>>();
    const reach = (l: Limb) => {
      const p = startOf(l.d);
      return p ? Math.hypot(p[0] - fx, p[1] - fy) : 0;
    };
    const all = tree.limbs.filter((l) => !l.fallen && !l.ghost);
    const far = Math.max(1, ...all.map(reach));
    for (const l of all) {
      const at = (reach(l) / far) * OUTWARD_SPAN_MS;
      out.set(
        l,
        l.solid
          ? { animationDelay: `${Math.round(at + 350)}ms`, animationDuration: '600ms' }
          : { animationDelay: `${Math.round(at)}ms`, animationDuration: `${OUTWARD_STROKE_MS}ms` },
      );
    }
    return out;
  }, [layers.foot, tree]);
  /** The per-path timing, only while the arrival draws the tree on (the end of a session keeps its own). */
  const outward = unfurling && !animate ? growDelays : undefined;
  const lifted = active && !drawOn && !(grewFrom && spotlight) ? active : null;

  const swing = (id: string): CSSProperties | undefined => {
    const geo = layers.geometry.get(id);
    if (!geo) return undefined;
    return {
      transform: pivots.get(id) ?? 'rotate(0deg)',
      transformOrigin: `${geo.anchor[0]}px ${geo.anchor[1]}px`,
      // The arrival's shiver (styles/index.css, branch-shiver): each branch
      // on its own, a little after its neighbour; the ones losing leaves
      // tremble harder.
      ...(shaking
        ? ({
            '--amp': arrival?.from[id] !== undefined ? '1.7' : '0.8',
            animationDelay: `${leafHash(id) % 160}ms`,
          } as CSSProperties)
        : {}),
    };
  };
  const limbSet = shaking ? 'limb-set branch-shiver' : 'limb-set';

  /* ---- the reveal (the lecture page) ---- */

  /** Finger down and the tree has it: a hold or a sideways swipe, not a scroll. */
  const engaged = useRef(false);
  /**
   * Engaged by resting, and not moved since. A thumb often rests a moment
   * before a slow scroll: if its first move is up or down, it was a scroll
   * after all, and the page gets it.
   */
  const stillSinceHold = useRef(false);
  /** The press moved the picked branch, so its click is not a tap. */
  const dragged = useRef(false);
  const down = useRef<{ x: number; y: number; shown: boolean } | null>(null);
  const holdTimer = useRef<number | undefined>(undefined);
  const hideTimer = useRef<number | undefined>(undefined);

  const hide = useCallback(() => {
    window.clearTimeout(hideTimer.current);
    setRevealed(false);
    setPointed(null);
  }, []);
  const show = useCallback(() => {
    window.clearTimeout(hideTimer.current);
    setRevealed(true);
  }, []);
  const hideSoon = useCallback(
    (ms: number) => {
      window.clearTimeout(hideTimer.current);
      hideTimer.current = window.setTimeout(hide, ms);
    },
    [hide],
  );
  useEffect(() => () => {
    window.clearTimeout(hideTimer.current);
    window.clearTimeout(holdTimer.current);
  }, []);

  /** Enter on the drawing: move the focus to the first number once it can take it. */
  const focusFirstKey = useRef(false);
  useEffect(() => {
    if (!revealed || !focusFirstKey.current) return;
    focusFirstKey.current = false;
    svgRef.current?.querySelector<SVGAElement>('.tree-keys a')?.focus();
  }, [revealed]);

  // Going quiet puts the numbers away (set while rendering, React's way of
  // following a prop, rather than an effect a frame later).
  const [wasQuiet, setWasQuiet] = useState(quiet);
  if (quiet !== wasQuiet) {
    setWasQuiet(quiet);
    if (quiet) {
      setRevealed(false);
      setPointed(null);
    }
  }

  // Which branch is picked, for the words under the drawing.
  useEffect(() => {
    if (reveal) onPoint?.(revealed ? pointed : null);
  }, [reveal, revealed, pointed, onPoint]);

  // A tap anywhere else puts the numbers away; the words under the tree are
  // part of it, so their Open can be tapped.
  useEffect(() => {
    if (!reveal || !revealed) return;
    const away = (e: PointerEvent) => {
      const t = e.target as Element | null;
      if (svgRef.current?.contains(t) || t?.closest?.('[data-keeps-tree-open]')) return;
      hide();
    };
    document.addEventListener('pointerdown', away, true);
    return () => document.removeEventListener('pointerdown', away, true);
  }, [reveal, revealed, hide]);

  // Once the tree has the finger, it keeps it: the page may scroll from an
  // up-and-down drag that starts on the tree (touch-action: pan-y), but not
  // from a finger that is already picking branches.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !reveal) return;
    const hold = (e: TouchEvent) => {
      if (!engaged.current) return;
      const d = down.current;
      const t = e.touches[0];
      if (stillSinceHold.current && d && t) {
        const dx = t.clientX - d.x;
        const dy = t.clientY - d.y;
        if (Math.hypot(dx, dy) > SLOP_PX) {
          stillSinceHold.current = false;
          if (Math.abs(dy) > Math.abs(dx)) {
            // A scroll that began with a rest: let it go, numbers and all.
            engaged.current = false;
            hide();
            return;
          }
        }
      }
      if (e.cancelable) e.preventDefault();
    };
    svg.addEventListener('touchmove', hold, { passive: false });
    return () => svg.removeEventListener('touchmove', hold);
  }, [reveal, hide]);

  /** The number under a tap, by where it is drawn now (swung or not). */
  const keyAt = (x: number, y: number): string | null => {
    let best: string | null = null;
    let bestDistance = KEY_REACH_PX;
    for (const el of svgRef.current?.querySelectorAll<SVGTextElement>('[data-key]') ?? []) {
      const r = el.getBoundingClientRect();
      const distance = Math.hypot(r.left + r.width / 2 - x, r.top + r.height / 2 - y);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = el.dataset.key ?? null;
      }
    }
    return best;
  };

  const openSection = (id: string) =>
    onOpenSection ? onOpenSection(id) : navigate(`/study/${courseId}/section/${encodeURIComponent(id)}`);

  const pickAt = (e: { clientX: number; clientY: number }, pointerType: string) =>
    setPointed((held) => nearest({ clientX: e.clientX, clientY: e.clientY, pointerType }, held) ?? held);

  const revealHandlers = reveal
    ? {
        onPointerDown: (e: ReactPointerEvent<SVGSVGElement>) => {
          lastPointer.current = e.pointerType;
          down.current = { x: e.clientX, y: e.clientY, shown: revealed };
          engaged.current = false;
          stillSinceHold.current = false;
          dragged.current = false;
          if (e.pointerType === 'mouse') return;
          window.clearTimeout(hideTimer.current);
          const at = { clientX: e.clientX, clientY: e.clientY };
          window.clearTimeout(holdTimer.current);
          holdTimer.current = window.setTimeout(() => {
            engaged.current = true;
            stillSinceHold.current = true;
            show();
            pickAt(at, 'touch');
          }, HOLD_MS);
        },
        onPointerMove: (e: ReactPointerEvent<SVGSVGElement>) => {
          if (e.pointerType === 'mouse') {
            show();
            pickAt(e, 'mouse');
            return;
          }
          const d = down.current;
          if (!d) return;
          if (!engaged.current) {
            const dx = e.clientX - d.x;
            const dy = e.clientY - d.y;
            if (Math.hypot(dx, dy) <= SLOP_PX) return;
            window.clearTimeout(holdTimer.current);
            // Up or down is the page's scroll; sideways is the tree's.
            if (Math.abs(dx) <= Math.abs(dy)) return;
            engaged.current = true;
            show();
          }
          if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > SLOP_PX) dragged.current = true;
          pickAt(e, e.pointerType);
        },
        onPointerUp: (e: ReactPointerEvent<SVGSVGElement>) => {
          window.clearTimeout(holdTimer.current);
          if (e.pointerType !== 'mouse' && engaged.current) hideSoon(LINGER_MS);
          engaged.current = false;
        },
        onPointerCancel: () => {
          // The page took the finger to scroll.
          window.clearTimeout(holdTimer.current);
          if (engaged.current) hideSoon(LINGER_MS);
          engaged.current = false;
          down.current = null;
        },
        onPointerEnter: (e: ReactPointerEvent<SVGSVGElement>) => {
          if (e.pointerType === 'mouse') window.clearTimeout(hideTimer.current);
        },
        onPointerLeave: (e: ReactPointerEvent<SVGSVGElement>) => {
          if (e.pointerType === 'mouse') hideSoon(LEAVE_MS);
        },
        onClick: (e: React.MouseEvent<SVGSVGElement>) => {
          // From the keyboard the focused number's own link, or Enter on the
          // tree, has it.
          if (e.detail === 0) return;
          // A finger that swept across the branches was picking, not tapping,
          // even when the browser still calls it a click.
          if (dragged.current) {
            dragged.current = false;
            down.current = null;
            return;
          }
          const shownAtDown = down.current ? down.current.shown : revealed;
          down.current = null;
          if (!shownAtDown) {
            // The first touch shows the map: the tap that used to open the
            // large tree now raises the numbers, so meeting them needs no
            // telling.
            show();
            pickAt(e, lastPointer.current);
            if (lastPointer.current !== 'mouse') hideSoon(LINGER_MS);
            return;
          }
          const key = keyAt(e.clientX, e.clientY);
          if (key) return openSection(key);
          // A tap on the branch already picked opens it too, as its number
          // does (the owner, 2026-11-27: "clicking the branch itself doesnt
          // work. is this intentional?"). With a mouse, pointing picks it, so
          // one click; with a finger, the first tap picks and the second
          // opens. A tap on bare paper, or on another branch, only picks
          // (Testing 11: a stray tap must never open anything).
          const under = nearest({ clientX: e.clientX, clientY: e.clientY, pointerType: lastPointer.current }, null);
          if (under && under === pointed) openSection(under);
          else {
            pickAt(e, lastPointer.current);
            if (lastPointer.current !== 'mouse') hideSoon(LINGER_MS);
          }
        },
        // A finger or a mouse does not focus it: its answer to them is the
        // numbers, and the focus ring a tap left round the drawing was a box
        // drawn round a picture. Tab still reaches it, ring and all.
        onMouseDown: (e: React.MouseEvent<SVGSVGElement>) => e.preventDefault(),
        onFocus: (e: React.FocusEvent<SVGSVGElement>) => {
          if (e.target === e.currentTarget) show();
        },
        onBlur: (e: React.FocusEvent<SVGSVGElement>) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) hide();
        },
        onKeyDown: (e: React.KeyboardEvent<SVGSVGElement>) => {
          if (e.key === 'Escape') {
            hide();
          } else if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
            // Into the numbers: the first one takes the focus once they show.
            e.preventDefault();
            focusFirstKey.current = true;
            show();
          }
        },
      }
    : {};

  const svg = (
    <svg
      ref={svgRef}
      viewBox={`${-pad} ${top} ${tree.width + pad * 2} ${tree.height - top}`}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      // A drawing with links inside it is not an image: role="img" would hide
      // every one of those links from a screen reader.
      role={interactive ? 'group' : 'img'}
      tabIndex={reveal ? 0 : undefined}
      style={
        {
          // An up-and-down drag that starts on the tree scrolls the page.
          ...(interactive ? { touchAction: 'pan-y' } : {}),
          // What every leaf is filled with (styles/index.css .lf).
          ...(paper ? { '--leaf-paper': `url(#${paperId})` } : {}),
        } as CSSProperties
      }
      aria-label={reveal ? `${label}. Touch or focus it to number its sections` : label}
      {...revealHandlers}
      // Leaves are filled with the paper they sit on so they hide the wood
      // behind them.
      className={`tree w-auto shrink-0 text-text ${drawOn ? 'tree-grow' : ''} ${
        grewFrom ? 'tree-spotlight' : ''
      } ${interactive ? 'cursor-pointer select-none [-webkit-touch-callout:none]' : ''} ${className}`}
    >
      {paperDefs}
      {/* The leaves on the ground, first: they never shake with the tree,
          and the trunk and a low canopy stand in front of them. */}
      <g>
        {[...layers.litter].map(([id, limbs]) => (
          <g key={`l${id}`} data-dim={(!!id && dim(id)) || undefined} data-back={(!!id && stepsBack(id)) || undefined} className="tree-litter">
            <LimbPaths limbs={limbs} held={false} animate={drawOn} pointable={false} grow={arrival?.landing} />
          </g>
        ))}
      </g>
      {/* The standing tree. On arrival its branches shiver, each about its
          own base, while the trunk and the ground stay still (the owner,
          2026-11-25: "more of a shake in the branches almost like a shiver"). */}
      <g>
      {/* Wood first, then foliage, so a canopy hides the branches behind it. */}
      <g>
        {layers.structural.map((limb, i) => (
          <path key={`s${i}`} {...paintLimb(limb, false, drawOn, false)} style={outward?.get(limb)} />
        ))}
        {[...layers.wood].map(([id, limbs]) => (
          <g key={id} data-sid={id} data-held={id === active || undefined} data-dim={dim(id) || undefined} data-back={stepsBack(id) || undefined} className={limbSet} style={swing(id)}>
            <LimbPaths limbs={limbs} held={id === active} animate={drawOn} pointable={interactive} growDelays={outward} />
          </g>
        ))}
      </g>
      <g>
        {layers.structuralFoliage.map((limb, i) => limbWithVein(limb, `sf${i}`, false, drawOn, false, undefined, outward?.get(limb)))}
        {[...layers.foliage].map(([id, limbs]) => (
          <g key={id} data-sid={id} data-held={id === active || undefined} data-dim={dim(id) || undefined} data-back={stepsBack(id) || undefined} className={limbSet} style={swing(id)}>
            <LimbPaths limbs={limbs} held={id === active} animate={drawOn} pointable={false} grow={grow} growDelays={outward} />
          </g>
        ))}
      </g>
      </g>

      {/* The picked branch, its wood then its leaves, over everything else.
          Each section's group here is always there, empty until it is
          picked, with the same swing as its wood and leaves below: a group
          made on the pick would start where the branch ends up while the
          drawing under it was still settling, two branches for a moment. */}
      <g aria-hidden="true">
        {layers.ids.map((id) => (
          <g key={id} data-front={id} data-held={id === active || undefined} className={limbSet} style={swing(id)}>
            {id === lifted && (
              <>
                <LimbPaths limbs={layers.wood.get(id) ?? NONE} held animate={false} pointable={false} />
                <LimbPaths limbs={layers.foliage.get(id) ?? NONE} held animate={false} pointable={false} />
              </>
            )}
          </g>
        ))}
      </g>

      {/* Fallen leaves the session won back, leaving the pile. */}
      {motion.clearing.length > 0 && (
        <g aria-hidden="true">
          {motion.clearing.map((c, i) => (
            <g key={i} className="leaf-clear" style={c.style}>
              <path d={c.d} className="lfm" strokeWidth={0.7} />
              {c.vein && <path d={c.vein} className="fv" strokeWidth={0.35} />}
            </g>
          ))}
        </g>
      )}

      {/* The selected section's lost leaves, falling: they start where they
          grew and drop into the pile on the ground. With reduced motion it
          does not play, and the thinned branch and the pile carry the news. */}
      {falls.map((f) => (
        <g key={f.at} data-fall={f.sid} aria-hidden="true">
          {/* The same leaf as on the branch, paper and vein: one group, so
              leaf and vein turn about the same centre. Its own class (lfm),
              so the drawing-on's fade, meant for leaves on the branch, never
              holds a falling one. */}
          {f.leaves.map((leaf, i) => (
            <g key={i} className={leaf.wither ? 'leaf-clear' : 'leaf-fall'} style={leaf.style}>
              <path d={leaf.d} className="lfm" strokeWidth={0.7} />
              {leaf.vein && <path d={leaf.vein} className="fv" strokeWidth={0.35} />}
            </g>
          ))}
        </g>
      ))}

      {/* The numbers (reveal). Each rides in its own section's group, with
          the same transform as that section's wood and leaves, so a branch
          swinging aside carries its number: they cannot drift apart because
          they are never moved apart. Each rises out of its branch's tip along
          its hairline, a little after the one before. */}
      {keys.length > 0 && (
        <g className="tree-keys" data-shown={revealed || undefined}>
          {keys.map((k, i) => {
            const s = sectionById.get(k.sectionId);
            const state = s?.state ?? 'bare';
            const said = state === 'bare' ? 'not started' : state === 'fading' ? `fading, ${s?.heldPct}% still held` : 'still held';
            return (
              <g key={k.sectionId} data-sid={k.sectionId} data-held={k.sectionId === active || undefined} className="limb-set" style={swing(k.sectionId)}>
                {/* Stopped short of its figure, so no paper halo is needed to
                    cut it: a halo of flat paper colour showed as a patch on
                    the grained dark paper. */}
                <path className="tree-key-line" d={shortOf(k.tip, k.at, 8)} pathLength={1} />
                <a
                  href={`#/study/${courseId}/section/${encodeURIComponent(k.sectionId)}`}
                  aria-label={`Section ${k.n}${s?.title ? `, ${s.title}` : ''}: ${said}`}
                  tabIndex={revealed ? 0 : -1}
                  onFocus={() => {
                    show();
                    setPointed(k.sectionId);
                  }}
                  // Pointing is by distance (keyAt); these are for the keyboard and a screen reader.
                  style={{ pointerEvents: 'none' }}
                >
                  <text
                    data-key={k.sectionId}
                    className="tree-key-num"
                    x={k.at.x}
                    y={k.at.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    style={
                      {
                        '--from': `translate(${(k.tip.x - k.at.x).toFixed(1)}px, ${(k.tip.y - k.at.y).toFixed(1)}px)`,
                        // In order: transform, opacity, visibility, font-size (styles/index.css).
                        transitionDelay: revealed ? `${i * 18}ms, ${i * 18}ms, 0s, 0ms` : '0ms, 0ms, 300ms, 0ms',
                      } as CSSProperties
                    }
                  >
                    {k.n}
                  </text>
                </a>
              </g>
            );
          })}
        </g>
      )}

    </svg>
  );

  return svg;
}
