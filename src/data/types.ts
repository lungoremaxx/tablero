export type Priority = 'baja' | 'media' | 'alta'

export type Hue = 'coral' | 'violet' | 'blue' | 'teal' | 'red' | 'green' | 'amber'

export interface Member {
  id: string
  name: string
  hue: Hue
}

export interface Project {
  id: string
  name: string
  hue: Hue
  position: number
}

export interface Task {
  id: string
  projectId: string
  title: string
  /** null = "Todos" */
  assigneeId: string | null
  priority: Priority
  /** YYYY-MM-DD */
  dueDate: string | null
  notes: string
  createdBy: string
  createdAt: string
  doneAt: string | null
  doneBy: string | null
}

export interface Session {
  token: string
  memberId: string
  /** true mientras siga con el PIN inicial */
  mustChangePin?: boolean
}

export interface TaskInput {
  projectId: string
  title: string
  assigneeId: string | null
  priority: Priority
  dueDate: string | null
  notes: string
}

export interface Store {
  /** true cuando los datos viven solo en este dispositivo */
  readonly demo: boolean
  listMembers(): Promise<Member[]>
  login(memberId: string, pin: string): Promise<Session>
  logout(token: string): Promise<void>
  load(token: string): Promise<{ projects: Project[]; tasks: Task[] }>
  addTask(token: string, input: TaskInput): Promise<Task>
  updateTask(token: string, id: string, input: TaskInput): Promise<Task>
  setDone(token: string, id: string, done: boolean): Promise<Task>
  deleteTask(token: string, id: string): Promise<void>
  changePin(token: string, oldPin: string, newPin: string): Promise<void>
  /** Llama a onChange cuando otro dispositivo cambia algo; devuelve cómo desuscribirse */
  subscribe(onChange: () => void): () => void
}
