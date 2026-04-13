import { useState, useRef, useCallback } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useCheckins } from '../hooks/useCheckins'
import { MES_LABELS } from '../types'
import type { CheckinFoto, CheckinWithFotos } from '../types'
import { ChevronLeft, ChevronRight, Trash2, X } from 'lucide-react'

export function FotosPage() {
  const { user } = useAuth()
  const { checkins, loading, deleteFotos, deleteFoto } = useCheckins(user?.id)
  const [mesA, setMesA] = useState<string>('')
  const [mesB, setMesB] = useState<string>('')
  const [sliderPos, setSliderPos] = useState(50)
  const sliderRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const [confirmDeleteSet, setConfirmDeleteSet] = useState<string | null>(null)
  const [confirmDeleteFoto, setConfirmDeleteFoto] = useState<string | null>(null)
  const [deletingSet, setDeletingSet] = useState(false)
  const [deletingFoto, setDeletingFoto] = useState(false)

  const checkinsConFotos = checkins
    .filter(c => c.checkin_fotos?.length > 0)
    .slice(-3)

  const options = checkinsConFotos.map(c => ({
    value: c.id,
    label: `${MES_LABELS[c.mes]} ${c.anio}`,
  }))

  const cA = checkinsConFotos.find(c => c.id === mesA)
  const cB = checkinsConFotos.find(c => c.id === mesB)

  const getMainFoto = (c: CheckinWithFotos) =>
    c.checkin_fotos?.find(f => f.tipo === 'frente')?.url ?? c.checkin_fotos?.[0]?.url

  const handleDeleteSet = async (checkinId: string) => {
    setDeletingSet(true)
    await deleteFotos(checkinId)
    setConfirmDeleteSet(null)
    setDeletingSet(false)
  }

  const handleDeleteFoto = async (foto: CheckinFoto) => {
    setDeletingFoto(true)
    await deleteFoto(foto)
    setConfirmDeleteFoto(null)
    setDeletingFoto(false)
  }

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging.current || !sliderRef.current) return
    const rect = sliderRef.current.getBoundingClientRect()
    setSliderPos(Math.min(Math.max(((e.clientX - rect.left) / rect.width) * 100, 2), 98))
  }, [])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!dragging.current || !sliderRef.current) return
    const rect = sliderRef.current.getBoundingClientRect()
    setSliderPos(Math.min(Math.max(((e.touches[0].clientX - rect.left) / rect.width) * 100, 2), 98))
  }, [])

  const startDrag = () => {
    dragging.current = true
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', stopDrag)
    window.addEventListener('touchmove', handleTouchMove)
    window.addEventListener('touchend', stopDrag)
  }

  const stopDrag = () => {
    dragging.current = false
    window.removeEventListener('mousemove', handleMouseMove)
    window.removeEventListener('mouseup', stopDrag)
    window.removeEventListener('touchmove', handleTouchMove)
    window.removeEventListener('touchend', stopDrag)
  }

  if (loading) return <div className="px-4 pt-8"><p style={{ color: 'var(--color-muted)' }}>Cargando…</p></div>

  if (checkinsConFotos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <div className="text-6xl mb-4">📷</div>
        <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: 'Syne' }}>Sin fotos aún</h2>
        <p style={{ color: 'var(--color-muted)' }}>Subí fotos en tu próximo check-in para ver tu progreso.</p>
      </div>
    )
  }

  return (
    <div className="px-4 pt-8 pb-6">
      <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: 'Syne' }}>Fotos</h1>
      <p className="text-sm mb-6" style={{ color: 'var(--color-muted)' }}>Historial y comparación de progreso</p>

      {/* Historial de progreso */}
      <p className="text-xs font-medium mb-3" style={{ color: 'var(--color-muted)', fontFamily: 'Syne' }}>
        HISTORIAL DE PROGRESO
      </p>

      <div className="flex flex-col gap-4 mb-8">
        {[...checkinsConFotos].reverse().map((c, idx) => (
          <div key={c.id} className="card">
            {/* Header */}
            <div className="flex items-center gap-3 mb-3">
              <div className="w-2 h-2 rounded-full shrink-0"
                   style={{ background: idx === 0 ? '#7BF0A0' : 'var(--color-muted)' }} />
              <p className="text-sm font-bold" style={{ fontFamily: 'Syne', color: idx === 0 ? '#7BF0A0' : 'var(--color-text)' }}>
                {MES_LABELS[c.mes]} {c.anio}
              </p>
              {idx === 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(123,240,160,0.12)', color: '#7BF0A0', fontFamily: 'Syne', border: '1px solid rgba(123,240,160,0.3)' }}>
                  Último
                </span>
              )}
              <span className="text-xs ml-auto" style={{ color: 'var(--color-muted)' }}>
                {c.checkin_fotos.length} foto{c.checkin_fotos.length > 1 ? 's' : ''}
              </span>

              {/* Eliminar set */}
              {confirmDeleteSet === c.id ? (
                <div className="flex items-center gap-1.5">
                  <button onClick={() => setConfirmDeleteSet(null)}
                          className="text-xs px-2 py-1 rounded-lg"
                          style={{ color: 'var(--color-muted)', background: 'var(--color-surface-2)' }}>
                    Cancelar
                  </button>
                  <button onClick={() => handleDeleteSet(c.id)} disabled={deletingSet}
                          className="text-xs px-2 py-1 rounded-lg"
                          style={{ color: '#f87171', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)' }}>
                    {deletingSet ? '…' : 'Confirmar'}
                  </button>
                </div>
              ) : (
                <button onClick={() => setConfirmDeleteSet(c.id)}
                        className="p-1.5 rounded-lg"
                        style={{ color: 'var(--color-muted)', background: 'var(--color-surface-2)' }}>
                  <Trash2 size={13} />
                </button>
              )}
            </div>

            {/* Fotos scroll horizontal con X por foto */}
            <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              {c.checkin_fotos.map(f => (
                <div key={f.id} className="relative rounded-xl overflow-hidden shrink-0"
                     style={{ width: 100, aspectRatio: '3/4', background: 'var(--color-surface-2)' }}>
                  <img src={f.url} alt={f.tipo} className="w-full h-full object-cover" />
                  <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-[10px]"
                       style={{ background: 'rgba(0,0,0,0.7)', color: '#7BF0A0', fontFamily: 'Syne' }}>
                    {f.tipo}
                  </div>

                  {/* Confirmar borrado de foto individual */}
                  {confirmDeleteFoto === f.id ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5"
                         style={{ background: 'rgba(0,0,0,0.75)' }}>
                      <button onClick={() => handleDeleteFoto(f)} disabled={deletingFoto}
                              className="text-[11px] px-2 py-1 rounded-lg font-medium"
                              style={{ color: '#f87171', background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)' }}>
                        {deletingFoto ? '…' : 'Eliminar'}
                      </button>
                      <button onClick={() => setConfirmDeleteFoto(null)}
                              className="text-[11px] px-2 py-1 rounded-lg"
                              style={{ color: 'var(--color-muted)', background: 'rgba(255,255,255,0.1)' }}>
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmDeleteFoto(f.id)}
                            className="absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center"
                            style={{ background: 'rgba(0,0,0,0.65)' }}>
                      <X size={11} color="white" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Medidas rápidas */}
            {(c.peso || c.cintura) && (
              <div className="flex gap-3 mt-3 pt-3" style={{ borderTop: '1px solid var(--color-border)' }}>
                {c.peso && (
                  <div>
                    <p className="text-[10px]" style={{ color: 'var(--color-muted)', fontFamily: 'Syne' }}>PESO</p>
                    <p className="text-sm font-bold">{c.peso} kg</p>
                  </div>
                )}
                {c.cintura && (
                  <div>
                    <p className="text-[10px]" style={{ color: 'var(--color-muted)', fontFamily: 'Syne' }}>CINTURA</p>
                    <p className="text-sm font-bold">{c.cintura} cm</p>
                  </div>
                )}
                {c.abdomen && (
                  <div>
                    <p className="text-[10px]" style={{ color: 'var(--color-muted)', fontFamily: 'Syne' }}>ABDOMEN</p>
                    <p className="text-sm font-bold">{c.abdomen} cm</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Comparador antes/después */}
      {checkinsConFotos.length >= 2 && (
        <>
          <p className="text-xs font-medium mb-3" style={{ color: 'var(--color-muted)', fontFamily: 'Syne' }}>
            COMPARAR ANTES / DESPUÉS
          </p>
          <div className="flex gap-3 mb-4">
            <div className="flex-1">
              <label className="block text-xs mb-1.5" style={{ color: 'var(--color-muted)', fontFamily: 'Syne' }}>ANTES</label>
              <select className="input-base" value={mesA} onChange={e => setMesA(e.target.value)}>
                <option value="">Seleccionar</option>
                {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs mb-1.5" style={{ color: 'var(--color-muted)', fontFamily: 'Syne' }}>DESPUÉS</label>
              <select className="input-base" value={mesB} onChange={e => setMesB(e.target.value)}>
                <option value="">Seleccionar</option>
                {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          {cA && cB ? (
            getMainFoto(cA) && getMainFoto(cB) ? (
              <div className="card overflow-hidden p-0 mb-6">
                <div className="flex justify-between px-4 py-2" style={{ background: 'var(--color-surface-2)' }}>
                  <span className="text-xs font-medium" style={{ fontFamily: 'Syne', color: '#7BF0A0' }}>
                    {MES_LABELS[cA.mes]} {cA.anio}
                  </span>
                  <span className="text-xs font-medium" style={{ fontFamily: 'Syne', color: '#7BF0A0' }}>
                    {MES_LABELS[cB.mes]} {cB.anio}
                  </span>
                </div>
                <div ref={sliderRef} className="relative select-none overflow-hidden"
                     style={{ aspectRatio: '3/4', cursor: 'ew-resize' }}>
                  <img src={getMainFoto(cB)!} alt="después"
                       className="absolute inset-0 w-full h-full object-cover" draggable={false} />
                  <div className="absolute inset-0 overflow-hidden" style={{ width: `${sliderPos}%` }}>
                    <img src={getMainFoto(cA)!} alt="antes"
                         className="absolute inset-0 h-full object-cover"
                         style={{ width: `${(100 / sliderPos) * 100}%`, maxWidth: 'none' }}
                         draggable={false} />
                  </div>
                  <div className="absolute top-0 bottom-0 w-0.5 z-10"
                       style={{ left: `${sliderPos}%`, background: '#7BF0A0', boxShadow: '0 0 10px rgba(123,240,160,0.8)' }} />
                  <div className="absolute top-1/2 z-20 flex items-center justify-center rounded-full cursor-grab active:cursor-grabbing"
                       style={{ left: `${sliderPos}%`, transform: 'translate(-50%, -50%)', width: 40, height: 40, background: '#7BF0A0', boxShadow: '0 0 20px rgba(123,240,160,0.6)' }}
                       onMouseDown={startDrag} onTouchStart={startDrag}>
                    <ChevronLeft size={10} color="#0a0a0a" />
                    <ChevronRight size={10} color="#0a0a0a" />
                  </div>
                </div>
                <p className="text-center text-xs py-2" style={{ color: 'var(--color-muted)' }}>
                  Arrastrá el slider para comparar
                </p>
              </div>
            ) : (
              <div className="card text-center py-8 mb-6">
                <p style={{ color: 'var(--color-muted)' }}>Uno de los meses no tiene foto de frente.</p>
              </div>
            )
          ) : (
            <div className="card flex flex-col items-center py-10 text-center mb-6"
                 style={{ border: '1px dashed var(--color-border)' }}>
              <p className="text-3xl mb-3">🖼️</p>
              <p style={{ color: 'var(--color-muted)' }}>Seleccioná dos meses para comparar.</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
