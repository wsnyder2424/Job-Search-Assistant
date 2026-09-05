/* ============================================================================
 *  Device tiering. The city is the same city everywhere — this only decides
 *  how much of it we can afford to draw.
 * ========================================================================== */

export interface Quality {
  tier: 'low' | 'high'
  /** Upper bound on devicePixelRatio. */
  dpr: [number, number]
  shadows: boolean
  shadowMapSize: number
  /** Segment count for the ocean plane. */
  waterSegments: number
  ferries: number
  trees: boolean
  /** Antialias costs real frames on integrated GPUs. */
  antialias: boolean
}

export function detectQuality(): Quality {
  if (typeof window === 'undefined') {
    return { tier: 'high', dpr: [1, 2], shadows: true, shadowMapSize: 2048, waterSegments: 128, ferries: 7, trees: true, antialias: true }
  }

  const coarse = window.matchMedia('(pointer: coarse)').matches
  const narrow = window.innerWidth < 900
  const cores = navigator.hardwareConcurrency ?? 4
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8

  const low = coarse || narrow || cores <= 4 || memory <= 4

  return low
    ? { tier: 'low', dpr: [1, 1.5], shadows: false, shadowMapSize: 1024, waterSegments: 48, ferries: 3, trees: false, antialias: false }
    : { tier: 'high', dpr: [1, 2], shadows: true, shadowMapSize: 2048, waterSegments: 128, ferries: 7, trees: true, antialias: true }
}

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
