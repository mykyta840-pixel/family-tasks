import { defineConfig } from 'vitest/config'

// Тесты проверяют только «чистую» логику (даты, фильтры, тексты ошибок), браузер и Supabase не нужны.
// Даты в тестах считаются от «сегодня» по местному времени, поэтому они идут одинаково в любом часовом поясе.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
