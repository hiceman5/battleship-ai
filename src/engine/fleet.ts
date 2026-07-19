/**
 * Fleet definition and ship-level geometry / status helpers (pure).
 */
import { Orientation, ShipType } from './types'
import type { Coord, Ship } from './types'
import { coordEquals } from './coord'

/** A single class in the standard fleet and its length (SPEC §2). */
export type FleetEntry = {
  readonly type: ShipType
  readonly size: number
}

/**
 * The five ships every player fields, one of each class (SPEC §2).
 * Total occupied cells: 17. Ordered largest-first, which is also a
 * convenient placement order for {@link generateRandomLayout}.
 */
export const FLEET: readonly FleetEntry[] = [
  { type: ShipType.Carrier, size: 5 },
  { type: ShipType.Battleship, size: 4 },
  { type: ShipType.Cruiser, size: 3 },
  { type: ShipType.Submarine, size: 3 },
  { type: ShipType.Destroyer, size: 2 },
]

/** Total number of occupied cells across a full fleet (SPEC §2: 17). */
export const FLEET_CELL_COUNT = FLEET.reduce((sum, e) => sum + e.size, 0)

/**
 * The cells a ship occupies, derived from its origin, orientation and size
 * (SPEC §3.1). `origin` is the top-left-most cell.
 */
export function cellsFor(ship: Ship): Coord[] {
  const cells: Coord[] = []
  for (let i = 0; i < ship.size; i++) {
    if (ship.orientation === Orientation.Horizontal) {
      cells.push({ row: ship.origin.row, col: ship.origin.col + i })
    } else {
      cells.push({ row: ship.origin.row + i, col: ship.origin.col })
    }
  }
  return cells
}

/**
 * True when every cell of the ship has been hit (SPEC §5): `Ship.hits`
 * covers the full ship.
 */
export function isSunk(ship: Ship): boolean {
  return cellsFor(ship).every((cell) =>
    ship.hits.some((hit) => coordEquals(hit, cell)),
  )
}
