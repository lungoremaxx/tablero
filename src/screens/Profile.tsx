import { Avatar } from '../components/Avatar'
import { ACCENTS } from '../lib/palette'
import { useApp } from '../state'

interface Props {
  accent: string
  demo: boolean
  onAccent(color: string): void
  onChangePin(): void
  onLogout(): void
}

export function Profile({ accent, demo, onAccent, onChangePin, onLogout }: Props) {
  const app = useApp()
  const mine = app.tasks.filter(t => t.doneBy === app.me.id).length

  return (
    <main className="screen">
      <header style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <Avatar member={app.me} size={60} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <h1 className="title">{app.me.name}</h1>
          <p className="subtitle">{mine === 1 ? '1 tarea hecha' : `${mine} tareas hechas`}</p>
        </div>
      </header>

      {demo && (
        <p className="banner">
          Estás en modo prueba: las tareas se guardan solo en este dispositivo. Cuando conectemos la base,
          las van a ver los tres.
        </p>
      )}

      <section className="card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <h2 className="eyebrow">Color de la app</h2>
        <div className="swatches" role="group" aria-label="Color de acento">
          {ACCENTS.map(c => (
            <button key={c} type="button" className={accent === c ? 'on' : ''} aria-pressed={accent === c}
              aria-label={`Color ${c}`} style={{ background: c }} onClick={() => onAccent(c)} />
          ))}
        </div>
      </section>

      <section className="card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h2 className="eyebrow">Tenerla como app en el celu</h2>
        <p style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--muted)' }}>
          <b style={{ color: 'var(--text)' }}>iPhone:</b> en Safari, tocá Compartir y después
          “Agregar a pantalla de inicio”.<br />
          <b style={{ color: 'var(--text)' }}>Android:</b> en Chrome, tocá los tres puntos y después
          “Agregar a la pantalla principal”.
        </p>
      </section>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button type="button" className="btn-ghost" onClick={onChangePin}>Cambiar PIN</button>
        <button type="button" className="btn-ghost btn-danger" onClick={onLogout}>Cerrar sesión</button>
      </div>
    </main>
  )
}
