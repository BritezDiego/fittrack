import { Outlet } from 'react-router-dom'
import { BottomNav } from './BottomNav'

export function AppLayout() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>
      <main className="main-content max-w-lg mx-auto">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
