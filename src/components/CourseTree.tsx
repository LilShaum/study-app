import { Fragment, memo, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Course } from '@/schema/course';
import type { ItemResult } from '@/store/progress';
import { sortedSections } from '@/lib/sortedSections';
import { sectionStats } from '@/lib/sectionStats';
import { growTree, type Limb, type Tree } from '@/lib/growTree';
import { sectionMemory } from '@/lib/sectionMemory';
import { placeTreeKeys, plateTop } from '@/lib/treeKeys';
import { useFallenStore } from '@/store/fallen';
import { examRule } from '@/lib/exam';

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
   * Limbs become live. Off by default — a thumbnail on a library card is a
   * picture of a course, not a way into its eleventh section.
   */
  interactive?: boolean;
  /**
   * What touching it does.
   *
   * 'navigate' is the large tree: pointing picks the branch nearest the
   * pointer, named under the drawing, and tapping the picked one opens it.
   * At the size of the expanded view the pointer resolves finely enough.
   *
   * 'reveal' is the lecture page, where the tree is a third of the first
   * screen and the page has to scroll past it: any touch raises a number on
   * every branch, the branch under the finger picked out, and a tap on a
   * number opens its section (docs/proposals/tree.md §2).
   */
  mode?: 'navigate' | 'reveal';
  /** Reveal: a tap on the drawing, not on a number, while the numbers show. */
  onExpand?: () => void;
  /** Reveal: which branch is picked, or null, for the words under the drawing. */
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
}

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
function limbWithVein(limb: Limb, key: number | string, held: boolean, animate: boolean, pointable: boolean, motion?: Motion) {
  const paint = paintLimb(limb, held, animate, pointable);
  const className = motion ? `${paint.className} ${motion.className}` : paint.className;
  if (!limb.vein) return <path key={key} {...paint} className={className} style={motion?.style} />;
  return (
    <Fragment key={key}>
      <path {...paint} className={className} style={motion?.style} />
      <path d={limb.vein} strokeWidth={paint.strokeWidth / 2} className={motion ? `vn ${motion.className}` : 'vn'} style={motion?.style} />
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
}: {
  limbs: Limb[];
  held: boolean;
  animate: boolean;
  pointable: boolean;
  grow?: Map<string, Motion>;
}) {
  return <>{limbs.map((limb, i) => limbWithVein(limb, i, held, animate, pointable, limb.leafKey ? grow?.get(limb.leafKey) : undefined))}</>;
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
  mode = 'navigate',
  onExpand,
  onPoint,
}: CourseTreeProps) {
  const [pointed, setPointed] = useState<string | null>(null);
  // Reveal: whether the numbers are up.
  const [revealed, setRevealed] = useState(false);
  // Fading is judged as of when the tree was drawn: rendering must not read
  // the clock, and a canopy that shed leaves while you looked at it would be
  // a strange thing to watch.
  const [now] = useState(Date.now);

  const reveal = interactive && mode === 'reveal';
  /* The pointer picks branches in the large tree always, and on the lecture
     page while the numbers are up: a thumbnail-sized tree that followed every
     pass of the pointer flickered between sections for nothing. */
  const tracking = interactive && (mode === 'navigate' || revealed);
  const active = (tracking ? pointed : null) ?? highlight;

  const { tree, sections } = useMemo(() => {
    const sections = sortedSections(course).map((section) => {
      const stats = sectionStats(section, progress);
      const memory = sectionMemory(section, progress, now, examRule(course, progress, now));
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
  }, [courseId, course, progress, now]);

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
    const clearing: { d: string; style: Record<string, string> }[] = [];
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
      clearing.push({ d: l.d, style: { animationDelay: `${200 + (leafHash(l.leafKey!) % 600)}ms` } });
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
  const lifted = active && !animate && !(grewFrom && spotlight) ? active : null;

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
    return { wood, foliage, ghosts, litter, structural, structuralFoliage, geometry, ids };
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
  const cloud = useRef<Sample[]>([]);
  /**
   * What the last press came from. A tap fires `click` with no pointermove
   * before it, and React's synthetic click carries no pointerType.
   */
  const lastPointer = useRef('mouse');
  /** Which branch was selected when the current touch began. */
  const heldAtDown = useRef<string | null>(null);
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
   * The falls playing now. A fall, once started, always finishes, and several
   * can be under way together; it starts after a short rest, so brushing
   * across the crown does not shake every branch it crosses. A leaf falls
   * once: only leaves lost since you last saw that branch fall, kept per
   * course (store/fallen).
   */
  const FALL_REST_MS = 180;
  const FALL_LASTS_MS = 3600;
  type Falling = { d: string; style: Record<string, string> };
  const [falls, setFalls] = useState<{ sid: string; at: number; leaves: Falling[] }[]>([]);
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
    (ghosts: Limb[]): Falling[] => {
      const step = Math.max(1, Math.ceil(ghosts.length / MAX_MOVING));
      return ghosts
        .filter((_, i) => i % step === 0)
        .map((l) => {
          const h = leafHash(l.leafKey ?? l.d);
          const at = startOf(l.d);
          // Into the thin band along the ground where the fallen leaves lie
          // (lib/growTree), not below it.
          const ground = tree.height - 13 + (h % 3);
          return {
            d: l.d,
            style: {
              // Each leaf its own drift, swing, turn and speed.
              '--dx': `${((h >> 3) % 41) - 20}px`,
              '--sway': `${(h & 1 ? 1 : -1) * (6 + ((h >> 9) % 10))}px`,
              '--dy': `${at ? ground - at[1] : 60}px`,
              // A tilt to land at, not a spin: leaves flutter, they do not tumble.
              '--rot': `${((h >> 6) % 70) - 35}deg`,
              animationDuration: `${2200 + ((h >> 12) % 800)}ms`,
              animationDelay: `${h % 550}ms`,
            } as Record<string, string>,
          };
        });
    },
    [tree.height],
  );

  useEffect(() => {
    if (!active) return;
    const t = setTimeout(() => {
      const ghosts = layers.ghosts.get(active) ?? [];
      const seenFrom = fellFrom?.[active] ?? Infinity;
      const fresh = ghosts.filter((l) => clumpOf(l.leafKey ?? '') < seenFrom);
      if (!fresh.length) return;
      fell(courseId, active, shownBySection[active] ?? 0);
      const at = Date.now();
      const leaves = fallingFor(fresh);
      // Three at once at most; the oldest is nearly done by then anyway.
      setFalls((now) => [...now.filter((f) => at - f.at < FALL_LASTS_MS).slice(-2), { sid: active, at, leaves }]);
      setTimeout(() => setFalls((now) => now.filter((f) => f.at !== at)), FALL_LASTS_MS);
    }, FALL_REST_MS);
    return () => clearTimeout(t);
    // Only a change of branch starts a fall; the record changing because of
    // this very fall must not start another.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const swing = (id: string): CSSProperties | undefined => {
    const geo = layers.geometry.get(id);
    if (!geo) return undefined;
    return {
      transform: pivots.get(id) ?? 'rotate(0deg)',
      transformOrigin: `${geo.anchor[0]}px ${geo.anchor[1]}px`,
    };
  };

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
          if (key) navigate(`/study/${courseId}/section/${encodeURIComponent(key)}`);
          else onExpand?.();
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
            e.preventDefault();
            onExpand?.();
          }
        },
      }
    : {};

  const navigateHandlers =
    interactive && mode === 'navigate'
      ? {
          onPointerDown: (e: ReactPointerEvent<SVGSVGElement>) => {
            lastPointer.current = e.pointerType;
            heldAtDown.current = pointed;
            setPointed((held) => nearest(e, held) ?? held);
          },
          // The selection STAYS: moving off a branch, or off the drawing,
          // keeps the last one selected, so the caption under the tree can be
          // reached and used. Touch selects by moving too.
          onPointerMove: (e: ReactPointerEvent<SVGSVGElement>) => setPointed((held) => nearest(e, held) ?? held),
          onClick: (e: React.MouseEvent<SVGSVGElement>) => {
            const id = nearest({ clientX: e.clientX, clientY: e.clientY, pointerType: lastPointer.current }, pointed);
            if (!id) {
              setPointed(null);
              return;
            }
            // On touch, a tap opens a branch only if it was ALREADY the
            // selected one when the finger came down; otherwise it selects
            // it, so you see its name and state before you leave for it.
            if (lastPointer.current !== 'mouse' && id !== heldAtDown.current) {
              setPointed(id);
              return;
            }
            navigate(`/study/${courseId}/section/${encodeURIComponent(id)}`);
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
      // The large tree keeps the finger (a drag selects branches); the
      // lecture page lets an up-and-down drag scroll the page.
      style={interactive ? { touchAction: reveal ? 'pan-y' : 'none' } : undefined}
      aria-label={reveal ? `${label}. Touch or focus it to number its sections` : label}
      {...navigateHandlers}
      {...revealHandlers}
      // Leaves are filled with the paper they sit on so they hide the wood
      // behind them.
      className={`tree w-auto shrink-0 text-text [&_.lf]:fill-[var(--color-bg)] ${animate ? 'tree-grow' : ''} ${
        grewFrom ? 'tree-spotlight' : ''
      } ${interactive ? (reveal ? 'cursor-pointer select-none [-webkit-touch-callout:none]' : pointed ? 'cursor-pointer' : '') : ''} ${className}`}
    >
      {/* Wood first, then foliage, so a canopy hides the branches behind it. */}
      <g>
        {layers.structural.map((limb, i) => (
          <path key={`s${i}`} {...paintLimb(limb, false, animate, false)} />
        ))}
        {[...layers.wood].map(([id, limbs]) => (
          <g key={id} data-sid={id} data-held={id === active || undefined} data-dim={dim(id) || undefined} data-back={stepsBack(id) || undefined} className="limb-set" style={swing(id)}>
            <LimbPaths limbs={limbs} held={id === active} animate={animate} pointable={interactive} />
          </g>
        ))}
      </g>
      <g>
        {[...layers.litter].map(([id, limbs]) => (
          <g key={`l${id}`} data-dim={(!!id && dim(id)) || undefined} data-back={(!!id && stepsBack(id)) || undefined} className="tree-litter">
            <LimbPaths limbs={limbs} held={false} animate={animate} pointable={false} />
          </g>
        ))}
        {layers.structuralFoliage.map((limb, i) => limbWithVein(limb, `sf${i}`, false, animate, false))}
        {[...layers.foliage].map(([id, limbs]) => (
          <g key={id} data-sid={id} data-held={id === active || undefined} data-dim={dim(id) || undefined} data-back={stepsBack(id) || undefined} className="limb-set" style={swing(id)}>
            <LimbPaths limbs={limbs} held={id === active} animate={animate} pointable={false} grow={motion.grow} />
          </g>
        ))}
      </g>

      {/* The picked branch, its wood then its leaves, over everything else.
          Each section's group here is always there, empty until it is
          picked, with the same swing as its wood and leaves below: a group
          made on the pick would start where the branch ends up while the
          drawing under it was still settling, two branches for a moment. */}
      <g aria-hidden="true">
        {layers.ids.map((id) => (
          <g key={id} data-front={id} data-held={id === active || undefined} className="limb-set" style={swing(id)}>
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
            <path key={i} d={c.d} className="lf leaf-clear" strokeWidth={0.7} style={c.style} />
          ))}
        </g>
      )}

      {/* The selected section's lost leaves, falling: they start where they
          grew and drop into the pile on the ground. With reduced motion it
          does not play, and the thinned branch and the pile carry the news. */}
      {falls.map((f) => (
        <g key={f.at} data-fall={f.sid} aria-hidden="true">
          {f.leaves.map((leaf, i) => (
            <path key={i} d={leaf.d} className="lf leaf-fall" strokeWidth={0.7} style={leaf.style} />
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
                <path className="tree-key-line" data-state={state} d={`M${k.tip.x} ${k.tip.y}L${k.at.x} ${k.at.y}`} pathLength={1} />
                <a
                  href={`#/study/${courseId}/section/${encodeURIComponent(k.sectionId)}`}
                  aria-label={`Section ${k.n}, ${s?.title ?? ''}: ${said}`}
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
                    data-state={state}
                    className="tree-key-num"
                    x={k.at.x}
                    y={k.at.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    style={
                      {
                        '--from': `translate(${(k.tip.x - k.at.x).toFixed(1)}px, ${(k.tip.y - k.at.y).toFixed(1)}px)`,
                        transitionDelay: revealed ? `${i * 18}ms` : '0ms',
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

      {/* The large tree: keyboard and screen-reader access to the same
          sections. These carry no pointer events — pointing is by distance —
          so they exist to be tabbed to, named, and pressed. */}
      {interactive &&
        mode === 'navigate' &&
        sections.map((section) => (
          <a
            key={section.id}
            href={`#/study/${courseId}/section/${encodeURIComponent(section.id)}`}
            aria-label={`${section.title}: ${section.items} item${section.items === 1 ? '' : 's'}${
              section.accuracy === null ? ', not yet studied' : `, ${section.accuracy}% correct`
            }`}
            onFocus={() => setPointed(section.id)}
            style={{ pointerEvents: 'none' }}
          >
            {/* A zero-area shape: the anchor needs a child to be focusable at
                all, and this one is never seen or hit. */}
            <rect x={0} y={0} width={0} height={0} fill="none" />
          </a>
        ))}
    </svg>
  );

  if (!interactive || mode === 'reveal') return svg;

  /* The plate caption of the large tree.

     Botanical plates key a drawing with a numbered caption beneath it, and
     that is what this is: the figure number, the section's name in full,
     one line of plain fact, and the two things worth doing from here. Its
     height is reserved, so pointing at branches never moves the page. */
  const chosen = tracking ? sections.findIndex((s) => s.id === (pointed ?? highlight)) : -1;
  const sel = chosen >= 0 ? sections[chosen] : null;
  const courseDue = sections.reduce((n, s) => n + s.due, 0);
  const fact = !sel ? null : !sel.studied ? 'not studied yet' : sel.due ? `${sel.due} due for review` : 'nothing due';
  const at = (path: string) => `/study/${courseId}${path}`;

  return (
    <div className="flex w-full flex-col items-center">
      {svg}
      <div className="mt-3 flex min-h-[7.5rem] w-full max-w-md flex-col items-center text-center" aria-live="polite">
        {sel ? (
          <>
            <span className="mark text-text-3">Fig. {chosen + 1}</span>
            <span className="mt-0.5 line-clamp-2 font-display text-heading text-text">{sel.title}</span>
            <span className="mt-1 flex flex-wrap items-baseline justify-center gap-x-4 gap-y-1 text-small">
              <span className="text-text-2">
                {sel.items} item{sel.items === 1 ? '' : 's'} · {fact}
              </span>
              <Link to={at(`/section/${encodeURIComponent(sel.id)}`)} className="text-accent hover:underline">
                Open section
              </Link>
              {sel.due > 0 && (
                <Link to={`/session/${courseId}/review?section=${encodeURIComponent(sel.id)}`} className="text-accent hover:underline">
                  Review {sel.due}
                </Link>
              )}
            </span>
          </>
        ) : (
          // Nothing selected: the course's own figures, not an instruction.
          <span className="mt-6 text-small text-text-3">
            {sections.length} section{sections.length === 1 ? '' : 's'}
            {courseDue > 0 ? ` · ${courseDue} due for review` : ''}
          </span>
        )}
      </div>
    </div>
  );
}
