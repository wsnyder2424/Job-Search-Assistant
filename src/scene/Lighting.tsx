import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Fog, type DirectionalLight, type HemisphereLight, type AmbientLight } from 'three'
import { env } from '../lib/env'
import { CAMERA_DISTANCE } from '../lib/layout'
import type { Quality } from '../lib/quality'

/**
 * One sun, one hemisphere bounce, one ambient floor — all three driven from
 * `env` every frame so the day/night slider moves light, colour and shadow
 * length together.
 */
export function Lighting({ quality, extent }: { quality: Quality; extent: number }) {
  const sun = useRef<DirectionalLight>(null)
  const hemi = useRef<HemisphereLight>(null)
  const ambient = useRef<AmbientLight>(null)
  const scene = useThree((s) => s.scene)
  const fog = useRef<Fog | null>(null)

  if (!fog.current) {
    fog.current = new Fog(env.fog.getHex(), CAMERA_DISTANCE + 30, CAMERA_DISTANCE + 330)
    scene.fog = fog.current
  }

  useFrame(() => {
    if (sun.current) {
      sun.current.position.set(...env.sunPosition)
      sun.current.color.copy(env.sun)
      sun.current.intensity = env.sunIntensity
    }
    if (hemi.current) {
      hemi.current.color.copy(env.skyTop)
      hemi.current.groundColor.copy(env.ground)
      hemi.current.intensity = env.ambientIntensity
    }
    if (ambient.current) {
      ambient.current.color.copy(env.ambient)
      // Lift the ambient floor at night so the city never goes fully black.
      ambient.current.intensity = 0.18 + env.night * 0.34
    }
    if (fog.current) {
      fog.current.color.copy(env.fog)
      // Belt and braces: if the sea plane's edge ever enters frame, the void
      // behind it is the same colour as the haze in front of it.
      scene.background = fog.current.color
      // Exponential fog would swamp the scene: under an ortho projection every
      // object sits ~CAMERA_DISTANCE deep, so fog has to start beyond that and
      // only bite on the open sea past the islands. `fogDensity` survives from
      // the keyframes purely as a haze amount — mistier at dawn, dusk and night.
      const haze = Math.min(Math.max((env.fogDensity - 0.003) / 0.0045, 0), 1)
      fog.current.near = CAMERA_DISTANCE + 30 - haze * 18
      fog.current.far = CAMERA_DISTANCE + 330 - haze * 165
    }
  })

  const s = extent * 1.2

  return (
    <>
      <ambientLight ref={ambient} intensity={0.2} />
      <hemisphereLight ref={hemi} intensity={0.9} />
      <directionalLight
        ref={sun}
        castShadow={quality.shadows}
        shadow-mapSize-width={quality.shadowMapSize}
        shadow-mapSize-height={quality.shadowMapSize}
        shadow-camera-left={-s}
        shadow-camera-right={s}
        shadow-camera-top={s}
        shadow-camera-bottom={-s}
        shadow-camera-near={1}
        shadow-camera-far={320}
        shadow-bias={-0.0012}
        shadow-normalBias={0.05}
      />
    </>
  )
}
