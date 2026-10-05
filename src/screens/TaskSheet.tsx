import { useEffect, useRef, useState } from 'react'
import { Avatar } from '../components/Avatar'
import { CalendarIcon } from '../components/Icons'
import type { Priority, Task, TaskInput } from '../data/types'
import { addDays, endOfWorkWeek, shortDate, todayISO } from '../lib/dates'
import { HUES } from '../lib/palette'
import { useApp } from '../state'

interface Props {
  task?: Task
  presetProjectId?: string
  onSave(input: TaskInput): Promise<void>
  onDelete?(): Promise<void>
  onClose(): void
}

export function TaskSheet({ task, presetProjectId, onSave, onDelete, onClose }: Props) {
  const app = useApp()
  const [title, setTitle] = useState(task?.title ?? '')
  const [projectId, setProjectId] = useState(task?.projectId ?? presetProjectId ?? '')
  const [assigneeId, setAssigneeId] = useState<string | null>(task ? task.assigneeId : app.me.id)
  const [dueDate, setDueDate] = useState<string | null>(task ? task.dueDate : null)
  const [priority, setPriority] = useState<Priority>(task?.priority ?? 'media')
  const [notes, setNotes] = useState(task?.notes ?? '')
  const [busy, setBusy] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)
  const dateRef = useRef<HTMLInputElement>(null)

  const closeRef = useRef(onClose)
  closeRef.current = onClose

  // Solo al abrir: foco en el título (tarea nueva) y Escape para cerrar
  useEffect(() => {
    if (!task) titleRef.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeRef.current() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const today = todayISO()
  const quick: { label: string; value: string | null }[] = [
    { label: 'Hoy', value: today },
    { label: 'Mañana', value: addDays(today, 1) },
    { label: 'Esta semana', value: endOfWorkWeek() },
    { label: 'Sin fecha', value: null },
  ]
  const isQuick = quick.some(q => q.value === dueDate)
  const canSave = title.trim().length > 0 && projectId !== '' && !busy

  async function save() {
    if (!canSave) return
    setBusy(true)
    try {
      await onSave({ title: title.trim(), projectId, assigneeId, dueDate, priority, notes: notes.trim() })
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!onDelete || !window.confirm('¿Borrar esta tarea? No se puede deshacer.')) return
    setBusy(true)
    try { await onDelete() } finally { setBusy(false) }
  }

  return (
    <>
      <div className="backdrop" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
       <div className="sheet-body">
        <div className="grabber" />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 id="sheet-title" style={{ fontSize: 22, fontWeight: 800 }}>{task ? 'Editar tarea' : 'Nueva tarea'}</h2>
          <button type="button" className="link" onClick={onClose} style={{ fontSize: 14 }}>Cancelar</button>
        </div>

        <div className="field">
          <label htmlFor="task-title" className="eyebrow">¿Qué hay que hacer?</label>
          <input id="task-title" ref={titleRef} className="input" value={title} maxLength={200}
            placeholder="Ej: llamar al proveedor" enterKeyHint="done"
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }} />
        </div>

        <fieldset className="field">
          <legend className="eyebrow">Proyecto</legend>
          <div className="chips">
            {app.projects.map(p => {
              const c = HUES[p.hue]
              const on = projectId === p.id
              return (
                <button key={p.id} type="button" className="chip" aria-pressed={on} onClick={() => setProjectId(p.id)}
                  style={{ color: on ? c.fg : c.fg, background: on ? c.bg : undefined, border: on ? `2px solid ${c.solid}` : undefined, fontWeight: 700 }}>
                  {p.name}
                </button>
              )
            })}
          </div>
        </fieldset>

        <fieldset className="field">
          <legend className="eyebrow">¿Quién la hace?</legend>
          <div className="people">
            {app.members.map(m => (
              <button key={m.id} type="button" className={'person' + (assigneeId === m.id ? ' on' : '')}
                aria-pressed={assigneeId === m.id} onClick={() => setAssigneeId(m.id)}>
                <Avatar member={m} size={32} />{m.name}
              </button>
            ))}
            <button type="button" className={'person' + (assigneeId === null ? ' on' : '')}
              aria-pressed={assigneeId === null} onClick={() => setAssigneeId(null)}>
              <Avatar member={null} size={32} />Todos
            </button>
          </div>
        </fieldset>

        <fieldset className="field">
          <legend className="eyebrow">¿Para cuándo?</legend>
          <div className="chips">
            {quick.map(q => (
              <button key={q.label} type="button" className={'chip' + (dueDate === q.value ? ' on' : '')}
                aria-pressed={dueDate === q.value} onClick={() => setDueDate(q.value)}>{q.label}</button>
            ))}
            <label className={'chip' + (!isQuick && dueDate ? ' on' : '')} style={{ position: 'relative', overflow: 'hidden' }}>
              <CalendarIcon size={15} />
              {!isQuick && dueDate ? shortDate(dueDate) : 'Elegir'}
              <input ref={dateRef} type="date" aria-label="Elegir fecha" value={dueDate ?? ''}
                onChange={e => setDueDate(e.target.value || null)}
                onClick={() => dateRef.current?.showPicker?.()}
                style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
            </label>
          </div>
        </fieldset>

        <fieldset className="field">
          <legend className="eyebrow">Prioridad</legend>
          <div className="seg" style={{ background: 'var(--bg)' }}>
            {(['baja', 'media', 'alta'] as Priority[]).map(p => (
              <button key={p} type="button" className={priority === p ? 'on' : ''} aria-pressed={priority === p}
                onClick={() => setPriority(p)}
                style={priority === p && p === 'alta' ? { color: 'var(--accent)', fontWeight: 800 } : undefined}>
                {p[0].toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="field">
          <label htmlFor="task-notes" className="eyebrow">Comentario (opcional)</label>
          <textarea id="task-notes" className="input" value={notes} maxLength={1000}
            placeholder="Detalles, links, a quién llamar…" onChange={e => setNotes(e.target.value)} />
        </div>

        {task && onDelete && (
          <button type="button" className="btn-ghost btn-danger" onClick={remove} disabled={busy}>Borrar tarea</button>
        )}
       </div>

        <div className="sheet-foot">
          {!projectId && title.trim() && <p className="subtitle" style={{ textAlign: 'center' }}>Elegí un proyecto</p>}
          <button type="button" className="btn-primary" disabled={!canSave} onClick={save}>
            {busy ? 'Guardando…' : task ? 'Guardar cambios' : 'Guardar tarea'}
          </button>
        </div>
      </div>
    </>
  )
}
