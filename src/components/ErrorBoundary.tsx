import { Component, type ErrorInfo, type ReactNode } from 'react'

// Если в приложении что-то сломалось, показываем понятный экран вместо белого листа
export default class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Ошибка приложения:', error, info.componentStack)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="mx-auto flex min-h-full max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="text-5xl">😕</div>
        <h1 className="font-display text-xl font-semibold">Что-то пошло не так</h1>
        <p className="text-ink/70">Ваши баллы и задания в безопасности. Обновите приложение.</p>
        <button className="btn-primary w-full" onClick={() => window.location.reload()}>
          Обновить
        </button>
      </div>
    )
  }
}
