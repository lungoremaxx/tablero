import { useState } from 'react'
import { CheckIcon } from '../components/Icons'
import type { Task } from '../data/types'
import { dayHeading, daysUntil, lateness, timeOf, toISODate } from '../lib/dates'
import { HUES } from '../lib/palette'
import { useApp } from '../state'

export function DoneRow({ task, showProject = true }: { task: Task; showProject?: boolean }) {
  const app = useApp()
  const by = app.memberById(task.doneBy)
  const project = app.projectById(task.projectId)
  const late = lateness(task.dueDate, task.doneAt!)
  return (
    <div className="task">
      <button type="button" className="check done" onClick={() => app.reopen(task)}
        aria-label={`Volver a pendiente: ${task.title}`}>
        <CheckIcon size={14} />
      </button>
      <button type="button" className="task-body" onClick={() => app.openTask(task)}>
        <span className="task-title">{task.title}</span>
        <span className="task-meta">
          <span>
            {by ? by.name : 'Alguien'}
            {showProject && project && <> · <span style={{ color: HUES[project.hue].fg }}>{project.name}</span></>}
            {' · '}{timeOf(task.doneAt!)}
          </span>
        </span>
        {late !== null && (
          late <= 0
            ? <span className="tag" style={{ color: '#86EFAC', background: '#14301F' }}>A tiempo</span>
            : <span className="tag" style={{ color: '#FCA5A5', background: '#3A1F1F' }}>
                {late === 1 ? '1 día tarde' : `${late} días tarde`}
              </span>
        )}
      </button>
    </div>
  )
}

export function Done() {
  const app = useApp()
  const [who, setWho] = useState<string | null>(null)

  const done = app.tasks
    .filter(t => t.doneAt && (!who || t.doneBy === who))
    .sort((a, b) => (a.doneAt! < b.doneAt! ? 1 : -1))

  const week = done.filter(t => daysUntil(toISODate(new Date(t.doneAt!))) > -7)
  const onTime = week.filter(t => (lateness(t.dueDate, t.doneAt!) ?? 0) <= 0).length

  const groups: { label: string; tasks: Task[] }[] = []
  for (const t of done) {
    const label = dayHeading(t.doneAt!)
    const last = groups[groups.length - 1]
    if (last && last.label === label) last.tasks.push(t)
    else groups.push({ label, tasks: [t] })
  }

  return (
    <main className="screen">
      <header style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <h1 className="title">Hechas</h1>
        <p className="subtitle">Quién hizo qué, y cuándo.</p>
      </header>

      <div className="stats" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
        <div className="stat"><b>{week.length}</b><span>Últimos 7 días</span></div>
        <div className="stat"><b style={{ color: 'var(--ok)' }}>{week.length ? `${onTime} de ${week.length}` : '–'}</b><span>A tiempo</span></div>
      </div>

      <div className="chips scroll" role="group" aria-label="Filtrar por persona">
        <button type="button" className={'chip' + (who === null ? ' on' : '')} aria-pressed={who === null}
          onClick={() => setWho(null)}>Todos</button>
        {app.members.map(m => (
          <button key={m.id} type="button" className={'chip' + (who === m.id ? ' on' : '')} aria-pressed={who === m.id}
            onClick={() => setWho(m.id)}>{m.name}</button>
        ))}
      </div>

      {groups.map(g => (
        <section key={g.label} className="list">
          <h2 className="eyebrow">{g.label}</h2>
          {g.tasks.map(t => <DoneRow key={t.id} task={t} />)}
        </section>
      ))}
      {!groups.length && <p className="empty">Cuando tildes una tarea, aparece acá.</p>}
    </main>
  )
}
