import ru from './locales/ru'

export type TFn = (key: string, vars?: Record<string, string | number>) => string

// Русский перевод без React: по умолчанию для чистой логики (ошибки, «5 мин назад») и для тестов
export const ruT: TFn = (key, vars) => {
  const raw = (ru as Record<string, string>)[key] ?? key
  return vars ? raw.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`)) : raw
}
