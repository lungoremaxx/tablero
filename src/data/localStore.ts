import { addDays, todayISO } from '../lib/dates'
import type { Member, Project, Session, Store, Task, TaskInput } from './types'

/**
 * Modo demo: todo se guarda en este dispositivo (localStorage).
 * Sirve para probar la app antes de conectar la base compartida.
 */

const KEY = 'tablero-demo-v1'
export const DEMO_PIN = '1234'

interface DemoData {
  members: Member[]
  pins: Record<string, string>
  projects: Project[]
  tasks: Task[]
}

function seed(): DemoData {
  const t = todayISO()
  const now = new Date().toISOString()
  const members: Member[] = [
    { id: 'm-martin', name: 'Martín', hue: 'coral' },
    { id: 'm-felipe', name: 'Felipe', hue: 'blue' },
    { id: 'm-ramiro', name: 'Ramiro', hue: 'green' },
  ]
  const projects: Project[] = [
    { id: 'p-sotano', name: 'Sótano 22', hue: 'violet', position: 1 },
    { id: 'p-montalba', name: 'Grupo Montalba', hue: 'blue', position: 2 },
    { id: 'p-tono', name: 'TonoSound', hue: 'teal', position: 3 },
    { id: 'p-sushi', name: 'Sushi', hue: 'red', position: 4 },
    { id: 'p-nico', name: 'Propiedades Nico', hue: 'green', position: 5 },
    { id: 'p-morocha', name: 'La Morocha', hue: 'amber', position: 6 },
  ]
  const task = (id: string, projectId: string, title: string, assigneeId: string | null,
    priority: Task['priority'], due: number | null): Task => ({
    id, projectId, title, assigneeId, priority,
    dueDate: due === null ? null : addDays(t, due),
    notes: '', createdBy: 'm-martin', createdAt: now, doneAt: null, doneBy: null,
  })
  return {
    members,
    pins: Object.fromEntries(members.map(m => [m.id, DEMO_PIN])),
    projects,
    tasks: [
      task('t1', 'p-sotano', 'Ejemplo: armar la grilla de streams de octubre', 'm-martin', 'alta', 3),
      task('t2', 'p-montalba', 'Ejemplo: subir fotos nuevas de las propiedades a los portales', 'm-felipe', 'alta', 1),
      task('t3', 'p-tono', 'Ejemplo: pasar presupuesto del equipo de sonido', 'm-ramiro', 'media', 8),
      task('t4', 'p-sushi', 'Ejemplo: definir proveedor de pescado', null, 'media', -2),
      task('t5', 'p-nico', 'Ejemplo: relevar estado de las propiedades', 'm-felipe', 'baja', 18),
    ],
  }
}

function read(): DemoData {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as DemoData
  } catch { /* datos corruptos o storage bloqueado: arranca de cero */ }
  const data = seed()
  write(data)
  return data
}

function write(data: DemoData) {
  try { localStorage.setItem(KEY, JSON.stringify(data)) } catch { /* sin storage */ }
}

function memberFromToken(token: string): string {
  return token.replace(/^demo:/, '')
}

function mutateTask(id: string, fn: (t: Task) => Task): Task {
  const data = read()
  const i = data.tasks.findIndex(t => t.id === id)
  if (i < 0) throw new Error('La tarea ya no existe')
  data.tasks[i] = fn(data.tasks[i])
  write(data)
  return data.tasks[i]
}

export const localStore: Store = {
  demo: true,

  async listMembers() {
    return read().members
  },

  async login(memberId, pin): Promise<Session> {
    const data = read()
    if (data.pins[memberId] !== pin) throw new Error('PIN incorrecto')
    return { token: 'demo:' + memberId, memberId }
  },

  async logout() {},

  async load() {
    const { projects, tasks } = read()
    return { projects, tasks }
  },

  async addTask(token, input: TaskInput) {
    const data = read()
    const task: Task = {
      ...input,
      id: crypto.randomUUID(),
      createdBy: memberFromToken(token),
      createdAt: new Date().toISOString(),
      doneAt: null,
      doneBy: null,
    }
    data.tasks.push(task)
    write(data)
    return task
  },

  async updateTask(_token, id, input) {
    return mutateTask(id, t => ({ ...t, ...input }))
  },

  async setDone(token, id, done) {
    return mutateTask(id, t => ({
      ...t,
      doneAt: done ? new Date().toISOString() : null,
      doneBy: done ? memberFromToken(token) : null,
    }))
  },

  async deleteTask(_token, id) {
    const data = read()
    data.tasks = data.tasks.filter(t => t.id !== id)
    write(data)
  },

  async changePin(token, oldPin, newPin) {
    const data = read()
    const id = memberFromToken(token)
    if (data.pins[id] !== oldPin) throw new Error('El PIN actual no es correcto')
    data.pins[id] = newPin
    write(data)
  },

  // En modo prueba, los cambios hechos en otra pestaña del mismo navegador
  subscribe(onChange) {
    const onStorage = (e: StorageEvent) => { if (e.key === KEY) onChange() }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  },
}
