import type { Config } from 'tailwindcss';

/**
 * Semantic tokens map straight onto the CSS custom properties defined in
 * src/styles/theme.css. Those variables are the single source of truth for
 * color — they shift automatically with the [data-theme] (light/dark) and
 * [data-tree] (default/winter/banyan/fig) attributes on <html>, so a utility
 * like `bg-surface text-text-2` re-themes for free with zero JS.
 */
export default {
  darkMode: ['selector', '[data-theme="dark"]'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--color-bg)',
        surface: 'var(--color-surface)',
        border: 'var(--color-border)',
        'border-light': 'var(--color-border-light)',

        text: 'var(--color-text)',
        'text-2': 'var(--color-text-2)',
        'text-3': 'var(--color-text-3)',

        accent: {
          DEFAULT: 'var(--color-accent)',
          hover: 'var(--color-accent-hover)',
          light: 'var(--color-accent-light)',
          border: 'var(--color-accent-border)',
        },
        success: {
          DEFAULT: 'var(--color-success)',
          hover: 'var(--color-success-hover)',
          bg: 'var(--color-success-bg)',
        },
        error: {
          DEFAULT: 'var(--color-error)',
          hover: 'var(--color-error-hover)',
          bg: 'var(--color-error-bg)',
        },
        warning: {
          DEFAULT: 'var(--color-warning)',
          bg: 'var(--color-warning-bg)',
        },
        easy: { DEFAULT: 'var(--color-easy)', bg: 'var(--color-easy-bg)' },
        medium: { DEFAULT: 'var(--color-medium)', bg: 'var(--color-medium-bg)' },
        hard: { DEFAULT: 'var(--color-hard)', bg: 'var(--color-hard-bg)' },
      },
      fontFamily: {
        sans: 'var(--font)',
        mono: 'var(--font-mono)',
      },
      borderRadius: {
        DEFAULT: 'var(--radius)',
        sm: 'var(--radius-sm)',
        lg: 'var(--radius-lg)',
      },
      boxShadow: {
        DEFAULT: 'var(--shadow)',
        md: 'var(--shadow-md)',
      },
      spacing: {
        sidebar: 'var(--sidebar-w)',
        header: 'var(--header-h)',
      },
    },
  },
  plugins: [],
} satisfies Config;
