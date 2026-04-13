import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useProfile } from '../hooks/useProfile'
import { OBJETIVO_LABELS, NIVEL_LABELS } from '../types'
import { LogOut, Save, Check } from 'lucide-react'

type Objetivo = 'perdida_grasa' | 'ganancia_muscular' | 'recomposicion' | 'mantenimiento'
type Nivel = 'principiante' | 'intermedio' | 'avanzado'

export function PerfilPage() {
  const { user, signOut } = useAuth()
  const { profile, loading, updateProfile } = useProfile(user?.id)

  const [nombre, setNombre] = useState('')
  const [edad, setEdad] = useState('')
  const [altura, setAltura] = useState('')
  const [objetivo, setObjetivo] = useState<Objetivo | ''>('')
  const [nivel, setNivel] = useState<Nivel | ''>('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (profile) {
      setNombre(profile.nombre ?? '')
      setEdad(profile.edad?.toString() ?? '')
      setAltura(profile.altura?.toString() ?? '')
      setObjetivo((profile.objetivo as Objetivo) ?? '')
      setNivel((profile.nivel as Nivel) ?? '')
    }
  }, [profile])

  const handleSave = async () => {
    setSaving(true)
    await updateProfile({
      nombre,
      edad: edad ? parseInt(edad) : null,
      altura: altura ? parseFloat(altura) : null,
      objetivo: objetivo || null,
      nivel: nivel || null,
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (loading) return <div className="px-4 pt-8"><p style={{ color: 'var(--color-muted)' }}>Cargando…</p></div>

  return (
    <div className="px-4 pt-8 pb-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'Syne' }}>Perfil</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>{user?.email}</p>
        </div>
        <button
          onClick={signOut}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm"
          style={{
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.2)',
            color: '#f87171',
            fontFamily: 'Syne',
          }}
        >
          <LogOut size={14} />
          Salir
        </button>
      </div>

      <div className="flex flex-col gap-5">
        {/* Datos básicos */}
        <div className="card flex flex-col gap-4">
          <p className="text-xs font-medium" style={{ color: 'var(--color-muted)', fontFamily: 'Syne' }}>
            DATOS PERSONALES
          </p>

          <div>
            <label className="block text-xs mb-1.5" style={{ color: 'var(--color-muted)' }}>Nombre</label>
            <input
              className="input-base"
              placeholder="Tu nombre"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1.5" style={{ color: 'var(--color-muted)' }}>Edad</label>
              <input
                className="input-base"
                type="number"
                placeholder="Años"
                value={edad}
                onChange={e => setEdad(e.target.value)}
                min={10}
                max={120}
              />
            </div>
            <div>
              <label className="block text-xs mb-1.5" style={{ color: 'var(--color-muted)' }}>Altura (cm)</label>
              <input
                className="input-base"
                type="number"
                placeholder="cm"
                value={altura}
                onChange={e => setAltura(e.target.value)}
                min={100}
                max={250}
              />
            </div>
          </div>
        </div>

        {/* Objetivo */}
        <div className="card flex flex-col gap-3">
          <p className="text-xs font-medium" style={{ color: 'var(--color-muted)', fontFamily: 'Syne' }}>
            OBJETIVO PRINCIPAL
          </p>
          <div className="grid grid-cols-2 gap-2">
            {(Object.entries(OBJETIVO_LABELS) as [Objetivo, string][]).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setObjetivo(key)}
                className="py-3 px-3 rounded-xl text-sm text-left transition-all"
                style={{
                  background: objetivo === key ? 'rgba(123,240,160,0.12)' : 'var(--color-surface-2)',
                  border: '1px solid',
                  borderColor: objetivo === key ? '#7BF0A0' : 'var(--color-border)',
                  color: objetivo === key ? '#7BF0A0' : 'var(--color-text)',
                  fontFamily: 'DM Sans',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Nivel */}
        <div className="card flex flex-col gap-3">
          <p className="text-xs font-medium" style={{ color: 'var(--color-muted)', fontFamily: 'Syne' }}>
            NIVEL DE ACTIVIDAD
          </p>
          <div className="flex gap-2">
            {(Object.entries(NIVEL_LABELS) as [Nivel, string][]).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setNivel(key)}
                className="flex-1 py-3 rounded-xl text-sm transition-all"
                style={{
                  fontFamily: 'Syne',
                  background: nivel === key ? 'rgba(123,240,160,0.12)' : 'var(--color-surface-2)',
                  border: '1px solid',
                  borderColor: nivel === key ? '#7BF0A0' : 'var(--color-border)',
                  color: nivel === key ? '#7BF0A0' : 'var(--color-muted)',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <button
          className="btn-primary flex items-center justify-center gap-2"
          onClick={handleSave}
          disabled={saving}
        >
          {saved
            ? <><Check size={16} /> Guardado</>
            : saving
            ? 'Guardando…'
            : <><Save size={16} /> Guardar perfil</>}
        </button>
      </div>
    </div>
  )
}
