import { useEffect, useState } from 'react'
import { DeleteKeyIcon } from './Icons'

interface Props {
  /** Se llama al completar los 4 números; si rechaza, se limpia el PIN y tiembla */
  onComplete(pin: string): Promise<void>
  disabled?: boolean
  label: string
  /** Se muestra entre las cajitas y el teclado, siempre a la vista */
  error?: string
}

export function PinPad({ onComplete, disabled, label, error }: Props) {
  const [pin, setPin] = useState('')
  const [busy, setBusy] = useState(false)
  const [shake, setShake] = useState(false)

  useEffect(() => {
    if (pin.length !== 4) return
    setBusy(true)
    onComplete(pin)
      .catch(() => {
        setShake(true)
        window.setTimeout(() => setShake(false), 400)
      })
      .finally(() => { setBusy(false); setPin('') })
  }, [pin, onComplete])

  const press = (d: string) => {
    if (disabled || busy) return
    setPin(p => (p.length < 4 ? p + d : p))
  }

  // Teclado físico (compu o teclado bluetooth)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) press(e.key)
      else if (e.key === 'Backspace') setPin(p => p.slice(0, -1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="eyebrow" id="pin-label">{label}</div>
      <div className={'pin-boxes' + (shake ? ' shake' : '')} role="status" aria-labelledby="pin-label"
        aria-label={`${pin.length} de 4 números`}>
        {[0, 1, 2, 3].map(i => (
          <span key={i} className={i === pin.length && !disabled ? 'cur' : ''}>{i < pin.length && <i />}</span>
        ))}
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="keypad">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(d => (
          <button key={d} type="button" onClick={() => press(d)} disabled={disabled}>{d}</button>
        ))}
        <span className="blank" />
        <button type="button" onClick={() => press('0')} disabled={disabled}>0</button>
        <button type="button" aria-label="Borrar" onClick={() => setPin(p => p.slice(0, -1))} disabled={disabled}>
          <DeleteKeyIcon />
        </button>
      </div>
    </div>
  )
}
