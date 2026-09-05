import { Suspense, useEffect, useMemo, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { City } from './scene/City'
import { detectQuality } from './lib/quality'
import { useCity } from './store'
import { Panel } from './ui/Panel'
import { Hint, NightDriver, TimeControl, Toast, Wordmark } from './ui/Hud'
import { Intro } from './ui/Intro'

export default function App() {
  const quality = useMemo(() => detectQuality(), [])
  const select = useCity((s) => s.select)
  const hovered = useCity((s) => s.hovered)
  const phase = useCity((s) => s.phase)
  const [ready, setReady] = useState(false)

  // Pointer feedback has to live on the container: the canvas itself has no
  // hover state to hang a cursor off.
  useEffect(() => {
    document.body.dataset.cursor = hovered ? 'pointer' : 'grab'
  }, [hovered])

  return (
    <div className="app" data-phase={phase}>
      <NightDriver />

      <Canvas
        orthographic
        camera={{ position: [180, 200, 180], zoom: 8, near: 0.1, far: 1400 }}
        shadows={quality.shadows}
        dpr={quality.dpr}
        gl={{
          antialias: quality.antialias,
          powerPreference: 'high-performance',
          alpha: false,
        }}
        onCreated={() => setReady(true)}
        onPointerMissed={() => select(null)}
      >
        <Suspense fallback={null}>
          <City quality={quality} />
        </Suspense>
      </Canvas>

      <div className="boot" data-done={ready} aria-hidden="true" />

      <Intro />

      <div className="chrome" data-hidden={phase !== 'live'}>
        <Wordmark />
        <Hint />
        <TimeControl />
      </div>

      <Panel />
      <Toast />
    </div>
  )
}
