import { useCallback, useState } from 'react'
import { PinPad } from '../components/PinPad'

interface Props {
  name: string
  /** PIN actual, si ya se sabe (primer ingreso); si no, se pide */
  currentPin?: string
  onSave(oldPin: string, newPin: string): Promise<void>
  onCancel?(): void
}

type Step = 'old' | 'new' | 'repeat'

export function ChangePin({ name, currentPin, onSave, onCancel }: Props) {
  const [step, setStep] = useState<Step>(currentPin ? 'new' : 'old')
  const [oldPin, setOldPin] = useState(currentPin ?? '')
  const [newPin, setNewPin] = useState('')
  const [error, setError] = useState('')

  const complete = useCallback(async (pin: string) => {
    setError('')
    if (step === 'old') { setOldPin(pin); setStep('new'); return }
    if (step === 'new') {
      if (pin === oldPin) { setError('Elegí un PIN distinto al actual'); throw new Error() }
      setNewPin(pin); setStep('repeat'); return
    }
    if (pin !== newPin) {
      setError('No coinciden. Probá de nuevo.')
      setStep('new')
      throw new Error()
    }
    try {
      await onSave(oldPin, pin)
    } catch (e) {
      setError((e as Error).message)
      setStep(currentPin ? 'new' : 'old')
      throw e
    }
  }, [step, oldPin, newPin, onSave, currentPin])

  const label = { old: 'Tu PIN actual', new: 'Elegí tu PIN nuevo', repeat: 'Repetilo' }[step]

  return (
    <main className="login">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h1 className="title">{currentPin ? `Hola, ${name}` : 'Cambiar PIN'}</h1>
        <p className="subtitle" style={{ lineHeight: 1.5 }}>
          {currentPin
            ? 'Es tu primera vez. Elegí un PIN de 4 números que solo sepas vos.'
            : 'Lo vas a usar para entrar desde otro celu o si cerrás sesión.'}
        </p>
      </div>
      <PinPad key={step} label={label} onComplete={complete} error={error} />
      {onCancel && <button type="button" className="btn-ghost" onClick={onCancel}>Cancelar</button>}
    </main>
  )
}
