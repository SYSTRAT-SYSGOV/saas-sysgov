/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // UIKIT GOVBR V3 - Paleta Principal
        gov: {
          primary: {
            DEFAULT: 'var(--gov-primary, #1351B4)',
            hover: 'var(--gov-primary-hover, #0C326F)',
            active: 'var(--gov-primary-active, #071D41)',
            light: 'var(--gov-primary-light, #E8F0FE)',
            border: 'var(--gov-primary-border, #C5D8F6)',
          },
          accent: {
            gold: 'var(--gov-accent-gold, #F6A609)',
            yellow: 'var(--gov-accent-yellow, #FFCD07)',
            cyan: 'var(--gov-accent-cyan, #06B6D4)',
            indigo: 'var(--gov-accent-indigo, #6366F1)',
          },
          page: 'var(--gov-bg-page, #F8F9FA)',
          surface: 'var(--gov-bg-surface, #FFFFFF)',
          alternative: 'var(--gov-bg-alternative, #071D41)',
          border: 'var(--gov-border, #D8DCE0)',
          text: {
            primary: 'var(--gov-text-primary, #1B1B1B)',
            secondary: 'var(--gov-text-secondary, #555555)',
            muted: 'var(--gov-text-muted, #888888)',
          },
        },
        // Semáforo Fiscal & Status
        status: {
          success: {
            DEFAULT: 'var(--status-success-base, #168821)',
            bg: 'var(--status-success-bg, #E8F5E9)',
            border: 'var(--status-success-border, #A5D6A7)',
          },
          warning: {
            DEFAULT: 'var(--status-warning-base, #F2A71B)',
            bg: 'var(--status-warning-bg, #FFF8E1)',
            border: 'var(--status-warning-border, #FFE082)',
          },
          danger: {
            DEFAULT: 'var(--status-danger-base, #E52207)',
            bg: 'var(--status-danger-bg, #FDECEA)',
            border: 'var(--status-danger-border, #F5C6CB)',
          },
          info: {
            DEFAULT: 'var(--status-info-base, #155BCB)',
            bg: 'var(--status-info-bg, #E8F0FE)',
            border: 'var(--status-info-border, #A9C6F0)',
          },
        },
      },
      fontFamily: {
        sans: ['"Inter"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        mono: ['"Inter"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        inter: ['"Inter"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
      fontSize: {
        'heading-main': ['36px', { lineHeight: '40px', fontWeight: '600' }],
      },
      fontWeight: {
        semibold: '600',
        bold: '600',
        heading: '600',
      },
      borderRadius: {
        sm: '4px',
        md: '8px',
        lg: '12px',
        full: '9999px',
        pill: '9999px',
      },
      boxShadow: {
        sm: '0 1px 3px rgba(0, 0, 0, 0.08)',
        md: '0 4px 8px rgba(0, 0, 0, 0.1)',
        lg: '0 12px 24px rgba(0, 0, 0, 0.12)',
      },
    },
  },
  plugins: [],
};
