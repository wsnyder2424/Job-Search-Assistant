import { Color } from 'three'

/* ============================================================================
 *  The day/night engine.
 *
 *  `env` is a module-level mutable singleton, deliberately outside React. The
 *  scene reads it inside useFrame and mutates materials directly, so dragging
 *  the time slider costs zero React re-renders — which is the difference
 *  between a smooth 60fps scrub and a slideshow.
 * ========================================================================== */

export interface Keyframe {
  t: number
  skyTop: string
  skyBottom: string
  sun: string
  sunIntensity: number
  /** Degrees above the horizon. Drives shadow length. */
  sunElevation: number
  sunAzimuth: number
  ambient: string
  ambientIntensity: number
  ground: string
  waterShallow: string
  waterDeep: string
  fog: string
  fogDensity: number
  /** 0 = full day, 1 = full night. Drives window emissives. */
  night: number
}

/**
 * Keyframes around the clock. t is normalised time-of-day:
 * 0 = midnight, 0.25 = 6am, 0.5 = noon, 0.75 = 6pm.
 */
const KEYFRAMES: Keyframe[] = [
  {
    t: 0.0,
    skyTop: '#070d1c', skyBottom: '#132133', sun: '#9fb6e4', sunIntensity: 0.62,
    sunElevation: 34, sunAzimuth: 40, ambient: '#34486f', ambientIntensity: 0.72,
    ground: '#2b3a4d', waterShallow: '#16283f', waterDeep: '#0a1523',
    fog: '#0d1728', fogDensity: 0.0075, night: 1,
  },
  {
    t: 0.21,
    skyTop: '#2d3f6b', skyBottom: '#8a6d84', sun: '#f0a37a', sunIntensity: 0.75,
    sunElevation: 8, sunAzimuth: 95, ambient: '#5b6b96', ambientIntensity: 0.7,
    ground: '#5e6f6a', waterShallow: '#3f5570', waterDeep: '#1e2f47',
    fog: '#6b6480', fogDensity: 0.0068, night: 0.72,
  },
  {
    t: 0.3,
    skyTop: '#5f95cf', skyBottom: '#d4b79c', sun: '#ffd2a1', sunIntensity: 1.55,
    sunElevation: 22, sunAzimuth: 108, ambient: '#9db4d4', ambientIntensity: 0.85,
    ground: '#87a37c', waterShallow: '#598bab', waterDeep: '#2c5573',
    fog: '#b5c6d6', fogDensity: 0.0042, night: 0.2,
  },
  {
    t: 0.5,
    skyTop: '#6fb0e8', skyBottom: '#cfe6f4', sun: '#fff6e4', sunIntensity: 2.35,
    sunElevation: 56, sunAzimuth: 140, ambient: '#c5dcf0', ambientIntensity: 1.0,
    ground: '#93b184', waterShallow: '#63a8c8', waterDeep: '#2f6e93',
    fog: '#d6e8f4', fogDensity: 0.0032, night: 0,
  },
  {
    t: 0.7,
    skyTop: '#5a8fc8', skyBottom: '#e8b98b', sun: '#ffcf96', sunIntensity: 1.85,
    sunElevation: 26, sunAzimuth: 208, ambient: '#b7bfd4', ambientIntensity: 0.88,
    ground: '#94a173', waterShallow: '#5f92b0', waterDeep: '#2d5c7c',
    fog: '#dcc3ae', fogDensity: 0.0044, night: 0.12,
  },
  {
    t: 0.79,
    skyTop: '#3a4a7d', skyBottom: '#e08a63', sun: '#ff9a5c', sunIntensity: 1.0,
    sunElevation: 7, sunAzimuth: 232, ambient: '#6f7ba6', ambientIntensity: 0.72,
    ground: '#6b7060', waterShallow: '#456a8a', waterDeep: '#1f3a55',
    fog: '#9c7d84', fogDensity: 0.0062, night: 0.55,
  },
  {
    t: 0.87,
    skyTop: '#101a33', skyBottom: '#2c2f4e', sun: '#9fb6e4', sunIntensity: 0.58,
    sunElevation: 20, sunAzimuth: 250, ambient: '#3a4d75', ambientIntensity: 0.75,
    ground: '#38455a', waterShallow: '#1d3149', waterDeep: '#0c1a2b',
    fog: '#141f36', fogDensity: 0.0072, night: 0.95,
  },
  {
    t: 1.0,
    skyTop: '#070d1c', skyBottom: '#132133', sun: '#9fb6e4', sunIntensity: 0.62,
    sunElevation: 34, sunAzimuth: 300, ambient: '#34486f', ambientIntensity: 0.72,
    ground: '#2b3a4d', waterShallow: '#16283f', waterDeep: '#0a1523',
    fog: '#0d1728', fogDensity: 0.0075, night: 1,
  },
]

export interface EnvState {
  /** Normalised time of day, 0–1. */
  time: number
  /** True until the visitor grabs the slider; drives the slow ambient drift. */
  auto: boolean
  /** Seconds of real time for one full day. */
  dayLength: number
  night: number
  sunIntensity: number
  ambientIntensity: number
  fogDensity: number
  skyTop: Color
  skyBottom: Color
  sun: Color
  ambient: Color
  ground: Color
  waterShallow: Color
  waterDeep: Color
  fog: Color
  sunPosition: [number, number, number]
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/** Shortest-path interpolation for the two angle keyframes. */
const lerpAngle = (a: number, b: number, t: number) => {
  let d = ((b - a + 540) % 360) - 180
  return a + d * t
}

const scratchA = new Color()
const scratchB = new Color()

export const env: EnvState = {
  time: 0.72,
  auto: true,
  dayLength: 210,
  night: 0,
  sunIntensity: 1,
  ambientIntensity: 1,
  fogDensity: 0.004,
  skyTop: new Color(),
  skyBottom: new Color(),
  sun: new Color(),
  ambient: new Color(),
  ground: new Color(),
  waterShallow: new Color(),
  waterDeep: new Color(),
  fog: new Color(),
  sunPosition: [0, 0, 0],
}

/** Recompute every derived colour and light value from `env.time`. */
export function updateEnv(): void {
  const t = ((env.time % 1) + 1) % 1

  let i = 0
  while (i < KEYFRAMES.length - 2 && KEYFRAMES[i + 1].t <= t) i++
  const a = KEYFRAMES[i]
  const b = KEYFRAMES[i + 1]
  const span = b.t - a.t
  const k = span <= 0 ? 0 : (t - a.t) / span
  // Smoothstep so transitions ease rather than snap at each keyframe.
  const e = k * k * (3 - 2 * k)

  const mix = (from: string, to: string, out: Color) => {
    scratchA.set(from)
    scratchB.set(to)
    out.copy(scratchA).lerp(scratchB, e)
  }

  mix(a.skyTop, b.skyTop, env.skyTop)
  mix(a.skyBottom, b.skyBottom, env.skyBottom)
  mix(a.sun, b.sun, env.sun)
  mix(a.ambient, b.ambient, env.ambient)
  mix(a.ground, b.ground, env.ground)
  mix(a.waterShallow, b.waterShallow, env.waterShallow)
  mix(a.waterDeep, b.waterDeep, env.waterDeep)
  mix(a.fog, b.fog, env.fog)

  env.night = lerp(a.night, b.night, e)
  env.sunIntensity = lerp(a.sunIntensity, b.sunIntensity, e)
  env.ambientIntensity = lerp(a.ambientIntensity, b.ambientIntensity, e)
  env.fogDensity = lerp(a.fogDensity, b.fogDensity, e)

  const elev = (lerp(a.sunElevation, b.sunElevation, e) * Math.PI) / 180
  const azi = (lerpAngle(a.sunAzimuth, b.sunAzimuth, e) * Math.PI) / 180
  const d = 90
  env.sunPosition[0] = Math.cos(elev) * Math.sin(azi) * d
  env.sunPosition[1] = Math.sin(elev) * d
  env.sunPosition[2] = Math.cos(elev) * Math.cos(azi) * d
}

updateEnv()

/** Human-readable clock for the slider label. */
export function formatTime(t: number): string {
  const total = ((t % 1) + 1) % 1 * 24 * 60
  const h24 = Math.floor(total / 60)
  const m = Math.floor(total % 60)
  const suffix = h24 < 12 ? 'am' : 'pm'
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`
}
