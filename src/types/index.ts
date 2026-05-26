export interface Profile {
  id: string
  user_id: string
  nombre: string
  edad: number | null
  altura: number | null
  objetivo: 'perdida_grasa' | 'ganancia_muscular' | 'recomposicion' | 'mantenimiento' | null
  nivel: 'principiante' | 'intermedio' | 'avanzado' | null
  legal_accepted_at: string | null
  created_at: string
}

export interface Checkin {
  id: string
  user_id: string
  mes: number
  anio: number
  peso: number | null
  cintura: number | null
  abdomen: number | null
  gluteos: number | null
  muslos: number | null
  brazos: number | null
  espalda: number | null
  notas: string | null
  created_at: string
}

export interface CheckinFoto {
  id: string
  checkin_id: string
  url: string
  tipo: string   // 'frente' | 'perfil' | 'espalda' | 'extra:Glúteos' | 'extra:Brazos' | …
  created_at: string
}

// Devuelve el label legible de un tipo de foto
export function getTipoLabel(tipo: string): string {
  if (tipo.startsWith('extra:')) return tipo.slice(6)
  const map: Record<string, string> = { frente: 'Frente', perfil: 'Perfil', espalda: 'Espalda', extra: 'Extra' }
  return map[tipo] ?? tipo
}

export interface CheckinWithFotos extends Checkin {
  checkin_fotos: CheckinFoto[]
}

export type Objetivo = 'perdida_grasa' | 'ganancia_muscular' | 'recomposicion' | 'mantenimiento'
export type Nivel = 'principiante' | 'intermedio' | 'avanzado'

export const OBJETIVO_LABELS: Record<Objetivo, string> = {
  perdida_grasa: 'Pérdida de grasa',
  ganancia_muscular: 'Ganancia muscular',
  recomposicion: 'Recomposición',
  mantenimiento: 'Mantenimiento',
}

export const NIVEL_LABELS: Record<Nivel, string> = {
  principiante: 'Principiante',
  intermedio: 'Intermedio',
  avanzado: 'Avanzado',
}

export const MES_LABELS = [
  '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

export const MEDIDAS_KEYS = ['peso', 'cintura', 'abdomen', 'gluteos', 'muslos', 'brazos', 'espalda'] as const
export type MedidaKey = typeof MEDIDAS_KEYS[number]

export const MEDIDAS_LABELS: Record<MedidaKey, string> = {
  peso: 'Peso (kg)',
  cintura: 'Cintura (cm)',
  abdomen: 'Abdomen (cm)',
  gluteos: 'Glúteos (cm)',
  muslos: 'Muslos (cm)',
  brazos: 'Brazos (cm)',
  espalda: 'Espalda (cm)',
}

// ─── Rutina activa (vinculada al calendario) ─────────────────────────────────

export type DiaSemana = 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado' | 'domingo'

export const ORDEN_DIAS: DiaSemana[] = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']

export const DIA_LABELS: Record<DiaSemana, string> = {
  lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles',
  jueves: 'Jueves', viernes: 'Viernes', sabado: 'Sábado', domingo: 'Domingo',
}

export const DIA_SHORT: Record<DiaSemana, string> = {
  lunes: 'Lu', martes: 'Ma', miercoles: 'Mi',
  jueves: 'Ju', viernes: 'Vi', sabado: 'Sá', domingo: 'Do',
}

// Distribución óptima de días de entrenamiento según cantidad
const DISTRIBUCIONES: Record<number, DiaSemana[]> = {
  1: ['miercoles'],
  2: ['lunes', 'jueves'],
  3: ['lunes', 'miercoles', 'viernes'],
  4: ['lunes', 'martes', 'jueves', 'viernes'],
  5: ['lunes', 'martes', 'miercoles', 'viernes', 'sabado'],
  6: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'],
  7: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'],
}

export interface RutinaDia {
  dia: DiaSemana
  label: string       // "Lunes"
  musculos: string    // "Pecho / Tríceps"
  ejercicios: string[]
  descanso: boolean
}

export interface RutinaActiva {
  id: string
  creadaEn: string
  objetivo: string
  nivel: string
  dias: RutinaDia[]
  textoCompleto: string
}

export const LS_RUTINA_KEY = 'fittrack_rutina_activa'

const DIAS_ALIAS: Record<string, DiaSemana> = {
  lunes: 'lunes',
  martes: 'martes',
  'miércoles': 'miercoles',
  miercoles: 'miercoles',
  jueves: 'jueves',
  viernes: 'viernes',
  'sábado': 'sabado',
  sabado: 'sabado',
  domingo: 'domingo',
}

export function parseRutinaFromMarkdown(
  text: string,
  objetivo: string,
  nivel: string,
): RutinaActiva {
  type Slot = { musculos: string; ejercicios: string[] }
  const slots: Slot[] = []

  // 1. Partir el texto en secciones por encabezados ##
  const sectionRegex = /^## (.+)$/gm
  const sectionMatches: { title: string; start: number }[] = []
  let m: RegExpExecArray | null
  while ((m = sectionRegex.exec(text)) !== null) {
    sectionMatches.push({ title: m[1].trim(), start: m.index + m[0].length })
  }

  for (let i = 0; i < sectionMatches.length; i++) {
    const { title, start } = sectionMatches[i]
    const end = i + 1 < sectionMatches.length ? sectionMatches[i + 1].start : text.length
    const content = text.slice(start, end)

    const titleLower = title.toLowerCase()

    // Detectar sección de día: "Día N" (nuevo formato) o nombre de día (legado)
    const isDaySection =
      /^día\s+\d+/i.test(titleLower) ||
      Object.keys(DIAS_ALIAS).some(d => titleLower.includes(d))
    if (!isDaySection) continue

    const sep = title.search(/[-–—]/)
    const musculos = (sep >= 0 ? title.slice(sep + 1).trim() : title.trim())
      .replace(/\*\*/g, '').trim()
    if (/descanso|rest|off/i.test(musculos)) continue

    const ejercicios: string[] = []

    // Nuevo formato: bloques :::ejercicio:::
    const blockRegex = /:::ejercicio([\s\S]*?):::/g
    let bm: RegExpExecArray | null
    while ((bm = blockRegex.exec(content)) !== null) {
      const inner = bm[1]
      const nombreLine = inner.split('\n').find(l => l.toLowerCase().startsWith('nombre:'))
      if (nombreLine) {
        const nombre = nombreLine.slice('nombre:'.length).trim()
        if (nombre.length > 2) ejercicios.push(nombre)
      }
    }

    // Fallback: formato legado con viñetas
    if (ejercicios.length === 0) {
      for (const line of content.split('\n')) {
        if (line.startsWith('- ') || line.startsWith('* ')) {
          const raw = line.slice(2)
            .replace(/\[video:[^\]]+\]/g, '')
            .replace(/\*\*/g, '')
            .trim()
          if (raw.length > 2 && raw.length < 80) ejercicios.push(raw)
        }
      }
    }

    slots.push({ musculos, ejercicios })
  }

  // 2. Distribuir los slots en días óptimos
  const n = Math.min(slots.length, 7)
  const diasEntrenamiento = DISTRIBUCIONES[n] ?? DISTRIBUCIONES[7]

  const dias: RutinaDia[] = ORDEN_DIAS.map(dia => {
    const slotIdx = diasEntrenamiento.indexOf(dia)
    if (slotIdx >= 0 && slotIdx < slots.length) {
      return {
        dia,
        label: DIA_LABELS[dia],
        musculos: slots[slotIdx].musculos,
        ejercicios: slots[slotIdx].ejercicios,
        descanso: false,
      }
    }
    return { dia, label: DIA_LABELS[dia], musculos: 'Descanso', ejercicios: [], descanso: true }
  })

  return {
    id: Date.now().toString(),
    creadaEn: new Date().toISOString(),
    objetivo,
    nivel,
    dias,
    textoCompleto: text,
  }
}
