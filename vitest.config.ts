import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

// Kept separate from vite.config.ts so the production build config doesn't
// carry test-only concerns; the alias and plugins are inherited via merge.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      include: ['src/**/*.test.{ts,tsx}'],
      restoreMocks: true,
    },
  }),
);
