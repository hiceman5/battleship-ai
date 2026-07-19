import { useCallback, useState } from 'react'
import { Orientation, type Coord, type ShipType } from '@/engine/types'

/**
 * Transient, UI-LOCAL placement state for the Setup phase (SPEC §3.2).
 *
 * This holds ONLY the ephemeral bits the placement UI needs while the human
 * is arranging their fleet: which ship class is selected, the pending
 * orientation, and the hovered/ghost preview cell. None of this is ever part
 * of {@link GameState} or a game rule — only completed, legal placements reach
 * the reducer via `PLACE_SHIP`.
 */
export type PlacementState = {
  /** The ship class the human is about to place, or `null` if none selected. */
  readonly selectedType: ShipType | null
  /** Orientation the pending ship will be placed with. */
  readonly orientation: Orientation
  /** The currently hovered cell used for the ghost preview, or `null`. */
  readonly hover: Coord | null
}

export type PlacementApi = PlacementState & {
  /** Select a ship class to place next. */
  readonly selectShip: (type: ShipType) => void
  /** Toggle the pending orientation between Horizontal and Vertical. */
  readonly rotate: () => void
  /** Set the hovered/ghost preview cell. */
  readonly setHover: (coord: Coord) => void
  /** Clear the hovered/ghost preview cell. */
  readonly clearHover: () => void
  /** Forget the currently selected ship (e.g. after it is placed). */
  readonly clearSelection: () => void
}

/**
 * Hook owning the transient placement UI state (SPEC §3.2). Kept deliberately
 * small: it never dispatches actions and never reads/writes `GameState`.
 */
export function usePlacement(): PlacementApi {
  const [selectedType, setSelectedType] = useState<ShipType | null>(null)
  const [orientation, setOrientation] = useState<Orientation>(
    Orientation.Horizontal,
  )
  const [hover, setHoverState] = useState<Coord | null>(null)

  const selectShip = useCallback((type: ShipType) => {
    setSelectedType(type)
  }, [])

  const rotate = useCallback(() => {
    setOrientation((prev) =>
      prev === Orientation.Horizontal
        ? Orientation.Vertical
        : Orientation.Horizontal,
    )
  }, [])

  const setHover = useCallback((coord: Coord) => {
    setHoverState(coord)
  }, [])

  const clearHover = useCallback(() => {
    setHoverState(null)
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedType(null)
  }, [])

  return {
    selectedType,
    orientation,
    hover,
    selectShip,
    rotate,
    setHover,
    clearHover,
    clearSelection,
  }
}
