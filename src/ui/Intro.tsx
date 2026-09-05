import { useEffect, useState } from 'react'
import { identity } from '../content'
import { useCity } from '../store'

/**
 * The title card over the opening fly-in. It fades in partway through the
 * camera move and clears itself the moment the visitor takes control.
 */
export function Intro() {
  const phase = useCity((s) => s.phase)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (phase !== 'intro') { setVisible(false); return }
    const id = window.setTimeout(() => setVisible(true), 1500)
    return () => window.clearTimeout(id)
  }, [phase])

  if (phase === 'live') return null

  return (
    <div className="intro" data-visible={visible} aria-hidden={!visible}>
      <div className="intro__card">
        <h1 className="intro__name">{identity.name}</h1>
        <p className="intro__title">{identity.title}</p>
        <p className="intro__tagline">{identity.tagline}</p>
      </div>
      <p className="intro__skip">Click anywhere to skip</p>
    </div>
  )
}
