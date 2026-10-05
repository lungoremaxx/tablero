import { createClient } from '@supabase/supabase-js'
import type { Member, Project, Session, Store, Task, TaskInput } from './types'

const MESSAGES: Record<string, string> = {
  PIN_INCORRECTO: 'PIN incorrecto',
  BLOQUEADO: 'Demasiados intentos. Probá de nuevo en 10 minutos.',
  PIN_INVALIDO: 'El PIN tiene que ser de 4 números',
  SESION_VENCIDA: 'Tu sesión venció. Entrá de nuevo.',
  NO_EXISTE: 'La tarea ya no existe',
}

export class SessionExpiredError extends Error {}

function friendly(message: string): Error {
  // Un token que no es uuid (por ejemplo, de modo prueba) también es una sesión inválida
  if (message.includes('invalid input syntax for type uuid')) return new SessionExpiredError(MESSAGES.SESION_VENCIDA)
  const code = Object.keys(MESSAGES).find(k => message.includes(k))
  if (code === 'SESION_VENCIDA') return new SessionExpiredError(MESSAGES[code])
  return new Error(code ? MESSAGES[code] : 'No se pudo conectar. Revisá la conexión y probá de nuevo.')
}

export function createSupabaseStore(url: string, anonKey: string): Store {
  const db = createClient(url, anonKey, { auth: { persistSession: false } })

  async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
    const { data, error } = await db.rpc(fn, args)
    if (error) throw friendly(error.message)
    return data as T
  }

  const taskArgs = (input: TaskInput) => ({
    p_project: input.projectId,
    p_title: input.title,
    p_assignee: input.assigneeId,
    p_priority: input.priority,
    p_due: input.dueDate,
    p_notes: input.notes,
  })

  return {
    demo: false,

    listMembers: () => rpc<Member[]>('list_members'),

    async login(memberId, pin) {
      const r = await rpc<Session & { error?: string }>('login', { p_member: memberId, p_pin: pin })
      if (r.error) throw friendly(r.error)
      return r
    },

    async logout(token) {
      await rpc('logout', { p_token: token }).catch(() => undefined)
    },

    load: token => rpc<{ projects: Project[]; tasks: Task[] }>('load_data', { p_token: token }),

    addTask: (token, input) => rpc<Task>('add_task', { p_token: token, ...taskArgs(input) }),

    updateTask: (token, id, input) =>
      rpc<Task>('update_task', { p_token: token, p_id: id, ...taskArgs(input) }),

    setDone: (token, id, done) => rpc<Task>('set_done', { p_token: token, p_id: id, p_done: done }),

    async deleteTask(token, id) {
      await rpc('delete_task', { p_token: token, p_id: id })
    },

    async changePin(token, oldPin, newPin) {
      await rpc('change_pin', { p_token: token, p_old: oldPin, p_new: newPin })
    },

    // La base manda una señal vacía en 'tablero-cambios' con cada cambio (ver schema.sql)
    subscribe(onChange) {
      const channel = db.channel('tablero-cambios')
        .on('broadcast', { event: 'cambio' }, () => onChange())
        .subscribe()
      return () => { void db.removeChannel(channel) }
    },
  }
}
