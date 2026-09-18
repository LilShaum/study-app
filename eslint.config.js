import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default tseslint.config(
  { ignores: ['dist', 'dev-dist', 'node_modules', 'coverage'] },

  // Application + test sources.
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.es2022 },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,

      // Fast Refresh only works when a module exports components and nothing
      // else. Constant exports (TYPE_LABELS, MODES, …) are fine and common
      // here, so allow them rather than splitting files to satisfy the rule.
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      // The codebase uses a leading underscore for deliberately-unused
      // bindings and for store internals (_hydrateFromLegacy), so honour that
      // convention instead of flagging them.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' },
      ],
    },
  },

  // The service worker runs in a worker scope, not the browser window.
  {
    files: ['src/sw.ts'],
    languageOptions: { globals: { ...globals.serviceworker } },
  },

  // Config files run in Node.
  {
    files: ['*.config.{ts,js}', 'vitest.config.ts', 'vite.config.ts'],
    languageOptions: { globals: { ...globals.node } },
  },
);
