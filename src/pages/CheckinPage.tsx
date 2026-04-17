import { useState, useRef } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useCheckins } from '../hooks/useCheckins'
import { useProfile } from '../hooks/useProfile'
import type { CheckinFoto } from '../types'
import { MES_LABELS, MEDIDAS_KEYS, MEDIDAS_LABELS, getTipoLabel } from '../types'
import { Camera, X, Check, RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const FOTO_TIPOS: CheckinFoto['tipo'][] = ['frente', 'perfil', 'espalda', 'extra']
const FOTO_LABELS: Record<CheckinFoto['tipo'], string> = {
  frente: 'Frente', perfil: 'Perfil', espalda: 'Espalda', extra: 'Extra',
}

const EXTRA_OPCIONES = [
  'Glúteos', 'Brazos', 'Isquiotibiales', 'Cuádriceps',
  'Pantorrillas', 'Hombros', 'Pecho', 'Abdomen', 'Espalda baja', 'Otro',
]

const now = new Date()

export function CheckinPage() {
  const { user } = useAuth()
  const { checkins, saveCheckin } = useCheckins(user?.id)
  const { profile, updateProfile } = useProfile(user?.id)
  const navigate = useNavigate()

  const [mes, setMes] = useState(now.getMonth() + 1)
  const [anio, setAnio] = useState(now.getFullYear())
  const [medidas, setMedidas] = useState<Record<string, string>>(
    Object.fromEntries(MEDIDAS_KEYS.map(k => [k, '']))
  )
  const [edad, setEdad] = useState('')
  const [altura, setAltura] = useState('')
  const [notas, setNotas] = useState('')
  const [fotos, setFotos] = useState<{ file: File; tipo: string; preview: string }[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pendingTipo, setPendingTipo] = useState<CheckinFoto['tipo']>('frente')
  const [extraLabel, setExtraLabel] = useState(EXTRA_OPCIONES[0])
  const [editingId, setEditingId] = useState<string | null>(null)

  // Detecta si el mes/año actual ya tiene un check-in
  const existingThisMonth = checkins.find(c => c.mes === mes && c.anio === anio)
  const isUpdate = !!existingThisMonth

  const loadCheckin = (id: string) => {
    const c = checkins.find(ch => ch.id === id)
    if (!c) return
    setMes(c.mes)
    setAnio(c.anio)
    setMedidas(Object.fromEntries(MEDIDAS_KEYS.map(k => [k, c[k] != null ? String(c[k]) : ''])))
    setNotas(c.notas ?? '')
    setEdad(profile?.edad?.toString() ?? '')
    setAltura(profile?.altura?.toString() ?? '')
    setFotos([])
    setEditingId(id)
    setError(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleMedida = (key: string, val: string) => {
    if (val === '' || /^\d*\.?\d*$/.test(val)) {
      setMedidas(prev => ({ ...prev, [key]: val }))
    }
  }

  const handleFotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    // TODO: restaurar límite de 5 fotos post-testing
    const newFotos = files.map((file) => ({
      file,
      tipo: pendingTipo === 'extra' ? `extra:${extraLabel}` : pendingTipo,
      preview: URL.createObjectURL(file),
    }))
    setFotos(prev => [...prev, ...newFotos])
    e.target.value = ''
  }

  const removeFoto = (idx: number) => {
    setFotos(prev => {
      URL.revokeObjectURL(prev[idx].preview)
      return prev.filter((_, i) => i !== idx)
    })
  }

  // Pre-fill edad/altura from profile when loaded
  const edadValue = edad || (profile?.edad?.toString() ?? '')
  const alturaValue = altura || (profile?.altura?.toString() ?? '')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaving(true)

    const checkinData = {
      mes,
      anio,
      notas: notas || null,
      ...Object.fromEntries(
        MEDIDAS_KEYS.map(k => [k, medidas[k] ? parseFloat(medidas[k]) : null])
      ),
    } as any

    const [{ error }] = await Promise.all([
      saveCheckin(checkinData, fotos.map(f => ({ file: f.file, tipo: f.tipo }))),
      updateProfile({
        ...(edadValue ? { edad: parseInt(edadValue) } : {}),
        ...(alturaValue ? { altura: parseFloat(alturaValue) } : {}),
      }),
    ])

    setSaving(false)
    if (error) {
      setError('Error guardando el check-in. Intentá de nuevo.')
    } else {
      setSaved(true)
      setTimeout(() => navigate('/dashboard'), 1500)
    }
  }

  if (saved) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4">
        <div className="w-20 h-20 rounded-full flex items-center justify-center neon-glow"
             style={{ background: 'rgba(123,240,150,0.15)', border: '2px solid #7BF0A0' }}>
          <Check size={40} color="#7BF0A0" />
        </div>
        <h2 className="text-2xl font-bold" style={{ fontFamily: 'Syne', color: '#7BF0A0' }}>
          ¡Check-in guardado!
        </h2>
        <p style={{ color: 'var(--color-muted)' }}>Redirigiendo al dashboard…</p>
      </div>
    )
  }

  return (
    <div className="px-4 pt-8 pb-5">
      <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: 'Syne' }}>Check-in mensual</h1>
      <p className="text-sm mb-4" style={{ color: 'var(--color-muted)' }}>
        Registrá tus medidas de este mes
      </p>

      {/* Check-ins anteriores para cargar */}
      {checkins.length > 0 && (
        <div className="mb-5">
          <p className="text-xs font-medium mb-2" style={{ color: 'var(--color-muted)', fontFamily: 'Syne' }}>
            CARGAR REGISTRO ANTERIOR
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {[...checkins].reverse().map(c => (
              <button
                key={c.id}
                type="button"
                onClick={() => loadCheckin(c.id)}
                className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs transition-all"
                style={{
                  fontFamily: 'Syne',
                  background: editingId === c.id ? 'rgba(123,240,160,0.12)' : 'var(--color-surface)',
                  border: '1px solid',
                  borderColor: editingId === c.id ? '#7BF0A0' : 'var(--color-border)',
                  color: editingId === c.id ? '#7BF0A0' : 'var(--color-muted)',
                }}
              >
                <RefreshCw size={11} />
                {MES_LABELS[c.mes]} {c.anio}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Banner modo actualización */}
      {isUpdate && (
        <div className="rounded-xl px-4 py-2.5 mb-4 text-xs"
             style={{ background: 'rgba(123,240,160,0.07)', border: '1px solid rgba(123,240,160,0.25)', color: '#7BF0A0', fontFamily: 'Syne' }}>
          ↻ Actualizando check-in de <strong>{MES_LABELS[mes]} {anio}</strong> — los datos anteriores serán reemplazados
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* Mes/Año */}
        <div className="card">
          <p className="text-xs font-medium mb-3" style={{ color: 'var(--color-muted)', fontFamily: 'Syne' }}>
            PERÍODO
          </p>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs mb-1.5" style={{ color: 'var(--color-muted)' }}>Mes</label>
              <select className="input-base" value={mes} onChange={e => setMes(Number(e.target.value))}>
                {MES_LABELS.slice(1).map((m, i) => (
                  <option key={i+1} value={i+1}>{m}</option>
                ))}
              </select>
            </div>
            <div className="w-28">
              <label className="block text-xs mb-1.5" style={{ color: 'var(--color-muted)' }}>Año</label>
              <input
                className="input-base"
                type="number"
                value={anio}
                onChange={e => setAnio(Number(e.target.value))}
                min={2020}
                max={2099}
              />
            </div>
          </div>
        </div>

        {/* Datos personales */}
        <div className="card">
          <p className="text-xs font-medium mb-3" style={{ color: 'var(--color-muted)', fontFamily: 'Syne' }}>
            DATOS PERSONALES
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1.5" style={{ color: 'var(--color-muted)' }}>Edad (años)</label>
              <input
                className="input-base"
                type="text"
                inputMode="numeric"
                placeholder="Ej: 28"
                value={edadValue}
                onChange={e => setEdad(e.target.value.replace(/\D/g, ''))}
              />
            </div>
            <div>
              <label className="block text-xs mb-1.5" style={{ color: 'var(--color-muted)' }}>Altura (cm)</label>
              <input
                className="input-base"
                type="text"
                inputMode="decimal"
                placeholder="Ej: 170"
                value={alturaValue}
                onChange={e => { if (e.target.value === '' || /^\d*\.?\d*$/.test(e.target.value)) setAltura(e.target.value) }}
              />
            </div>
          </div>
        </div>

        {/* Medidas */}
        <div className="card">
          <p className="text-xs font-medium mb-3" style={{ color: 'var(--color-muted)', fontFamily: 'Syne' }}>
            MEDIDAS
          </p>
          <div className="grid grid-cols-2 gap-3">
            {MEDIDAS_KEYS.map((key) => (
              <div key={key}>
                <label className="block text-xs mb-1.5" style={{ color: 'var(--color-muted)' }}>
                  {MEDIDAS_LABELS[key]}
                </label>
                <input
                  className="input-base"
                  type="text"
                  inputMode="decimal"
                  placeholder="0.0"
                  value={medidas[key]}
                  onChange={e => handleMedida(key, e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Notas */}
        <div className="card">
          <p className="text-xs font-medium mb-3" style={{ color: 'var(--color-muted)', fontFamily: 'Syne' }}>
            NOTAS
          </p>
          <textarea
            className="input-base"
            rows={3}
            placeholder="¿Cómo te sentiste este mes? Cambios en dieta, entrenamiento…"
            value={notas}
            onChange={e => setNotas(e.target.value)}
            style={{ resize: 'none' }}
          />
        </div>

        {/* Fotos */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium" style={{ color: 'var(--color-muted)', fontFamily: 'Syne' }}>
              FOTOS ({fotos.length})
            </p>
          </div>

          {/* Tipo selector */}
          <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
            {FOTO_TIPOS.map(tipo => (
              <button
                key={tipo}
                type="button"
                onClick={() => setPendingTipo(tipo)}
                className="shrink-0 px-3 py-1.5 rounded-full text-xs transition-all"
                style={{
                  fontFamily: 'Syne',
                  background: pendingTipo === tipo ? 'var(--color-neon)' : 'var(--color-surface-2)',
                  color: pendingTipo === tipo ? '#0a0a0a' : 'var(--color-muted)',
                  border: '1px solid',
                  borderColor: pendingTipo === tipo ? 'var(--color-neon)' : 'var(--color-border)',
                }}
              >
                {FOTO_LABELS[tipo]}
              </button>
            ))}
          </div>

          {/* Sub-selector Extra */}
          {pendingTipo === 'extra' && (
            <div className="mb-3 flex flex-col gap-1.5">
              <p className="text-xs" style={{ color: 'var(--color-muted)' }}>¿Qué zona es?</p>
              <div className="flex flex-wrap gap-1.5">
                {EXTRA_OPCIONES.map(op => (
                  <button
                    key={op}
                    type="button"
                    onClick={() => setExtraLabel(op)}
                    className="px-2.5 py-1 rounded-lg text-xs transition-all"
                    style={{
                      fontFamily: 'DM Sans',
                      background: extraLabel === op ? 'rgba(123,240,160,0.15)' : 'var(--color-surface-2)',
                      border: '1px solid',
                      borderColor: extraLabel === op ? '#7BF0A0' : 'var(--color-border)',
                      color: extraLabel === op ? '#7BF0A0' : 'var(--color-muted)',
                    }}
                  >
                    {op}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Preview grid */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            {fotos.map((f, i) => (
              <div key={i} className="relative aspect-square rounded-xl overflow-hidden"
                   style={{ background: 'var(--color-surface-2)' }}>
                <img src={f.preview} alt={f.tipo} className="w-full h-full object-cover" />
                <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[10px]"
                     style={{ background: 'rgba(0,0,0,0.7)', color: '#7BF0A0', fontFamily: 'Syne' }}>
                  {getTipoLabel(f.tipo)}
                </div>
                <button
                  type="button"
                  onClick={() => removeFoto(i)}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(0,0,0,0.7)' }}
                >
                  <X size={12} color="white" />
                </button>
              </div>
            ))}
            {(
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square rounded-xl flex flex-col items-center justify-center gap-1 transition-all"
                style={{
                  background: 'var(--color-surface-2)',
                  border: '1px dashed var(--color-border)',
                  color: 'var(--color-muted)',
                }}
              >
                <Camera size={20} />
                <span className="text-xs" style={{ fontFamily: 'Syne' }}>Agregar</span>
              </button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFotoSelect}
          />
        </div>

        {error && (
          <div className="rounded-xl px-4 py-3 text-sm"
               style={{ background: 'rgba(239,58,58,0.1)', border: '1px solid rgba(239,58,58,0.3)', color: '#f87171' }}>
            {error}
          </div>
        )}

        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Guardando…' : isUpdate ? `Actualizar ${MES_LABELS[mes]} ${anio}` : 'Guardar check-in'}
        </button>
      </form>
    </div>
  )
}
