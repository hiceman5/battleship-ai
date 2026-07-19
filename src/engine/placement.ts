/**
 * Ship-placement legality and random layout generation (pure).
 */
import { Orientation } from './types'
import type { Board, Coord, Ship } from './types'
import { BOARD_HEIGHT, BOARD_WIDTH, inBounds, kingNeighbors } from './coord'
import { FLEET, cellsFor } from './fleet'

/** An injectable random source returning a float in `[0, 1)` (SPEC §3.3). */
export type Rng = () => number

function key(coord: Coord): string {
  return `${coord.row},${coord.col}`
}

/**
 * True when `ship` may be legally placed on `board` (SPEC §3.1):
 * within bounds, no overlap, and no king-move touching of any existing ship.
 *
 * The ship being tested is matched by `id` and ignored among the board's
 * existing ships, so re-checking an already-placed ship is well-defined.
 */
export function isLegalPlacement(board: Board, ship: Ship): boolean {
  const shipCells = cellsFor(ship)

  // Rule 2: entirely within bounds.
  for (const cell of shipCells) {
    if (!inBounds(cell, board.width, board.height)) return false
  }

  // Occupied cells of every other placed ship.
  const occupied = new Set<string>()
  for (const other of board.ships) {
    if (other.id === ship.id) continue
    for (const cell of cellsFor(other)) occupied.add(key(cell))
  }

  for (const cell of shipCells) {
    // Rule 3: no overlap.
    if (occupied.has(key(cell))) return false
    // Rule 4: no touching (orthogonal or diagonal) — the one-cell buffer.
    for (const neighbor of kingNeighbors(cell)) {
      if (occupied.has(key(neighbor))) return false
    }
  }

  return true
}

/**
 * Produce a uniform random legal full fleet (SPEC §3.3) using the injected
 * RNG. Deterministic for a given `rng`, so tests can pin layouts. Every
 * returned ship satisfies §3.1 and the fleet never touches.
 */
export function generateRandomLayout(
  rng: Rng,
  width: number = BOARD_WIDTH,
  height: number = BOARD_HEIGHT,
): Ship[] {
  const orientations = [Orientation.Horizontal, Orientation.Vertical]
  const MAX_LAYOUT_ATTEMPTS = 1000
  const MAX_SHIP_ATTEMPTS = 1000

  for (let attempt = 0; attempt < MAX_LAYOUT_ATTEMPTS; attempt++) {
    const placed: Ship[] = []
    let ok = true

    for (const entry of FLEET) {
      let shipPlaced = false
      for (let i = 0; i < MAX_SHIP_ATTEMPTS; i++) {
        const orientation =
          orientations[Math.floor(rng() * orientations.length)]
        const row = Math.floor(rng() * height)
        const col = Math.floor(rng() * width)
        const candidate: Ship = {
          id: entry.type,
          type: entry.type,
          size: entry.size,
          origin: { row, col },
          orientation,
          hits: [],
        }
        const boardSoFar: Board = {
          width,
          height,
          cells: [],
          ships: placed,
          shots: [],
        }
        if (isLegalPlacement(boardSoFar, candidate)) {
          placed.push(candidate)
          shipPlaced = true
          break
        }
      }
      if (!shipPlaced) {
        ok = false
        break
      }
    }

    if (ok) return placed
  }

  throw new Error('generateRandomLayout: could not produce a legal layout')
}
