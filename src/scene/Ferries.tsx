import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CatmullRomCurve3, Group, MeshStandardMaterial, Vector3 } from 'three'
import { env } from '../lib/env'
import { makeRng } from '../lib/rng'
import type { Quality } from '../lib/quality'

/* ============================================================================
 *  Ferries. They trace two closed loops — one through the lagoon, one out at
 *  sea — bobbing on the same swell frequency as the ocean shader so they never
 *  look like they're skating on glass.
 * ========================================================================== */

interface Boat {
  route: number
  offset: number
  speed: number
  scale: number
}

const pos = new Vector3()
const tan = new Vector3()

/** Mirrors the dominant swell in Ocean.tsx so hulls sit in the water. */
function surfaceHeight(x: number, z: number, t: number): number {
  return (
    Math.sin((x * 1.0 + z * 0.15) * 0.3 + t * 0.85) * 1.0 +
    Math.sin((x * -0.55 + z * 0.84) * 0.52 + t * 1.15) * 0.52
  ) * 0.62
}

export function Ferries({ routes, quality }: { routes: CatmullRomCurve3[]; quality: Quality }) {
  const boats = useMemo<Boat[]>(() => {
    const rng = makeRng(9001)
    return Array.from({ length: quality.ferries }, (_, i) => ({
      route: i % routes.length,
      offset: rng(),
      speed: rng.range(0.008, 0.017),
      scale: rng.range(0.85, 1.3),
    }))
  }, [quality.ferries, routes.length])

  const refs = useRef<(Group | null)[]>([])
  const lampMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        color: '#ffd9a0',
        emissive: '#ffb15e',
        emissiveIntensity: 0,
        roughness: 0.4,
      }),
    [],
  )

  useFrame((state) => {
    const t = state.clock.elapsedTime
    lampMaterial.emissiveIntensity = env.night * 3.2

    boats.forEach((boat, i) => {
      const group = refs.current[i]
      const curve = routes[boat.route]
      if (!group || !curve) return

      const u = (boat.offset + t * boat.speed) % 1
      curve.getPointAt(u, pos)
      curve.getTangentAt(u, tan)

      group.position.set(pos.x, surfaceHeight(pos.x, pos.z, t) + 0.28, pos.z)
      group.rotation.y = Math.atan2(tan.x, tan.z)
      // Roll into the swell.
      group.rotation.z = Math.sin(t * 1.3 + i) * 0.045
      group.rotation.x = Math.sin(t * 0.9 + i * 2.1) * 0.035
    })
  })

  return (
    <group>
      {boats.map((boat, i) => (
        <group
          key={i}
          ref={(el) => { refs.current[i] = el }}
          scale={boat.scale}
        >
          {/* Hull */}
          <mesh castShadow={quality.shadows} position={[0, 0, 0]}>
            <boxGeometry args={[1.5, 0.62, 4]} />
            <meshStandardMaterial color="#e9e4d8" roughness={0.8} />
          </mesh>
          {/* Bow */}
          <mesh position={[0, 0, 2.5]} rotation={[Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.78, 1.3, 4]} />
            <meshStandardMaterial color="#e9e4d8" roughness={0.8} />
          </mesh>
          {/* Cabin */}
          <mesh castShadow={quality.shadows} position={[0, 0.55, -0.4]}>
            <boxGeometry args={[1.1, 0.7, 1.6]} />
            <meshStandardMaterial color="#c85f52" roughness={0.7} />
          </mesh>
          {/* Mast lamp */}
          <mesh position={[0, 1.15, -0.4]} material={lampMaterial}>
            <sphereGeometry args={[0.14, 8, 6]} />
          </mesh>
          {/* Wake */}
          <mesh position={[0, -0.2, -3.4]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[2.4, 6]} />
            <meshStandardMaterial color="#ffffff" transparent opacity={0.16} depthWrite={false} />
          </mesh>
        </group>
      ))}
    </group>
  )
}
