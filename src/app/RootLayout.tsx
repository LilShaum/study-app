import { Link, Outlet, useLocation, useParams } from 'react-router-dom';
import { ThemeEffect } from '@/components/ThemeEffect';
import { DarkModeToggle } from '@/components/DarkModeToggle';
import { Toaster } from '@/components/Toaster';
import { Onboarding } from '@/components/Onboarding';
import { Sprig } from '@/components/Sprig';
import { useCoursesStore } from '@/store/courses';

/**
 * What the running head says on the right — where in the work you are.
 *
 * A book's head carries the work on the verso and the chapter on the recto.
 * On a single column both sit on one line, so this resolves the second half
 * from the route: the course you are in, or the name of the apparatus you
 * have opened. Derived rather than published by each route, so a new page
 * cannot forget to set it and leave the head lying.
 */
function useLocationName(): string {
  const { pathname } = useLocation();
  const params = useParams();
  const id = params.id;
  // Select the one string the head shows. Subscribing to the whole courses
  // map re-rendered the shell — and everything under its Outlet — whenever
  // any course anywhere changed. A primitive only changes when this does.
  const title = useCoursesStore((s) => {
    const course = id ? s.courses[id] : undefined;
    return course?.metadata.course_code || course?.metadata.title;
  });

  if (pathname === '/help') return 'Using Arborous';
  if (pathname.startsWith('/session/')) return title ?? 'Session';
  if (pathname.includes('/progress')) return title ? `${title} · Progress` : 'Progress';
  if (pathname.includes('/diagrams')) return title ? `${title} · Plates` : 'Plates';
  if (title) return title;
  return 'The library';
}

export function RootLayout() {
  const here = useLocationName();
  const { pathname } = useLocation();
  // The course page is laid out in two columns on a desktop; head, page and
  // colophon widen together so the rules still line up.
  const wide = /^\/study\/[^/]+$/.test(pathname) ? ' is-wide' : '';

  return (
    <div className="app-shell paper-grain flex min-h-screen flex-col bg-bg">
      <ThemeEffect />
      {/* The running head, not a nav bar.
          The page used to sit in an `lg:` rounded, bordered, shadowed box —
          a card on a backdrop, which is a dashboard's anatomy, not a
          printed page's. Here the viewport IS the sheet: the paper runs to
          every edge and the text block is set inside it by its own margins,
          the way a page is trimmed rather than pasted down. */}
      <header className={`app-header page-block shrink-0${wide}`}>
        <div className="flex min-h-header items-end justify-between gap-4 pb-2">
          {/* shrink-0 and whitespace-nowrap are both load-bearing. Without
              them a long location on the right squeezed this side until the
              wordmark wrapped, leaving a lone "s" on a second line and
              pushing the whole page down. The work's name is fixed
              furniture; it is the location that gives way. */}
          <Link
            to="/"
            className="mark flex shrink-0 items-center gap-2 whitespace-nowrap text-text hover:text-accent"
            aria-label="Arborous — back to the library"
          >
            <Sprig size={20} />
            Arborous
          </Link>
          {/* Capped well short of the full width so it clips before it can
              crowd the wordmark, rather than at the moment they collide. */}
          <span className="mark min-w-0 max-w-[50%] truncate text-text-3">{here}</span>
        </div>
        <div className="rule-oxford" />
      </header>

      <main className={`page-block flex-1 py-8${wide}`}>
        <Outlet />
      </main>

      {/* The colophon closes the page the way a book does, and is where the
          things you set once and forget live. They were in the head, which
          is what made it read as a toolbar.

          The mark here is the whole sprig, not the single leaf it used to
          be. Those are two different devices doing two different jobs: a
          fleuron is a neutral ornament that divides one section from the
          next, which is what it still does mid-page, while a book ends with
          the printer's own device. Using the leaf for both left an
          unexplained mark at the foot of every page. */}
      <footer className={`page-block shrink-0 pb-8 pt-10${wide}`}>
        <div className="mb-5 flex justify-center text-text-3">
          <Sprig size={22} />
        </div>
        <div className="flex items-center justify-center gap-5">
          <Link to="/help" className="press press-quiet">
            Help
          </Link>
          <DarkModeToggle />
        </div>
      </footer>

      <Toaster />
      <Onboarding />
    </div>
  );
}
