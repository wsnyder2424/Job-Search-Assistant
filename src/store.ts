import { create } from 'zustand'
import { islands } from './content'

export type Phase = 'loading' | 'intro' | 'live'

interface CityState {
  phase: Phase
  /** Island id, or null when nothing is focused. */
  selected: string | null
  hovered: string | null
  /** True while the camera is animating; input is handed back when it settles. */
  transitioning: boolean
  setPhase: (phase: Phase) => void
  select: (id: string | null) => void
  hover: (id: string | null) => void
  setTransitioning: (v: boolean) => void
  toast: string | null
  showToast: (message: string) => void
}

/**
 * The plane's takeoff is driven from outside React so the scene never
 * re-renders to start an animation.
 */
export const flight = { startedAt: -1 }
export const launchPlane = () => {
  flight.startedAt = performance.now() / 1000
}

const validId = (id: string | null) =>
  id && islands.some((i) => i.id === id) ? id : null

/** Read the deep link on first load: yoursite.com/#/harbor-scheduling */
const idFromHash = (): string | null => {
  if (typeof window === 'undefined') return null
  const raw = window.location.hash.replace(/^#\/?/, '').trim()
  return validId(raw || null)
}

const writeHash = (id: string | null) => {
  if (typeof window === 'undefined') return
  const next = id ? `#/${id}` : ' '
  if (id) {
    if (window.location.hash !== next) window.history.replaceState(null, '', next)
  } else if (window.location.hash) {
    window.history.replaceState(null, '', window.location.pathname + window.location.search)
  }
}

export const useCity = create<CityState>((set) => ({
  phase: 'loading',
  selected: idFromHash(),
  hovered: null,
  transitioning: false,
  setPhase: (phase) => set({ phase }),
  select: (id) => {
    const next = validId(id)
    writeHash(next)
    set({ selected: next, transitioning: true })
  },
  hover: (id) => set({ hovered: validId(id) }),
  setTransitioning: (transitioning) => set({ transitioning }),
  toast: null,
  showToast: (message) => {
    set({ toast: message })
    window.setTimeout(() => {
      if (useCity.getState().toast === message) set({ toast: null })
    }, 4200)
  },
}))

/** Keep browser back/forward working with the deep links. */
if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', () => {
    const id = idFromHash()
    if (useCity.getState().selected !== id) {
      useCity.setState({ selected: id, transitioning: true })
    }
  })
}
