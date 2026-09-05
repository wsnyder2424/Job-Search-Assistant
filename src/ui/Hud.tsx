import { useEffect, useRef, useState } from 'react'
import { env, formatTime } from '../lib/env'
import { identity } from '../content'
import { useCity } from '../store'

/* ============================================================================
 *  Everything that floats over the canvas: the wordmark, the time-of-day
 *  control, the wayfinding hint and the toast.
 * ========================================================================== */

/**
 * Pushes the day/night value into CSS custom properties so the interface
 * changes colour with the sky. Runs on rAF and never re-renders React.
 */
export function NightDriver() {
  useEffect(() => {
    let frame = 0
    const root = document.documentElement
    const tick = () => {
      root.style.setProperty('--night', env.night.toFixed(3))
      const mode = env.night > 0.55 ? 'night' : 'day'
      if (root.dataset.mode !== mode) root.dataset.mode = mode
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [])
  return null
}

export function TimeControl() {
  const input = useRef<HTMLInputElement>(null)
  const readout = useRef<HTMLSpanElement>(null)
  const [auto, setAuto] = useState(env.auto)

  useEffect(() => {
    let frame = 0
    const tick = () => {
      if (input.current && document.activeElement !== input.current) {
        input.current.value = String(Math.round(env.time * 1000))
      }
      if (readout.current) readout.current.textContent = formatTime(env.time)
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <div className="timebar">
      <span className="timebar__icon" aria-hidden="true">
        {/* Sun on the left, moon on the right — the slider runs midnight to midnight. */}
        ☀
      </span>
      <label className="timebar__control">
        <span className="visually-hidden">Time of day</span>
        <input
          ref={input}
          type="range"
          min={0}
          max={1000}
          step={1}
          defaultValue={Math.round(env.time * 1000)}
          onInput={(e) => {
            env.time = Number((e.target as HTMLInputElement).value) / 1000
            env.auto = false
            setAuto(false)
          }}
        />
      </label>
      <span className="timebar__icon" aria-hidden="true">☾</span>
      <span ref={readout} className="timebar__readout" aria-live="off">
        {formatTime(env.time)}
      </span>
      <button
        type="button"
        className="timebar__auto"
        data-on={auto}
        aria-pressed={auto}
        onClick={() => { env.auto = !env.auto; setAuto(env.auto) }}
      >
        <span aria-hidden="true">↻</span>
        <span className="visually-hidden">
          {auto ? 'Pause the passage of time' : 'Let time pass on its own'}
        </span>
      </button>
    </div>
  )
}

export function Wordmark() {
  const select = useCity((s) => s.select)
  const selected = useCity((s) => s.selected)

  return (
    <button
      type="button"
      className="wordmark"
      onClick={() => select(null)}
      aria-label={selected ? 'Return to the archipelago' : identity.name}
    >
      <span className="wordmark__name">{identity.name}</span>
      <span className="wordmark__title">{identity.title}</span>
    </button>
  )
}

export function Hint() {
  const phase = useCity((s) => s.phase)
  const selected = useCity((s) => s.selected)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (phase !== 'live') return
    const id = window.setTimeout(() => setDismissed(true), 11000)
    return () => window.clearTimeout(id)
  }, [phase])

  const show = phase === 'live' && !selected && !dismissed

  return (
    <p className="hint" data-show={show}>
      Drag to orbit · scroll to zoom · pick an island
    </p>
  )
}

export function Toast() {
  const toast = useCity((s) => s.toast)
  return (
    <div className="toast" data-open={!!toast} role="status" aria-live="polite">
      {toast}
    </div>
  )
}
