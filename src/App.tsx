import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { useProfile } from './hooks/useProfile'
import { AuthPage } from './components/auth/AuthPage'
import { AppLayout } from './components/layout/AppLayout'
import { LegalModal } from './components/LegalModal'
import { DashboardPage } from './pages/DashboardPage'
import { CheckinPage } from './pages/CheckinPage'
import { FotosPage } from './pages/FotosPage'
import { CoachPage } from './pages/CoachPage'
import { PerfilPage } from './pages/PerfilPage'
import { supabase } from './lib/supabase'

function App() {
  const { user, loading: authLoading } = useAuth()
  const { profile, loading: profileLoading, updateProfile } = useProfile(user?.id)

  if (authLoading || (user && profileLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center"
           style={{ background: 'var(--color-bg)' }}>
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-12 h-12 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: '#7BF0A0', borderTopColor: 'transparent' }}
          />
          <p className="text-sm" style={{ color: 'var(--color-muted)', fontFamily: 'Syne' }}>
            Cargando…
          </p>
        </div>
      </div>
    )
  }

  if (!user) return <AuthPage />

  if (!profile?.legal_accepted_at) {
    return (
      <LegalModal
        onAccept={async () => {
          await updateProfile({ legal_accepted_at: new Date().toISOString() })
        }}
        onDecline={async () => {
          await supabase.auth.signOut()
        }}
      />
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/checkin" element={<CheckinPage />} />
          <Route path="/fotos" element={<FotosPage />} />
          <Route path="/coach" element={<CoachPage />} />
          <Route path="/perfil" element={<PerfilPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
