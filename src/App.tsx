import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BottomNav, type Tab } from './components/BottomNav'
import { store } from './data/store'
import { SessionExpiredError } from './data/supabaseStore'
import type { Member, Project, Session, Task, TaskInput } from './data/types'
import { ACCENTS } from './lib/palette'
import { ChangePin } from './screens/ChangePin'
import { Done } from './screens/Done'
import { Home } from './screens/Home'
import { Login } from './screens/Login'
import { Profile } from './screens/Profile'
import { ProjectDetail } from './screens/ProjectDetail'
import { Projects } from './screens/Projects'
import { TaskSheet } from './screens/TaskSheet'
import { AppContext, type AppState } from './state'

const SESSION_KEY = 'tablero-session'
const ACCENT_KEY = 'tablero-accent'

function readJSON<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch { return null }
}
function writeJSON(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(value))
  } catch { /* sin storage: la sesión dura lo que dure la pestaña */ }
}

type Sheet = { kind: 'new'; projectId?: string } | { kind: 'edit'; task: Task } | null
interface Toast { text: string; undo?: () => void }

export default function App() {
  const [members, setMembers] = useState<Member[]>([])
  const [session, setSession] = useState<Session | null>(() => readJSON<Session>(SESSION_KEY))
  const [projects, setProjects] = useState<Project[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [loaded, setLoaded] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [bootError, setBootError] = useState('')

  const [tab, setTab] = useState<Tab>('inicio')
  const [projectId, setProjectId] = useState<string | null>(null)
  const [sheet, setSheet] = useState<Sheet>(null)
  const [toast, setToast] = useState<Toast | null>(null)
  const [accent, setAccent] = useState(() => readJSON<string>(ACCENT_KEY) ?? ACCENTS[0])
  /** PIN inicial recién usado (primer ingreso) o 'cambiar' desde Perfil */
  const [pinFlow, setPinFlow] = useState<{ firstPin?: string } | null>(null)
  const toastTimer = useRef<number | undefined>(undefined)

  useEffect(() => {
    document.documentElement.style.setProperty('--accent', accent)
    writeJSON(ACCENT_KEY, accent)
  }, [accent])

  useEffect(() => {
    store.listMembers().then(setMembers).catch(() =>
      setBootError('No se pudo conectar. Revisá la conexión y recargá.'))
  }, [])

  const showToast = useCallback((t: Toast) => {
    window.clearTimeout(toastTimer.current)
    setToast(t)
    toastTimer.current = window.setTimeout(() => setToast(null), t.undo ? 5000 : 2500)
  }, [])

  const logout = useCallback(() => {
    if (session) void store.logout(session.token)
    writeJSON(SESSION_KEY, null)
    setSession(null)
    setLoaded(false)
    setTasks([])
    setTab('inicio')
    setProjectId(null)
    setPinFlow(null)
  }, [session])

  const reload = useCallback(async () => {
    if (!session) return
    setRefreshing(true)
    try {
      const data = await store.load(session.token)
      setProjects(data.projects)
      setTasks(data.tasks)
      setLoaded(true)
    } catch (e) {
      if (e instanceof SessionExpiredError) logout()
      else showToast({ text: (e as Error).message })
    } finally {
      setRefreshing(false)
    }
  }, [session, logout, showToast])

  // Carga inicial; después recarga al instante cuando otro celu cambia algo,
  // al volver a la app y cada minuto por si se perdió alguna señal
  useEffect(() => {
    if (!session) return
    void reload()
    let debounce: number | undefined
    const soon = () => {
      window.clearTimeout(debounce)
      debounce = window.setTimeout(() => void reload(), 300)
    }
    const unsubscribe = store.subscribe(soon)
    const onVisible = () => { if (document.visibilityState === 'visible') void reload() }
    document.addEventListener('visibilitychange', onVisible)
    const timer = window.setInterval(onVisible, 60_000)
    return () => {
      unsubscribe()
      window.clearTimeout(debounce)
      document.removeEventListener('visibilitychange', onVisible)
      window.clearInterval(timer)
    }
  }, [session, reload])

  /** Ejecuta un cambio; si falla, avisa y recarga para volver al estado real */
  const run = useCallback(async <T,>(fn: (token: string) => Promise<T>): Promise<T | undefined> => {
    if (!session) return undefined
    try {
      return await fn(session.token)
    } catch (e) {
      if (e instanceof SessionExpiredError) { logout(); return undefined }
      showToast({ text: (e as Error).message })
      void reload()
      throw e
    }
  }, [session, logout, reload, showToast])

  const replaceTask = (t: Task) => setTasks(ts => ts.map(x => (x.id === t.id ? t : x)))

  const login = useCallback(async (memberId: string, pin: string) => {
    const s = await store.login(memberId, pin)
    writeJSON(SESSION_KEY, { token: s.token, memberId: s.memberId })
    setSession(s)
    if (s.mustChangePin) setPinFlow({ firstPin: pin })
  }, [])

  const me = members.find(m => m.id === session?.memberId)

  const setDone = useCallback((task: Task, done: boolean) => {
    if (!me) return
    replaceTask({ ...task, doneAt: done ? new Date().toISOString() : null, doneBy: done ? me.id : null })
    run(token => store.setDone(token, task.id, done)).then(t => t && replaceTask(t)).catch(() => undefined)
  }, [me, run])

  const appState: AppState | null = useMemo(() => {
    if (!me) return null
    return {
      me, members, projects, tasks,
      memberById: id => members.find(m => m.id === id) ?? null,
      projectById: id => projects.find(p => p.id === id),
      complete: task => {
        setDone(task, true)
        showToast({ text: 'Tarea hecha', undo: () => { setDone(task, false); setToast(null) } })
      },
      reopen: task => {
        setDone(task, false)
        showToast({ text: 'Volvió a pendientes', undo: () => { setDone(task, true); setToast(null) } })
      },
      openTask: task => setSheet({ kind: 'edit', task }),
      openNew: pid => setSheet({ kind: 'new', projectId: pid }),
    }
  }, [me, members, projects, tasks, setDone, showToast])

  async function saveTask(input: TaskInput) {
    if (!sheet) return
    if (sheet.kind === 'new') {
      const t = await run(token => store.addTask(token, input))
      if (t) { setTasks(ts => [...ts, t]); showToast({ text: 'Tarea guardada' }) }
    } else {
      const t = await run(token => store.updateTask(token, sheet.task.id, input))
      if (t) { replaceTask(t); showToast({ text: 'Cambios guardados' }) }
    }
    setSheet(null)
  }

  async function deleteTask() {
    if (sheet?.kind !== 'edit') return
    const id = sheet.task.id
    await run(token => store.deleteTask(token, id))
    setTasks(ts => ts.filter(t => t.id !== id))
    setSheet(null)
    showToast({ text: 'Tarea borrada' })
  }

  async function changePin(oldPin: string, newPin: string) {
    await run(token => store.changePin(token, oldPin, newPin))
    setPinFlow(null)
    showToast({ text: 'PIN actualizado' })
  }

  // ------------------------------------------------------------ Render

  if (bootError) return <main className="login"><p className="error">{bootError}</p></main>

  if (!session || (!me && members.length)) {
    return <div className="app"><Login members={members} demo={store.demo} onLogin={login} /></div>
  }

  if (!me || !appState || !loaded) {
    return <main className="login"><p className="subtitle" style={{ margin: 'auto' }}>Cargando…</p></main>
  }

  if (pinFlow) {
    return (
      <div className="app">
        <ChangePin name={me.name} currentPin={pinFlow.firstPin} onSave={changePin}
          onCancel={pinFlow.firstPin ? undefined : () => setPinFlow(null)} />
      </div>
    )
  }

  const goTab = (t: Tab) => { setTab(t); setProjectId(null); window.scrollTo(0, 0) }
  const openProject = (id: string) => { setProjectId(id); window.scrollTo(0, 0) }

  return (
    <AppContext.Provider value={appState}>
      <div className="app">
        {projectId
          ? <ProjectDetail projectId={projectId} onBack={() => setProjectId(null)} />
          : tab === 'inicio' ? <Home onOpenProject={openProject} onRefresh={reload} refreshing={refreshing} />
          : tab === 'proyectos' ? <Projects onOpenProject={openProject} />
          : tab === 'hechas' ? <Done />
          : <Profile accent={accent} demo={store.demo} onAccent={setAccent}
              onChangePin={() => setPinFlow({})} onLogout={logout} />}

        {!projectId && <BottomNav tab={tab} onTab={goTab} onNew={() => appState.openNew()} />}

        {sheet && (
          <TaskSheet
            key={sheet.kind === 'edit' ? sheet.task.id : 'new'}
            task={sheet.kind === 'edit' ? sheet.task : undefined}
            presetProjectId={sheet.kind === 'new' ? sheet.projectId : undefined}
            onSave={saveTask}
            onDelete={sheet.kind === 'edit' ? deleteTask : undefined}
            onClose={() => setSheet(null)}
          />
        )}

        {toast && (
          <div className="toast" role="status" style={projectId ? { bottom: 'calc(100px + env(safe-area-inset-bottom))' } : undefined}>
            <span>{toast.text}</span>
            {toast.undo && <button type="button" onClick={toast.undo}>Deshacer</button>}
          </div>
        )}
      </div>
    </AppContext.Provider>
  )
}
