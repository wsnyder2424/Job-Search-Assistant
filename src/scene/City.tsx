import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { accolades } from '../content'
import { buildArchipelago } from '../lib/layout'
import type { Quality } from '../lib/quality'
import { env, updateEnv } from '../lib/env'
import { Ocean } from './Ocean'
import { Lighting } from './Lighting'
import { Island } from './Island'
import { Bridges } from './Bridges'
import { Ferries } from './Ferries'
import { Plane } from './Plane'
import { Labels } from './Labels'
import { CameraRig } from './CameraRig'

/** Advances the clock and recomputes every derived colour, once per frame. */
function EnvDriver() {
  useFrame((_, delta) => {
    if (env.auto) env.time = (env.time + delta / env.dayLength) % 1
    updateEnv()
  })
  return null
}

export function City({ quality }: { quality: Quality }) {
  const world = useMemo(() => buildArchipelago(accolades.length), [])
  const resumeIsland = useMemo(
    () => world.islands.find((i) => i.kind === 'resume') ?? null,
    [world.islands],
  )

  return (
    <>
      <EnvDriver />
      <CameraRig world={world} />
      <Lighting quality={quality} extent={world.extent} />
      <Ocean quality={quality} />
      <Bridges bridges={world.bridges} quality={quality} />
      {world.islands.map((island) => (
        <Island key={island.id} island={island} quality={quality} />
      ))}
      <Ferries routes={world.ferryRoutes} quality={quality} />
      <Plane island={resumeIsland} />
      <Labels islands={world.islands} />
    </>
  )
}
