import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Frown, RefreshCw } from 'lucide-react'
import { useI18n } from '../i18n'
import { hideSplash } from '../lib/splash'

// Экран-заглушка (функция, чтобы взять язык через хук)
function Fallback() {
  const { t } = useI18n()
  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="grid h-20 w-20 place-items-center rounded-3xl border border-warn/30 bg-warn-soft text-warn shadow-card">
        <Frown size={40} aria-hidden />
      </div>
      <h1 className="font-display text-xl font-semibold">{t('boundary.title')}</h1>
      <p className="text-ink/70">{t('boundary.text')}</p>
      <button className="btn-primary w-full" onClick={() => window.location.reload()}>
        <RefreshCw size={18} aria-hidden /> {t('boundary.reload')}
      </button>
    </div>
  )
}

// Если в приложении что-то сломалось, показываем понятный экран вместо белого листа
export default class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Ошибка приложения:', error, info.componentStack)
    hideSplash(true) // экран ошибки не должен прятаться под заставкой
  }

  render() {
    if (!this.state.failed) return this.props.children
    return <Fallback />
  }
}
