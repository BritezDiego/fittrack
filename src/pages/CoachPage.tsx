import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useCheckins } from '../hooks/useCheckins'
import { useProfile } from '../hooks/useProfile'
import { OBJETIVO_LABELS, NIVEL_LABELS, MES_LABELS } from '../types'
import { Bot, Dumbbell, Salad, Loader2, Copy, Check } from 'lucide-react'

type PlanType = 'rutina' | 'alimentacion'
type Objetivo = 'perdida_grasa' | 'ganancia_muscular' | 'recomposicion' | 'mantenimiento'
type Nivel = 'principiante' | 'intermedio' | 'avanzado'

export function CoachPage() {
  const { user } = useAuth()
  const { profile } = useProfile(user?.id)
  const { checkins } = useCheckins(user?.id)

  const lastCheckin = checkins[checkins.length - 1]

  const [planType, setPlanType] = useState<PlanType>('rutina')
  const [objetivo, setObjetivo] = useState<Objetivo>(
    (profile?.objetivo as Objetivo) ?? 'perdida_grasa'
  )
  const [nivel, setNivel] = useState<Nivel>(
    (profile?.nivel as Nivel) ?? 'principiante'
  )
  const [dias, setDias] = useState(3)
  const [restricciones, setRestricciones] = useState('')
  const [instrucciones, setInstrucciones] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const checkinImageUrls = lastCheckin?.checkin_fotos?.map(f => f.url) ?? []
  const hasImages = checkinImageUrls.length > 0

  const buildPrompt = () => {
    const userData = [
      profile?.nombre && `Nombre: ${profile.nombre}`,
      profile?.edad && `Edad: ${profile.edad} años`,
      profile?.altura && `Altura: ${profile.altura} cm`,
      `Objetivo: ${OBJETIVO_LABELS[objetivo]}`,
      `Nivel: ${NIVEL_LABELS[nivel]}`,
      `Días disponibles por semana: ${dias}`,
      restricciones && `Restricciones/lesiones: ${restricciones}`,
    ].filter(Boolean).join('\n')

    const medidasStr = lastCheckin
      ? [
          `Peso: ${lastCheckin.peso ?? 'N/A'} kg`,
          `Cintura: ${lastCheckin.cintura ?? 'N/A'} cm`,
          `Abdomen: ${lastCheckin.abdomen ?? 'N/A'} cm`,
          `Glúteos: ${lastCheckin.gluteos ?? 'N/A'} cm`,
          `Muslos: ${lastCheckin.muslos ?? 'N/A'} cm`,
          `Brazos: ${lastCheckin.brazos ?? 'N/A'} cm`,
          `Mes del check-in: ${MES_LABELS[lastCheckin.mes]} ${lastCheckin.anio}`,
          lastCheckin.notas && `Notas del check-in: ${lastCheckin.notas}`,
        ].filter(Boolean).join('\n')
      : 'Sin check-in registrado aún.'

    const imageContext = hasImages
      ? `\nFOTOS DEL ÚLTIMO CHECK-IN: Se adjuntan ${checkinImageUrls.length} foto(s) del cuerpo del usuario. Analiza visualmente la composición corporal, distribución de grasa y masa muscular visible para personalizar aún más el plan.\n`
      : ''

    const instruccionesContext = instrucciones.trim()
      ? `\nINSTRUCCIONES ESPECÍFICAS DEL USUARIO (prioridad alta — el plan debe girar en torno a esto):\n${instrucciones.trim()}\n`
      : ''

    if (planType === 'rutina') {
      return `Eres un coach fitness experto. Genera una rutina semanal detallada y personalizada.

DATOS DEL USUARIO:
${userData}

MEDIDAS ACTUALES (último check-in):
${medidasStr}
${imageContext}${instruccionesContext}
Genera una RUTINA SEMANAL con:
- Distribución clara de días (ej: Lunes - Pecho/Tríceps, etc.)
- Para cada ejercicio: series, repeticiones, descanso y notas de forma
- Calentamiento y enfriamiento
- Progresión sugerida para las próximas semanas
- Tips específicos para su objetivo de ${OBJETIVO_LABELS[objetivo]}${hasImages ? '\n- Observaciones basadas en las fotos sobre áreas a trabajar prioritariamente' : ''}${instrucciones.trim() ? '\n- Asegurate de que las instrucciones específicas del usuario sean el eje central del plan' : ''}

Formato: usa markdown con headers (##), listas y tablas donde sea útil. Sé específico y práctico.`
    } else {
      return `Eres un nutricionista deportivo experto. Genera un plan de alimentación detallado y personalizado.

DATOS DEL USUARIO:
${userData}

MEDIDAS ACTUALES (último check-in):
${medidasStr}
${imageContext}${instruccionesContext}
Genera un PLAN DE ALIMENTACIÓN con:
- Calorías totales diarias recomendadas (con cálculo basado en datos)
- Distribución de macros (proteínas, carbohidratos, grasas) en gramos y porcentajes
- Plan de comidas para un día típico (desayuno, almuerzo, merienda, cena, snacks)
- Lista de alimentos recomendados y a evitar
- Timing de nutrientes alrededor del entrenamiento
- Tips específicos para ${OBJETIVO_LABELS[objetivo]}${hasImages ? '\n- Observaciones basadas en las fotos sobre la composición corporal actual' : ''}${instrucciones.trim() ? '\n- El plan debe reflejar las instrucciones específicas del usuario como prioridad' : ''}

Formato: usa markdown con headers (##), listas y tablas. Incluye valores nutricionales aproximados.`
    }
  }

  const generate = async () => {
    setError(null)
    setResult(null)
    setLoading(true)

    try {
      const response = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: buildPrompt(), imageUrls: checkinImageUrls }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error ?? `Error ${response.status}`)
      }

      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let fullText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim()
          if (raw === '[DONE]') break
          try {
            const parsed = JSON.parse(raw)
            if (parsed.error) throw new Error(parsed.error)
            if (parsed.text) {
              fullText += parsed.text
              setResult(fullText)
            }
          } catch (parseErr: any) {
            if (parseErr.message && !parseErr.message.includes('JSON')) {
              throw parseErr
            }
          }
        }
      }
    } catch (err: any) {
      setError(err.message ?? 'Error al conectar con el Coach IA.')
    } finally {
      setLoading(false)
    }
  }

  const copyResult = () => {
    if (result) {
      navigator.clipboard.writeText(result)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="px-4 pt-8 pb-6">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
             style={{ background: 'rgba(123,240,160,0.1)', border: '1px solid rgba(123,240,160,0.3)' }}>
          <Bot size={18} color="#7BF0A0" />
        </div>
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'Syne' }}>Coach IA</h1>
      </div>
      <p className="text-sm mb-6" style={{ color: 'var(--color-muted)' }}>
        Planes personalizados con tus datos reales
      </p>

      {/* Plan type */}
      <div className="flex rounded-xl p-1 mb-5"
           style={{ background: 'var(--color-surface)' }}>
        {([['rutina', Dumbbell, 'Rutina semanal'], ['alimentacion', Salad, 'Plan alimentario']] as const).map(
          ([type, Icon, label]) => (
            <button
              key={type}
              onClick={() => setPlanType(type)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all"
              style={{
                fontFamily: 'Syne',
                background: planType === type ? 'var(--color-neon)' : 'transparent',
                color: planType === type ? '#0a0a0a' : 'var(--color-muted)',
              }}
            >
              <Icon size={14} />
              {label}
            </button>
          )
        )}
      </div>

      <div className="card flex flex-col gap-4 mb-5">
        {/* Objetivo */}
        <div>
          <label className="block text-xs font-medium mb-2" style={{ color: 'var(--color-muted)', fontFamily: 'Syne' }}>
            OBJETIVO
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(Object.entries(OBJETIVO_LABELS) as [Objetivo, string][]).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setObjetivo(key)}
                className="py-2.5 px-3 rounded-xl text-sm text-left transition-all"
                style={{
                  fontFamily: 'DM Sans',
                  background: objetivo === key ? 'rgba(123,240,160,0.12)' : 'var(--color-surface-2)',
                  border: '1px solid',
                  borderColor: objetivo === key ? '#7BF0A0' : 'var(--color-border)',
                  color: objetivo === key ? '#7BF0A0' : 'var(--color-text)',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Nivel */}
        <div>
          <label className="block text-xs font-medium mb-2" style={{ color: 'var(--color-muted)', fontFamily: 'Syne' }}>
            NIVEL
          </label>
          <div className="flex gap-2">
            {(Object.entries(NIVEL_LABELS) as [Nivel, string][]).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setNivel(key)}
                className="flex-1 py-2.5 rounded-xl text-sm transition-all"
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

        {/* Días */}
        <div>
          <label className="block text-xs font-medium mb-2" style={{ color: 'var(--color-muted)', fontFamily: 'Syne' }}>
            DÍAS POR SEMANA: <span style={{ color: '#7BF0A0' }}>{dias}</span>
          </label>
          <input
            type="range"
            min={1}
            max={7}
            value={dias}
            onChange={e => setDias(Number(e.target.value))}
            className="w-full"
            style={{ accentColor: '#7BF0A0' }}
          />
          <div className="flex justify-between text-xs mt-1" style={{ color: 'var(--color-muted)' }}>
            <span>1</span><span>7</span>
          </div>
        </div>

        {/* Restricciones */}
        <div>
          <label className="block text-xs font-medium mb-2" style={{ color: 'var(--color-muted)', fontFamily: 'Syne' }}>
            RESTRICCIONES / LESIONES <span style={{ color: 'var(--color-muted)', fontWeight: 400 }}>(opcional)</span>
          </label>
          <input
            className="input-base"
            placeholder="Ej: lesión de rodilla, vegetariano, sin gluten…"
            value={restricciones}
            onChange={e => setRestricciones(e.target.value)}
          />
        </div>

        {/* Instrucciones personalizadas */}
        <div>
          <label className="block text-xs font-medium mb-2" style={{ color: 'var(--color-muted)', fontFamily: 'Syne' }}>
            INSTRUCCIONES AL COACH <span style={{ color: 'var(--color-muted)', fontWeight: 400 }}>(opcional)</span>
          </label>
          <textarea
            className="input-base"
            rows={3}
            placeholder="Ej: quiero enfocarme en crecimiento de glúteos, prefiero ejercicios sin máquinas, me gustaría más proteína en el desayuno…"
            value={instrucciones}
            onChange={e => setInstrucciones(e.target.value)}
            style={{ resize: 'none' }}
          />
        </div>
      </div>

      {/* Context preview */}
      {lastCheckin && (
        <div className="rounded-xl px-4 py-3 mb-5 text-xs flex flex-col gap-1"
             style={{ background: 'rgba(123,240,160,0.05)', border: '1px solid rgba(123,240,160,0.2)', color: 'var(--color-muted)' }}>
          <div>
            <span style={{ color: '#7BF0A0', fontFamily: 'Syne', fontWeight: 600 }}>✓ Último check-in incluido: </span>
            {MES_LABELS[lastCheckin.mes]} {lastCheckin.anio} — {lastCheckin.peso ?? '?'}kg
          </div>
          {hasImages && (
            <div>
              <span style={{ color: '#7BF0A0', fontFamily: 'Syne', fontWeight: 600 }}>✓ Fotos para análisis visual: </span>
              {checkinImageUrls.length} foto{checkinImageUrls.length > 1 ? 's' : ''} ({lastCheckin.checkin_fotos.map(f => f.tipo).join(', ')})
            </div>
          )}
        </div>
      )}

      <button className="btn-primary" onClick={generate} disabled={loading}>
        {loading
          ? <span className="flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" /> Generando…</span>
          : `Generar ${planType === 'rutina' ? 'rutina' : 'plan alimentario'}`}
      </button>

      {error && (
        <div className="rounded-xl px-4 py-3 mt-4 text-sm"
             style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>
          {error}
        </div>
      )}

      {result && (
        <div className="card mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold" style={{ fontFamily: 'Syne', color: '#7BF0A0' }}>
              Tu {planType === 'rutina' ? 'rutina' : 'plan alimentario'}
            </h3>
            <button
              onClick={copyResult}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all"
              style={{
                background: 'var(--color-surface-2)',
                border: '1px solid var(--color-border)',
                color: copied ? '#7BF0A0' : 'var(--color-muted)',
              }}
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? 'Copiado' : 'Copiar'}
            </button>
          </div>
          <div
            className="text-sm leading-relaxed whitespace-pre-wrap"
            style={{ color: 'var(--color-text)', fontFamily: 'DM Sans' }}
          >
            <MarkdownRenderer content={result} />
          </div>
        </div>
      )}
    </div>
  )
}

// Simple markdown renderer for the AI output
function MarkdownRenderer({ content }: { content: string }) {
  const lines = content.split('\n')
  return (
    <>
      {lines.map((line, i) => {
        if (line.startsWith('## ')) {
          return <h2 key={i} className="text-base font-bold mt-4 mb-2" style={{ fontFamily: 'Syne', color: '#7BF0A0' }}>{line.slice(3)}</h2>
        }
        if (line.startsWith('### ')) {
          return <h3 key={i} className="text-sm font-bold mt-3 mb-1" style={{ fontFamily: 'Syne', color: '#f0f0f0' }}>{line.slice(4)}</h3>
        }
        if (line.startsWith('**') && line.endsWith('**')) {
          return <p key={i} className="font-semibold my-1">{line.slice(2, -2)}</p>
        }
        if (line.startsWith('- ') || line.startsWith('* ')) {
          return (
            <div key={i} className="flex gap-2 my-0.5">
              <span style={{ color: '#7BF0A0' }}>•</span>
              <span>{line.slice(2)}</span>
            </div>
          )
        }
        if (line.match(/^\d+\./)) {
          return <p key={i} className="my-0.5 pl-1">{line}</p>
        }
        if (line === '') return <div key={i} className="h-2" />
        return <p key={i} className="my-0.5">{line}</p>
      })}
    </>
  )
}
