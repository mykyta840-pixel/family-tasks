import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { isConfigured } from './lib/supabase'
import { AuthProvider, useAuth } from './auth/AuthProvider'
import { FamilyDataProvider } from './data/FamilyData'
import { NotificationsProvider } from './data/Notifications'
import ConfigMissing from './components/ConfigMissing'
import Shell from './components/Shell'
import ErrorBoundary from './components/ErrorBoundary'
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

function Gate() {
  const { session, family, role, loading } = useAuth()
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
  if (!isConfigured) return <ConfigMissing />
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <Gate />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
