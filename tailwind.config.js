/** @type {import('tailwindcss').Config} */
const c = (v) => `rgb(var(--${v}) / <alpha-value>)`
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: c('ink'),
        paper: c('bg'),
        surface: c('surface'),
        'on-brand': c('on-brand'),
        brand: { DEFAULT: c('brand'), soft: c('brand-soft'), dark: c('brand-dark') },
        star: { DEFAULT: c('star'), soft: c('star-soft') },
        ok: { DEFAULT: c('ok'), soft: c('ok-soft') },
        review: { DEFAULT: c('review'), soft: c('review-soft') },
        warn: { DEFAULT: c('warn'), soft: c('warn-soft') },
      },
      fontFamily: {
        sans: ['Onest', 'system-ui', 'sans-serif'],
        display: ['Unbounded', 'Onest', 'system-ui', 'sans-serif'],
      },
      borderRadius: { card: '20px', ctl: '14px' },
      boxShadow: { card: 'var(--shadow-card)', glow: 'var(--shadow-glow)' },
      transitionDuration: { fast: '120ms', base: '200ms' },
    },
  },
  plugins: [],
}
