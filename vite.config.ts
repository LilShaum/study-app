import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages serves this repo from https://lilshaum.github.io/study-app/
// so every asset URL and the hash router live under this base path.
const BASE = '/study-app/';

/**
 * A Content-Security-Policy for the built page, as a <meta> because GitHub
 * Pages cannot send headers. It is the second layer behind prepareSvg's
 * sanitizer for diagrams from shared courses: even markup that got through
 * could not run a script or send anything anywhere but this site and the
 * sync server. Build only: the dev server injects scripts of its own.
 *
 * Inline scripts (the theme stamp in index.html) are allowed by hash, worked
 * out here from the page itself, so editing one cannot silently break it.
 */
function contentSecurityPolicy(): Plugin {
  const supabase = readFileSync(new URL('./src/lib/cloud.ts', import.meta.url), 'utf8').match(/https:\/\/[a-z0-9-]+\.supabase\.co/)?.[0];
  return {
    name: 'content-security-policy',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        const hashes = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(
          ([, body]) => `'sha256-${createHash('sha256').update(body).digest('base64')}'`,
        );
        const policy = [
          "default-src 'self'",
          `script-src 'self' ${hashes.join(' ')}`,
          // React and the diagrams set style attributes.
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: blob:",
          "font-src 'self' data:",
          `connect-src 'self'${supabase ? ` ${supabase} ${supabase.replace('https:', 'wss:')}` : ''}`,
          "worker-src 'self'",
          "manifest-src 'self'",
          "object-src 'none'",
          "base-uri 'self'",
          "form-action 'self'",
        ].join('; ');
        // First in <head>: a policy only covers what comes after it.
        return html.replace(/<meta charset="UTF-8" \/>/, (m) => `${m}\n  <meta http-equiv="Content-Security-Policy" content="${policy}" />`);
      },
    },
  };
}

export default defineConfig({
  base: BASE,
  build: {
    rollupOptions: {
      output: {
        // Split the dependencies out of the app chunk. Nothing is downloaded
        // less often — the service worker precaches every chunk either way —
        // but the vendor chunk keeps its content hash across a deploy that
        // only touches app code, so returning users refetch the small chunk
        // instead of the whole bundle.
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          vendor: ['zustand', 'zod', '@radix-ui/react-dropdown-menu', '@radix-ui/react-toast', 'clsx'],
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  plugins: [
    react(),
    contentSecurityPolicy(),
    VitePWA({
      // We hand-author the service worker (src/sw.ts); the plugin only injects
      // the precache manifest of Vite's content-hashed output into it.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      // The web app manifest is shipped as a static file in public/, not generated.
      manifest: false,
      injectManifest: {
        // woff2 included deliberately: the display face is part of the
        // app's identity, and an installed app that falls back to a system
        // serif offline looks broken in exactly the state it is meant to
        // shine in. It is fingerprinted, so caching it is safe forever.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest,woff2}'],
      },
      devOptions: {
        // Keep the SW out of the way during `npm run dev`.
        enabled: false,
      },
    }),
  ],
});
