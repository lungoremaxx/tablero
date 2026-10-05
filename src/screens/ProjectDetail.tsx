import { useState } from 'react'
import { Avatar } from '../components/Avatar'
import { BackIcon, PlusIcon } from '../components/Icons'
import { TaskCard } from '../components/TaskCard'
import type { Task } from '../data/types'
import { HUES } from '../lib/palette'
import { countDueSoon, sortOpen, useApp } from '../state'
import { DoneRow } from './Done'

interface Props {
  projectId: string
  onBack(): void
}

export function ProjectDetail({ projectId, onBack }: Props) {
  const app = useApp()
  const [view, setView] = useState<'pendientes' | 'hechas'>('pendientes')
  const project = app.projectById(projectId)
  if (!project) return null

  const c = HUES[project.hue]
  const all = app.tasks.filter(t => t.projectId === projectId)
  const open = sortOpen(all.filter(t => !t.doneAt))
  const done = all.filter(t => t.doneAt).sort((a, b) => (a.doneAt! < b.doneAt! ? 1 : -1))
  const pct = all.length ? done.length / all.length : 0
  const { overdue, soon } = countDueSoon(open)

  // Agrupa por responsable: primero cada socio, después "Todos"
  const groups: { key: string; tasks: Task[] }[] = []
  for (const m of app.members) {
    const ts = open.filter(t => t.assigneeId === m.id)
    if (ts.length) groups.push({ key: m.id, tasks: ts })
  }
  const shared = open.filter(t => t.assigneeId === null || !app.memberById(t.assigneeId))
  if (shared.length) groups.push({ key: 'todos', tasks: shared })

  const r = 34
  const circ = 2 * Math.PI * r

  return (
    <main className="screen">
      <header style={{ display: 'flex', alignItems: 'center' }}>
        <button type="button" className="iconbtn" aria-label="Volver" onClick={onBack}><BackIcon /></button>
      </header>

      <div className="card" style={{ background: c.bg, borderColor: 'transparent', padding: 20, display: 'flex', alignItems: 'center', gap: 18 }}>
        <div className="ring-wrap">
          <svg width="84" height="84" viewBox="0 0 84 84" aria-hidden="true">
            <circle cx="42" cy="42" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="9" />
            {pct > 0 && (
              <circle cx="42" cy="42" r={r} fill="none" stroke={c.solid} strokeWidth="9" strokeLinecap="round"
                strokeDasharray={`${circ * pct} ${circ}`} transform="rotate(-90 42 42)" />
            )}
          </svg>
          <b>{Math.round(pct * 100)}%</b>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.01em', color: c.fg }}>{project.name}</h1>
          <p style={{ fontSize: 13, color: 'var(--text)', opacity: 0.8, lineHeight: 1.4 }}>
            {done.length} hechas de {all.length}
            {overdue > 0 && ` · ${overdue} vencida${overdue > 1 ? 's' : ''}`}
            {overdue === 0 && soon > 0 && ` · ${soon} vence${soon > 1 ? 'n' : ''} esta semana`}
          </p>
        </div>
      </div>

      <div className="chips">
        <button type="button" className={'chip' + (view === 'pendientes' ? ' on' : '')} aria-pressed={view === 'pendientes'}
          onClick={() => setView('pendientes')}>Pendientes · {open.length}</button>
        <button type="button" className={'chip' + (view === 'hechas' ? ' on' : '')} aria-pressed={view === 'hechas'}
          onClick={() => setView('hechas')}>Hechas · {done.length}</button>
      </div>

      {view === 'pendientes' && (
        <>
          {groups.map(g => {
            const m = g.key === 'todos' ? null : app.memberById(g.key)
            return (
              <section key={g.key} className="list">
                <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Avatar member={m} size={22} />{m ? m.name : 'Todos'} · {g.tasks.length}
                </h2>
                {g.tasks.map(t => <TaskCard key={t.id} task={t} showProject={false} showAssignee={false} />)}
              </section>
            )
          })}
          {!open.length && <p className="empty">No hay nada pendiente en {project.name}.</p>}
        </>
      )}

      {view === 'hechas' && (
        <div className="list">
          {done.map(t => <DoneRow key={t.id} task={t} showProject={false} />)}
          {!done.length && <p className="empty">Todavía no se cerró ninguna tarea.</p>}
        </div>
      )}

      <div className="float-cta">
        <button type="button" className="btn-primary" onClick={() => app.openNew(projectId)}>
          <PlusIcon size={20} />Agregar tarea
        </button>
      </div>
    </main>
  )
}
