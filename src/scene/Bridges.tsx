import { useMemo } from 'react'
import { Color } from 'three'
import type { Bridge } from '../lib/layout'
import type { Quality } from '../lib/quality'

/**
 * Slim causeways between neighbouring islands. They do the narrative work of
 * saying "these places belong to the same person".
 */
export function Bridges({ bridges, quality }: { bridges: Bridge[]; quality: Quality }) {
  const deckColor = useMemo(() => new Color('#cdc6b8'), [])
  const pylonColor = useMemo(() => new Color('#a9a294'), [])

  return (
    <group>
      {bridges.map((b, i) => {
        const dx = b.b.x - b.a.x
        const dz = b.b.z - b.a.z
        const length = Math.hypot(dx, dz)
        const heading = Math.atan2(dz, dx)
        const midX = (b.a.x + b.b.x) / 2
        const midZ = (b.a.z + b.b.z) / 2

        const pylonCount = Math.max(2, Math.floor(length / 7))

        return (
          <group key={i} position={[midX, 0, midZ]} rotation={[0, -heading, 0]}>
            {/* Deck */}
            <mesh position={[0, 1.05, 0]} castShadow={quality.shadows} receiveShadow={quality.shadows}>
              <boxGeometry args={[length, 0.32, 2.5]} />
              <meshStandardMaterial color={deckColor} roughness={0.9} />
            </mesh>

            {/* Railings */}
            <mesh position={[0, 1.42, 1.16]}>
              <boxGeometry args={[length, 0.42, 0.12]} />
              <meshStandardMaterial color={pylonColor} roughness={0.85} />
            </mesh>
            <mesh position={[0, 1.42, -1.16]}>
              <boxGeometry args={[length, 0.42, 0.12]} />
              <meshStandardMaterial color={pylonColor} roughness={0.85} />
            </mesh>

            {/* Pylons down into the water */}
            {Array.from({ length: pylonCount }, (_, p) => {
              const t = (p + 0.5) / pylonCount - 0.5
              return (
                <mesh key={p} position={[t * length * 0.92, -0.4, 0]} castShadow={quality.shadows}>
                  <boxGeometry args={[0.6, 3.2, 1.5]} />
                  <meshStandardMaterial color={pylonColor} roughness={0.95} />
                </mesh>
              )
            })}
          </group>
        )
      })}
    </group>
  )
}
