import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useCheckins } from '../hooks/useCheckins'
import { useProfile } from '../hooks/useProfile'
import { OBJETIVO_LABELS, NIVEL_LABELS, MES_LABELS, getTipoLabel } from '../types'
import { Bot, Dumbbell, Salad, Loader2, Copy, Check, AlertTriangle } from 'lucide-react'

type Objetivo = 'perdida_grasa' | 'ganancia_muscular' | 'recomposicion' | 'mantenimiento'
type Nivel = 'principiante' | 'intermedio' | 'avanzado'

const SS_RUTINA = 'coach_result_rutina'
const SS_ALIMENTACION = 'coach_result_alimentacion'

export function CoachPage() {
  const { user } = useAuth()
  const { profile } = useProfile(user?.id)
  const { checkins } = useCheckins(user?.id)

  const lastCheckin = checkins[checkins.length - 1]
  const prevCheckin = checkins.length >= 2 ? checkins[checkins.length - 2] : null

  // Defaults first — synced from profile via useEffect
  const [objetivo, setObjetivo] = useState<Objetivo>('perdida_grasa')
  const [nivel, setNivel] = useState<Nivel>('principiante')
  const [dias, setDias] = useState(3)
  const [restricciones, setRestricciones] = useState('')
  const [instrucciones, setInstrucciones] = useState('')

  useEffect(() => {
    if (profile?.objetivo) setObjetivo(profile.objetivo as Objetivo)
    if (profile?.nivel) setNivel(profile.nivel as Nivel)
  }, [profile?.objetivo, profile?.nivel])

  // Per-card loading states
  const [loadingRutina, setLoadingRutina] = useState(false)
  const [loadingAlimentacion, setLoadingAlimentacion] = useState(false)
  const loading = loadingRutina || loadingAlimentacion

  // Persist results across navigation via sessionStorage
  const [resultRutina, setResultRutinaState] = useState<string | null>(() =>
    sessionStorage.getItem(SS_RUTINA)
  )
  const [resultAlimentacion, setResultAlimentacionState] = useState<string | null>(() =>
    sessionStorage.getItem(SS_ALIMENTACION)
  )

  const setResultRutina = (v: string | null) => {
    setResultRutinaState(v)
    if (v) sessionStorage.setItem(SS_RUTINA, v)
    else sessionStorage.removeItem(SS_RUTINA)
  }

  const setResultAlimentacion = (v: string | null) => {
    setResultAlimentacionState(v)
    if (v) sessionStorage.setItem(SS_ALIMENTACION, v)
    else sessionStorage.removeItem(SS_ALIMENTACION)
  }

  const [error, setError] = useState<string | null>(null)
  const [copiedRutina, setCopiedRutina] = useState(false)
  const [copiedAlimentacion, setCopiedAlimentacion] = useState(false)

  const resultsRef = useRef<HTMLDivElement>(null)
  const hasResults = !!(resultRutina || resultAlimentacion)

  // Fotos: hasta 5 del check-in anterior + 5 del último
  const prevCheckinFotos = prevCheckin?.checkin_fotos?.slice(0, 5) ?? []
  const lastCheckinFotos = lastCheckin?.checkin_fotos?.slice(0, 5) ?? []
  const checkinImageUrls = [
    ...prevCheckinFotos.map(f => f.url),
    ...lastCheckinFotos.map(f => f.url),
  ]
  const hasImages = checkinImageUrls.length > 0

  // Construye el array de URLs y el contexto de imágenes con matching inteligente por tipo
  const buildImageData = () => {
    if (!hasImages) return { urls: [] as string[], imageContext: '' }

    // Indexar por tipo
    const prevByTipo = new Map(prevCheckinFotos.map(f => [f.tipo, f]))
    const lastByTipo = new Map(lastCheckinFotos.map(f => [f.tipo, f]))
    const allTipos = [...new Set([...prevByTipo.keys(), ...lastByTipo.keys()])]

    const urls: string[] = []
    const lines: string[] = []
    let idx = 1

    const prevLabel = prevCheckin ? `${MES_LABELS[prevCheckin.mes]} ${prevCheckin.anio}` : ''
    const lastLabel = `${MES_LABELS[lastCheckin!.mes]} ${lastCheckin!.anio}`

    for (const tipo of allTipos) {
      const prev = prevByTipo.get(tipo)
      const last = lastByTipo.get(tipo)
      const label = getTipoLabel(tipo)

      if (prev && last) {
        // Ambos meses tienen esta foto → par de comparación
        urls.push(prev.url, last.url)
        lines.push(`Imágenes ${idx} y ${idx + 1}: "${label}" — ${prevLabel} vs ${lastLabel} (COMPARAR)`)
        idx += 2
      } else if (last && !prev) {
        // Solo en el último mes → primera vez, sin referencia
        urls.push(last.url)
        lines.push(`Imagen ${idx}: "${label}" — ${lastLabel} (primera vez registrada, sin foto anterior para comparar)`)
        idx += 1
      } else if (prev && !last) {
        // Solo en el mes anterior → no hay foto reciente
        urls.push(prev.url)
        lines.push(`Imagen ${idx}: "${label}" — ${prevLabel} (no hay foto reciente de este ángulo)`)
        idx += 1
      }
    }

    const imageContext = `\nFOTOS ADJUNTAS (${urls.length} en total):\n${lines.join('\n')}\n`
    return { urls, imageContext }
  }

  const buildContext = () => {
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

    const { urls: imageUrls, imageContext } = buildImageData()

    const instruccionesContext = instrucciones.trim()
      ? `\nINSTRUCCIONES ESPECÍFICAS (prioridad alta):\n${instrucciones.trim()}\n`
      : ''

    return { userData, medidasStr, imageContext, imageUrls, instruccionesContext }
  }

  const buildRutinaPrompt = () => {
    const { userData, medidasStr, imageContext, instruccionesContext } = buildContext()
    // imageUrls se obtiene por separado en generate()

    // Detección de duplicados solo en este prompt (se ejecuta una sola vez)
    const duplicateInstruction = prevCheckinFotos.length > 0 && lastCheckinFotos.length > 0
      ? `\nANTES DE ANALIZAR: Compará minuciosamente las fotos de ambos check-ins para detectar si alguna imagen fue reutilizada entre meses. La clienta puede estar en ropa interior o ropa deportiva ajustada — examiná con detalle: posición corporal exacta, ángulo, iluminación, sombras, marcas en la piel, ropa, accesorios, fondo. Si encontrás fotos idénticas o muy similares entre meses, indicalo claramente al inicio de tu respuesta antes del plan. Si todas son distintas, confirmalo también.\n`
      : ''

    return `Eres un coach fitness experto. Genera una rutina semanal detallada y personalizada.

DATOS DEL USUARIO:
${userData}

MEDIDAS ACTUALES (último check-in):
${medidasStr}
${imageContext}${duplicateInstruction}${instruccionesContext}
Genera una RUTINA SEMANAL con:
- Distribución clara de días (ej: Lunes - Pecho/Tríceps, etc.)
- Para cada ejercicio: series, repeticiones, descanso y notas de forma
- Calentamiento y enfriamiento
- Progresión sugerida para las próximas semanas
- Tips específicos para su objetivo de ${OBJETIVO_LABELS[objetivo]}${hasImages ? '\n- Observaciones basadas en las fotos sobre áreas a trabajar prioritariamente' : ''}${instrucciones.trim() ? '\n- Las instrucciones específicas del usuario deben ser el eje central' : ''}

Formato: usa markdown con headers (##), listas y tablas donde sea útil. Sé específico y práctico.`
  }

  const buildAlimentacionPrompt = () => {
    const { userData, medidasStr, imageContext, instruccionesContext } = buildContext()
    // imageUrls se obtiene por separado en generate()
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
- Tips específicos para ${OBJETIVO_LABELS[objetivo]}${hasImages ? '\n- Observaciones basadas en las fotos sobre la composición corporal actual' : ''}${instrucciones.trim() ? '\n- Las instrucciones específicas del usuario deben ser el eje central' : ''}

Formato: usa markdown con headers (##), listas y tablas. Incluye valores nutricionales aproximados.`
  }

  const streamResponse = async (
    prompt: string,
    imageUrls: string[],
    onChunk: (text: string) => void
  ) => {
    const response = await fetch('/api/coach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, imageUrls }),
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
        if (raw === '[DONE]') return
        try {
          const parsed = JSON.parse(raw)
          if (parsed.error) throw new Error(parsed.error)
          if (parsed.text) {
            fullText += parsed.text
            onChunk(fullText)
          }
        } catch (parseErr: any) {
          if (parseErr.message && !parseErr.message.includes('JSON')) throw parseErr
        }
      }
    }
  }

  const generate = async () => {
    setError(null)
    setResultRutina(null)
    setResultAlimentacion(null)
    setLoadingRutina(true)
    setLoadingAlimentacion(true)

    // Scroll to results area as soon as loading starts
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)

    const { imageUrls } = buildContext()

    const [rutinaErr, alimentacionErr] = await Promise.all([
      streamResponse(buildRutinaPrompt(), imageUrls, setResultRutina)
        .then(() => null as null)
        .catch((e: any) => e)
        .finally(() => setLoadingRutina(false)),
      streamResponse(buildAlimentacionPrompt(), imageUrls, setResultAlimentacion)
        .then(() => null as null)
        .catch((e: any) => e)
        .finally(() => setLoadingAlimentacion(false)),
    ])

    const err = rutinaErr ?? alimentacionErr
    if (err) setError((err as any).message ?? 'Error al conectar con el Coach IA.')
  }

  const copy = async (text: string, setCopied: (v: boolean) => void) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard no disponible
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
        Genera tu rutina y plan alimentario personalizados
      </p>

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
            type="range" min={1} max={7} value={dias}
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
            RESTRICCIONES / LESIONES <span style={{ fontWeight: 400 }}>(opcional)</span>
          </label>
          <input
            className="input-base"
            placeholder="Ej: lesión de rodilla, vegetariano, sin gluten…"
            value={restricciones}
            onChange={e => setRestricciones(e.target.value)}
          />
        </div>

        {/* Instrucciones */}
        <div>
          <label className="block text-xs font-medium mb-2" style={{ color: 'var(--color-muted)', fontFamily: 'Syne' }}>
            INSTRUCCIONES AL COACH <span style={{ fontWeight: 400 }}>(opcional)</span>
          </label>
          <textarea
            className="input-base"
            rows={3}
            placeholder="Ej: quiero enfocarme en crecimiento de glúteos, prefiero ejercicios sin máquinas, más proteína en el desayuno…"
            value={instrucciones}
            onChange={e => setInstrucciones(e.target.value)}
            style={{ resize: 'none' }}
          />
        </div>
      </div>

      {/* Aviso: sin check-in */}
      {!lastCheckin && (
        <div className="rounded-xl px-4 py-3 mb-5 text-xs flex items-start gap-2"
             style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.3)', color: '#fbbf24' }}>
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>Sin check-in registrado — el plan se generará con datos básicos del perfil, sin medidas ni fotos.</span>
        </div>
      )}

      {/* Context preview */}
      {lastCheckin && (
        <div className="rounded-xl px-4 py-3 mb-5 text-xs flex flex-col gap-1"
             style={{ background: 'rgba(123,240,160,0.05)', border: '1px solid rgba(123,240,160,0.2)', color: 'var(--color-muted)' }}>
          <div>
            <span style={{ color: '#7BF0A0', fontFamily: 'Syne', fontWeight: 600 }}>✓ Último check-in incluido: </span>
            {MES_LABELS[lastCheckin.mes]} {lastCheckin.anio} — {lastCheckin.peso ?? '?'}kg
          </div>
          {hasImages && (
            <div className="flex flex-col gap-0.5">
              {prevCheckinFotos.length > 0 && (
                <div>
                  <span style={{ color: '#7BF0A0', fontFamily: 'Syne', fontWeight: 600 }}>✓ Fotos {MES_LABELS[prevCheckin!.mes]} {prevCheckin!.anio}: </span>
                  {prevCheckinFotos.length} foto{prevCheckinFotos.length > 1 ? 's' : ''} ({prevCheckinFotos.map(f => getTipoLabel(f.tipo)).join(', ')})
                </div>
              )}
              <div>
                <span style={{ color: '#7BF0A0', fontFamily: 'Syne', fontWeight: 600 }}>✓ Fotos {MES_LABELS[lastCheckin.mes]} {lastCheckin.anio}: </span>
                {lastCheckinFotos.length} foto{lastCheckinFotos.length > 1 ? 's' : ''} ({lastCheckinFotos.map(f => getTipoLabel(f.tipo)).join(', ')})
              </div>
              {prevCheckinFotos.length > 0 && lastCheckinFotos.length > 0 && (
                <div style={{ color: 'var(--color-muted)', fontStyle: 'italic' }}>
                  IA comparará ambos check-ins para detectar fotos duplicadas
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <button className="btn-primary" onClick={generate} disabled={loading}>
        {loading
          ? <span className="flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" /> Generando plan completo…</span>
          : hasResults ? 'Regenerar plan completo' : 'Generar plan completo'}
      </button>

      {error && (
        <div className="rounded-xl px-4 py-3 mt-4 text-sm"
             style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>
          {error}
        </div>
      )}

      {/* Anchor para scroll automático */}
      <div ref={resultsRef} />

      {/* Rutina */}
      {(resultRutina || loadingRutina) && (
        <ResultCard
          title="Rutina semanal"
          icon={<Dumbbell size={14} color="#7BF0A0" />}
          content={resultRutina}
          loading={loadingRutina && !resultRutina}
          copied={copiedRutina}
          onCopy={() => resultRutina && copy(resultRutina, setCopiedRutina)}
        />
      )}

      {/* Alimentación */}
      {(resultAlimentacion || loadingAlimentacion) && (
        <ResultCard
          title="Plan alimentario"
          icon={<Salad size={14} color="#7BF0A0" />}
          content={resultAlimentacion}
          loading={loadingAlimentacion && !resultAlimentacion}
          copied={copiedAlimentacion}
          onCopy={() => resultAlimentacion && copy(resultAlimentacion, setCopiedAlimentacion)}
        />
      )}
    </div>
  )
}

function ResultCard({
  title, icon, content, loading, copied, onCopy,
}: {
  title: string
  icon: React.ReactNode
  content: string | null
  loading: boolean
  copied: boolean
  onCopy: () => void
}) {
  return (
    <div className="card mt-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="font-bold text-sm" style={{ fontFamily: 'Syne', color: '#7BF0A0' }}>{title}</h3>
        </div>
        {content && (
          <button
            onClick={onCopy}
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
        )}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-4" style={{ color: 'var(--color-muted)' }}>
          <Loader2 size={14} className="animate-spin" />
          <span className="text-sm">Generando…</span>
        </div>
      ) : (
        <div className="text-sm leading-relaxed" style={{ color: 'var(--color-text)', fontFamily: 'DM Sans' }}>
          <MarkdownRenderer content={content ?? ''} />
        </div>
      )}
    </div>
  )
}

// Renderiza texto con soporte para **negrita** inline
function InlineText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/)
  if (parts.length === 1) return <>{text}</>
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('**') && part.endsWith('**')
          ? <strong key={i}>{part.slice(2, -2)}</strong>
          : <span key={i}>{part}</span>
      )}
    </>
  )
}

function TableBlock({ rows }: { rows: string[][] }) {
  if (rows.length === 0) return null
  const [header, ...body] = rows
  return (
    <div className="overflow-x-auto my-3">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr>
            {header.map((cell, i) => (
              <th key={i} className="px-3 py-2 text-left font-semibold"
                style={{ background: 'rgba(123,240,160,0.1)', borderBottom: '1px solid rgba(123,240,160,0.3)', color: '#7BF0A0', fontFamily: 'Syne' }}>
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => (
                <td key={ci} className="px-3 py-2"
                  style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text)' }}>
                  <InlineText text={cell} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

type Block =
  | { type: 'h2'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'bullet'; text: string }
  | { type: 'numbered'; text: string }
  | { type: 'table'; rows: string[][] }
  | { type: 'empty' }
  | { type: 'text'; text: string }

function parseBlocks(content: string): Block[] {
  const lines = content.split('\n')
  const blocks: Block[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    if (line.startsWith('## ')) {
      blocks.push({ type: 'h2', text: line.slice(3) })
      i++
    } else if (line.startsWith('#### ')) {
      blocks.push({ type: 'h3', text: line.slice(5) })
      i++
    } else if (line.startsWith('### ')) {
      blocks.push({ type: 'h3', text: line.slice(4) })
      i++
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      blocks.push({ type: 'bullet', text: line.slice(2) })
      i++
    } else if (line.match(/^\d+\./)) {
      blocks.push({ type: 'numbered', text: line })
      i++
    } else if (line.startsWith('|')) {
      const tableLines: string[] = []
      while (i < lines.length && lines[i].startsWith('|')) {
        tableLines.push(lines[i])
        i++
      }
      // Filtrar filas separadoras (ej: | --- | :---: |)
      const rows = tableLines
        .filter(l => !l.split('|').slice(1, -1).every(cell => /^[\s\-:]+$/.test(cell)))
        .map(l => l.split('|').slice(1, -1).map(cell => cell.trim()))
      if (rows.length > 0) blocks.push({ type: 'table', rows })
    } else if (line === '') {
      blocks.push({ type: 'empty' })
      i++
    } else {
      blocks.push({ type: 'text', text: line })
      i++
    }
  }

  return blocks
}

function MarkdownRenderer({ content }: { content: string }) {
  const blocks = parseBlocks(content)
  return (
    <>
      {blocks.map((block, i) => {
        switch (block.type) {
          case 'h2':
            return <h2 key={i} className="text-base font-bold mt-4 mb-2" style={{ fontFamily: 'Syne', color: '#7BF0A0' }}>{block.text}</h2>
          case 'h3':
            return <h3 key={i} className="text-sm font-bold mt-3 mb-1" style={{ fontFamily: 'Syne', color: '#f0f0f0' }}>{block.text}</h3>
          case 'bullet':
            return (
              <div key={i} className="flex gap-2 my-0.5">
                <span style={{ color: '#7BF0A0' }}>•</span>
                <span><InlineText text={block.text} /></span>
              </div>
            )
          case 'numbered':
            return <p key={i} className="my-0.5 pl-1"><InlineText text={block.text} /></p>
          case 'table':
            return <TableBlock key={i} rows={block.rows} />
          case 'empty':
            return <div key={i} className="h-2" />
          case 'text':
            return <p key={i} className="my-0.5"><InlineText text={block.text} /></p>
        }
      })}
    </>
  )
}
