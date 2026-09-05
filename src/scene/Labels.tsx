import { Html } from '@react-three/drei'
import { LAND_HEIGHT, type PlacedIsland } from '../lib/layout'
import { useCity } from '../store'

/**
 * Floating island labels. They are real <button> elements in the DOM, so the
 * whole city is reachable by keyboard and legible to a screen reader even
 * though the world itself is a canvas.
 */
export function Labels({ islands }: { islands: PlacedIsland[] }) {
  const selected = useCity((s) => s.selected)
  const hovered = useCity((s) => s.hovered)
  const phase = useCity((s) => s.phase)
  const select = useCity((s) => s.select)
  const hover = useCity((s) => s.hover)

  return (
    <>
      {islands.map((island) => {
        const isSelected = selected === island.id
        const dimmed = selected !== null && !isSelected
        const tallest = island.buildings.reduce((m, b) => Math.max(m, b.h), 4)

        return (
          <Html
            key={island.id}
            position={[island.cx, LAND_HEIGHT + tallest + 3.4, island.cz]}
            center
            zIndexRange={[40, 0]}
            style={{ pointerEvents: dimmed ? 'none' : 'auto' }}
          >
            <button
              type="button"
              className="island-label"
              data-kind={island.kind}
              data-active={hovered === island.id || isSelected}
              data-dimmed={dimmed}
              data-hidden={phase !== 'live'}
              style={{ ['--accent' as string]: island.accent }}
              onClick={(e) => { e.stopPropagation(); select(island.id) }}
              onPointerEnter={() => hover(island.id)}
              onPointerLeave={() => hover(null)}
              onFocus={() => hover(island.id)}
              onBlur={() => hover(null)}
            >
              <span className="island-label__pin" aria-hidden="true" />
              <span className="island-label__text">
                <span className="island-label__name">{island.name}</span>
                <span className="island-label__sub">{island.subtitle}</span>
              </span>
            </button>
          </Html>
        )
      })}
    </>
  )
}
