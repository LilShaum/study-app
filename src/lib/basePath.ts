/**
 * The path this app is served from.
 *
 * Single source of truth: vite.config.ts sets `base`, and Vite exposes it as
 * import.meta.env.BASE_URL. The service worker previously hardcoded its own
 * copy of "/study-app/", so moving the deployment would have broken the
 * offline navigation fallback while everything else kept working.
 */
export const BASE_PATH = import.meta.env.BASE_URL;
