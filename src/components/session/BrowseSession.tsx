import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Course } from '@/schema/course';
import { sortedSections } from '@/lib/sortedSections';
import { EditableItem } from '@/components/items/EditableItem';
import { AddItemButton } from '@/components/items/AddItemButton';
import { scrollBehavior } from '@/lib/motion';

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
    sectionRefs.current.get(id)?.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
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
                  <EditableItem key={item.id} courseId={courseId} sectionId={section.id} item={item} />
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
