import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Course } from '@/schema/course';
import { sortedSections } from '@/lib/sortedSections';
import { EditableItem } from '@/components/items/EditableItem';
import { AddItemButton } from '@/components/items/AddItemButton';

interface BrowseSessionProps {
  courseId: string;
  course: Course;
}

/**
 * "Browse" mode — every item, in order, editable in place.
 *
 * The section nav restores something the vanilla app had and the first rebuild
 * dropped: without it a long course is an unnavigable scroll. Sidebar on wide
 * screens, horizontally-scrolling chips on phones (a fixed sidebar would eat
 * most of a 375px viewport).
 */
export function BrowseSession({ courseId, course }: BrowseSessionProps) {
  const sections = useMemo(() => sortedSections(course), [course]);
  const [activeSection, setActiveSection] = useState<string | null>(sections[0]?.id ?? null);
  const sectionRefs = useRef(new Map<string, HTMLElement>());

  // Highlight whichever section is currently nearest the top of the viewport.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible?.target.id) setActiveSection(visible.target.id.replace('section-', ''));
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0 },
    );

    for (const el of sectionRefs.current.values()) observer.observe(el);
    return () => observer.disconnect();
  }, [course]);

  const scrollToSection = (id: string) => {
    // Always an instant jump, whatever the motion preference, because a smooth
    // one lands in the wrong place here. Entries off screen are not laid out
    // (see .browse-entry), so a smooth scroll aims at a position computed from
    // their estimated heights and then renders every entry it passes, each
    // growing to its real size and pushing the target further down: measured,
    // a jump to the last section stopped 9,488px short. An instant jump never
    // renders the entries above the target, so the target stays where it was
    // aimed. Across tens of thousands of pixels a smooth scroll was a blur
    // anyway, not motion anyone could follow.
    const target = sectionRefs.current.get(id);
    if (!target) return;
    target.scrollIntoView({ behavior: 'auto', block: 'start' });
    // Where the jump put it — the scroll margin — which is where it should stay.
    const want = target.getBoundingClientRect().top;
    // Then keep checking, a frame at a time, and re-aim if it has drifted.
    // Entries the jump brought into the browser's render margin take their
    // real heights a few frames later, and going UP they sit above the target
    // and push it down by about one entry. The check has to read the position
    // at the START of a frame: measured straight after scrollIntoView it still
    // reports the aimed position, because that layout has not happened yet —
    // an earlier version of this loop checked there, saw it "stable", and
    // stopped one frame before the shift. Stops once on target for three
    // frames running, or after thirty regardless.
    let onTarget = 0;
    let frames = 0;
    const settle = () => {
      if (Math.abs(target.getBoundingClientRect().top - want) > 1) {
        target.scrollIntoView({ behavior: 'auto', block: 'start' });
        onTarget = 0;
      } else {
        onTarget += 1;
      }
      if (onTarget < 3 && ++frames < 30) requestAnimationFrame(settle);
    };
    requestAnimationFrame(settle);
    setActiveSection(id);
  };

  const hasNav = sections.length > 1;

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-4 flex items-center gap-3">
        <Link to={`/study/${courseId}`} className="text-sm text-text-2 hover:text-text">
          ← Back
        </Link>
        <span className="mark text-text-3">Browse</span>
      </div>
      <h1 className="mb-6 font-display text-display font-semibold text-text">{course.metadata.title}</h1>

      {hasNav && (
        <nav
          aria-label="Sections"
          className="sticky top-0 z-10 -mx-6 mb-4 flex gap-2 overflow-x-auto bg-bg px-6 py-2 lg:hidden"
        >
          {sections.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => scrollToSection(s.id)}
              className={`shrink-0 rounded border px-3 py-1 text-xs transition-colors ${
                activeSection === s.id
                  ? 'border-border-strong bg-surface-sunken font-medium text-text'
                  : 'border-border text-text-2'
              }`}
            >
              {s.title}
            </button>
          ))}
        </nav>
      )}

      <div className={hasNav ? 'lg:flex lg:gap-8' : undefined}>
        {hasNav && (
          <aside className="hidden shrink-0 lg:block lg:w-56">
            <nav aria-label="Sections" className="sticky top-6 space-y-1">
              {sections.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => scrollToSection(s.id)}
                  className={`block w-full rounded px-3 py-1.5 text-left text-sm transition-colors ${
                    activeSection === s.id
                      ? 'bg-surface-sunken font-medium text-text'
                      : 'text-text-2 hover:text-text'
                  }`}
                >
                  {s.title}
                </button>
              ))}
            </nav>
          </aside>
        )}

        <div className="min-w-0 flex-1">
          {sections.map((section) => (
            <section
              key={section.id}
              id={`section-${section.id}`}
              ref={(el) => {
                if (el) sectionRefs.current.set(section.id, el);
                else sectionRefs.current.delete(section.id);
              }}
              className="mb-10 scroll-mt-20"
            >
              <h2 className="font-display text-title font-semibold text-text">{section.title}</h2>
              {section.description && <p className="mt-1 text-sm text-text-2">{section.description}</p>}
              <div className="mt-4 space-y-4">
                {section.items.map((item) => (
                  <div key={item.id} className="browse-entry">
                    <EditableItem courseId={courseId} sectionId={section.id} item={item} />
                  </div>
                ))}
                <AddItemButton courseId={courseId} sectionId={section.id} />
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
