import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { isConfigured } from './lib/supabase'
import { hideSplash, splashReady } from './lib/splash'
import { useEffect, useRef } from 'react'
import { AuthProvider, useAuth } from './auth/AuthProvider'
import { isLang, useI18n } from './i18n'
import { callRpc } from './lib/actions'
import { FamilyDataProvider, useFamilyData } from './data/FamilyData'
import { NotificationsProvider } from './data/Notifications'
import ConfigMissing from './components/ConfigMissing'
import Shell from './components/Shell'
import ErrorBoundary from './components/ErrorBoundary'
import PushBridge from './components/PushBridge'
import WelcomeTour from './components/WelcomeTour'
import Auth from './pages/Auth'
import Onboarding from './pages/Onboarding'
import ResetPassword from './pages/ResetPassword'
import FamilyHome from './pages/FamilyHome'
import ParentDashboard from './pages/ParentDashboard'
import ChildHome from './pages/ChildHome'
import TaskList from './pages/TaskList'
import TaskForm from './pages/TaskForm'
import ChildShop from './pages/ChildShop'
import ParentRewards from './pages/ParentRewards'
import History from './pages/History'
import Profile from './pages/Profile'
import Settings from './pages/Settings'

// Язык, сохранённый в профиле, перекрывает локальный выбор (на всех устройствах человека язык один).
// Если в профиле языка ещё нет (новый участник), записываем туда тот, что сейчас на экране.
function LanguageSync() {
  const { profile, session, refresh } = useAuth()
  const { lang, setForced } = useI18n()
  const saved = profile?.language
  const langRef = useRef(lang)
  langRef.current = lang
  const asked = useRef<string | null>(null)
  useEffect(() => {
    setForced(isLang(saved) ? saved : null)
  }, [saved, setForced])
  const uid = session?.user.id
  const loaded = !!profile
  useEffect(() => {
    if (!uid || !loaded || isLang(saved) || asked.current === uid) return
    asked.current = uid // одна попытка за вход: при сбое не зацикливаемся
    callRpc('set_member_language', { p_user: uid, p_lang: langRef.current })
      .then(() => refresh())
      .catch(() => { /* язык запишется при следующем входе или в «Настройках» */ })
  }, [uid, loaded, saved, refresh])
  return null
}

// Заставка ждёт и первую загрузку данных семьи (задания, дети, награды)
function SplashDataReady() {
  const { loading } = useFamilyData()
  useEffect(() => {
    if (!loading) splashReady('data')
  }, [loading])
  return null
}

function Gate() {
  const { session, family, role, loading, recovery, isAnonymous, joining } = useAuth()
  useEffect(() => {
    if (loading) return
    splashReady('auth')
    if (!session || !family || recovery) splashReady('data') // нет семьи или экран нового пароля — данных ждать нечего
  }, [loading, session, family, recovery])
  // Вход по коду идёт на экране входа: пока сессия переключается (анонимный вход -> семья), он не должен пропадать
  if (joining) return <Auth />
  if (loading) {
    return (
      <div className="grid min-h-full place-items-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand/20 border-t-brand" />
      </div>
    )
  }
  if (!session) return <Auth />
  if (recovery) return <ResetPassword />
  // Ребёнок без пароля, который ещё не вошёл в семью (закрыл приложение на середине): снова экран ввода кода
  if (!family && isAnonymous) return <Auth />
  if (!family) return <Onboarding />
  const parent = role === 'parent'
  return (
    <FamilyDataProvider familyId={family.id}>
      <SplashDataReady />
      <NotificationsProvider userId={session.user.id}>
      <PushBridge userId={session.user.id} />
      <Shell>
        <WelcomeTour />
        <Routes>
          <Route path="/" element={parent ? <ParentDashboard /> : <ChildHome />} />
          <Route path="/family" element={<FamilyHome />} />
          <Route path="/rewards" element={parent ? <ParentRewards /> : <ChildShop />} />
          <Route path="/history" element={<History />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
          {parent && <Route path="/tasks" element={<TaskList />} />}
          {parent && <Route path="/tasks/new" element={<TaskForm />} />}
          {parent && <Route path="/tasks/:id" element={<TaskForm />} />}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Shell>
      </NotificationsProvider>
    </FamilyDataProvider>
  )
}

export default function App() {
  useEffect(() => {
    if (!isConfigured) hideSplash()  // без настроек ждать нечего
  }, [])
  if (!isConfigured) return <ConfigMissing />
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <LanguageSync />
          <Gate />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
