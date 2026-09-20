import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages serves this repo from https://lilshaum.github.io/study-app/
// so every asset URL and the hash router live under this base path.
const BASE = '/study-app/';

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
