import type { ReactNode } from 'react'
import { DoneIcon, FolderIcon, HomeIcon, PlusIcon, UserIcon } from './Icons'

export type Tab = 'inicio' | 'proyectos' | 'hechas' | 'perfil'

interface Props {
  tab: Tab
  onTab(tab: Tab): void
  onNew(): void
}

export function BottomNav({ tab, onTab, onNew }: Props) {
  const item = (id: Tab, label: string, icon: ReactNode) => (
    <button type="button" className={tab === id ? 'on' : ''} aria-current={tab === id ? 'page' : undefined}
      onClick={() => onTab(id)}>
      {icon}{label}
    </button>
  )
  return (
    <nav className="nav" aria-label="Navegación">
      {item('inicio', 'Inicio', <HomeIcon />)}
      {item('proyectos', 'Proyectos', <FolderIcon />)}
      <button type="button" className="fab" aria-label="Nueva tarea" onClick={onNew}><PlusIcon size={28} /></button>
      {item('hechas', 'Hechas', <DoneIcon />)}
      {item('perfil', 'Perfil', <UserIcon />)}
    </nav>
  )
}
