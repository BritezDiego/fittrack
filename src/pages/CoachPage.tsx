import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useCheckins } from '../hooks/useCheckins'
import { useProfile } from '../hooks/useProfile'
import { OBJETIVO_LABELS, NIVEL_LABELS, MES_LABELS, getTipoLabel, parseRutinaFromMarkdown, LS_RUTINA_KEY } from '../types'
import { Bot, Dumbbell, Salad, Loader2, Copy, Check, AlertTriangle, PlayCircle, X, ChevronDown } from 'lucide-react'

type Objetivo = 'perdida_grasa' | 'ganancia_muscular' | 'recomposicion' | 'mantenimiento'
type Nivel = 'principiante' | 'intermedio' | 'avanzado'

const SS_RUTINA = 'coach_result_rutina'
const SS_ALIMENTACION = 'coach_result_alimentacion'

export function CoachPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { profile } = useProfile(user?.id)
  const { checkins } = useCheckins(user?.id)

  const lastCheckin = checkins[checkins.length - 1]

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
  const [pendingGenerate, setPendingGenerate] = useState(false)
  const [pendingType, setPendingType] = useState<{ doRutina: boolean; doDieta: boolean }>({ doRutina: false, doDieta: false })

  const resultsRef = useRef<HTMLDivElement>(null)

  // Fotos: siempre los 2 check-ins más recientes que TIENEN fotos (no necesariamente adyacentes)
  const checkinsConFotos = checkins.filter(c => (c.checkin_fotos?.length ?? 0) > 0)
  const lastCheckinConFotos = checkinsConFotos[checkinsConFotos.length - 1] ?? null
  const prevCheckinConFotos = checkinsConFotos.length >= 2 ? checkinsConFotos[checkinsConFotos.length - 2] : null
  const prevCheckinFotos = prevCheckinConFotos?.checkin_fotos?.slice(0, 5) ?? []
  const lastCheckinFotos = lastCheckinConFotos?.checkin_fotos?.slice(0, 5) ?? []
  const checkinImageUrls = [
    ...prevCheckinFotos.map(f => f.url),
    ...lastCheckinFotos.map(f => f.url),
  ]
  const hasImages = checkinImageUrls.length > 0

  const hasMedidas = !!(lastCheckin && [
    lastCheckin.peso, lastCheckin.cintura, lastCheckin.abdomen,
    lastCheckin.gluteos, lastCheckin.muslos, lastCheckin.brazos,
  ].some(v => v !== null))
  const hasFotos = lastCheckinConFotos !== null

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

    const prevLabel = prevCheckinConFotos ? `${MES_LABELS[prevCheckinConFotos.mes]} ${prevCheckinConFotos.anio}` : ''
    const lastLabel = lastCheckinConFotos ? `${MES_LABELS[lastCheckinConFotos.mes]} ${lastCheckinConFotos.anio}` : ''

    for (const tipo of allTipos) {
      const prev = prevByTipo.get(tipo)
      const last = lastByTipo.get(tipo)
      const label = getTipoLabel(tipo)

      if (prev && last) {
        urls.push(prev.url, last.url)
        lines.push(`Imágenes ${idx} y ${idx + 1}: zona "${label}" — ${prevLabel} (anterior) vs ${lastLabel} (actual) → COMPARAR progreso en esta zona`)
        idx += 2
      } else if (last && !prev) {
        urls.push(last.url)
        lines.push(`Imagen ${idx}: zona "${label}" — ${lastLabel} (sin foto anterior de esta zona para comparar)`)
        idx += 1
      } else if (prev && !last) {
        urls.push(prev.url)
        lines.push(`Imagen ${idx}: zona "${label}" — ${prevLabel} (sin foto reciente de esta zona)`)
        idx += 1
      }
    }

    const hasPares = prevLabel && lastLabel && lines.some(l => l.includes('COMPARAR'))
    const imageContext = hasPares
      ? `\nFOTOS COMPARATIVAS POR ZONA MUSCULAR (${urls.length} imágenes, ${prevLabel} vs ${lastLabel}):\nOBLIGATORIO: para cada par de fotos del mismo ángulo analizá el progreso visible en esa zona.\n${lines.join('\n')}\n`
      : `\nFOTOS ADJUNTAS (${urls.length} en total):\n${lines.join('\n')}\n`
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
    ].filter(Boolean).join('\n')

    const restriccionesContext = restricciones.trim()
      ? `\nRESTRICCIONES / LESIONES / PREFERENCIAS (OBLIGATORIO RESPETAR):\n${restricciones.trim()}\n`
      : ''

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

    return { userData, medidasStr, imageContext, imageUrls, instruccionesContext, restriccionesContext }
  }

  const buildRutinaPrompt = () => {
    const { userData, medidasStr, imageContext, instruccionesContext, restriccionesContext } = buildContext()
    // imageUrls se obtiene por separado en generate()

    // Detección de duplicados solo en este prompt (se ejecuta una sola vez)
    const duplicateInstruction = prevCheckinFotos.length > 0 && lastCheckinFotos.length > 0
      ? `\nANTES DE ANALIZAR: Compará minuciosamente las fotos de ambos check-ins para detectar si alguna imagen fue reutilizada entre meses. La clienta puede estar en ropa interior o ropa deportiva ajustada — examiná con detalle: posición corporal exacta, ángulo, iluminación, sombras, marcas en la piel, ropa, accesorios, fondo. Si encontrás fotos idénticas o muy similares entre meses, indicalo claramente al inicio de tu respuesta antes del plan. Si todas son distintas, confirmalo también.\n`
      : ''

    const diasLabels = Array.from({ length: dias }, (_, i) => `Día ${i + 1}`).join(', ')

    return `Eres un coach fitness experto. Genera una rutina semanal detallada y personalizada.

DATOS DEL USUARIO:
${userData}

MEDIDAS ACTUALES (último check-in):
${medidasStr}
${restriccionesContext}${imageContext}${duplicateInstruction}${instruccionesContext}
ESTRUCTURA OBLIGATORIA DE LA RESPUESTA — seguí exactamente este orden de secciones:

## Calentamiento general
(describí el calentamiento aplicable a todos los días)

## Día 1 — [nombre del grupo muscular]
(ejercicios del día 1)

## Día 2 — [nombre del grupo muscular]
(ejercicios del día 2)

... continuá hasta ## Día ${dias} — [grupo muscular]

## Progresión sugerida
(progresión para las próximas semanas)

## Tips y recomendaciones
(tips para el objetivo de ${OBJETIVO_LABELS[objetivo]})

REGLAS DE FORMATO — OBLIGATORIAS:
- Generá EXACTAMENTE ${dias} días de entrenamiento: ${diasLabels}
- Cada día de entrenamiento DEBE ser una sección ## (no ###, no tabla, no lista)
- El título de cada día DEBE seguir el formato exacto: ## Día N — [grupos musculares]
- Dentro de cada día listá los ejercicios con: series, repeticiones, descanso y nota de forma
- NO uses tablas para los días; usá listas con guiones (-)${restricciones.trim() ? '\n- Cualquier ejercicio que afecte las restricciones/lesiones declaradas debe ser eliminado o reemplazado por una alternativa segura' : ''}${hasImages ? '\n- Incluí observaciones basadas en las fotos sobre áreas a trabajar prioritariamente' : ''}${instrucciones.trim() ? '\n- Las instrucciones específicas del usuario deben ser el eje central' : ''}

ETIQUETAS DE VIDEO — al final del nombre de cada ejercicio principal (no en calentamiento ni tips), agregá \`[video: término de búsqueda]\` con un término preciso para YouTube, adecuado al nivel ${NIVEL_LABELS[nivel]}. Ejemplo:
- **Sentadilla con barra** [video: sentadilla con barra técnica principiante]`
  }

  const buildAlimentacionPrompt = () => {
    const { userData, medidasStr, imageContext, instruccionesContext, restriccionesContext } = buildContext()
    // imageUrls se obtiene por separado en generate()
    return `Eres un nutricionista deportivo experto. Genera un plan de alimentación detallado y personalizado.

DATOS DEL USUARIO:
${userData}

MEDIDAS ACTUALES (último check-in):
${medidasStr}
${restriccionesContext}${imageContext}${instruccionesContext}
Genera un PLAN DE ALIMENTACIÓN con:
- Calorías totales diarias recomendadas (con cálculo basado en datos)
- Distribución de macros (proteínas, carbohidratos, grasas) en gramos y porcentajes
- Plan de comidas para un día típico (desayuno, almuerzo, merienda, cena, snacks)
- Lista de alimentos recomendados y a evitar
- Timing de nutrientes alrededor del entrenamiento
- Tips específicos para ${OBJETIVO_LABELS[objetivo]}${restricciones.trim() ? '\n- Los alimentos, ingredientes o patrones alimentarios que contradigan las restricciones/preferencias declaradas deben ser eliminados del plan sin excepción' : ''}${prevCheckinFotos.length > 0 && lastCheckinFotos.length > 0 ? '\n- Analizá el progreso visual zona por zona en las fotos comparativas e indicá cómo la alimentación puede potenciar las zonas con menor avance' : hasImages ? '\n- Observaciones basadas en las fotos sobre la composición corporal actual' : ''}${instrucciones.trim() ? '\n- Las instrucciones específicas del usuario deben ser el eje central' : ''}

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

  const generate = async (doRutina: boolean, doDieta: boolean) => {
    if (!doRutina && !doDieta) return
    setError(null)
    if (doRutina) { setResultRutina(null); setLoadingRutina(true); setRutinaGuardada(false) }
    if (doDieta) { setResultAlimentacion(null); setLoadingAlimentacion(true) }

    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)

    const { imageUrls } = buildContext()

    const tasks: Promise<any>[] = []
    if (doRutina) tasks.push(
      streamResponse(buildRutinaPrompt(), imageUrls, setResultRutina)
        .then(() => null as null)
        .catch((e: any) => e)
        .finally(() => setLoadingRutina(false))
    )
    if (doDieta) tasks.push(
      streamResponse(buildAlimentacionPrompt(), imageUrls, setResultAlimentacion)
        .then(() => null as null)
        .catch((e: any) => e)
        .finally(() => setLoadingAlimentacion(false))
    )

    const results = await Promise.all(tasks)
    const err = results.find(r => r !== null) ?? null
    if (err) setError((err as any).message ?? 'Error al conectar con el Coach IA.')
  }

  const [showConfirmRutina, setShowConfirmRutina] = useState(false)
  const [rutinaGuardada, setRutinaGuardada] = useState(false)

  const handleUsarRutina = () => {
    if (!resultRutina) return
    const rutina = parseRutinaFromMarkdown(resultRutina, OBJETIVO_LABELS[objetivo], NIVEL_LABELS[nivel])
    localStorage.setItem(LS_RUTINA_KEY, JSON.stringify(rutina))
    navigate('/calendario')
  }

  const checkAndGenerate = (doRutina: boolean, doDieta: boolean) => {
    if (!hasMedidas || !hasFotos) {
      setPendingType({ doRutina, doDieta })
      setPendingGenerate(true)
    } else {
      generate(doRutina, doDieta)
    }
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
          <div className="flex items-baseline justify-between mb-2">
            <label className="text-xs font-medium" style={{ color: 'var(--color-muted)', fontFamily: 'Syne' }}>
              OBJETIVO
            </label>
            {profile?.objetivo && (
              <span className="text-[11px]" style={{ color: 'var(--color-muted)' }}>
                Tomado de tu perfil — podés cambiarlo
              </span>
            )}
          </div>
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
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-muted)', fontFamily: 'Syne' }}>
            RESTRICCIONES / LESIONES / PREFERENCIAS <span style={{ fontWeight: 400 }}>(opcional)</span>
          </label>
          <p className="text-xs mb-2 leading-relaxed" style={{ color: 'var(--color-muted)', opacity: 0.7 }}>
            Indicá cualquier condición física, limitación alimentaria o preferencia que el Coach deba respetar al armar tu rutina y dieta.
          </p>
          <textarea
            className="input-base"
            rows={3}
            placeholder={"Ejemplos:\n• Lesión de rodilla — evitar sentadillas y impacto\n• Vegetariano / sin gluten / intolerancia a la lactosa\n• Sin acceso a pesas, solo peso corporal\n• Alergia al maní, no me gustan los mariscos"}
            value={restricciones}
            onChange={e => setRestricciones(e.target.value)}
            style={{ resize: 'none' }}
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
                  <span style={{ color: '#7BF0A0', fontFamily: 'Syne', fontWeight: 600 }}>✓ Fotos {MES_LABELS[prevCheckinConFotos!.mes]} {prevCheckinConFotos!.anio}: </span>
                  {prevCheckinFotos.length} foto{prevCheckinFotos.length > 1 ? 's' : ''} ({prevCheckinFotos.map(f => getTipoLabel(f.tipo)).join(', ')})
                </div>
              )}
              {lastCheckinFotos.length > 0 && (
                <div>
                  <span style={{ color: '#7BF0A0', fontFamily: 'Syne', fontWeight: 600 }}>✓ Fotos {MES_LABELS[lastCheckinConFotos!.mes]} {lastCheckinConFotos!.anio}: </span>
                  {lastCheckinFotos.length} foto{lastCheckinFotos.length > 1 ? 's' : ''} ({lastCheckinFotos.map(f => getTipoLabel(f.tipo)).join(', ')})
                </div>
              )}
              {prevCheckinFotos.length > 0 && lastCheckinFotos.length > 0 && (
                <div style={{ color: 'var(--color-muted)', fontStyle: 'italic' }}>
                  IA comparará zona por zona ({prevCheckinFotos.map(f => getTipoLabel(f.tipo)).filter(t => lastCheckinFotos.map(f => getTipoLabel(f.tipo)).includes(t)).join(', ') || 'sin coincidencias'})
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3 mb-5">
        <button
          onClick={() => checkAndGenerate(true, false)}
          disabled={loading}
          className="flex-1 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
          style={{
            background: 'rgba(123,240,160,0.12)',
            border: '1px solid rgba(123,240,160,0.5)',
            color: '#7BF0A0',
            fontFamily: 'Syne',
            opacity: loading ? 0.6 : 1,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loadingRutina
            ? <><Loader2 size={15} className="animate-spin" /> Generando…</>
            : <><Dumbbell size={15} /> {resultRutina ? 'Regenerar rutina' : 'Generar rutina'}</>
          }
        </button>
        <button
          onClick={() => checkAndGenerate(false, true)}
          disabled={loading}
          className="flex-1 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
          style={{
            background: 'rgba(123,200,255,0.1)',
            border: '1px solid rgba(123,200,255,0.4)',
            color: '#7bc8ff',
            fontFamily: 'Syne',
            opacity: loading ? 0.6 : 1,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loadingAlimentacion
            ? <><Loader2 size={15} className="animate-spin" /> Generando…</>
            : <><Salad size={15} /> {resultAlimentacion ? 'Regenerar dieta' : 'Generar dieta'}</>
          }
        </button>
      </div>

      {error && (
        <div className="rounded-xl px-4 py-3 mt-4 text-sm"
             style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>
          {error}
        </div>
      )}

      {/* Anchor para scroll automático */}
      <div ref={resultsRef} />

      {/* Modal datos incompletos */}
      {pendingGenerate && (() => {
        const faltante = !hasMedidas && !hasFotos
          ? 'medidas ni imágenes'
          : !hasMedidas ? 'medidas' : 'imágenes'
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
            style={{ background: 'rgba(0,0,0,0.7)' }}
            onClick={() => setPendingGenerate(false)}
          >
            <div
              className="w-full max-w-lg rounded-2xl p-6 flex flex-col gap-4"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-2">
                <AlertTriangle size={18} color="#fbbf24" />
                <h3 className="font-bold text-base" style={{ fontFamily: 'Syne', color: '#fbbf24' }}>
                  Información incompleta
                </h3>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-muted)', fontFamily: 'DM Sans' }}>
                No se encontraron <strong style={{ color: 'var(--color-text)' }}>{faltante}</strong> recientes. El plan será menos preciso sin esos datos.
              </p>
              <p className="text-xs" style={{ color: 'var(--color-muted)', fontFamily: 'DM Sans', opacity: 0.7 }}>
                Podés registrar un nuevo check-in antes de continuar para un análisis más personalizado.
              </p>
              <div className="flex gap-3">
                <button
                  className="flex-1 py-3 rounded-xl text-sm font-semibold"
                  style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-muted)', fontFamily: 'Syne' }}
                  onClick={() => setPendingGenerate(false)}
                >
                  Cancelar
                </button>
                <button
                  className="flex-1 py-3 rounded-xl text-sm font-semibold"
                  style={{ background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.5)', color: '#fbbf24', fontFamily: 'Syne' }}
                  onClick={() => { setPendingGenerate(false); generate(pendingType.doRutina, pendingType.doDieta) }}
                >
                  Generar de todas formas
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Modal confirmación usar rutina */}
      {showConfirmRutina && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={() => setShowConfirmRutina(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl p-6 flex flex-col gap-4"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <Dumbbell size={18} color="#7BF0A0" />
              <h3 className="font-bold text-base" style={{ fontFamily: 'Syne', color: '#7BF0A0' }}>
                Utilizar esta rutina
              </h3>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--color-muted)', fontFamily: 'DM Sans' }}>
              Esta rutina se vinculará al calendario de la aplicación y podrás ver tus entrenamientos organizados por día.
              Si ya tenías una rutina guardada, será reemplazada.
            </p>
            <div className="flex gap-3">
              <button
                className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all"
                style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-muted)', fontFamily: 'Syne' }}
                onClick={() => setShowConfirmRutina(false)}
              >
                Cancelar
              </button>
              <button
                className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all"
                style={{ background: 'rgba(123,240,160,0.15)', border: '1px solid #7BF0A0', color: '#7BF0A0', fontFamily: 'Syne' }}
                onClick={handleUsarRutina}
              >
                Vincular al calendario
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rutina */}
      {(resultRutina || loadingRutina) && (
        <ResultCard
          title="Rutina semanal"
          icon={<Dumbbell size={14} color="#7BF0A0" />}
          content={resultRutina}
          loading={loadingRutina}
          copied={copiedRutina}
          onCopy={() => resultRutina && copy(resultRutina, setCopiedRutina)}
          onUsarRutina={resultRutina && !loadingRutina ? () => setShowConfirmRutina(true) : undefined}
          rutinaGuardada={rutinaGuardada}
          isRutina
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
  title, icon, content, loading, copied, onCopy, onUsarRutina, rutinaGuardada, isRutina,
}: {
  title: string
  icon: React.ReactNode
  content: string | null
  loading: boolean
  copied: boolean
  onCopy: () => void
  onUsarRutina?: () => void
  rutinaGuardada?: boolean
  isRutina?: boolean
}) {
  return (
    <div className="card mt-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="font-bold text-sm" style={{ fontFamily: 'Syne', color: '#7BF0A0' }}>{title}</h3>
        </div>
        {content && !loading && (
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
        <div className="flex items-center gap-2 py-6" style={{ color: 'var(--color-muted)' }}>
          <Loader2 size={14} className="animate-spin" />
          <span className="text-sm">Generando{content ? ` (${content.length} caracteres…)` : '…'}</span>
        </div>
      ) : isRutina && content ? (
        <RutinaAccordion content={content} />
      ) : (
        <div className="text-sm leading-relaxed" style={{ color: 'var(--color-text)', fontFamily: 'DM Sans' }}>
          <MarkdownRenderer content={content ?? ''} />
        </div>
      )}

      {onUsarRutina && content && !loading && (
        <button
          onClick={rutinaGuardada ? undefined : onUsarRutina}
          className="w-full mt-4 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
          style={rutinaGuardada ? {
            background: 'rgba(123,240,160,0.08)',
            border: '1px solid rgba(123,240,160,0.3)',
            color: '#7BF0A0',
            fontFamily: 'Syne',
            cursor: 'default',
          } : {
            background: 'rgba(123,240,160,0.12)',
            border: '1px solid #7BF0A0',
            color: '#7BF0A0',
            fontFamily: 'Syne',
          }}
        >
          <Dumbbell size={14} />
          {rutinaGuardada ? '✓ Rutina vinculada al calendario' : 'Utilizar rutina'}
        </button>
      )}
    </div>
  )
}

function parseRutinaSections(markdown: string): { title: string; content: string }[] {
  const sections: { title: string; content: string }[] = []
  const lines = markdown.split('\n')
  let current: { title: string; lines: string[] } | null = null

  for (const line of lines) {
    if (line.startsWith('## ')) {
      if (current) sections.push({ title: current.title, content: current.lines.join('\n').trim() })
      current = { title: line.slice(3).trim(), lines: [] }
    } else if (current) {
      current.lines.push(line)
    }
  }
  if (current) sections.push({ title: current.title, content: current.lines.join('\n').trim() })
  return sections
}

function RutinaAccordion({ content }: { content: string }) {
  const sections = parseRutinaSections(content)
  const [openIdx, setOpenIdx] = useState<number | null>(0)

  if (sections.length === 0) {
    return (
      <div className="text-sm leading-relaxed" style={{ color: 'var(--color-text)', fontFamily: 'DM Sans' }}>
        <MarkdownRenderer content={content} />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {sections.map((section, i) => (
        <div key={i} className="rounded-xl overflow-hidden"
             style={{ border: `1px solid ${openIdx === i ? 'rgba(123,240,160,0.4)' : 'var(--color-border)'}` }}>
          <button
            className="w-full flex items-center justify-between px-4 py-3 text-left transition-all"
            style={{ background: openIdx === i ? 'rgba(123,240,160,0.08)' : 'var(--color-surface-2)' }}
            onClick={() => setOpenIdx(openIdx === i ? null : i)}
          >
            <span className="text-sm font-semibold pr-2" style={{ fontFamily: 'Syne', color: openIdx === i ? '#7BF0A0' : 'var(--color-text)' }}>
              {section.title}
            </span>
            <ChevronDown
              size={14}
              style={{
                color: 'var(--color-muted)',
                transform: openIdx === i ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.2s',
                flexShrink: 0,
              }}
            />
          </button>
          {openIdx === i && section.content && (
            <div className="px-4 py-3 text-sm leading-relaxed" style={{ color: 'var(--color-text)', fontFamily: 'DM Sans', borderTop: '1px solid var(--color-border)' }}>
              <MarkdownRenderer content={section.content} />
            </div>
          )}
        </div>
      ))}
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

function TableBlock({ rows, onVideoClick }: { rows: string[][], onVideoClick?: (query: string) => void }) {
  if (rows.length === 0) return null
  const [header, ...body] = rows
  return (
    <div className="overflow-x-auto my-3">
      <table className="min-w-full text-xs border-collapse">
        <thead>
          <tr>
            {header.map((cell, i) => (
              <th key={i} className="px-3 py-2 text-left font-semibold whitespace-nowrap"
                style={{ background: 'rgba(123,240,160,0.1)', borderBottom: '1px solid rgba(123,240,160,0.3)', color: '#7BF0A0', fontFamily: 'Syne' }}>
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => {
                const { text, videoQuery } = extractVideo(cell)
                return (
                  <td key={ci} className="px-3 py-2"
                    style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text)' }}>
                    <InlineText text={text} />
                    {videoQuery && onVideoClick && (
                      <button
                        onClick={() => onVideoClick(videoQuery)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs ml-1.5 transition-all"
                        style={{ background: 'rgba(255,0,0,0.1)', border: '1px solid rgba(255,0,0,0.3)', color: '#ff6666', verticalAlign: 'middle' }}
                      >
                        <PlayCircle size={11} />
                        tutorial
                      </button>
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function extractVideo(raw: string): { text: string; videoQuery?: string } {
  const match = raw.match(/\[video:\s*([^\]]+)\]/)
  if (!match) return { text: raw }
  return { text: raw.replace(match[0], '').trim(), videoQuery: match[1].trim() }
}

type Block =
  | { type: 'h2'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'bullet'; text: string; videoQuery?: string }
  | { type: 'numbered'; text: string; videoQuery?: string }
  | { type: 'table'; rows: string[][] }
  | { type: 'empty' }
  | { type: 'text'; text: string; videoQuery?: string }

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
      const { text, videoQuery } = extractVideo(line.slice(2))
      blocks.push({ type: 'bullet', text, videoQuery })
      i++
    } else if (line.match(/^\d+\./)) {
      const { text, videoQuery } = extractVideo(line)
      blocks.push({ type: 'numbered', text, videoQuery })
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
      const { text, videoQuery } = extractVideo(line)
      blocks.push({ type: 'text', text, videoQuery })
      i++
    }
  }

  return blocks
}

function VideoModal({ query, onClose }: { query: string; onClose: () => void }) {
  const youtubeUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl p-5 flex flex-col gap-4"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PlayCircle size={16} color="#7BF0A0" />
            <span className="text-sm font-bold" style={{ fontFamily: 'Syne', color: '#7BF0A0' }}>
              Tutorial
            </span>
          </div>
          <button onClick={onClose} style={{ color: 'var(--color-muted)' }}>
            <X size={18} />
          </button>
        </div>
        <p className="text-sm" style={{ color: 'var(--color-text)', fontFamily: 'DM Sans' }}>
          {query}
        </p>
        <a
          href={youtubeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all"
          style={{ background: '#ff0000', color: '#fff', fontFamily: 'Syne' }}
        >
          <PlayCircle size={16} />
          Ver en YouTube
        </a>
      </div>
    </div>
  )
}

function MarkdownRenderer({ content }: { content: string }) {
  const blocks = parseBlocks(content)
  const [activeVideo, setActiveVideo] = useState<string | null>(null)

  const VideoBtn = ({ query }: { query: string }) => (
    <button
      onClick={() => setActiveVideo(query)}
      className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs ml-1.5 transition-all"
      style={{
        background: 'rgba(255,0,0,0.1)',
        border: '1px solid rgba(255,0,0,0.3)',
        color: '#ff6666',
        verticalAlign: 'middle',
      }}
      title={`Ver tutorial: ${query}`}
    >
      <PlayCircle size={11} />
      tutorial
    </button>
  )

  return (
    <>
      {activeVideo && <VideoModal query={activeVideo} onClose={() => setActiveVideo(null)} />}
      {blocks.map((block, i) => {
        switch (block.type) {
          case 'h2':
            return <h2 key={i} className="text-base font-bold mt-4 mb-2" style={{ fontFamily: 'Syne', color: '#7BF0A0' }}>{block.text}</h2>
          case 'h3':
            return <h3 key={i} className="text-sm font-bold mt-3 mb-1" style={{ fontFamily: 'Syne', color: '#f0f0f0' }}>{block.text}</h3>
          case 'bullet':
            return (
              <div key={i} className="flex gap-2 my-0.5 items-baseline">
                <span style={{ color: '#7BF0A0' }}>•</span>
                <span>
                  <InlineText text={block.text} />
                  {block.videoQuery && <VideoBtn query={block.videoQuery} />}
                </span>
              </div>
            )
          case 'numbered':
            return (
              <p key={i} className="my-0.5 pl-1">
                <InlineText text={block.text} />
                {block.videoQuery && <VideoBtn query={block.videoQuery} />}
              </p>
            )
          case 'table':
            return <TableBlock key={i} rows={block.rows} onVideoClick={setActiveVideo} />
          case 'empty':
            return <div key={i} className="h-2" />
          case 'text':
            return (
              <p key={i} className="my-0.5">
                <InlineText text={block.text} />
                {block.videoQuery && <VideoBtn query={block.videoQuery} />}
              </p>
            )
        }
      })}
    </>
  )
}
