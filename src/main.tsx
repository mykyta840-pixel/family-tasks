import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { ThemeProvider } from './theme/theme'
import { I18nProvider } from './i18n'
import './index.css'
import { armSplashFailsafe, installResumeSplash } from './lib/splash'

armSplashFailsafe()
installResumeSplash()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <I18nProvider>
        <App />
      </I18nProvider>
    </ThemeProvider>
  </React.StrictMode>,
)
