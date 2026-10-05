import { ChevronIcon } from '../components/Icons'
import { countDueSoon, openTasks, useApp } from '../state'
import { HUES, initials } from '../lib/palette'

interface Props {
  onOpenProject(id: string): void
}

export function Projects({ onOpenProject }: Props) {
  const app = useApp()
  return (
    <main className="screen">
      <header style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <h1 className="title">Proyectos</h1>
        <p className="subtitle">{app.projects.length} proyectos en marcha</p>
      </header>
      <div className="list">
        {app.projects.map(p => {
          const all = app.tasks.filter(t => t.projectId === p.id)
          const open = openTasks(all)
          const { overdue } = countDueSoon(open)
          const pct = all.length ? (all.length - open.length) / all.length : 0
          const c = HUES[p.hue]
          return (
            <button key={p.id} type="button" className="proj-item" onClick={() => onOpenProject(p.id)}>
              <span className="proj-badge" style={{ background: c.bg, color: c.fg, width: 44, height: 44, borderRadius: 14 }}>
                {initials(p.name)}
              </span>
              <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={{ fontSize: 16, fontWeight: 700 }}>{p.name}</span>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                  {open.length === 1 ? '1 pendiente' : `${open.length} pendientes`}
                  {overdue > 0 && <span style={{ color: 'var(--danger)', fontWeight: 700 }}> · {overdue} vencida{overdue > 1 ? 's' : ''}</span>}
                </span>
                <span className="bar"><i style={{ width: `${pct * 100}%`, background: c.solid }} /></span>
              </span>
              <span style={{ color: 'var(--muted)' }}><ChevronIcon /></span>
            </button>
          )
        })}
      </div>
    </main>
  )
}
