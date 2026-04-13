import { useState, useRef, useCallback } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useCheckins } from '../hooks/useCheckins'
import { MES_LABELS } from '../types'
import type { CheckinWithFotos } from '../types'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export function FotosPage() {
  const { user } = useAuth()
  const { checkins, loading } = useCheckins(user?.id)
  const [mesA, setMesA] = useState<string>('')
  const [mesB, setMesB] = useState<string>('')
  const [sliderPos, setSliderPos] = useState(50)
  const sliderRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  const checkinsConFotos = checkins.filter(c => c.checkin_fotos?.length > 0)

  const options = checkinsConFotos.map(c => ({
    value: c.id,
    label: `${MES_LABELS[c.mes]} ${c.anio}`,
  }))

  const cA = checkinsConFotos.find(c => c.id === mesA)
  const cB = checkinsConFotos.find(c => c.id === mesB)

  const getMainFoto = (c: CheckinWithFotos) =>
    c.checkin_fotos?.find(f => f.tipo === 'frente')?.url
    ?? c.checkin_fotos?.[0]?.url

  // Drag logic for slider
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging.current || !sliderRef.current) return
    const rect = sliderRef.current.getBoundingClientRect()
    const pos = ((e.clientX - rect.left) / rect.width) * 100
    setSliderPos(Math.min(Math.max(pos, 2), 98))
  }, [])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!dragging.current || !sliderRef.current) return
    const rect = sliderRef.current.getBoundingClientRect()
    const pos = ((e.touches[0].clientX - rect.left) / rect.width) * 100
    setSliderPos(Math.min(Math.max(pos, 2), 98))
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
        <p style={{ color: 'var(--color-muted)' }}>
          Subí fotos en tu próximo check-in para comparar tu progreso visualmente.
        </p>
      </div>
    )
  }

  return (
    <div className="px-4 pt-8 pb-6">
      <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: 'Syne' }}>Comparar fotos</h1>
      <p className="text-sm mb-6" style={{ color: 'var(--color-muted)' }}>
        Antes y después con deslizador
      </p>

      {/* Month selectors */}
      <div className="flex gap-3 mb-6">
        <div className="flex-1">
          <label className="block text-xs mb-1.5" style={{ color: 'var(--color-muted)', fontFamily: 'Syne' }}>
            MES A (antes)
          </label>
          <select className="input-base" value={mesA} onChange={e => setMesA(e.target.value)}>
            <option value="">Seleccionar</option>
            {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-xs mb-1.5" style={{ color: 'var(--color-muted)', fontFamily: 'Syne' }}>
            MES B (después)
          </label>
          <select className="input-base" value={mesB} onChange={e => setMesB(e.target.value)}>
            <option value="">Seleccionar</option>
            {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {/* Slider comparison */}
      {cA && cB ? (
        <>
          {getMainFoto(cA) && getMainFoto(cB) ? (
            <div className="card overflow-hidden p-0 mb-6">
              {/* Labels */}
              <div className="flex justify-between px-4 py-2"
                   style={{ background: 'var(--color-surface-2)' }}>
                <span className="text-xs font-medium" style={{ fontFamily: 'Syne', color: '#7BF0A0' }}>
                  {MES_LABELS[cA.mes]} {cA.anio}
                </span>
                <span className="text-xs font-medium" style={{ fontFamily: 'Syne', color: '#7BF0A0' }}>
                  {MES_LABELS[cB.mes]} {cB.anio}
                </span>
              </div>

              {/* Before/after slider */}
              <div
                ref={sliderRef}
                className="relative select-none overflow-hidden"
                style={{ aspectRatio: '3/4', cursor: 'ew-resize' }}
              >
                {/* B (right - full width) */}
                <img
                  src={getMainFoto(cB)!}
                  alt="después"
                  className="absolute inset-0 w-full h-full object-cover"
                  draggable={false}
                />
                {/* A (left - clipped) */}
                <div
                  className="absolute inset-0 overflow-hidden"
                  style={{ width: `${sliderPos}%` }}
                >
                  <img
                    src={getMainFoto(cA)!}
                    alt="antes"
                    className="absolute inset-0 h-full object-cover"
                    style={{ width: `${(100 / sliderPos) * 100}%`, maxWidth: 'none' }}
                    draggable={false}
                  />
                </div>
                {/* Divider */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 z-10"
                  style={{
                    left: `${sliderPos}%`,
                    background: '#7BF0A0',
                    boxShadow: '0 0 10px rgba(123,240,160,0.8)',
                  }}
                />
                {/* Handle */}
                <div
                  className="absolute top-1/2 z-20 flex items-center justify-center rounded-full cursor-grab active:cursor-grabbing"
                  style={{
                    left: `${sliderPos}%`,
                    transform: 'translate(-50%, -50%)',
                    width: 40,
                    height: 40,
                    background: '#7BF0A0',
                    boxShadow: '0 0 20px rgba(123,240,160,0.6)',
                  }}
                  onMouseDown={startDrag}
                  onTouchStart={startDrag}
                >
                  <ChevronLeft size={10} color="#0a0a0a" />
                  <ChevronRight size={10} color="#0a0a0a" />
                </div>
              </div>
              <p className="text-center text-xs py-2" style={{ color: 'var(--color-muted)' }}>
                Arrastrá el slider para comparar
              </p>
            </div>
          ) : (
            <div className="card text-center py-8">
              <p style={{ color: 'var(--color-muted)' }}>Uno de los meses no tiene foto principal.</p>
            </div>
          )}

          {/* All photos grid side by side */}
          <p className="text-xs font-medium mb-3" style={{ color: 'var(--color-muted)', fontFamily: 'Syne' }}>
            TODAS LAS FOTOS
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs mb-2 text-center font-medium" style={{ color: '#7BF0A0', fontFamily: 'Syne' }}>
                {MES_LABELS[cA.mes]} {cA.anio}
              </p>
              <div className="flex flex-col gap-2">
                {cA.checkin_fotos?.map(f => (
                  <img key={f.id} src={f.url} alt={f.tipo}
                    className="w-full rounded-xl object-cover"
                    style={{ aspectRatio: '3/4' }} />
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs mb-2 text-center font-medium" style={{ color: '#7BF0A0', fontFamily: 'Syne' }}>
                {MES_LABELS[cB.mes]} {cB.anio}
              </p>
              <div className="flex flex-col gap-2">
                {cB.checkin_fotos?.map(f => (
                  <img key={f.id} src={f.url} alt={f.tipo}
                    className="w-full rounded-xl object-cover"
                    style={{ aspectRatio: '3/4' }} />
                ))}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="card flex flex-col items-center py-12 text-center mb-6"
             style={{ border: '1px dashed var(--color-border)' }}>
          <p className="text-4xl mb-3">🖼️</p>
          <p style={{ color: 'var(--color-muted)' }}>
            {checkinsConFotos.length >= 2
              ? 'Seleccioná dos meses para comparar.'
              : 'Seleccioná un mes en ambos selectores para ver tus fotos.'}
          </p>
        </div>
      )}

      {/* Galería de todos los check-ins */}
      <p className="text-xs font-medium mb-3" style={{ color: 'var(--color-muted)', fontFamily: 'Syne' }}>
        GALERÍA COMPLETA
      </p>
      {checkinsConFotos.map(c => (
        <div key={c.id} className="card mb-4">
          <p className="text-sm font-bold mb-3" style={{ fontFamily: 'Syne', color: '#7BF0A0' }}>
            {MES_LABELS[c.mes]} {c.anio}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {c.checkin_fotos?.map(f => (
              <div key={f.id} className="relative rounded-xl overflow-hidden"
                   style={{ aspectRatio: '3/4', background: 'var(--color-surface-2)' }}>
                <img src={f.url} alt={f.tipo} className="w-full h-full object-cover" />
                <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-[10px]"
                     style={{ background: 'rgba(0,0,0,0.7)', color: '#7BF0A0', fontFamily: 'Syne' }}>
                  {f.tipo}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
