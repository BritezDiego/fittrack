import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, Dumbbell, Coffee, ChevronDown, ChevronUp, Trash2, Pencil, Check, X } from 'lucide-react'
import type { RutinaActiva, RutinaDia, DiaSemana } from '../types'
import { LS_RUTINA_KEY, ORDEN_DIAS, DIA_LABELS, DIA_SHORT } from '../types'

function loadRutina(): RutinaActiva | null {
  try {
    const raw = localStorage.getItem(LS_RUTINA_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function CalendarioPage() {
  const navigate = useNavigate()
  const [rutina, setRutina] = useState<RutinaActiva | null>(loadRutina)
  const [expandido, setExpandido] = useState<DiaSemana | null>(null)
  const [confirmEliminar, setConfirmEliminar] = useState(false)

  // Modo edición
  const [editMode, setEditMode] = useState(false)
  // editDias[i] = día asignado al i-ésimo slot de entrenamiento (en orden de semana)
  const [editDias, setEditDias] = useState<DiaSemana[]>([])

  const hoy = new Date()
    .toLocaleDateString('es-AR', { weekday: 'long' })
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

  const diasOrdenados = rutina
    ? ORDEN_DIAS.map(d => rutina.dias.find(r => r.dia === d)).filter(Boolean) as RutinaDia[]
    : []

  const trainingSlots = diasOrdenados.filter(d => !d.descanso)

  // ── Edición ──────────────────────────────────────────────────────────────────

  const handleEnterEdit = () => {
    setEditDias(trainingSlots.map(d => d.dia))
    setExpandido(null)
    setEditMode(true)
  }

  const handleCancelEdit = () => setEditMode(false)

  const handleDayTap = (slotIdx: number, dia: DiaSemana) => {
    setEditDias(prev => {
      const next = [...prev]
      const conflicto = next.indexOf(dia)
      if (conflicto !== -1 && conflicto !== slotIdx) {
        // Intercambiar con el slot que ya tiene ese día
        next[conflicto] = next[slotIdx]
      }
      next[slotIdx] = dia
      return next
    })
  }

  const handleSaveEdit = () => {
    if (!rutina) return
    const newDias: RutinaDia[] = ORDEN_DIAS.map(dia => {
      const slotIdx = editDias.indexOf(dia)
      if (slotIdx >= 0) {
        return { ...trainingSlots[slotIdx], dia, label: DIA_LABELS[dia] }
      }
      return { dia, label: DIA_LABELS[dia], musculos: 'Descanso', ejercicios: [], descanso: true }
    })
    const updated = { ...rutina, dias: newDias }
    localStorage.setItem(LS_RUTINA_KEY, JSON.stringify(updated))
    setRutina(updated)
    setEditMode(false)
  }

  // ── Eliminar ─────────────────────────────────────────────────────────────────

  const eliminarRutina = () => {
    localStorage.removeItem(LS_RUTINA_KEY)
    setRutina(null)
    setConfirmEliminar(false)
  }

  const toggleDia = (dia: DiaSemana) => {
    if (editMode) return
    setExpandido(prev => prev === dia ? null : dia)
  }

  // ── Empty state ───────────────────────────────────────────────────────────────

  if (!rutina) {
    return (
      <div className="px-4 pt-8 pb-6 flex flex-col items-center gap-6">
        <div className="flex items-center gap-3 self-start mb-2">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
               style={{ background: 'rgba(123,240,160,0.1)', border: '1px solid rgba(123,240,160,0.3)' }}>
            <CalendarDays size={18} color="#7BF0A0" />
          </div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'Syne' }}>Calendario</h1>
        </div>
        <div className="w-full rounded-2xl p-8 flex flex-col items-center gap-4 text-center"
             style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
               style={{ background: 'rgba(123,240,160,0.08)', border: '1px solid rgba(123,240,160,0.2)' }}>
            <Dumbbell size={24} color="#7BF0A0" strokeWidth={1.5} />
          </div>
          <div>
            <p className="font-bold text-base mb-1" style={{ fontFamily: 'Syne' }}>Sin rutina vinculada</p>
            <p className="text-sm" style={{ color: 'var(--color-muted)', fontFamily: 'DM Sans' }}>
              Generá una rutina con el Coach IA y tocá "Utilizar rutina" para verla aquí.
            </p>
          </div>
          <button className="btn-primary mt-2" onClick={() => navigate('/coach')}>
            Ir al Coach IA
          </button>
        </div>
      </div>
    )
  }

  // ── Vista principal ───────────────────────────────────────────────────────────

  return (
    <div className="px-4 pt-8 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
               style={{ background: 'rgba(123,240,160,0.1)', border: '1px solid rgba(123,240,160,0.3)' }}>
            <CalendarDays size={18} color="#7BF0A0" />
          </div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'Syne' }}>Calendario</h1>
        </div>
        <div className="flex gap-2">
          {!editMode && (
            <button
              onClick={handleEnterEdit}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
              style={{ color: '#7BF0A0', background: 'rgba(123,240,160,0.1)', border: '1px solid rgba(123,240,160,0.3)', fontFamily: 'Syne' }}
            >
              <Pencil size={13} />
              Editar días
            </button>
          )}
          {!editMode && (
            <button
              onClick={() => setConfirmEliminar(true)}
              className="p-2 rounded-xl transition-all"
              style={{ color: 'var(--color-muted)', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Meta info */}
      <div className="flex gap-2 mt-3 mb-5 flex-wrap">
        <span className="text-xs px-2.5 py-1 rounded-lg"
              style={{ background: 'rgba(123,240,160,0.1)', border: '1px solid rgba(123,240,160,0.25)', color: '#7BF0A0', fontFamily: 'Syne' }}>
          {rutina.objetivo}
        </span>
        <span className="text-xs px-2.5 py-1 rounded-lg"
              style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-muted)', fontFamily: 'Syne' }}>
          {rutina.nivel}
        </span>
        <span className="text-xs px-2.5 py-1 rounded-lg"
              style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-muted)', fontFamily: 'Syne' }}>
          {trainingSlots.length} días de entrenamiento
        </span>
      </div>

      {/* ── MODO EDICIÓN ─────────────────────────────────────────────────────── */}
      {editMode && (
        <div className="mb-5">
          <p className="text-xs font-semibold mb-3 uppercase tracking-wide"
             style={{ color: 'var(--color-muted)', fontFamily: 'Syne' }}>
            Tocá un día para reasignar — si el día ya está ocupado, los slots se intercambian
          </p>
          <div className="flex flex-col gap-3">
            {trainingSlots.map((slot, idx) => {
              const asignado = editDias[idx]
              return (
                <div key={idx} className="rounded-2xl p-4"
                     style={{ background: 'var(--color-surface)', border: '1px solid rgba(123,240,160,0.3)' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Dumbbell size={13} color="#7BF0A0" />
                    <span className="text-sm font-bold" style={{ fontFamily: 'Syne', color: '#7BF0A0' }}>
                      {slot.musculos}
                    </span>
                  </div>
                  {/* Chips de días */}
                  <div className="flex gap-1.5 flex-wrap">
                    {ORDEN_DIAS.map(dia => {
                      const esAsignado = asignado === dia
                      const otroDueño = editDias.findIndex(d => d === dia)
                      const esConflicto = otroDueño !== -1 && otroDueño !== idx
                      return (
                        <button
                          key={dia}
                          onClick={() => handleDayTap(idx, dia)}
                          className="w-9 h-9 rounded-xl text-xs font-bold transition-all"
                          style={{
                            fontFamily: 'Syne',
                            background: esAsignado
                              ? 'rgba(123,240,160,0.2)'
                              : esConflicto
                              ? 'rgba(251,191,36,0.1)'
                              : 'var(--color-surface-2)',
                            border: `1px solid ${
                              esAsignado ? '#7BF0A0'
                              : esConflicto ? 'rgba(251,191,36,0.5)'
                              : 'var(--color-border)'
                            }`,
                            color: esAsignado ? '#7BF0A0'
                              : esConflicto ? '#fbbf24'
                              : 'var(--color-muted)',
                          }}
                        >
                          {DIA_SHORT[dia]}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Botones guardar/cancelar */}
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleCancelEdit}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold"
              style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-muted)', fontFamily: 'Syne' }}
            >
              <X size={14} />
              Cancelar
            </button>
            <button
              onClick={handleSaveEdit}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold"
              style={{ background: 'rgba(123,240,160,0.15)', border: '1px solid #7BF0A0', color: '#7BF0A0', fontFamily: 'Syne' }}
            >
              <Check size={14} />
              Guardar cambios
            </button>
          </div>
        </div>
      )}

      {/* ── VISTA SEMANAL ────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        {diasOrdenados.map(dia => {
          const esHoy = hoy.includes(dia.dia === 'miercoles' ? 'mie' : dia.dia.slice(0, 3))
          const abierto = expandido === dia.dia

          return (
            <div
              key={dia.dia}
              className="rounded-2xl overflow-hidden transition-all"
              style={{
                background: 'var(--color-surface)',
                border: `1px solid ${esHoy && !editMode ? '#7BF0A0' : 'var(--color-border)'}`,
                boxShadow: esHoy && !editMode ? '0 0 0 1px rgba(123,240,160,0.15)' : 'none',
                opacity: editMode ? 0.5 : 1,
              }}
            >
              <button
                className="w-full flex items-center justify-between px-4 py-3.5 text-left"
                onClick={() => !dia.descanso && toggleDia(dia.dia)}
                style={{ cursor: dia.descanso || editMode ? 'default' : 'pointer' }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                       style={{
                         background: esHoy && !editMode ? 'rgba(123,240,160,0.15)' : dia.descanso ? 'rgba(255,255,255,0.04)' : 'var(--color-surface-2)',
                         border: `1px solid ${esHoy && !editMode ? 'rgba(123,240,160,0.4)' : 'var(--color-border)'}`,
                       }}>
                    {dia.descanso
                      ? <Coffee size={14} color="var(--color-muted)" />
                      : <Dumbbell size={14} color={esHoy && !editMode ? '#7BF0A0' : 'var(--color-muted)'} />
                    }
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold"
                            style={{ fontFamily: 'Syne', color: esHoy && !editMode ? '#7BF0A0' : 'var(--color-text)' }}>
                        {dia.label}
                      </span>
                      {esHoy && !editMode && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold"
                              style={{ background: 'rgba(123,240,160,0.15)', color: '#7BF0A0', fontFamily: 'Syne' }}>
                          Hoy
                        </span>
                      )}
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)', fontFamily: 'DM Sans' }}>
                      {dia.musculos}
                    </p>
                  </div>
                </div>
                {!dia.descanso && !editMode && (
                  <div style={{ color: 'var(--color-muted)' }}>
                    {abierto ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                )}
              </button>

              {abierto && !dia.descanso && dia.ejercicios.length > 0 && (
                <div className="px-4 pb-4 flex flex-col gap-1.5"
                     style={{ borderTop: '1px solid var(--color-border)' }}>
                  <p className="text-[11px] pt-3 pb-1 font-semibold uppercase tracking-wide"
                     style={{ color: 'var(--color-muted)', fontFamily: 'Syne' }}>
                    Ejercicios
                  </p>
                  {dia.ejercicios.map((ej, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span className="text-xs mt-0.5" style={{ color: '#7BF0A0' }}>•</span>
                      <span className="text-sm" style={{ color: 'var(--color-text)', fontFamily: 'DM Sans' }}>{ej}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <p className="text-xs text-center mt-5" style={{ color: 'var(--color-muted)', fontFamily: 'DM Sans' }}>
        Rutina generada el {new Date(rutina.creadaEn).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}
      </p>

      {/* Modal eliminar */}
      {confirmEliminar && (
        <div className="fixed inset-0 z-50 flex items-end justify-center"
             style={{ background: 'rgba(0,0,0,0.7)' }}
             onClick={() => setConfirmEliminar(false)}>
          <div className="w-full max-w-lg rounded-t-2xl p-6 flex flex-col gap-4"
               style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
               onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-base" style={{ fontFamily: 'Syne' }}>¿Eliminar rutina?</h3>
            <p className="text-sm" style={{ color: 'var(--color-muted)', fontFamily: 'DM Sans' }}>
              Se quitará del calendario. Podés generar una nueva desde el Coach IA.
            </p>
            <div className="flex gap-3">
              <button className="flex-1 py-3 rounded-xl text-sm font-semibold"
                      style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-muted)', fontFamily: 'Syne' }}
                      onClick={() => setConfirmEliminar(false)}>
                Cancelar
              </button>
              <button className="flex-1 py-3 rounded-xl text-sm font-semibold"
                      style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.4)', color: '#f87171', fontFamily: 'Syne' }}
                      onClick={eliminarRutina}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
