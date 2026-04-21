import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCheckins } from '../hooks/useCheckins'
import { useAuth } from '../hooks/useAuth'
import { useProfile } from '../hooks/useProfile'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts'
import { MES_LABELS, MEDIDAS_KEYS, MEDIDAS_LABELS } from '../types'
import type { MedidaKey } from '../types'
import { TrendingUp, TrendingDown, Minus, Trash2, UserCircle, X } from 'lucide-react'

export function DashboardPage() {
  const { user } = useAuth()
  const { checkins, loading, deleteCheckin } = useCheckins(user?.id)
  const { profile } = useProfile(user?.id)
  const navigate = useNavigate()
  const [activeMedida, setActiveMedida] = useState<MedidaKey>('peso')
  const [compareA, setCompareA] = useState<string>('')
  const [compareB, setCompareB] = useState<string>('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [bannerDismissed, setBannerDismissed] = useState(false)

  const profileIncomplete = !profile?.nombre || !profile?.objetivo || !profile?.nivel

  const handleDelete = async (id: string) => {
    setDeleting(true)
    await deleteCheckin(id)
    setConfirmDelete(null)
    setDeleting(false)
  }

  if (loading) return <LoadingSkeleton />

  const profileBanner = profileIncomplete && !bannerDismissed ? (
    <div className="flex items-start gap-3 px-4 py-3 rounded-2xl mb-6"
         style={{ background: 'rgba(123,240,160,0.08)', border: '1px solid rgba(123,240,160,0.25)' }}>
      <UserCircle size={20} color="#7BF0A0" className="shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold mb-0.5" style={{ fontFamily: 'Syne', color: '#7BF0A0' }}>
          Completá tu perfil
        </p>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--color-muted)' }}>
          Para que el Coach IA pueda darte recomendaciones personalizadas, completá tu nombre, objetivo y nivel en Perfil.
        </p>
        <button
          onClick={() => navigate('/perfil')}
          className="mt-2 text-xs font-medium px-3 py-1.5 rounded-lg"
          style={{ background: 'rgba(123,240,160,0.15)', color: '#7BF0A0', border: '1px solid rgba(123,240,160,0.3)', fontFamily: 'Syne' }}
        >
          Ir a Perfil →
        </button>
      </div>
      <button onClick={() => setBannerDismissed(true)} className="shrink-0 p-1 rounded-lg"
              style={{ color: 'var(--color-muted)' }}>
        <X size={14} />
      </button>
    </div>
  ) : null

  if (checkins.length === 0) {
    return (
      <div className="px-4 pt-8 pb-6">
        {profileBanner}
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
          <div className="text-6xl mb-4">📊</div>
          <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: 'Syne' }}>
            Sin datos aún
          </h2>
          <p style={{ color: 'var(--color-muted)' }}>
            Hacé tu primer check-in para empezar a ver tu progreso.
          </p>
        </div>
      </div>
    )
  }

  // Chart data
  const chartData = checkins.map((c) => ({
    name: `${MES_LABELS[c.mes].slice(0, 3)} ${c.anio}`,
    value: c[activeMedida] ?? null,
  })).filter(d => d.value !== null)

  // Last checkin stats
  const last = checkins[checkins.length - 1]
  const prev = checkins.length > 1 ? checkins[checkins.length - 2] : null

  // Compare
  const checkinById = Object.fromEntries(checkins.map(c => [c.id, c]))
  const cA = compareA ? checkinById[compareA] : null
  const cB = compareB ? checkinById[compareB] : null

  const checkinOptions = checkins.map(c => ({
    value: c.id,
    label: `${MES_LABELS[c.mes]} ${c.anio}`,
  }))

  return (
    <div className="px-4 pt-8 pb-6">
      {profileBanner}
      <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: 'Syne' }}>
        Tu progreso
      </h1>
      <p className="text-sm mb-6" style={{ color: 'var(--color-muted)' }}>
        {checkins.length} check-in{checkins.length !== 1 ? 's' : ''} registrado{checkins.length !== 1 ? 's' : ''}
      </p>

      {/* Latest stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {MEDIDAS_KEYS.filter(k => last[k] !== null).slice(0, 4).map((key) => {
          const current = last[key] as number
          const previous = prev?.[key] as number | null | undefined
          const diff = previous != null ? current - previous : null
          return (
            <StatCard
              key={key}
              label={MEDIDAS_LABELS[key]}
              value={current}
              diff={diff}
              unit={key === 'peso' ? 'kg' : 'cm'}
            />
          )
        })}
      </div>

      {/* Medida selector */}
      <div className="mb-3">
        <p className="text-xs font-medium mb-2" style={{ color: 'var(--color-muted)', fontFamily: 'Syne' }}>
          EVOLUCIÓN
        </p>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {MEDIDAS_KEYS.map((key) => (
            <button
              key={key}
              onClick={() => setActiveMedida(key)}
              className="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
              style={{
                fontFamily: 'Syne',
                background: activeMedida === key ? 'var(--color-neon)' : 'var(--color-surface-2)',
                color: activeMedida === key ? '#0a0a0a' : 'var(--color-muted)',
                border: '1px solid',
                borderColor: activeMedida === key ? 'var(--color-neon)' : 'var(--color-border)',
              }}
            >
              {MEDIDAS_LABELS[key].split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="card mb-6" style={{ padding: '16px 8px' }}>
        {chartData.length > 1 ? (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{ top: 4, right: 16, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="name"
                tick={{ fill: '#666', fontSize: 10, fontFamily: 'DM Sans' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#666', fontSize: 10, fontFamily: 'DM Sans' }}
                axisLine={false}
                tickLine={false}
                domain={['auto', 'auto']}
              />
              <Tooltip
                contentStyle={{
                  background: '#1a1a1a',
                  border: '1px solid #2a2a2a',
                  borderRadius: 12,
                  fontFamily: 'DM Sans',
                  fontSize: 12,
                  color: '#f0f0f0',
                }}
                cursor={{ stroke: 'rgba(123,240,160,0.2)' }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#7BF0A0"
                strokeWidth={2.5}
                dot={{ fill: '#7BF0A0', r: 4, strokeWidth: 0 }}
                activeDot={{ r: 6, fill: '#7BF0A0', strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-center text-sm py-10" style={{ color: 'var(--color-muted)' }}>
            Necesitás al menos 2 check-ins para ver la evolución.
          </p>
        )}
      </div>

      {/* Historial */}
      <p className="text-xs font-medium mb-3 mt-6" style={{ color: 'var(--color-muted)', fontFamily: 'Syne' }}>
        HISTORIAL DE CHECK-INS
      </p>
      <div className="flex flex-col gap-2">
        {[...checkins].reverse().map(c => (
          <div key={c.id} className="card flex items-center justify-between gap-3 py-3">
            <div>
              <p className="text-sm font-bold" style={{ fontFamily: 'Syne' }}>
                {MES_LABELS[c.mes]} {c.anio}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>
                {[
                  c.peso && `${c.peso} kg`,
                  c.cintura && `cintura ${c.cintura} cm`,
                  c.checkin_fotos?.length && `${c.checkin_fotos.length} foto${c.checkin_fotos.length > 1 ? 's' : ''}`,
                ].filter(Boolean).join(' · ')}
              </p>
            </div>
            {confirmDelete === c.id ? (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="text-xs px-2 py-1 rounded-lg"
                  style={{ color: 'var(--color-muted)', background: 'var(--color-surface-2)' }}
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleDelete(c.id)}
                  disabled={deleting}
                  className="text-xs px-2 py-1 rounded-lg"
                  style={{ color: '#f87171', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)' }}
                >
                  {deleting ? '…' : 'Confirmar'}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(c.id)}
                className="shrink-0 p-2 rounded-lg transition-all"
                style={{ color: 'var(--color-muted)', background: 'var(--color-surface-2)' }}
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Comparativa */}
      {checkins.length >= 2 && (
        <>
          <p className="text-xs font-medium mb-3 mt-6" style={{ color: 'var(--color-muted)', fontFamily: 'Syne' }}>
            COMPARAR DOS MESES
          </p>
          <div className="flex gap-3 mb-4">
            <select className="input-base" value={compareA} onChange={e => setCompareA(e.target.value)}>
              <option value="">Mes A</option>
              {checkinOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select className="input-base" value={compareB} onChange={e => setCompareB(e.target.value)}>
              <option value="">Mes B</option>
              {checkinOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          {cA && cB && (
            <div className="card overflow-hidden">
              <div className="grid grid-cols-3 gap-0">
                <div className="col-span-1 py-2 px-3 text-xs font-medium"
                     style={{ fontFamily: 'Syne', color: 'var(--color-muted)' }}>
                  MEDIDA
                </div>
                <div className="col-span-1 py-2 px-3 text-xs font-medium text-center"
                     style={{ fontFamily: 'Syne', color: '#7BF0A0' }}>
                  {MES_LABELS[cA.mes]}
                </div>
                <div className="col-span-1 py-2 px-3 text-xs font-medium text-center"
                     style={{ fontFamily: 'Syne', color: '#7BF0A0' }}>
                  {MES_LABELS[cB.mes]}
                </div>
              </div>
              {MEDIDAS_KEYS.map((key, i) => {
                const vA = cA[key] as number | null
                const vB = cB[key] as number | null
                if (vA == null && vB == null) return null
                const diff = vA != null && vB != null ? vB - vA : null
                return (
                  <div
                    key={key}
                    className="grid grid-cols-3 border-t"
                    style={{ borderColor: 'var(--color-border)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}
                  >
                    <div className="py-3 px-3 text-xs" style={{ color: 'var(--color-muted)' }}>
                      {MEDIDAS_LABELS[key].split(' ')[0]}
                    </div>
                    <div className="py-3 px-3 text-sm text-center font-medium">
                      {vA ?? '—'}
                    </div>
                    <div className="py-3 px-3 text-sm text-center font-medium flex items-center justify-center gap-1">
                      {vB ?? '—'}
                      {diff !== null && (
                        <span className="text-xs" style={{
                          color: getDiffColor(key, diff),
                        }}>
                          {diff > 0 ? '+' : ''}{diff.toFixed(1)}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function StatCard({ label, value, diff, unit }: {
  label: string; value: number; diff: number | null; unit: string
}) {
  const Icon = diff == null ? Minus : diff > 0 ? TrendingUp : diff < 0 ? TrendingDown : Minus
  const color = diff == null || diff === 0 ? 'var(--color-muted)' : diff > 0 ? '#f87171' : '#7BF0A0'

  return (
    <div className="card flex flex-col gap-1">
      <p className="text-xs" style={{ color: 'var(--color-muted)', fontFamily: 'Syne' }}>
        {label}
      </p>
      <p className="text-2xl font-bold" style={{ fontFamily: 'Syne' }}>
        {value}<span className="text-sm font-normal ml-1" style={{ color: 'var(--color-muted)' }}>{unit}</span>
      </p>
      {diff !== null && (
        <div className="flex items-center gap-1 text-xs" style={{ color }}>
          <Icon size={12} />
          <span>{diff > 0 ? '+' : ''}{diff.toFixed(1)} {unit}</span>
        </div>
      )}
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="px-4 pt-8 animate-pulse">
      <div className="h-6 w-40 rounded-lg mb-2" style={{ background: 'var(--color-surface-2)' }} />
      <div className="h-4 w-24 rounded-lg mb-6" style={{ background: 'var(--color-surface-2)' }} />
      <div className="grid grid-cols-2 gap-3 mb-6">
        {[1,2,3,4].map(i => (
          <div key={i} className="h-20 rounded-2xl" style={{ background: 'var(--color-surface)' }} />
        ))}
      </div>
      <div className="h-52 rounded-2xl" style={{ background: 'var(--color-surface)' }} />
    </div>
  )
}

// For metrics where lower is better (measurements), green = going down
// For weight it depends on goal but default: neutral
function getDiffColor(key: MedidaKey, diff: number): string {
  if (diff === 0) return 'var(--color-muted)'
  if (key === 'peso') return diff < 0 ? '#7BF0A0' : '#f87171'
  return diff < 0 ? '#7BF0A0' : '#f87171'
}
