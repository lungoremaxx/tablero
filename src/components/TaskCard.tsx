import { useState } from 'react'
import type { Task } from '../data/types'
import { dueLabel, dueState } from '../lib/dates'
import { HUES } from '../lib/palette'
import { useApp } from '../state'
import { Avatar } from './Avatar'
import { CalendarIcon, CheckIcon } from './Icons'

interface Props {
  task: Task
  showProject?: boolean
  showAssignee?: boolean
}

const PRIORITY_LABEL = { alta: 'Alta', media: 'Media', baja: 'Baja' }

export function TaskCard({ task, showProject = true, showAssignee = true }: Props) {
  const app = useApp()
  const [leaving, setLeaving] = useState(false)
  const project = app.projectById(task.projectId)
  const colors = project ? HUES[project.hue] : HUES.blue
  const state = dueState(task.dueDate)
  const assignee = app.memberById(task.assigneeId)

  function done() {
    if (leaving) return
    setLeaving(true)
    if ('vibrate' in navigator) navigator.vibrate?.(15)
    window.setTimeout(() => app.complete(task), 260)
  }

  return (
    <div className={'task' + (leaving ? ' leaving' : '')}>
      <button type="button" className={'check' + (leaving ? ' done' : '')} onClick={done}
        aria-label={`Marcar como hecha: ${task.title}`}>
        {leaving && <CheckIcon size={14} />}
      </button>
      <button type="button" className="task-body" onClick={() => app.openTask(task)}>
        {showProject && project && (
          <span className="tag" style={{ color: colors.fg, background: colors.bg }}>{project.name}</span>
        )}
        <span className="task-title">{task.title}</span>
        <span className="task-meta">
          <span style={state === 'overdue' ? { color: 'var(--danger)', fontWeight: 700 } : undefined}>
            <CalendarIcon />{dueLabel(task.dueDate)}
          </span>
          {task.priority === 'alta'
            ? <span style={{ color: 'var(--accent)', fontWeight: 700 }}>
                <i className="dot" style={{ background: 'var(--accent)' }} />Alta
              </span>
            : <span>{PRIORITY_LABEL[task.priority]}</span>}
          {task.notes && <span>Con nota</span>}
        </span>
      </button>
      {showAssignee && (
        <span title={assignee ? assignee.name : 'Todos'}>
          <Avatar member={assignee} size={28} />
        </span>
      )}
    </div>
  )
}
