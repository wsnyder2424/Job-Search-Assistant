import { CatmullRomCurve3, Vector2, Vector3 } from 'three'
import { islands, type Island, type IslandKind } from '../content'
import { makeRng } from './rng'

/* ============================================================================
 *  Procedural layout of the archipelago.
 *
 *  Everything here is a pure function of `content.ts` plus each island's seed,
 *  so the world is identical on every load but reshapes the moment you edit
 *  the content file.
 * ========================================================================== */

/** Distance from the lagoon centre to each island's centre. */
export const RING_RADIUS = 36
/** Height of the island plateau above sea level (sea sits at y = 0). */
export const LAND_HEIGHT = 1.15
/**
 * How far back the orthographic camera sits. Distance has no effect on scale
 * under an ortho projection, but it does set the view-space depth of the whole
 * world — which is what fog is measured against, so the two must agree.
 */
export const CAMERA_DISTANCE = 200

export type BuildingType = 'tower' | 'block' | 'house' | 'pavilion'

export interface Building {
  x: number
  z: number
  w: number
  d: number
  h: number
  rot: number
  type: BuildingType
  /** 0–1, picks a shade from the island's palette ramp. */
  shade: number
  /** The one accent-coloured landmark per island. */
  signature: boolean
}

export interface Prop {
  x: number
  z: number
  scale: number
  rot: number
}

export interface Monument {
  x: number
  z: number
  height: number
  rot: number
}

export interface PlacedIsland extends Island {
  index: number
  /** World-space centre. */
  cx: number
  cz: number
  angle: number
  radius: number
  /** Radial outline function — the island's coastline. */
  outline: (theta: number) => number
  /** Cached polygon for building the extruded landmass. */
  shapePoints: Vector2[]
  buildings: Building[]
  trees: Prop[]
  monuments: Monument[]
  /** Resume island only: runway centre + heading. */
  runway: { x: number; z: number; rot: number; length: number } | null
  /** Where the camera parks when this island is selected. */
  focus: { position: Vector3; target: Vector3; zoom: number }
}

export interface Bridge {
  from: number
  to: number
  a: Vector3
  b: Vector3
}

const TAU = Math.PI * 2

function makeOutline(radius: number, seed: number) {
  const rng = makeRng(seed ^ 0x9e37)
  const h = [
    { f: 2, a: rng.range(0.05, 0.1), p: rng.range(0, TAU) },
    { f: 3, a: rng.range(0.04, 0.09), p: rng.range(0, TAU) },
    { f: 5, a: rng.range(0.02, 0.05), p: rng.range(0, TAU) },
  ]
  return (theta: number) => {
    let m = 1
    for (const { f, a, p } of h) m += a * Math.sin(theta * f + p)
    return radius * m
  }
}

function buildingProfile(kind: IslandKind) {
  switch (kind) {
    case 'case-study':
      // Dense downtown: tall in the middle, falling away to the shore.
      return { count: 34, minH: 2.2, maxH: 13, centreBias: 2.1, types: ['tower', 'block'] as BuildingType[] }
    case 'about':
      // A low, old, walkable quarter.
      return { count: 26, minH: 1.4, maxH: 3.4, centreBias: 0.5, types: ['house'] as BuildingType[] }
    case 'accolades':
      // Mostly parkland; a handful of pavilions at the rim.
      return { count: 9, minH: 1.2, maxH: 2.6, centreBias: -1.4, types: ['pavilion'] as BuildingType[] }
    case 'resume':
      // An airfield: a couple of hangars, nothing tall near the runway.
      return { count: 11, minH: 1.6, maxH: 4.2, centreBias: -1.1, types: ['block', 'pavilion'] as BuildingType[] }
  }
}

function placeBuildings(island: Island, radius: number, outline: (t: number) => number): Building[] {
  const rng = makeRng(island.seed)
  const profile = buildingProfile(island.kind)
  const out: Building[] = []

  // Rejection-sample on a jittered grid, keeping a minimum separation so
  // buildings never intersect.
  const attempts = profile.count * 26
  const minGap = island.kind === 'about' ? 2.5 : 2.9
  const keepOutRadius = island.kind === 'accolades' || island.kind === 'resume' ? radius * 0.5 : 0

  for (let i = 0; i < attempts && out.length < profile.count; i++) {
    const theta = rng() * TAU
    // sqrt keeps the distribution even rather than clustered at the centre.
    const dist = Math.sqrt(rng()) * radius * 0.82
    if (dist < keepOutRadius) continue

    const x = Math.cos(theta) * dist
    const z = Math.sin(theta) * dist
    if (dist > outline(theta) - 3.4) continue

    let clear = true
    for (const b of out) {
      if ((b.x - x) ** 2 + (b.z - z) ** 2 < minGap ** 2) { clear = false; break }
    }
    if (!clear) continue

    const type = rng.pick(profile.types)
    const t = 1 - dist / radius
    const bias = Math.pow(Math.max(t, 0), 1.6) * profile.centreBias
    const h = Math.min(
      profile.maxH,
      Math.max(profile.minH, rng.range(profile.minH, profile.maxH * 0.55) + bias * rng.range(1.4, 3.2)),
    )

    const footprint = type === 'tower' ? rng.range(1.5, 2.2) : rng.range(1.9, 2.9)
    out.push({
      x, z,
      w: footprint,
      d: footprint * rng.range(0.8, 1.25),
      h: h * island.weight,
      // Snap rotation to a loose grid so the district reads as planned, not scattered.
      rot: Math.round(rng() * 4) * (Math.PI / 2) + rng.range(-0.13, 0.13),
      type,
      shade: rng(),
      signature: false,
    })
  }

  // The tallest building becomes the island's accent-coloured landmark.
  if (out.length && island.kind === 'case-study') {
    let tallest = 0
    for (let i = 1; i < out.length; i++) if (out[i].h > out[tallest].h) tallest = i
    out[tallest].signature = true
    out[tallest].h *= 1.22
  }
  return out
}

function placeTrees(island: Island, radius: number, outline: (t: number) => number, buildings: Building[]): Prop[] {
  const rng = makeRng(island.seed ^ 0x51ed)
  const count = island.kind === 'accolades' ? 44 : island.kind === 'about' ? 30 : 16
  const out: Prop[] = []
  for (let i = 0; i < count * 18 && out.length < count; i++) {
    const theta = rng() * TAU
    const dist = Math.sqrt(rng()) * radius * 0.9
    const x = Math.cos(theta) * dist
    const z = Math.sin(theta) * dist
    if (dist > outline(theta) - 1.6) continue
    let clear = true
    for (const b of buildings) {
      if ((b.x - x) ** 2 + (b.z - z) ** 2 < 2.6 ** 2) { clear = false; break }
    }
    if (!clear) continue
    for (const p of out) {
      if ((p.x - x) ** 2 + (p.z - z) ** 2 < 1.7 ** 2) { clear = false; break }
    }
    if (!clear) continue
    out.push({ x, z, scale: rng.range(0.75, 1.35), rot: rng() * TAU })
  }
  return out
}

/** One monument per accolade, arranged along a spiral in the park. */
function placeMonuments(island: Island, radius: number, count: number): Monument[] {
  if (island.kind !== 'accolades' || count === 0) return []
  const rng = makeRng(island.seed ^ 0x2b7c)
  const out: Monument[] = []
  for (let i = 0; i < count; i++) {
    const theta = (i / count) * TAU + 0.4
    const dist = radius * (0.14 + (i / Math.max(count - 1, 1)) * 0.24)
    out.push({
      x: Math.cos(theta) * dist,
      z: Math.sin(theta) * dist,
      height: rng.range(3.2, 5.4),
      rot: rng() * TAU,
    })
  }
  return out
}

function buildIsland(island: Island, index: number, count: number, accoladeCount: number): PlacedIsland {
  const jitter = makeRng(island.seed ^ 0x77af)
  const angle = (index / count) * TAU - Math.PI / 2 + jitter.range(-0.05, 0.05)
  const ringR = RING_RADIUS + jitter.range(-2.6, 2.6)
  const cx = Math.cos(angle) * ringR
  const cz = Math.sin(angle) * ringR
  const radius = 8.2 * island.weight

  const outline = makeOutline(radius, island.seed)

  const shapePoints: Vector2[] = []
  const SEGMENTS = 72
  for (let i = 0; i < SEGMENTS; i++) {
    const t = (i / SEGMENTS) * TAU
    const r = outline(t)
    shapePoints.push(new Vector2(Math.cos(t) * r, Math.sin(t) * r))
  }

  const buildings = placeBuildings(island, radius, outline)
  const trees = placeTrees(island, radius, outline, buildings)
  const monuments = placeMonuments(island, radius, accoladeCount)

  const runway =
    island.kind === 'resume'
      // Heading points radially outward so the departure is out over open
      // water rather than a low pass across the other islands.
      ? { x: 0, z: 0, rot: angle, length: radius * 0.6 }
      : null

  // Park the camera outside the ring looking back in, so a focused island is
  // framed against the lagoon rather than against the empty sea.
  const inward = new Vector3(-Math.cos(angle), 0, -Math.sin(angle))
  const camDir = new Vector3(0.72, 0.82, 0.72).normalize()
  const target = new Vector3(cx + inward.x * radius * 0.1, LAND_HEIGHT + 2.4, cz + inward.z * radius * 0.1)
  const focus = {
    position: target.clone().add(camDir.multiplyScalar(CAMERA_DISTANCE)),
    target,
    zoom: 26 / island.weight,
  }

  return {
    ...island,
    index, cx, cz, angle, radius, outline, shapePoints,
    buildings, trees, monuments, runway, focus,
  }
}

function buildBridges(placed: PlacedIsland[]): Bridge[] {
  const out: Bridge[] = []
  const n = placed.length
  if (n < 2) return out
  for (let i = 0; i < n; i++) {
    const a = placed[i]
    const b = placed[(i + 1) % n]
    if (n === 2 && i === 1) break

    const dx = b.cx - a.cx
    const dz = b.cz - a.cz
    const heading = Math.atan2(dz, dx)
    const ra = a.outline(heading) - 0.6
    const rb = b.outline(heading + Math.PI) - 0.6

    out.push({
      from: i,
      to: (i + 1) % n,
      a: new Vector3(a.cx + Math.cos(heading) * ra, 0.5, a.cz + Math.sin(heading) * ra),
      b: new Vector3(b.cx - Math.cos(heading) * rb, 0.5, b.cz - Math.sin(heading) * rb),
    })
  }
  return out
}

/** Closed loops the ferries trace: one through the lagoon, one out at sea. */
function buildFerryRoutes(placed: PlacedIsland[]): CatmullRomCurve3[] {
  const avgR = placed.reduce((s, i) => s + i.radius, 0) / Math.max(placed.length, 1)
  const routes: CatmullRomCurve3[] = []
  const rings = [
    { r: RING_RADIUS - avgR - 7.5, wobble: 2.2, seed: 11 },
    { r: RING_RADIUS + avgR + 9.5, wobble: 3.4, seed: 29 },
  ]
  for (const { r, wobble, seed } of rings) {
    const rng = makeRng(seed)
    const pts: Vector3[] = []
    for (let i = 0; i < 12; i++) {
      const t = (i / 12) * TAU
      const rr = r + rng.range(-wobble, wobble)
      pts.push(new Vector3(Math.cos(t) * rr, 0, Math.sin(t) * rr))
    }
    routes.push(new CatmullRomCurve3(pts, true, 'catmullrom', 0.4))
  }
  return routes
}

export interface Archipelago {
  islands: PlacedIsland[]
  bridges: Bridge[]
  ferryRoutes: CatmullRomCurve3[]
  /** Radius that contains the whole world — used to clamp panning. */
  extent: number
}

export function buildArchipelago(accoladeCount: number): Archipelago {
  const placed = islands.map((island, i) => buildIsland(island, i, islands.length, accoladeCount))
  const extent = placed.reduce((m, i) => Math.max(m, Math.hypot(i.cx, i.cz) + i.radius), 0)
  return {
    islands: placed,
    bridges: buildBridges(placed),
    ferryRoutes: buildFerryRoutes(placed),
    extent,
  }
}
