import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--theme-font)', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        theme: 'var(--theme-radius)',
        'theme-lg': 'var(--theme-radius-lg)',
      },
      colors: {
        background: 'rgb(var(--background-rgb) / <alpha-value>)',
        foreground: 'rgb(var(--foreground-rgb) / <alpha-value>)',
        primary: {
          DEFAULT: 'rgb(var(--primary-rgb) / <alpha-value>)',
          hover: 'rgb(var(--primary-hover-rgb) / <alpha-value>)',
        },
        secondary: 'rgb(var(--secondary-rgb) / <alpha-value>)',
        surface: {
          DEFAULT: 'rgb(var(--surface-rgb) / <alpha-value>)',
          hover: 'rgb(var(--surface-hover-rgb) / <alpha-value>)',
          raised: 'rgb(var(--surface-raised-rgb) / <alpha-value>)',
          'raised-hover': 'rgb(var(--surface-raised-hover-rgb) / <alpha-value>)',
        },
        border: {
          DEFAULT: 'rgb(var(--border-rgb) / <alpha-value>)',
          light: 'rgb(var(--border-light-rgb) / <alpha-value>)',
        }
      },
      boxShadow: {
        // Theme-aware shadows using CSS variables
        // These can be customized per-layout via admin UI
        'theme': 'var(--theme-shadow)',
        'theme-lg': 'var(--theme-shadow-lg)',
        // Legacy fallbacks (hardcoded)
        'soft': '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
        'glow': '0 0 15px rgba(0, 113, 227, 0.15)',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};

export default config;
