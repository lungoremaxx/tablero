const DAY = 86_400_000

const WEEKDAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto',
  'septiembre', 'octubre', 'noviembre', 'diciembre']
const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

/** Fecha local YYYY-MM-DD */
export function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayISO(): string {
  return toISODate(new Date())
}

function parse(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Días desde hoy hasta la fecha (negativo = pasada) */
export function daysUntil(iso: string): number {
  return Math.round((parse(iso).getTime() - parse(todayISO()).getTime()) / DAY)
}

export function addDays(iso: string, n: number): string {
  const d = parse(iso)
  d.setDate(d.getDate() + n)
  return toISODate(d)
}

/** Viernes de esta semana; si ya es fin de semana, hoy */
export function endOfWorkWeek(): string {
  const today = new Date()
  const dow = today.getDay()
  if (dow === 0 || dow === 6) return todayISO()
  return addDays(todayISO(), 5 - dow)
}

export function longToday(): string {
  const d = new Date()
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()} de ${MONTHS[d.getMonth()]}`
}

export function shortDate(iso: string): string {
  const d = parse(iso)
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`
}

export type DueState = 'none' | 'overdue' | 'soon' | 'later'

export function dueState(iso: string | null): DueState {
  if (!iso) return 'none'
  const n = daysUntil(iso)
  if (n < 0) return 'overdue'
  if (n <= 7) return 'soon'
  return 'later'
}

export function dueLabel(iso: string | null): string {
  if (!iso) return 'Sin fecha'
  const n = daysUntil(iso)
  if (n === -1) return 'Venció ayer'
  if (n < -1) return `Venció hace ${-n} días`
  if (n === 0) return 'Hoy'
  if (n === 1) return 'Mañana'
  const d = parse(iso)
  if (n < 7) return `${WEEKDAYS[d.getDay()]} ${d.getDate()}`
  return shortDate(iso)
}

/** Etiqueta de un día ya pasado, para agrupar el historial */
export function dayHeading(isoDateTime: string): string {
  const day = toISODate(new Date(isoDateTime))
  const n = daysUntil(day)
  if (n === 0) return 'Hoy'
  if (n === -1) return 'Ayer'
  const d = parse(day)
  if (n > -7) return `${WEEKDAYS[d.getDay()]} ${d.getDate()}`
  return `${d.getDate()} de ${MONTHS[d.getMonth()]}`
}

export function timeOf(isoDateTime: string): string {
  const d = new Date(isoDateTime)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** Días de atraso al cerrar (0 o negativo = a tiempo) */
export function lateness(dueDate: string | null, doneAt: string): number | null {
  if (!dueDate) return null
  const done = toISODate(new Date(doneAt))
  return Math.round((parse(done).getTime() - parse(dueDate).getTime()) / DAY)
}
