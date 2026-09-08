import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { OrthographicCamera, Vector3 } from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { CAMERA_DISTANCE, type Archipelago, LAND_HEIGHT } from '../lib/layout'
import { useCity } from '../store'
import { prefersReducedMotion } from '../lib/quality'

/* ============================================================================
 *  Camera choreography.
 *
 *  Three modes share one rig:
 *    intro    — a scripted low pass over the sea that rises into the overview
 *    overview — the whole archipelago, visitor-controlled via OrbitControls
 *    focused  — an island framed beside the open content panel
 *
 *  OrbitControls only takes the wheel once a transition has settled, so the
 *  visitor's own rotation is never fought over by an animation.
 * ========================================================================== */

/** The locked isometric viewing direction. */
const ISO_DIR = new Vector3(0.72, 0.82, 0.72).normalize()
const WORLD_UP = new Vector3(0, 1, 0)
const INTRO_DURATION = 6.2

const tmpTarget = new Vector3()
const tmpPos = new Vector3()
const tmpRight = new Vector3()
const tmpUp = new Vector3()
const tmpForward = new Vector3()

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

export function CameraRig({ world }: { world: Archipelago }) {
  const controls = useRef<OrbitControlsImpl>(null)
  const camera = useThree((s) => s.camera) as OrthographicCamera
  const size = useThree((s) => s.size)

  const phase = useCity((s) => s.phase)
  const selected = useCity((s) => s.selected)
  const transitioning = useCity((s) => s.transitioning)
  const setPhase = useCity((s) => s.setPhase)
  const setTransitioning = useCity((s) => s.setTransitioning)

  const introStart = useRef<number | null>(null)
  const skipped = useRef(false)

  const reduced = useMemo(() => prefersReducedMotion(), [])

  /** Zoom that fits `worldW` x `worldH` world units inside the canvas. */
  const fitZoom = (worldW: number, worldH: number) =>
    Math.min(size.width / worldW, size.height / worldH)

  const overview = useMemo(() => {
    const span = world.extent * 2.05
    const target = new Vector3(0, LAND_HEIGHT, 0)
    return {
      target,
      position: target.clone().addScaledVector(ISO_DIR, CAMERA_DISTANCE),
      zoom: fitZoom(span, span),
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [world.extent, size.width, size.height])

  /**
   * Nudge the framing so a focused island doesn't sit under the content panel:
   * sideways on desktop, upward on the mobile bottom sheet.
   */
  const panelOffset = (zoom: number, out: Vector3) => {
    out.set(0, 0, 0)
    if (!selected) return out

    // right = forward x worldUp, up = right x forward. Getting either cross
    // product backwards pushes the focused island *behind* the panel.
    tmpForward.copy(ISO_DIR).negate()
    tmpRight.copy(tmpForward).cross(WORLD_UP).normalize()
    tmpUp.copy(tmpRight).cross(tmpForward).normalize()

    if (size.width >= 900) {
      const panelPx = Math.min(Math.max(size.width * 0.34, 380), 520)
      out.addScaledVector(tmpRight, (panelPx / 2) / zoom)
    } else {
      const sheetPx = size.height * 0.52
      out.addScaledVector(tmpUp, -(sheetPx / 2) / zoom * 0.85)
    }
    return out
  }

  const desired = useMemo(() => {
    const island = selected ? world.islands.find((i) => i.id === selected) : null
    if (!island) return overview

    const zoom = fitZoom(island.radius * 6.4, island.radius * 5.2)
    const target = new Vector3(island.cx, LAND_HEIGHT + 2.6, island.cz)
    target.add(panelOffset(zoom, tmpTarget))
    return { target, position: target.clone().addScaledVector(ISO_DIR, CAMERA_DISTANCE), zoom }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, overview, world.islands, size.width, size.height])

  /* ------------------------------------------------------------- intro -- */

  useEffect(() => {
    if (phase !== 'loading') return
    if (reduced) {
      // Snap to wherever we should end up — including a deep-linked island —
      // rather than animating there. `desired` is the overview when nothing
      // is selected, so this covers both cases.
      camera.position.copy(desired.position)
      camera.zoom = desired.zoom
      camera.updateProjectionMatrix()
      controls.current?.target.copy(desired.target)
      setPhase('live')
      return
    }
    setPhase('intro')
  }, [phase, reduced, camera, desired, setPhase])

  useEffect(() => {
    if (phase !== 'intro') return
    const skip = () => { skipped.current = true }
    window.addEventListener('pointerdown', skip)
    window.addEventListener('keydown', skip)
    return () => {
      window.removeEventListener('pointerdown', skip)
      window.removeEventListener('keydown', skip)
    }
  }, [phase])

  /* ------------------------------------------------------------- frames -- */

  useFrame((state, delta) => {
    const c = controls.current
    if (!c) return

    if (phase === 'intro') {
      if (introStart.current === null) introStart.current = state.clock.elapsedTime
      const elapsed = state.clock.elapsedTime - introStart.current
      let t = Math.min(elapsed / INTRO_DURATION, 1)
      if (skipped.current) t = Math.min(t + 0.35, 1)

      const e = easeInOutCubic(t)

      // Start out at sea level, swing round, and rise into the overview.
      const startAzimuth = Math.atan2(ISO_DIR.z, ISO_DIR.x) - 1.15
      const azimuth = startAzimuth + 1.15 * e
      const elevation = 0.055 + (ISO_DIR.y - 0.055) * easeOutCubic(t)
      const horiz = Math.sqrt(Math.max(1 - elevation * elevation, 0.0001))

      tmpPos.set(Math.cos(azimuth) * horiz, elevation, Math.sin(azimuth) * horiz).multiplyScalar(CAMERA_DISTANCE)
      tmpTarget.copy(overview.target)
      tmpTarget.y = LAND_HEIGHT + (1 - e) * 1.2

      camera.position.copy(tmpTarget).add(tmpPos)
      c.target.copy(tmpTarget)

      const startZoom = fitZoom(70, 70)
      camera.zoom = startZoom + (overview.zoom - startZoom) * e
      camera.updateProjectionMatrix()
      c.update()

      if (t >= 1) {
        setPhase('live')
        // A deep link arrives with an island already selected but nothing to
        // drive the camera there: `select()` queues the transition, and the
        // hash never calls it. Without this the intro lands on the overview
        // and the panel opens beside an island sitting off to one side.
        setTransitioning(selected !== null)
      }
      return
    }

    if (transitioning) {
      // Critically-damped-ish approach; framerate independent.
      const k = 1 - Math.pow(0.0016, delta)
      camera.position.lerp(desired.position, k)
      c.target.lerp(desired.target, k)
      camera.zoom += (desired.zoom - camera.zoom) * k
      camera.updateProjectionMatrix()
      c.update()

      const settled =
        camera.position.distanceTo(desired.position) < 0.6 &&
        c.target.distanceTo(desired.target) < 0.35 &&
        Math.abs(camera.zoom - desired.zoom) < 0.25
      if (settled) setTransitioning(false)
      return
    }

    // Free look. Keep the visitor from panning off into empty ocean.
    const limit = world.extent * 0.85
    const d = Math.hypot(c.target.x, c.target.z)
    if (d > limit) {
      const scale = limit / d
      const dx = c.target.x * scale - c.target.x
      const dz = c.target.z * scale - c.target.z
      c.target.x += dx
      c.target.z += dz
      camera.position.x += dx
      camera.position.z += dz
    }
    c.update()
  })

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enabled={phase === 'live' && !transitioning}
      enableDamping
      dampingFactor={0.09}
      enablePan
      panSpeed={0.7}
      screenSpacePanning={false}
      rotateSpeed={0.55}
      zoomSpeed={0.8}
      minPolarAngle={0.58}
      maxPolarAngle={1.16}
      minZoom={overview.zoom * 0.55}
      maxZoom={overview.zoom * 7}
    />
  )
}
