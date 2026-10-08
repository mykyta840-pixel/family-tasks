import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import en from './locales/en'
import de from './locales/de'
import ru from './locales/ru'
import uk from './locales/uk'

/* Чтобы добавить 5-й язык: 1) файл locales/xx.ts с теми же ключами, 2) одна строка в LOCALES ниже. */
export const LOCALES = {
  en: { name: 'English', flag: '🇬🇧', dict: en },
  de: { name: 'Deutsch', flag: '🇩🇪', dict: de },
  ru: { name: 'Русский', flag: '🇷🇺', dict: ru },
  uk: { name: 'Українська', flag: '🇺🇦', dict: uk },
} as const
export type Lang = keyof typeof LOCALES
export const LANGS = Object.keys(LOCALES) as Lang[]
export type Dict = Record<string, string>

const KEY = 'ft.lang'
export const isLang = (v: unknown): v is Lang => typeof v === 'string' && v in LOCALES

function detect(): Lang {
  try {
    const s = localStorage.getItem(KEY)
    if (isLang(s)) return s
  } catch { /* ignore */ }
  const n = navigator.language?.slice(0, 2)
  return isLang(n) ? n : 'en'
}

/** Перевод по ключу; {name} подставляется из vars. Нет ключа -> английский -> сам ключ. */
export function translate(lang: Lang, key: string, vars?: Record<string, string | number>): string {
  const raw = (LOCALES[lang].dict as Dict)[key] ?? (en as Dict)[key] ?? key
  return vars ? raw.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`)) : raw
}

const Ctx = createContext<{
  lang: Lang
  setLang: (l: Lang) => void
  /** Язык из профиля (после входа). null = вернуться к локальному выбору. */
  setForced: (l: Lang | null) => void
  t: (key: string, vars?: Record<string, string | number>) => string
}>({ lang: 'en', setLang: () => {}, setForced: () => {}, t: (k) => k })
export const useI18n = () => useContext(Ctx)

/** `forceLang` — язык, назначенный человеку (ребёнку его выбирает родитель). Перекрывает локальный выбор. */
export function I18nProvider({ children, forceLang }: { children: ReactNode; forceLang?: Lang | null }) {
  const [local, setLocal] = useState<Lang>(detect)
  const [forced, setForced] = useState<Lang | null>(null)
  const lang = forceLang && isLang(forceLang) ? forceLang : forced ?? local
  useEffect(() => { document.documentElement.lang = lang }, [lang])
  const setLang = useCallback((l: Lang) => {
    setLocal(l)
    try { localStorage.setItem(KEY, l) } catch { /* ignore */ }
  }, [])
  const t = useCallback((k: string, v?: Record<string, string | number>) => translate(lang, k, v), [lang])
  const value = useMemo(() => ({ lang, setLang, setForced, t }), [lang, setLang, t])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
