import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Course } from '@/schema/course';
import type { ItemResult } from '@/store/progress';
import { sortedSections } from '@/lib/sortedSections';
import { sectionStats } from '@/lib/sectionStats';
import { growTree, type Limb } from '@/lib/growTree';
import { scoredEntries } from '@/lib/scored';
import { examTime, isDueFor, retrievability } from '@/lib/memory';

/**
 * How much of a section counts as known.
 *
 * Coverage times confidence: studying every scorable item badly is not the
 * same as studying half of them well, and neither is mastery. The floor of
 * 0.35 on the accuracy term means work always shows — a branch you have
 * struggled with still leafs, just thinly.
 */
function mastery(studied: number, gradable: number, accuracy: number | null): number {
  if (!gradable || !studied) return 0;
  const coverage = studied / gradable;
  const confidence = accuracy === null ? 0.5 : 0.35 + (accuracy / 100) * 0.65;
  return Math.max(0, Math.min(1, coverage * confidence));
}

/**
 * How much of what a section learned would still be recalled now: the mean
 * recall chance (lib/memory.ts) over the items studied in it. 1 straight
 * after studying, falling as they fade, rising again when they are reviewed.
 * Items never studied are not counted — unseen is not forgotten; that is
 * what the bare wood already says.
 */
function heldShare(
  items: Course['sections'][number]['items'],
  progress: Record<string, ItemResult>,
  now: number,
): number {
  let sum = 0;
  let n = 0;
  for (const { id } of scoredEntries(items)) {
    const R = retrievability(progress[id], now);
    if (R == null) continue;
    sum += R;
    n++;
  }
  return n ? sum / n : 1;
}

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
   * Limbs become live: pointing at one lights it and pivots its neighbours
   * aside. Off by default — a thumbnail on a library card is a picture of a
   * course, not a way into its eleventh section.
   */
  interactive?: boolean;
  /**
   * What a click does.
   *
   * 'preview' calls `onExpand`, because at the size a tree sits on a course
   * page you cannot reliably aim at one limb among eleven interleaved
   * crowns — measured at 60% correct. 'navigate' goes to the section, and is
   * for the expanded view, where the same drawing is three times the size
   * and the pointer resolves about four times finer.
   */
  mode?: 'preview' | 'navigate';
  onExpand?: () => void;
  /** Draw this section's limbs at full strength and dim everything else. */
  highlight?: string | null;
  /**
   * Draw the tree on, once, as it appears.
   *
   * The only animation in the app, and it is growth-shaped because that is
   * the one thing this drawing is about: the wood inks itself in and the
   * leaves come after it. Reserved for the end of a session, where something
   * has actually been earned; a tree that redraws itself every time a page
   * loads is a loading spinner with extra steps.
   */
  animate?: boolean;
}

/** Wood that belongs to no section — the bole and the leader — never dims. */
const isStructural = (limb: Limb) => !limb.sectionId;

/**
 * How close the pointer must come to a branch, in SCREEN PIXELS, to be on it.
 *
 * This used to be 26 viewBox units, which on a 200x260 tree is 13% of the
 * whole drawing — and a branch's own stroke is between one and three units.
 * So a section grabbed the pointer from ten times its own width away, and on
 * a crown where limbs overlap the nearer one snapped the selection off the
 * one underneath before you ever reached it. Pointing at a branch has to
 * mean being ON the branch.
 *
 * In pixels rather than viewBox units because the same drawing renders at a
 * thumbnail and at 68vh: a fixed unit distance is a different physical
 * target in each. Converted through the CTM at the moment of the test, so
 * the tolerance is the same on any screen at any size.
 */
const REACH_PX = 11;

/** A fingertip is blunter than a cursor and cannot see what it covers. */
const REACH_PX_COARSE = 20;

/** How far a neighbouring limb swings aside, in degrees, at its closest. */
const PIVOT = 5;

/** Falloff of that swing with distance across the crown, in viewBox units. */
const PIVOT_REACH = 60;

/**
 * How much nearer a different branch must be before the selection moves to it.
 *
 * Without this the answer changes the instant another branch is a hair
 * closer, so crossing the crown flickers between sections and the drawing
 * churns. Holding what you have until something is clearly nearer is what
 * makes it feel like pointing at a thing rather than sweeping a field.
 */
const STICK = 1.2;

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

/**
 * The course, drawn.
 *
 * Structure comes from the course and never moves; foliage comes from what
 * has been studied. A section never opened is a bare branch, which is the
 * one thing a percentage cannot show you at a glance.
 *
 * When `interactive`, each section's limbs are also a link into that section,
 * which is the difference between a drawing beside an app and a drawing that
 * IS one. The links are a second layer of transparent, deliberately fat
 * copies of the wood rather than handlers on the visible paths, because the
 * paint order cannot be disturbed: every leaf is drawn after every branch so
 * that a canopy hides the wood behind it, and grouping the paths by section
 * to make them clickable would have put one section's branches back on top of
 * another's leaves.
 *
 * Deliberately has no caption. It either communicates or it does not, and a
 * sentence underneath describing the picture would be an admission that it
 * does not.
 */
export function CourseTree({
  courseId,
  course,
  progress,
  className = 'h-40',
  interactive = false,
  highlight = null,
  animate = false,
  mode = 'navigate',
  onExpand,
}: CourseTreeProps) {
  const [pointed, setPointed] = useState<string | null>(null);
  // Fading is judged as of when the tree was drawn: rendering must not read
  // the clock, and a canopy that shed leaves while you looked at it would be
  // a strange thing to watch.
  const [now] = useState(Date.now);

  /*
   * Only the expanded drawing follows the pointer.
   *
   * A thumbnail is one object, not eleven. Tracking the nearest limb at
   * 176px tall means the answer changes every few pixels of mouse travel —
   * sections flicking between lit and dim, crowns twitching — and the page
   * reads as though it is malfunctioning. The whole preview responds to a
   * click instead; the pointing happens where the limbs are far enough apart
   * to point at.
   */
  const tracking = interactive && mode === 'navigate';
  const active = (tracking ? pointed : null) ?? highlight;

  const { tree, sections } = useMemo(() => {
    const examAt = examTime(course.metadata.exam_date);
    const sections = sortedSections(course).map((section) => {
      const stats = sectionStats(section, progress);
      const learned = mastery(stats.studied, stats.gradable, stats.accuracy);
      return {
        id: section.id,
        title: section.title,
        items: section.items.length,
        accuracy: stats.accuracy,
        weight: section.items.length,
        learned,
        mastery: learned * heldShare(section.items, progress, now),
        studied: stats.studied,
        due: scoredEntries(section.items).filter(({ id }) => isDueFor(progress[id], now, examAt)).length,
      };
    });
    return { tree: growTree(courseId, sections), sections };
  }, [courseId, course, progress, now]);

  /*
   * The limbs, grouped twice: by layer, then by section.
   *
   * By layer because paint order is load-bearing — every leaf is drawn after
   * every branch so a canopy hides the wood behind it, and grouping by
   * section alone would put one section's branches back on top of another's
   * leaves. By section inside that, because a section is the thing that
   * moves: pointing at one limb swings its neighbours aside, and a group is
   * what can carry a transform.
   *
   * Each section also gets an anchor — where its lowest limb leaves the wood
   * it grew from, which is what it pivots about — and a centroid, which is
   * what decides the direction it swings.
   */
  const layers = useMemo(() => {
    const wood = new Map<string, Limb[]>();
    const foliage = new Map<string, Limb[]>();
    const ghosts = new Map<string, Limb[]>();
    const structural: Limb[] = [];
    const structuralFoliage: Limb[] = [];
    // On the ground, so it never swings with its branch; it still dims and
    // lights with its section, which is how you tell whose litter is whose.
    const litter: Limb[] = [];
    for (const limb of tree.limbs) {
      if (limb.fallen) {
        litter.push(limb);
        continue;
      }
      if (limb.ghost) {
        // The leader's lost leaves belong to no section and are never
        // pointed at, so they are never drawn.
        if (!limb.sectionId) continue;
        const list = ghosts.get(limb.sectionId);
        if (list) list.push(limb);
        else ghosts.set(limb.sectionId, [limb]);
        continue;
      }
      if (!limb.sectionId) {
        // Split by layer, not just set aside. The leader carries foliage and
        // belongs to no section, so filing all of it as "structural" and
        // drawing that first put the leader's leaves UNDER the branches —
        // the one thing the layering exists to prevent.
        (limb.solid ? structuralFoliage : structural).push(limb);
        continue;
      }
      const into = limb.solid ? foliage : wood;
      const list = into.get(limb.sectionId);
      if (list) list.push(limb);
      else into.set(limb.sectionId, [limb]);
    }

    const geometry = new Map<string, { anchor: [number, number]; cx: number }>();
    for (const [id, limbs] of wood) {
      const starts = limbs.map((l) => startOf(l.d)).filter((p): p is [number, number] => !!p);
      if (!starts.length) continue;
      // Lowest start point: the limb nearest the ground is the one the rest
      // of the section hangs off, so it is what the section turns about.
      const anchor = starts.reduce((low, p) => (p[1] > low[1] ? p : low));
      const cx = starts.reduce((n, p) => n + p[0], 0) / starts.length;
      geometry.set(id, { anchor, cx });
    }
    return { wood, foliage, ghosts, litter, structural, structuralFoliage, geometry };
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
      // Away from the section being pointed at, hardest for its nearest
      // neighbours and fading across the crown. A tie goes left, so two limbs
      // at the same centroid never both sit still.
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
   * before it, and React's synthetic click carries no pointerType, so without
   * this a finger tapping a branch was measured against the cursor's radius.
   */
  const lastPointer = useRef('mouse');
  /** Which branch was selected when the current touch began. */
  const heldAtDown = useRef<string | null>(null);
  const navigate = useNavigate();

  /*
   * Pointing at a limb is decided by DISTANCE, not by stacking.
   *
   * The first version gave each section a fat transparent copy of its own
   * wood and let the browser hit-test them. With eleven crowns interleaved
   * in one canvas those copies overlap almost everywhere, and the last one
   * appended wins, so aiming at a visible limb selected the right section
   * 54% of the time — measured, not guessed. Weighting the order by limb
   * thickness moved it to 58%. A control that misroutes two clicks in five
   * is worse than no control.
   *
   * So the limbs are sampled into a point cloud once, and the pointer picks
   * the nearest sample. Whatever you are closest to is what you get, which
   * is both correct by construction and what the drawing looks like it
   * should do.
   *
   * Measured at the expanded size, over 1737 probes along every limb:
   *
   *   hit-test by stacking, fat transparent copies ......... 54%
   *   ditto, ordered by limb thickness ..................... 58%
   *   nearest sampled point (this) ......................... 65%
   *   ditto, plus one sample per leaf ...................... 58%
   *   ditto, distance discounted by limb weight ............ 63%
   *
   * Sampling the canopy sounds right — a person aims at the leafy mass, not
   * the twig — and measures worse, because leaves sit at the crown's edge
   * where sections interleave most. Weighting by thickness measures worse
   * too. The remaining error is not a modelling failure: deep in a crown the
   * nearest limb genuinely belongs to a neighbour, and no hit model fixes an
   * ambiguous drawing. What fixes it is naming what the pointer is on before
   * the click, which is what the caption under the tree does.
   */
  useLayoutEffect(() => {
    const svg = svgRef.current;
    if (!svg || !tracking) return;
    const samples: Sample[] = [];
    for (const el of svg.querySelectorAll<SVGPathElement>('path[data-section]')) {
      // jsdom has no SVG geometry, so the cloud stays empty under test and
      // pointing simply finds nothing — which is the correct behaviour for a
      // renderer that cannot measure a path.
      if (typeof el.getTotalLength !== 'function') return;
      const sectionId = el.dataset.section!;
      const length = el.getTotalLength();
      // Every ~2 units. With a grab radius of a few units, a 6-unit sample
      // spacing left scallops between samples where the line tested as
      // further away than it is.
      const steps = Math.max(2, Math.ceil(length / 2));
      for (let i = 0; i <= steps; i++) {
        const { x, y } = el.getPointAtLength((length * i) / steps);
        samples.push({ x, y, sectionId });
      }
    }
    cloud.current = samples;
  }, [tree, tracking]);

  const nearest = useCallback(
    (event: { clientX: number; clientY: number; pointerType?: string }, holding: string | null): string | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const { x, y } = point.matrixTransform(ctm.inverse());
    // One screen pixel is this many viewBox units at the size we are drawn.
    const perPx = Math.hypot(ctm.a, ctm.b) || 1;
    // Ask the event what is pointing, not the device. A media query was
    // allocated here on every move, and it answered the wrong question: a
    // touchscreen laptop reports a fine pointer, so a finger on it got the
    // cursor's 11px target. pointerType says what THIS event came from.
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
  }, []);

  const inLeaf = useMemo(
    () => new Set(tree.limbs.filter((l) => l.solid && !l.fallen).map((l) => l.sectionId)).size,
    [tree],
  );

  const label = `${course.metadata.title}: ${inLeaf} of ${course.sections.length} sections in leaf`;

  const paint = (limb: Limb) => ({
    d: limb.d,
    // The lit limb is drawn heavier as well as left at full strength. Dimming
    // alone had to be so deep to register that the whole crown went to a
    // ghost, and a tree you cannot see is not locating anything.
    strokeWidth: active && limb.sectionId === active ? limb.weight * 1.5 : limb.weight,
    className: limb.solid ? 'lf' : limb.ink ? 'ink' : 'wd',
    // The trunk is a filled outline in the line colour (see growTree).
    fill: limb.ink ? 'currentColor' : undefined,
    stroke: limb.ink ? 'none' : undefined,
    // Normalised length, so one dash rule can draw on a path of any size
    // without knowing how long it is.
    pathLength: animate && !limb.solid && !limb.ink ? 1 : undefined,
    // Only a section's MAIN LINE is a target.
    //
    // Filtering on kind was not enough and this is why: kind comes from
    // depth, so a section's depth-3 limb and all its depth-2 children are
    // every one of them `branch`. Nine strokes fanning across the crown,
    // all sampled, made a section's target a wide ragged region that
    // overlapped its neighbours' — which is exactly the complaint that
    // aiming at one branch lands two over. The generator now marks the
    // unbroken leader chain, so a section is one stroke to point at.
    //
    // And only the BRANCH-weight part of that chain. The spine carries on
    // into twig weight out at the tip, where it is a hair thick and has
    // wandered in among the limbs it grew past — so those last segments were
    // claiming pointer that was nowhere near anything you could see.
    'data-section': tracking && limb.spine && limb.kind === 'branch' ? limb.sectionId : undefined,
    // Deeper in the large view: there the pointed section's lost leaves are
    // outlined, and at 0.4 its neighbours' real leaves read as the same
    // faint marks as that outline.
    opacity: active && !isStructural(limb) && limb.sectionId !== active ? (tracking ? 0.2 : 0.4) : undefined,
  });

  const swing = (id: string) => {
    const geo = layers.geometry.get(id);
    if (!geo) return undefined;
    return {
      transform: pivots.get(id) ?? 'rotate(0deg)',
      transformOrigin: `${geo.anchor[0]}px ${geo.anchor[1]}px`,
    };
  };

  const svg = (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${tree.width} ${tree.height}`}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      // A drawing with links inside it is not an image: role="img" would hide
      // every one of those links from a screen reader.
      role={tracking ? 'group' : 'img'}
      // A finger dragged over the tree selects branches; it must not also
      // scroll the page underneath it.
      style={tracking ? { touchAction: 'none' } : undefined}
      aria-label={label}
      onPointerDown={
        tracking
          ? (e) => {
              lastPointer.current = e.pointerType;
              heldAtDown.current = pointed;
              setPointed((held) => nearest(e, held) ?? held);
            }
          : undefined
      }
      // The selection STAYS: moving off a branch, or off the drawing, keeps
      // the last one selected, so the caption under the tree can be reached
      // and used. It changes only when another branch is selected.
      //
      // Touch selects by moving too — dragging a finger across the branches
      // is the phone's version of moving the mouse over them. An earlier
      // version ignored touch moves so that a tap could not select and open
      // in one go; that is handled in onClick instead, and it cost the
      // gesture that makes the tree worth touching.
      onPointerMove={tracking ? (e) => setPointed((held) => nearest(e, held) ?? held) : undefined}
      onClick={
        tracking
          ? (e) => {
              const id = nearest(
                { clientX: e.clientX, clientY: e.clientY, pointerType: lastPointer.current },
                pointed,
              );
              if (!id) {
                setPointed(null);
                return;
              }
              // On touch, a tap opens a branch only if it was ALREADY the
              // selected one when the finger came down. Otherwise the tap —
              // or the drag that ended on it — just selects it, so you see
              // its name and state before you leave for it.
              if (lastPointer.current !== 'mouse' && id !== heldAtDown.current) {
                setPointed(id);
                return;
              }
              navigate(`/study/${courseId}/section/${encodeURIComponent(id)}`);
            }
          : undefined
      }
      // Leaves are filled with the paper they sit on so they hide the wood
      // behind them. Every tree now sits on the page itself — the library row
      // that used to be a card is a ruled entry — so there is one fill.
      className={`w-auto shrink-0 text-text [&_.lf]:fill-[var(--color-bg)] ${animate ? 'tree-grow' : ''} ${
        interactive ? (mode === 'preview' ? 'cursor-zoom-in' : pointed ? 'cursor-pointer' : '') : ''
      } ${className}`}
    >
      {/* Wood first, then foliage, so a canopy hides the branches behind it. */}
      <g>
        {layers.structural.map((limb, i) => (
          <path key={`s${i}`} {...paint(limb)} />
        ))}
        {[...layers.wood].map(([id, limbs]) => (
          <g key={id} data-sid={id} data-held={id === active || undefined} className="limb-set" style={swing(id)}>
            {limbs.map((limb, i) => (
              <path key={i} {...paint(limb)} />
            ))}
          </g>
        ))}
      </g>
      <g>
        {layers.litter.map((limb, i) => (
          <path key={`l${i}`} {...paint(limb)} />
        ))}
        {layers.structuralFoliage.map((limb, i) => (
          <path key={`sf${i}`} {...paint(limb)} />
        ))}
        {[...layers.foliage].map(([id, limbs]) => (
          <g key={id} data-sid={id} data-held={id === active || undefined} className="limb-set" style={swing(id)}>
            {limbs.map((limb, i) => (
              <path key={i} {...paint(limb)} />
            ))}
          </g>
        ))}
      </g>

      {/* The shape of what was known. The pointed section's lost leaves,
          outlined where they grew: the solid leaves are what is held, the
          outline around them is what has gone, and what a review grows
          back. No count — the gap is the measure. */}
      {active && layers.ghosts.get(active) && (
        <g key={active} className="tree-ghost" aria-hidden="true">
          {layers.ghosts.get(active)!.map((limb, i) => (
            // Dotted: the line for something that was here and is not.
            <path key={i} d={limb.d} strokeWidth={0.35} strokeDasharray="0.7 0.8" />
          ))}
        </g>
      )}

      {/* Keyboard and screen-reader access to the same sections. These carry
          no pointer events — pointing is handled above, by distance — so they
          exist to be tabbed to, named, and pressed. */}
      {tracking &&
        sections.map((section) => (
          <a
            key={section.id}
            href={`#/study/${courseId}/section/${encodeURIComponent(section.id)}`}
            aria-label={`${section.title} — ${section.items} item${section.items === 1 ? '' : 's'}${
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

  if (!interactive) return svg;

  if (mode === 'preview') {
    return (
      <button
        type="button"
        onClick={onExpand}
        aria-label={`${label}. Open it`}
        className="shrink-0 cursor-zoom-in rounded transition-opacity hover:opacity-80"
      >
        {svg}
      </button>
    );
  }

  /* The plate caption.

     Botanical plates key a drawing with a numbered caption beneath it, and
     that is what this is: the figure number, the section's name in full,
     one line of plain fact, and the two things worth doing from here. It
     replaced a line of small grey text holding the name alone — which told
     you what you were pointing at and nothing you could act on.

     Its height is reserved, so pointing at branches never moves the page. */
  const chosen = tracking ? sections.findIndex((s) => s.id === (pointed ?? highlight)) : -1;
  const sel = chosen >= 0 ? sections[chosen] : null;
  const courseDue = sections.reduce((n, s) => n + s.due, 0);
  const fact = !sel
    ? null
    : !sel.studied
      ? 'not studied yet'
      : sel.due
        ? `${sel.due} due for review`
        : 'nothing due';
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
                <Link
                  to={`/session/${courseId}/review?section=${encodeURIComponent(sel.id)}`}
                  className="text-accent hover:underline"
                >
                  Review {sel.due}
                </Link>
              )}
            </span>
          </>
        ) : (
          // Nothing selected: the course's own figures, not an instruction.
          // How to use the tree lives behind the dialog's info button.
          <span className="mt-6 text-small text-text-3">
            {sections.length} section{sections.length === 1 ? '' : 's'}
            {courseDue > 0 ? ` · ${courseDue} due for review` : ''}
          </span>
        )}
      </div>
    </div>
  );
}
