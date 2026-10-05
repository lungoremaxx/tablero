import { createContext, useContext } from 'react'
import type { Member, Project, Task } from './data/types'
import { dueState } from './lib/dates'

export interface AppState {
  me: Member
  members: Member[]
  projects: Project[]
  tasks: Task[]
  memberById(id: string | null): Member | null
  projectById(id: string): Project | undefined
  complete(task: Task): void
  reopen(task: Task): void
  openTask(task: Task): void
  openNew(projectId?: string): void
}

export const AppContext = createContext<AppState | null>(null)

export function useApp(): AppState {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp fuera de AppContext')
  return ctx
}

const PRIORITY_RANK = { alta: 0, media: 1, baja: 2 }

/** Vencidas primero, después por fecha (sin fecha al final) y por prioridad */
export function sortOpen(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const da = a.dueDate ?? '9999-12-31'
    const db = b.dueDate ?? '9999-12-31'
    if (da !== db) return da < db ? -1 : 1
    return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
  })
}

/** Las tareas de "Todos" cuentan como de cada uno */
export function isMine(task: Task, memberId: string): boolean {
  return task.assigneeId === memberId || task.assigneeId === null
}

export function openTasks(tasks: Task[]): Task[] {
  return tasks.filter(t => !t.doneAt)
}

export function countDueSoon(tasks: Task[]): { overdue: number; soon: number } {
  let overdue = 0
  let soon = 0
  for (const t of tasks) {
    const s = dueState(t.dueDate)
    if (s === 'overdue') overdue++
    else if (s === 'soon') soon++
  }
  return { overdue, soon }
}
