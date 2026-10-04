/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1E1B4B',        // основной тёмный текст
        brand: { DEFAULT: '#4F46E5', soft: '#EEF0FF', dark: '#3730A3' },
        star: { DEFAULT: '#F5A524', soft: '#FFF4DB' },   // баллы
        ok: { DEFAULT: '#1FA971', soft: '#DDF6EA' },     // подтверждено
        review: { DEFAULT: '#8B5CF6', soft: '#EFE8FF' }, // на проверке
        warn: { DEFAULT: '#E5484D', soft: '#FDE8E9' },   // отклонено / ошибка
        paper: '#F5F6FB',
      },
      fontFamily: {
        sans: ['Onest', 'system-ui', 'sans-serif'],
        display: ['Unbounded', 'Onest', 'system-ui', 'sans-serif'],
      },
      borderRadius: { card: '22px' },
      boxShadow: { card: '0 6px 24px -10px rgba(30,27,75,0.25)' },
    },
  },
  plugins: [],
}
