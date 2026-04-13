export interface Profile {
  id: string
  user_id: string
  nombre: string
  edad: number | null
  altura: number | null
  objetivo: 'perdida_grasa' | 'ganancia_muscular' | 'recomposicion' | 'mantenimiento' | null
  nivel: 'principiante' | 'intermedio' | 'avanzado' | null
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
  tipo: 'frente' | 'perfil' | 'espalda' | 'extra'
  created_at: string
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
