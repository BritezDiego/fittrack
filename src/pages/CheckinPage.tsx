import { useState, useRef } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useCheckins } from '../hooks/useCheckins'
import type { CheckinFoto } from '../types'
import { MES_LABELS, MEDIDAS_KEYS, MEDIDAS_LABELS } from '../types'
import { Camera, X, Check } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const FOTO_TIPOS: CheckinFoto['tipo'][] = ['frente', 'perfil', 'espalda', 'extra']
const FOTO_LABELS: Record<CheckinFoto['tipo'], string> = {
  frente: 'Frente', perfil: 'Perfil', espalda: 'Espalda', extra: 'Extra',
}

const now = new Date()

export function CheckinPage() {
  const { user } = useAuth()
  const { saveCheckin } = useCheckins(user?.id)
  const navigate = useNavigate()

  const [mes, setMes] = useState(now.getMonth() + 1)
  const [anio, setAnio] = useState(now.getFullYear())
  const [medidas, setMedidas] = useState<Record<string, string>>(
    Object.fromEntries(MEDIDAS_KEYS.map(k => [k, '']))
  )
  const [notas, setNotas] = useState('')
  const [fotos, setFotos] = useState<{ file: File; tipo: CheckinFoto['tipo']; preview: string }[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pendingTipo, setPendingTipo] = useState<CheckinFoto['tipo']>('frente')

  const handleMedida = (key: string, val: string) => {
    if (val === '' || /^\d*\.?\d*$/.test(val)) {
      setMedidas(prev => ({ ...prev, [key]: val }))
    }
  }

  const handleFotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (fotos.length + files.length > 5) {
      setError('Máximo 5 fotos permitidas.')
      return
    }
    const newFotos = files.map((file) => ({
      file,
      tipo: pendingTipo,
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

    const { error } = await saveCheckin(
      checkinData,
      fotos.map(f => ({ file: f.file, tipo: f.tipo }))
    )

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
      <p className="text-sm mb-5" style={{ color: 'var(--color-muted)' }}>
        Registrá tus medidas de este mes
      </p>

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
              FOTOS ({fotos.length}/5)
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

          {/* Preview grid */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            {fotos.map((f, i) => (
              <div key={i} className="relative aspect-square rounded-xl overflow-hidden"
                   style={{ background: 'var(--color-surface-2)' }}>
                <img src={f.preview} alt={f.tipo} className="w-full h-full object-cover" />
                <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[10px]"
                     style={{ background: 'rgba(0,0,0,0.7)', color: '#7BF0A0', fontFamily: 'Syne' }}>
                  {FOTO_LABELS[f.tipo]}
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
            {fotos.length < 5 && (
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
          {saving ? 'Guardando…' : 'Guardar check-in'}
        </button>
      </form>
    </div>
  )
}
