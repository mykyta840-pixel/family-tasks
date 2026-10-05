import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { isConfigured } from './lib/supabase'
import { hideSplash } from './lib/splash'
import { useEffect } from 'react'
import { AuthProvider, useAuth } from './auth/AuthProvider'
import { isLang, useI18n } from './i18n'
import { FamilyDataProvider } from './data/FamilyData'
import { NotificationsProvider } from './data/Notifications'
import ConfigMissing from './components/ConfigMissing'
import Shell from './components/Shell'
import ErrorBoundary from './components/ErrorBoundary'
import PushBridge from './components/PushBridge'
import Auth from './pages/Auth'
import Onboarding from './pages/Onboarding'
import FamilyHome from './pages/FamilyHome'
import ParentDashboard from './pages/ParentDashboard'
import ChildHome from './pages/ChildHome'
import TaskList from './pages/TaskList'
import TaskForm from './pages/TaskForm'
import ChildShop from './pages/ChildShop'
import ParentRewards from './pages/ParentRewards'
import History from './pages/History'
import Profile from './pages/Profile'

// Язык, сохранённый в профиле, перекрывает локальный выбор (ребёнку язык выбирает родитель)
function LanguageSync() {
  const { profile } = useAuth()
  const { setForced } = useI18n()
  const saved = profile?.language
  useEffect(() => {
    setForced(isLang(saved) ? saved : null)
  }, [saved, setForced])
  return null
}

function Gate() {
  const { session, family, role, loading } = useAuth()
  useEffect(() => {
    if (!loading) hideSplash()
  }, [loading])
  if (loading) {
    return (
      <div className="grid min-h-full place-items-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand/20 border-t-brand" />
      </div>
    )
  }
  if (!session) return <Auth />
  if (!family) return <Onboarding />
  const parent = role === 'parent'
  return (
    <FamilyDataProvider familyId={family.id}>
      <NotificationsProvider userId={session.user.id}>
      <PushBridge userId={session.user.id} />
      <Shell>
        <Routes>
          <Route path="/" element={parent ? <ParentDashboard /> : <ChildHome />} />
          <Route path="/family" element={<FamilyHome />} />
          <Route path="/rewards" element={parent ? <ParentRewards /> : <ChildShop />} />
          <Route path="/history" element={<History />} />
          <Route path="/profile" element={<Profile />} />
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
    if (!isConfigured) hideSplash()
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
