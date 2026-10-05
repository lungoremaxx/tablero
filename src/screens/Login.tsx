import { useCallback, useState } from 'react'
import { Avatar } from '../components/Avatar'
import { CheckIcon } from '../components/Icons'
import { PinPad } from '../components/PinPad'
import { DEMO_PIN } from '../data/localStore'
import type { Member } from '../data/types'

interface Props {
  members: Member[]
  demo: boolean
  onLogin(memberId: string, pin: string): Promise<void>
}

export function Login({ members, demo, onLogin }: Props) {
  const [who, setWho] = useState<string | null>(null)
  const [error, setError] = useState('')

  const submit = useCallback(async (pin: string) => {
    if (!who) return
    setError('')
    try {
      await onLogin(who, pin)
    } catch (e) {
      setError((e as Error).message)
      throw e
    }
  }, [who, onLogin])

  return (
    <main className="login">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="logo"><CheckIcon size={30} /></div>
        <h1 style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-0.02em' }}>Tablero</h1>
        <p className="subtitle" style={{ fontSize: 15, lineHeight: 1.5 }}>
          Las tareas de Montalba, Sótano 22 y los demás proyectos, en un solo lugar.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="eyebrow">¿Quién sos?</div>
        <div className="who">
          {members.map(m => (
            <button key={m.id} type="button" className={who === m.id ? 'on' : ''} aria-pressed={who === m.id}
              onClick={() => { setWho(m.id); setError('') }}>
              <Avatar member={m} size={48} />
              {m.name}
            </button>
          ))}
        </div>
      </div>

      <PinPad label={who ? 'Tu PIN' : 'Elegí tu nombre y poné tu PIN'} onComplete={submit} disabled={!who} error={error} />
      {demo && (
        <p className="banner">Modo prueba: los datos quedan solo en este celu. El PIN de todos es {DEMO_PIN}.</p>
      )}
    </main>
  )
}
