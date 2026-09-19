import { createHashRouter } from 'react-router-dom';
import { RootLayout } from '@/app/RootLayout';
import { RouteError } from '@/app/RouteError';
import { LibraryRoute } from '@/routes/LibraryRoute';
import { CourseRoute } from '@/routes/CourseRoute';
import { SessionRoute } from '@/routes/SessionRoute';
import { ProgressRoute } from '@/routes/ProgressRoute';
import { SectionRoute } from '@/routes/SectionRoute';

// Hash routing (createHashRouter) is required, not a preference — GitHub
// Pages serves this as a static site with no server-side rewrite, so a
// path-based SPA router 404s on refresh/deep-link. Hash routes always
// resolve client-side against index.html.
export const router = createHashRouter([
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <LibraryRoute /> },
      { path: 'study/:id', element: <CourseRoute /> },
      { path: 'study/:id/progress', element: <ProgressRoute /> },
      { path: 'study/:id/section/:sectionId', element: <SectionRoute /> },
      { path: 'session/:id/:mode', element: <SessionRoute /> },
      { path: '*', element: <LibraryRoute /> },
    ],
  },
]);
