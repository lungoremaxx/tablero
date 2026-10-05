import type { Hue } from '../data/types'

export interface HueColors {
  /** texto sobre fondo oscuro */
  fg: string
  /** fondo tenue (etiquetas, avatares) */
  bg: string
  /** color pleno (barras, anillos) */
  solid: string
}

export const HUES: Record<Hue, HueColors> = {
  coral: { fg: '#F9A88E', bg: '#3B2A24', solid: '#F47A55' },
  violet: { fg: '#C4B5FD', bg: '#2A2340', solid: '#A78BFA' },
  blue: { fg: '#93C5FD', bg: '#1B2A40', solid: '#60A5FA' },
  teal: { fg: '#5EEAD4', bg: '#16302D', solid: '#2DD4BF' },
  red: { fg: '#FCA5A5', bg: '#3A1F1F', solid: '#F87171' },
  green: { fg: '#86EFAC', bg: '#14301F', solid: '#4ADE80' },
  amber: { fg: '#FCD34D', bg: '#3A2E12', solid: '#FBBF24' },
}

export const ACCENTS = ['#F47A55', '#60A5FA', '#4ADE80', '#A78BFA']

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}
