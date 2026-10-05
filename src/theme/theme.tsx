import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export const THEMES = ['purple', 'turquoise', 'gold', 'blue'] as const
export type Theme = (typeof THEMES)[number]
// Цвет кружка в переключателе (только превью)
export const THEME_SWATCH: Record<Theme, string> = {
  purple: '#9333EA', turquoise: '#06B6D4', gold: '#C9962A', blue: '#2563EB',
}
const META: Record<Theme, string> = { purple: '#0B0818', turquoise: '#050D13', gold: '#FAF6EE', blue: '#F3F8FF' }
const KEY = 'ft.theme'

const Ctx = createContext<{ theme: Theme; setTheme: (t: Theme) => void }>({ theme: 'purple', setTheme: () => {} })
export const useTheme = () => useContext(Ctx)

function initial(): Theme {
  try {
    const s = localStorage.getItem(KEY) as Theme | null
    if (s && THEMES.includes(s)) return s
  } catch { /* приватный режим */ }
  return 'purple'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(initial)
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', META[theme])
    try { localStorage.setItem(KEY, theme) } catch { /* ignore */ }
  }, [theme])
  return <Ctx.Provider value={{ theme, setTheme: setThemeState }}>{children}</Ctx.Provider>
}
