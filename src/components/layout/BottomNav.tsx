import { NavLink } from 'react-router-dom'
import { BarChart2, PlusCircle, Camera, Bot, User, CalendarDays } from 'lucide-react'

const tabs = [
  { to: '/dashboard', icon: BarChart2, label: 'Progreso' },
  { to: '/checkin', icon: PlusCircle, label: 'Check-in' },
  { to: '/fotos', icon: Camera, label: 'Fotos' },
  { to: '/coach', icon: Bot, label: 'Coach IA' },
  { to: '/calendario', icon: CalendarDays, label: 'Rutina' },
  { to: '/perfil', icon: User, label: 'Perfil' },
]

export function BottomNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 tab-bar-height flex items-center justify-around px-2 z-50"
      style={{
        background: 'rgba(17,17,17,0.95)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid var(--color-border)',
      }}
    >
      {tabs.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className="flex flex-col items-center justify-center gap-1 py-2 px-3 rounded-xl transition-all min-w-[60px]"
          style={({ isActive }) => ({
            color: isActive ? '#7BF0A0' : 'var(--color-muted)',
          })}
        >
          {({ isActive }) => (
            <>
              <div
                className="p-1.5 rounded-xl transition-all"
                style={{
                  background: isActive ? 'rgba(123,240,160,0.12)' : 'transparent',
                }}
              >
                <Icon size={20} strokeWidth={isActive ? 2.5 : 1.5} />
              </div>
              <span className="text-[10px] font-medium" style={{ fontFamily: 'Syne' }}>
                {label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
