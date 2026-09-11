import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { runLegacyMigration } from '@/store/migrateLegacy';
import { router } from './router';
import '@/styles/index.css';

// Must run before the stores are read by any component — imports above have
// already created (and synchronously rehydrated) them, so this just seeds
// data from the vanilla app's localStorage keys into the new ones if needed.
runLegacyMigration();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
