import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

// The simulator (sim/, see .claude/skills/simulate) runs the app's own
// session and memory code over simulated weeks. It is slow and is not a
// test, so it has its own config and never runs with `npm test`.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      include: ['sim/**/*.sim.ts'],
      testTimeout: 3_600_000,
    },
  }),
);
