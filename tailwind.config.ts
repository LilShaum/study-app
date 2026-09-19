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
        // A card that outranks its neighbours, and an inset well. Without
        // these there was one surface and therefore no visual hierarchy.
        'surface-raised': 'var(--color-surface-raised)',
        'surface-sunken': 'var(--color-surface-sunken)',
        border: 'var(--color-border)',
        'border-light': 'var(--color-border-light)',
        // For the outline of a control, which needs 3:1 (WCAG 1.4.11).
        'border-strong': 'var(--color-border-strong)',

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
        display: 'var(--font-display)',
        mono: 'var(--font-mono)',
      },
      fontSize: {
        // A real scale, replacing a page built almost entirely from 14px and
        // 12px. Line heights are part of the token: a display size set solid
        // and body text set open is most of what makes a page read well.
        micro: ['var(--text-micro)', { lineHeight: '1.4' }],
        small: ['var(--text-small)', { lineHeight: '1.55' }],
        body: ['var(--text-body)', { lineHeight: '1.65' }],
        heading: ['var(--text-heading)', { lineHeight: '1.4', letterSpacing: '-0.005em' }],
        title: ['var(--text-title)', { lineHeight: '1.25', letterSpacing: '-0.012em' }],
        display: ['var(--text-display)', { lineHeight: '1.12', letterSpacing: '-0.02em' }],
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
