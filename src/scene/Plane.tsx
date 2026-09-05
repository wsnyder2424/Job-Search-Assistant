import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group, Mesh, Vector3 } from 'three'
import { LAND_HEIGHT, type PlacedIsland } from '../lib/layout'
import { flight } from '../store'
import { env } from '../lib/env'
import type { MeshStandardMaterial } from 'three'

/* ============================================================================
 *  The resume leaves by plane.
 *
 *  Parked at the threshold until someone downloads the PDF, then it rolls the
 *  length of the runway, rotates, and climbs out along a bezier that carries it
 *  into the fog. Roughly 13 seconds door to door.
 * ========================================================================== */

const FLIGHT_DURATION = 13
const ROLL_FRACTION = 0.15

const start = new Vector3()
const end = new Vector3()
const ctrl = new Vector3()
const far = new Vector3()
const p = new Vector3()
const pNext = new Vector3()

function bezier(a: number, out: Vector3) {
  const inv = 1 - a
  out.set(0, 0, 0)
    .addScaledVector(end, inv * inv)
    .addScaledVector(ctrl, 2 * inv * a)
    .addScaledVector(far, a * a)
}

export function Plane({ island }: { island: PlacedIsland | null }) {
  const group = useRef<Group>(null)
  const prop = useRef<Mesh>(null)

  const geometry = useMemo(() => {
    if (!island?.runway) return null
    const { x, z, rot, length } = island.runway
    const half = length * 0.95
    const dx = Math.cos(rot)
    const dz = Math.sin(rot)
    const groundY = LAND_HEIGHT + 0.45

    start.set(island.cx + x - dx * half, groundY, island.cz + z - dz * half)
    end.set(island.cx + x + dx * half, groundY, island.cz + z + dz * half)

    // Straight ahead first, then a long, shallow turn as it climbs out.
    const turned = rot + 0.34
    ctrl.set(end.x + dx * 150, groundY + 46, end.z + dz * 150)
    far.set(end.x + Math.cos(turned) * 330, groundY + 105, end.z + Math.sin(turned) * 330)

    return { start: start.clone(), end: end.clone(), rot, groundY, half }
  }, [island])

  useFrame((state, delta) => {
    const g = group.current
    if (!g || !geometry) return

    const now = state.clock.elapsedTime
    const started = flight.startedAt
    const elapsed = started < 0 ? -1 : performance.now() / 1000 - started

    if (elapsed < 0 || elapsed > FLIGHT_DURATION) {
      // Parked, nose down the runway.
      g.position.copy(geometry.start)
      g.rotation.set(0, -geometry.rot, 0)
      if (prop.current) prop.current.rotation.z += delta * 3
      return
    }

    const e = elapsed / FLIGHT_DURATION

    if (e < ROLL_FRACTION) {
      // Ground roll, accelerating.
      const k = e / ROLL_FRACTION
      const s = k * k
      g.position.lerpVectors(geometry.start, geometry.end, s)
      g.rotation.set(0, -geometry.rot, 0)
    } else {
      const a = (e - ROLL_FRACTION) / (1 - ROLL_FRACTION)
      bezier(a, p)
      bezier(Math.min(a + 0.01, 1), pNext)
      g.position.copy(p)

      const heading = Math.atan2(pNext.x - p.x, pNext.z - p.z)
      const climb = Math.atan2(pNext.y - p.y, Math.hypot(pNext.x - p.x, pNext.z - p.z))
      g.rotation.set(0, 0, 0)
      g.rotation.y = heading - Math.PI / 2
      // Bank into the turn, easing out as it levels off.
      g.rotation.z = -Math.min(a * 3, 1) * 0.42 * (1 - a * 0.5)
      g.rotation.x = -climb * 0.6
    }

    if (prop.current) prop.current.rotation.z += delta * 42
    // Blink the navigation light harder once it's dark out.
    const nav = g.getObjectByName('nav') as Mesh | undefined
    if (nav) {
      const m = nav.material as MeshStandardMaterial
      m.emissiveIntensity = (Math.sin(now * 6) > 0.6 ? 4 : 0.2) * (0.3 + env.night)
    }
  })

  if (!geometry) return null

  return (
    <group ref={group} scale={0.85}>
      {/* Fuselage */}
      <mesh castShadow rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.34, 0.22, 3.6, 8]} />
        <meshStandardMaterial color="#f4f1ea" roughness={0.45} metalness={0.15} />
      </mesh>
      {/* Nose */}
      <mesh position={[1.9, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[0.34, 0.6, 8]} />
        <meshStandardMaterial color="#d95f7a" roughness={0.5} />
      </mesh>
      {/* Propeller */}
      <mesh ref={prop} position={[2.24, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[0.08, 2.3, 0.14]} />
        <meshStandardMaterial color="#3d3f45" roughness={0.6} />
      </mesh>
      {/* Wings */}
      <mesh castShadow position={[0.15, 0.12, 0]}>
        <boxGeometry args={[1.1, 0.1, 5.4]} />
        <meshStandardMaterial color="#e9e4d8" roughness={0.5} metalness={0.1} />
      </mesh>
      {/* Tailplane */}
      <mesh position={[-1.5, 0.1, 0]}>
        <boxGeometry args={[0.6, 0.08, 2]} />
        <meshStandardMaterial color="#e9e4d8" roughness={0.5} />
      </mesh>
      {/* Fin */}
      <mesh position={[-1.6, 0.55, 0]}>
        <boxGeometry args={[0.7, 0.9, 0.09]} />
        <meshStandardMaterial color="#d95f7a" roughness={0.5} />
      </mesh>
      {/* Navigation light */}
      <mesh name="nav" position={[0.15, 0.2, 2.7]}>
        <sphereGeometry args={[0.12, 8, 6]} />
        <meshStandardMaterial color="#ffffff" emissive="#ff5c5c" emissiveIntensity={1} roughness={0.3} />
      </mesh>
    </group>
  )
}
