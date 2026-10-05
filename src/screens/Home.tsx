import { useState } from 'react'
import { Avatar } from '../components/Avatar'
import { RefreshIcon } from '../components/Icons'
import { TaskCard } from '../components/TaskCard'
import { longToday } from '../lib/dates'
import { HUES, initials } from '../lib/palette'
import { countDueSoon, isMine, openTasks, sortOpen, useApp } from '../state'

interface Props {
  onOpenProject(id: string): void
  onRefresh(): void
  refreshing: boolean
}

export function Home({ onOpenProject, onRefresh, refreshing }: Props) {
  const app = useApp()
  const [scope, setScope] = useState<'mias' | 'todas'>('mias')
  const open = openTasks(app.tasks)
  const mine = open.filter(t => isMine(t, app.me.id))
  const { overdue, soon } = countDueSoon(mine)
  const list = sortOpen(scope === 'mias' ? mine : open)

  return (
    <main className="screen">
      <header style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Avatar member={app.me} size={44} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800 }}>Hola, {app.me.name}</h1>
          <p className="subtitle" style={{ fontSize: 13 }}>{longToday()}</p>
        </div>
        <button type="button" className="iconbtn" aria-label="Actualizar" onClick={onRefresh} disabled={refreshing}
          style={refreshing ? { opacity: 0.5 } : undefined}>
          <RefreshIcon />
        </button>
      </header>

      <div className="stats">
        <div className="stat hero"><b>{mine.length}</b><span>Mis pendientes</span></div>
        <div className="stat"><b style={overdue ? { color: 'var(--danger)' } : undefined}>{overdue}</b>
          <span>{overdue === 1 ? 'Vencida' : 'Vencidas'}</span></div>
        <div className="stat"><b>{soon}</b><span>Esta semana</span></div>
      </div>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h2 className="section-title">Proyectos</h2>
        <div className="proj-row">
          {app.projects.map(p => {
            const all = app.tasks.filter(t => t.projectId === p.id)
            const pending = all.filter(t => !t.doneAt).length
            const pct = all.length ? (all.length - pending) / all.length : 0
            const c = HUES[p.hue]
            return (
              <button key={p.id} type="button" className="proj-card" onClick={() => onOpenProject(p.id)}>
                <span className="proj-badge" style={{ background: c.bg, color: c.fg }}>{initials(p.name)}</span>
                <span style={{ fontSize: 14, fontWeight: 700 }}>{p.name}</span>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                  {pending === 1 ? '1 pendiente' : `${pending} pendientes`}
                </span>
                <span className="bar" style={{ width: '100%' }}><i style={{ width: `${pct * 100}%`, background: c.solid }} /></span>
              </button>
            )
          })}
        </div>
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="seg" role="group" aria-label="Qué tareas ver">
          <button type="button" className={scope === 'mias' ? 'on' : ''} aria-pressed={scope === 'mias'}
            onClick={() => setScope('mias')}>Mis tareas</button>
          <button type="button" className={scope === 'todas' ? 'on' : ''} aria-pressed={scope === 'todas'}
            onClick={() => setScope('todas')}>Todas · {open.length}</button>
        </div>
        <div className="list">
          {list.map(t => <TaskCard key={t.id} task={t} showAssignee={scope === 'todas'} />)}
          {!list.length && (
            <p className="empty">
              {scope === 'mias' ? 'No tenés nada pendiente.' : 'No hay tareas pendientes.'}<br />
              Tocá el + para cargar una.
            </p>
          )}
        </div>
      </section>
    </main>
  )
}
