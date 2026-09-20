import { Link, Outlet, useLocation, useParams } from 'react-router-dom';
import { ThemeEffect } from '@/components/ThemeEffect';
import { DarkModeToggle } from '@/components/DarkModeToggle';
import { Toaster } from '@/components/Toaster';
import { Onboarding } from '@/components/Onboarding';
import { Sprig } from '@/components/Sprig';
import { Fleuron } from '@/components/Fleuron';
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
  const courses = useCoursesStore((s) => s.courses);
  const id = params.id;
  const course = id ? courses[id] : undefined;
  const title = course?.metadata.course_code || course?.metadata.title;

  if (pathname === '/help') return 'Using Arborous';
  if (pathname.startsWith('/session/')) return title ?? 'Session';
  if (pathname.includes('/progress')) return title ? `${title} · Progress` : 'Progress';
  if (pathname.includes('/diagrams')) return title ? `${title} · Plates` : 'Plates';
  if (title) return title;
  return 'The library';
}

export function RootLayout() {
  const here = useLocationName();

  return (
    <div className="app-shell paper-grain flex min-h-screen flex-col bg-bg">
      <ThemeEffect />
      {/* The running head, not a nav bar.
          The page used to sit in an `lg:` rounded, bordered, shadowed box —
          a card on a backdrop, which is a dashboard's anatomy, not a
          printed page's. Here the viewport IS the sheet: the paper runs to
          every edge and the text block is set inside it by its own margins,
          the way a page is trimmed rather than pasted down. */}
      <header className="app-header page-block shrink-0">
        <div className="flex min-h-header items-end justify-between gap-4 pb-2">
          <Link
            to="/"
            className="mark flex items-center gap-2 text-text hover:text-accent"
            aria-label="Arborous — back to the library"
          >
            <Sprig className="h-5" />
            Arborous
          </Link>
          {/* Truncates rather than wraps: a running head that grows to two
              lines pushes the whole page down as you navigate. */}
          <span className="mark min-w-0 truncate text-text-3">{here}</span>
        </div>
        <div className="rule-oxford" />
      </header>

      <main className="page-block flex-1 py-8">
        <Outlet />
      </main>

      {/* The colophon closes the page the way a book does, and is where the
          things you set once and forget live. They were in the head, which
          is what made it read as a toolbar. */}
      <footer className="page-block shrink-0 pb-8 pt-10">
        <Fleuron className="mb-5" />
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
