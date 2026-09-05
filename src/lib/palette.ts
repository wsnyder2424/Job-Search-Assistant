import { Color } from 'three'
import type { IslandKind } from '../content'

/* ============================================================================
 *  Every island derives its building palette from its single `accent` hex in
 *  content.ts. The walls stay near-neutral and pick up only a hint of the
 *  accent, so the district reads as tinted rather than as a colour swatch —
 *  and so the one accent-coloured landmark still lands as a landmark.
 * ========================================================================== */

const NEUTRALS: Record<IslandKind, string[]> = {
  'case-study': ['#e6e1d8', '#d4cdc2', '#c2bab0', '#b0a99f', '#f0ece5'],
  about: ['#efe6d8', '#e3d4be', '#d6c3a8', '#c9b294', '#f5efe4'],
  accolades: ['#eee9dc', '#e2dccb', '#d3ccb9', '#f2eee2', '#e8e2d2'],
  resume: ['#e4e6e8', '#d2d6da', '#c0c5cb', '#eef0f2', '#b6bcc3'],
}

const ROOFS: Record<IslandKind, string> = {
  'case-study': '#8c8880',
  about: '#a8635a',
  accolades: '#7f8a78',
  resume: '#7c848c',
}

export interface IslandPalette {
  /** Five wall shades, sampled by each building's `shade` value. */
  walls: Color[]
  roof: Color
  accent: Color
  /** Grass / plateau surface. */
  land: Color
  /** The beach ring at the waterline. */
  sand: Color
  road: Color
}

export function makePalette(kind: IslandKind, accentHex: string): IslandPalette {
  const accent = new Color(accentHex)
  const walls = NEUTRALS[kind].map((hex) => {
    const c = new Color(hex)
    // A 12% pull toward the accent: enough to unify a district, not enough to shout.
    return c.lerp(accent, 0.12)
  })

  const roof = new Color(ROOFS[kind]).lerp(accent, 0.22)

  const landBase = kind === 'resume' ? '#9aa88c' : kind === 'accolades' ? '#7fa86e' : '#8fae7c'
  const land = new Color(landBase).lerp(accent, 0.07)
  const sand = new Color('#e6d6ae').lerp(accent, 0.06)
  const road = new Color('#b9b3a8').lerp(accent, 0.05)

  return { walls, roof, accent, land, sand, road }
}

export const TREE_FOLIAGE = ['#4f7d4a', '#5c8c50', '#446b41', '#68985a']
export const TREE_TRUNK = '#6b5138'
