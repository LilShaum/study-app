import { createHashRouter, Navigate } from 'react-router-dom';
import { RootLayout } from '@/app/RootLayout';
import { RouteError } from '@/app/RouteError';
import { LibraryRoute } from '@/routes/LibraryRoute';
import { CourseRoute } from '@/routes/CourseRoute';
import { SessionRoute } from '@/routes/SessionRoute';
import { ProgressRoute } from '@/routes/ProgressRoute';
import { SectionRoute } from '@/routes/SectionRoute';
import { DiagramsRoute } from '@/routes/DiagramsRoute';
import { PracticeRoute } from '@/routes/PracticeRoute';
import { SetAsideRoute } from '@/routes/SetAsideRoute';
import { GlossaryRoute } from '@/routes/GlossaryRoute';
import { HelpRoute } from '@/routes/HelpRoute';
import { SettingsRoute } from '@/routes/SettingsRoute';
import { SharedRoute } from '@/routes/SharedRoute';
import { ClassRoute } from '@/routes/ClassRoute';
import { TestRoute } from '@/routes/TestRoute';
import { AccountRoute } from '@/routes/AccountRoute';

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
      { path: 'study/:id/diagrams', element: <DiagramsRoute /> },
      { path: 'study/:id/glossary', element: <GlossaryRoute /> },
      { path: 'study/:id/practice', element: <PracticeRoute /> },
      { path: 'study/:id/test', element: <TestRoute /> },
      { path: 'study/:id/set-aside', element: <SetAsideRoute /> },
      { path: 'class/:code', element: <ClassRoute /> },
      { path: 'class/:code/test', element: <TestRoute /> },
      { path: 'class/:code/practice', element: <PracticeRoute /> },
      { path: 'help', element: <HelpRoute /> },
      { path: 'settings', element: <SettingsRoute /> },
      // Sync became part of Settings (docs/proposals/settings.md); old links still land.
      { path: 'sync', element: <Navigate to="/settings" replace /> },
      { path: 'account', element: <AccountRoute /> },
      { path: 'shared/:id', element: <SharedRoute /> },
      { path: 'session/:id/:mode', element: <SessionRoute /> },
      { path: '*', element: <LibraryRoute /> },
    ],
  },
]);
