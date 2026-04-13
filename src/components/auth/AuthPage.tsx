import { useState } from 'react'
import { supabase } from '../../lib/supabase'

type Mode = 'login' | 'register'

export function AuthPage() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nombre, setNombre] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    if (mode === 'register') {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { nombre } },
      })
      if (error) {
        setError(error.message)
      } else {
        // Create profile record
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          await supabase.from('profiles').upsert({
            user_id: session.user.id,
            nombre,
          }, { onConflict: 'user_id' })
        }
        setSuccess('Cuenta creada. Revisá tu email para confirmar.')
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(translateError(error.message))
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12"
         style={{ background: 'var(--color-bg)' }}>

      {/* Logo / Brand */}
      <div className="mb-10 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 neon-glow"
             style={{ background: 'rgba(123,240,160,0.1)', border: '1px solid rgba(123,240,160,0.3)' }}>
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <path d="M16 4L4 12V28H12V20H20V28H28V12L16 4Z"
                  fill="none" stroke="#7BF0A0" strokeWidth="1.5" strokeLinejoin="round"/>
            <circle cx="16" cy="14" r="3" fill="#7BF0A0"/>
          </svg>
        </div>
        <h1 className="text-3xl font-bold" style={{ fontFamily: 'Syne', color: '#7BF0A0' }}>
          FitTrack
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>
          Tu progreso. Tu historia.
        </p>
      </div>

      {/* Card */}
      <div className="card w-full max-w-sm">
        {/* Tab switcher */}
        <div className="flex rounded-xl p-1 mb-6"
             style={{ background: 'var(--color-surface-2)' }}>
          {(['login', 'register'] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(null); setSuccess(null) }}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-all"
              style={{
                fontFamily: 'Syne',
                background: mode === m ? 'var(--color-neon)' : 'transparent',
                color: mode === m ? '#0a0a0a' : 'var(--color-muted)',
              }}
            >
              {m === 'login' ? 'Iniciar sesión' : 'Registrarse'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-medium mb-1.5"
                     style={{ color: 'var(--color-muted)', fontFamily: 'Syne' }}>
                Nombre
              </label>
              <input
                className="input-base"
                type="text"
                placeholder="Tu nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
                autoComplete="name"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium mb-1.5"
                   style={{ color: 'var(--color-muted)', fontFamily: 'Syne' }}>
              Email
            </label>
            <input
              className="input-base"
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5"
                   style={{ color: 'var(--color-muted)', fontFamily: 'Syne' }}>
              Contraseña
            </label>
            <input
              className="input-base"
              type="password"
              placeholder={mode === 'register' ? 'Mínimo 8 caracteres' : '••••••••'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={mode === 'register' ? 8 : 1}
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            />
          </div>

          {error && (
            <div className="rounded-xl px-4 py-3 text-sm"
                 style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-xl px-4 py-3 text-sm"
                 style={{ background: 'rgba(123,240,160,0.1)', border: '1px solid rgba(123,240,160,0.3)', color: '#7BF0A0' }}>
              {success}
            </div>
          )}

          <button type="submit" className="btn-primary mt-2" disabled={loading}>
            {loading
              ? 'Cargando…'
              : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
          </button>
        </form>

        {mode === 'login' && (
          <button
            onClick={() => handleForgotPassword(email, setSuccess, setError)}
            className="w-full text-center text-xs mt-4"
            style={{ color: 'var(--color-muted)' }}
          >
            ¿Olvidaste tu contraseña?
          </button>
        )}
      </div>

      <p className="text-xs mt-8 text-center" style={{ color: 'var(--color-muted)' }}>
        {mode === 'login'
          ? '¿No tenés cuenta? '
          : '¿Ya tenés cuenta? '}
        <button
          onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null) }}
          style={{ color: 'var(--color-neon)' }}
        >
          {mode === 'login' ? 'Registrate' : 'Iniciá sesión'}
        </button>
      </p>
    </div>
  )
}

async function handleForgotPassword(
  email: string,
  setSuccess: (s: string) => void,
  setError: (s: string) => void
) {
  if (!email) { setError('Ingresá tu email primero.'); return }
  const { error } = await supabase.auth.resetPasswordForEmail(email)
  if (error) setError(error.message)
  else setSuccess('Te enviamos un email para resetear tu contraseña.')
}

function translateError(msg: string): string {
  if (msg.includes('Invalid login credentials')) return 'Email o contraseña incorrectos.'
  if (msg.includes('Email not confirmed')) return 'Confirmá tu email antes de iniciar sesión.'
  if (msg.includes('Too many requests')) return 'Demasiados intentos. Esperá un momento.'
  return msg
}
