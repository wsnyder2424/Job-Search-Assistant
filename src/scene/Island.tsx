import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  BoxGeometry,
  Color,
  ConeGeometry,
  DoubleSide,
  ExtrudeGeometry,
  InstancedBufferAttribute,
  InstancedMesh,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Shape,
  ShapeGeometry,
  Vector2,
} from 'three'
import { LAND_HEIGHT, type PlacedIsland } from '../lib/layout'
import { makePalette, TREE_FOLIAGE, TREE_TRUNK } from '../lib/palette'
import { getWindowTexture } from '../lib/textures'
import { env } from '../lib/env'
import { useCity } from '../store'
import type { Quality } from '../lib/quality'
import { makeRng } from '../lib/rng'

/* ============================================================================
 *  One island: extruded landmass, beach, foam ring, instanced skyline, and
 *  whatever landmark its `kind` calls for.
 * ========================================================================== */

/** World units covered by one tile of the window texture. */
const WINDOW_TILE_W = 4.8
const WINDOW_TILE_H = 8.8

const dummy = new Object3D()
const scratchColor = new Color()

function shapeFrom(points: Vector2[], scale = 1): Shape {
  const shape = new Shape()
  points.forEach((p, i) => {
    const x = p.x * scale
    const y = p.y * scale
    if (i === 0) shape.moveTo(x, y)
    else shape.lineTo(x, y)
  })
  shape.closePath()
  return shape
}

/**
 * Patches a standard material so each instance can scale its own emissive-map
 * UVs. Without this a 13-unit tower and a 2-unit shed show the same number of
 * window rows, which instantly reads as fake.
 */
function enableInstancedWindowUvs(material: MeshStandardMaterial) {
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
         attribute vec2 aUvScale;
         varying vec2 vUvScaleV;`,
      )
      .replace(
        '#include <uv_vertex>',
        `#include <uv_vertex>
         vUvScaleV = aUvScale;`,
      )

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
         varying vec2 vUvScaleV;`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#ifdef USE_EMISSIVEMAP
           vec4 emissiveColorInst = texture2D( emissiveMap, vEmissiveMapUv * vUvScaleV );
           totalEmissiveRadiance *= emissiveColorInst.rgb;
         #endif`,
      )
  }
  material.customProgramCacheKey = () => 'instanced-window-uvs'
}

export function Island({ island, quality }: { island: PlacedIsland; quality: Quality }) {
  const select = useCity((s) => s.select)
  const hover = useCity((s) => s.hover)

  const palette = useMemo(() => makePalette(island.kind, island.accent), [island.kind, island.accent])

  /* ---------------------------------------------------------------- land -- */

  const { landGeometry, sandGeometry, foamGeometry } = useMemo(() => {
    const land = new ExtrudeGeometry(shapeFrom(island.shapePoints), {
      depth: 5.5,
      bevelEnabled: true,
      bevelThickness: 0.45,
      bevelSize: 0.5,
      bevelSegments: 2,
    })
    const sand = new ExtrudeGeometry(shapeFrom(island.shapePoints, 1.075), {
      depth: 3.5,
      bevelEnabled: true,
      bevelThickness: 0.3,
      bevelSize: 0.35,
      bevelSegments: 1,
    })

    // Foam is the ring between the beach edge and slightly further out.
    const foamShape = shapeFrom(island.shapePoints, 1.19)
    foamShape.holes.push(shapeFrom(island.shapePoints, 1.055))
    const foam = new ShapeGeometry(foamShape, 1)

    return { landGeometry: land, sandGeometry: sand, foamGeometry: foam }
  }, [island.shapePoints])

  /* ----------------------------------------------------------- buildings -- */

  const boxes = useRef<InstancedMesh>(null)
  const pyramids = useRef<InstancedMesh>(null)

  const pyramidBuildings = useMemo(
    () => island.buildings.filter((b) => b.type === 'house' || b.type === 'pavilion'),
    [island.buildings],
  )

  const wallMaterial = useMemo(() => {
    const m = new MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.82,
      metalness: 0.02,
      emissive: new Color('#ffb35e'),
      emissiveMap: getWindowTexture(),
      emissiveIntensity: 0,
    })
    enableInstancedWindowUvs(m)
    return m
  }, [])

  const roofMaterial = useMemo(
    () => new MeshStandardMaterial({ color: palette.roof, roughness: 0.9, metalness: 0 }),
    [palette.roof],
  )

  const pyramidMaterial = useMemo(
    () => new MeshStandardMaterial({ color: palette.roof, roughness: 0.88, metalness: 0 }),
    [palette.roof],
  )

  const boxGeometry = useMemo(() => new BoxGeometry(1, 1, 1), [])
  const pyramidGeometry = useMemo(() => {
    const g = new ConeGeometry(0.72, 1, 4, 1)
    g.rotateY(Math.PI / 4)
    return g
  }, [])

  // BoxGeometry group order is +x, -x, +y, -y, +z, -z — so index 2 and 3 are
  // the roof and the underside, which must never grow windows.
  const boxMaterials = useMemo(
    () => [wallMaterial, wallMaterial, roofMaterial, roofMaterial, wallMaterial, wallMaterial],
    [wallMaterial, roofMaterial],
  )

  useLayoutEffect(() => {
    const mesh = boxes.current
    if (!mesh) return

    const uvScales = new Float32Array(island.buildings.length * 2)

    island.buildings.forEach((b, i) => {
      dummy.position.set(b.x, LAND_HEIGHT + b.h / 2, b.z)
      dummy.rotation.set(0, b.rot, 0)
      dummy.scale.set(b.w, b.h, b.d)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)

      const shade = palette.walls[Math.floor(b.shade * palette.walls.length) % palette.walls.length]
      mesh.setColorAt(i, b.signature ? scratchColor.copy(palette.accent) : scratchColor.copy(shade))

      uvScales[i * 2] = Math.max(b.w / WINDOW_TILE_W, 0.2)
      uvScales[i * 2 + 1] = Math.max(b.h / WINDOW_TILE_H, 0.18)
    })

    mesh.geometry.setAttribute('aUvScale', new InstancedBufferAttribute(uvScales, 2))
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [island.buildings, palette])

  useLayoutEffect(() => {
    const mesh = pyramids.current
    if (!mesh) return
    pyramidBuildings.forEach((b, i) => {
      const roofH = b.type === 'house' ? b.h * 0.42 : b.h * 0.34
      dummy.position.set(b.x, LAND_HEIGHT + b.h + roofH / 2, b.z)
      dummy.rotation.set(0, b.rot, 0)
      dummy.scale.set(b.w * 1.28, roofH, b.d * 1.28)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [pyramidBuildings])

  /* --------------------------------------------------------------- trees -- */

  const foliage = useRef<InstancedMesh>(null)
  const trunks = useRef<InstancedMesh>(null)
  const trees = quality.trees ? island.trees : island.trees.slice(0, Math.ceil(island.trees.length / 3))

  useLayoutEffect(() => {
    const f = foliage.current
    const t = trunks.current
    if (!f || !t) return
    const rng = makeRng(island.seed ^ 0xbeef)
    trees.forEach((p, i) => {
      const h = 2.1 * p.scale
      dummy.position.set(p.x, LAND_HEIGHT + 0.35 + h / 2, p.z)
      dummy.rotation.set(0, p.rot, 0)
      dummy.scale.set(p.scale, p.scale, p.scale)
      dummy.updateMatrix()
      f.setMatrixAt(i, dummy.matrix)
      f.setColorAt(i, scratchColor.set(rng.pick(TREE_FOLIAGE)))

      dummy.position.set(p.x, LAND_HEIGHT + 0.28 * p.scale, p.z)
      dummy.scale.set(p.scale, p.scale, p.scale)
      dummy.updateMatrix()
      t.setMatrixAt(i, dummy.matrix)
    })
    f.instanceMatrix.needsUpdate = true
    if (f.instanceColor) f.instanceColor.needsUpdate = true
    t.instanceMatrix.needsUpdate = true
    f.computeBoundingSphere()
    t.computeBoundingSphere()
  }, [trees, island.seed])

  /* ---------------------------------------------------------- animation -- */

  const foam = useRef<Mesh>(null)
  const groupRef = useRef<Object3D>(null)

  useFrame((state) => {
    // Windows light up as the sun goes down.
    wallMaterial.emissiveIntensity = Math.pow(env.night, 1.35) * 2.1

    if (foam.current) {
      const t = state.clock.elapsedTime
      const m = foam.current.material as MeshStandardMaterial
      m.opacity = 0.3 + Math.sin(t * 0.9 + island.seed) * 0.09
      const s = 1 + Math.sin(t * 0.55 + island.seed * 0.3) * 0.012
      foam.current.scale.set(s, s, 1)
    }

    // A gentle bob so the island reads as floating rather than pasted on.
    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.42 + island.index) * 0.055
    }
  })

  /* ------------------------------------------------------------ landmark -- */

  const landmark = useIslandLandmark(island, palette)

  return (
    <group position={[island.cx, 0, island.cz]}>
      <group ref={groupRef}>
        {/* Invisible but raycastable: the whole island is one click target. */}
        <mesh
          position={[0, LAND_HEIGHT + 3, 0]}
          onPointerOver={(e) => { e.stopPropagation(); hover(island.id) }}
          onPointerOut={(e) => { e.stopPropagation(); hover(null) }}
          onClick={(e) => { e.stopPropagation(); select(island.id) }}
        >
          <cylinderGeometry args={[island.radius * 1.04, island.radius * 1.04, 12, 20]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
        </mesh>

        {/* Beach */}
        <mesh
          geometry={sandGeometry}
          rotation={[Math.PI / 2, 0, 0]}
          position={[0, 0.28, 0]}
          receiveShadow={quality.shadows}
        >
          <meshStandardMaterial color={palette.sand} roughness={1} />
        </mesh>

        {/* Plateau */}
        <mesh
          geometry={landGeometry}
          rotation={[Math.PI / 2, 0, 0]}
          position={[0, LAND_HEIGHT, 0]}
          receiveShadow={quality.shadows}
          castShadow={quality.shadows}
        >
          <meshStandardMaterial color={palette.land} roughness={0.95} />
        </mesh>

        {/* Shoreline foam */}
        <mesh ref={foam} geometry={foamGeometry} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, 0]}>
          <meshStandardMaterial
            color="#ffffff"
            transparent
            opacity={0.3}
            roughness={1}
            depthWrite={false}
            side={DoubleSide}
          />
        </mesh>

        {/* Skyline */}
        <instancedMesh
          ref={boxes}
          args={[boxGeometry, undefined, island.buildings.length]}
          material={boxMaterials}
          castShadow={quality.shadows}
          receiveShadow={quality.shadows}
        />
        {pyramidBuildings.length > 0 && (
          <instancedMesh
            ref={pyramids}
            args={[pyramidGeometry, pyramidMaterial, pyramidBuildings.length]}
            castShadow={quality.shadows}
          />
        )}

        {/* Trees */}
        {trees.length > 0 && (
          <>
            <instancedMesh ref={trunks} args={[undefined, undefined, trees.length]} castShadow={false}>
              <cylinderGeometry args={[0.11, 0.15, 0.6, 5]} />
              <meshStandardMaterial color={TREE_TRUNK} roughness={1} />
            </instancedMesh>
            <instancedMesh
              ref={foliage}
              args={[undefined, undefined, trees.length]}
              castShadow={quality.shadows}
            >
              <coneGeometry args={[0.95, 2.1, 6]} />
              <meshStandardMaterial color="#ffffff" roughness={0.95} />
            </instancedMesh>
          </>
        )}

        {landmark}
      </group>
    </group>
  )
}

/* ========================================================================== */
/*  Per-kind landmarks                                                         */
/* ========================================================================== */

function useIslandLandmark(island: PlacedIsland, palette: ReturnType<typeof makePalette>) {
  const monumentMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        color: palette.accent,
        roughness: 0.4,
        metalness: 0.25,
        emissive: new Color(palette.accent),
        emissiveIntensity: 0,
      }),
    [palette.accent],
  )

  const stripes = useRef<InstancedMesh>(null)
  const beaconRef = useRef<Mesh>(null)

  useLayoutEffect(() => {
    const mesh = stripes.current
    if (!mesh || !island.runway) return
    const count = 9
    for (let i = 0; i < count; i++) {
      const t = (i / (count - 1) - 0.5) * island.runway.length * 1.62
      dummy.position.set(
        island.runway.x + Math.cos(island.runway.rot) * t,
        LAND_HEIGHT + 0.19,
        island.runway.z + Math.sin(island.runway.rot) * t,
      )
      dummy.rotation.set(0, -island.runway.rot, 0)
      dummy.scale.set(1.5, 1, 0.3)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
  }, [island.runway])

  useFrame((state) => {
    monumentMaterial.emissiveIntensity = env.night * 1.6
    if (beaconRef.current) {
      const m = beaconRef.current.material as MeshStandardMaterial
      // A rotating beacon that only matters once it's dark.
      const pulse = (Math.sin(state.clock.elapsedTime * 2.2) * 0.5 + 0.5) ** 2
      m.emissiveIntensity = 0.4 + pulse * 3.4 * (0.25 + env.night)
    }
  })

  if (island.kind === 'accolades') {
    return (
      <group>
        {island.monuments.map((m, i) => (
          <group key={i} position={[m.x, LAND_HEIGHT, m.z]} rotation={[0, m.rot, 0]}>
            <mesh castShadow position={[0, 0.3, 0]}>
              <boxGeometry args={[1.7, 0.6, 1.7]} />
              <meshStandardMaterial color={palette.walls[0]} roughness={0.9} />
            </mesh>
            <mesh castShadow position={[0, 0.6 + m.height / 2, 0]} material={monumentMaterial}>
              <cylinderGeometry args={[0.16, 0.55, m.height, 4]} />
            </mesh>
            <mesh position={[0, 0.6 + m.height + 0.35, 0]} material={monumentMaterial}>
              <octahedronGeometry args={[0.5, 0]} />
            </mesh>
          </group>
        ))}
      </group>
    )
  }

  if (island.kind === 'resume' && island.runway) {
    const { x, z, rot, length } = island.runway
    return (
      <group>
        {/* Runway */}
        <mesh position={[x, LAND_HEIGHT + 0.12, z]} rotation={[0, -rot, 0]} receiveShadow>
          <boxGeometry args={[length * 2.1, 0.24, 3.6]} />
          <meshStandardMaterial color="#4c5057" roughness={0.95} />
        </mesh>
        <instancedMesh ref={stripes} args={[undefined, undefined, 9]}>
          <boxGeometry args={[1, 0.06, 1]} />
          <meshStandardMaterial color="#f2f2ef" roughness={0.85} />
        </instancedMesh>

        {/* Control tower with a night beacon */}
        <group position={[x + Math.cos(rot + Math.PI / 2) * 5.4, LAND_HEIGHT, z + Math.sin(rot + Math.PI / 2) * 5.4]}>
          <mesh castShadow position={[0, 2.2, 0]}>
            <cylinderGeometry args={[0.55, 0.75, 4.4, 8]} />
            <meshStandardMaterial color={palette.walls[0]} roughness={0.8} />
          </mesh>
          <mesh castShadow position={[0, 4.8, 0]}>
            <cylinderGeometry args={[1.15, 1.0, 1.3, 8]} />
            <meshStandardMaterial color={palette.walls[3]} roughness={0.5} metalness={0.15} />
          </mesh>
          <mesh ref={beaconRef} position={[0, 5.8, 0]}>
            <sphereGeometry args={[0.3, 10, 8]} />
            <meshStandardMaterial
              color={palette.accent}
              emissive={palette.accent}
              emissiveIntensity={1}
              roughness={0.3}
            />
          </mesh>
        </group>
      </group>
    )
  }

  if (island.kind === 'about') {
    // A little lighthouse on the point, because every home town has one.
    const a = island.angle + Math.PI
    const r = island.radius * 0.68
    return (
      <group position={[Math.cos(a) * r, LAND_HEIGHT, Math.sin(a) * r]}>
        <mesh castShadow position={[0, 2.4, 0]}>
          <cylinderGeometry args={[0.5, 0.95, 4.8, 10]} />
          <meshStandardMaterial color="#f3ece0" roughness={0.85} />
        </mesh>
        <mesh castShadow position={[0, 5.2, 0]} material={monumentMaterial}>
          <cylinderGeometry args={[0.62, 0.62, 0.9, 10]} />
        </mesh>
        <mesh position={[0, 5.85, 0]}>
          <coneGeometry args={[0.75, 0.7, 10]} />
          <meshStandardMaterial color={palette.roof} roughness={0.8} />
        </mesh>
      </group>
    )
  }

  return null
}
