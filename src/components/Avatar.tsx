import type { Member } from '../data/types'
import { HUES, initials } from '../lib/palette'

interface Props {
  member: Member | null
  size?: number
}

/** member null = "Todos" */
export function Avatar({ member, size = 32 }: Props) {
  const colors = member ? HUES[member.hue] : { bg: '#2A2A2E', fg: '#D4D4D8' }
  return (
    <span
      className="avatar"
      aria-hidden="true"
      style={{ width: size, height: size, background: colors.bg, color: colors.fg, fontSize: Math.round(size * 0.38) }}
    >
      {member ? initials(member.name) : 'T'}
    </span>
  )
}
