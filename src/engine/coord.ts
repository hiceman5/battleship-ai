/**
 * Pure coordinate and adjacency helpers.
 *
 * No React, no DOM: this module only manipulates {@link Coord} values.
 */
import type { Coord } from './types'

/** The fixed board dimensions for v1 (SPEC §1: a 10×10 grid). */
export const BOARD_WIDTH = 10
export const BOARD_HEIGHT = 10

/** True when `coord` lies inside a `width`×`height` grid. */
export function inBounds(
  coord: Coord,
  width: number = BOARD_WIDTH,
  height: number = BOARD_HEIGHT,
): boolean {
  return (
    coord.row >= 0 && coord.row < height && coord.col >= 0 && coord.col < width
  )
}

/** True when two coordinates refer to the same cell. */
export function coordEquals(a: Coord, b: Coord): boolean {
  return a.row === b.row && a.col === b.col
}

/**
 * The four orthogonally adjacent cells (up/down/left/right).
 *
 * Purely geometric — results are not filtered to the board; callers filter
 * with {@link inBounds} as needed.
 */
export function orthogonalNeighbors(coord: Coord): Coord[] {
  const { row, col } = coord
  return [
    { row: row - 1, col },
    { row: row + 1, col },
    { row, col: col - 1 },
    { row, col: col + 1 },
  ]
}

/**
 * The up-to-eight king-move adjacent cells (orthogonal + diagonal).
 *
 * Used to enforce the no-touch rule (SPEC §3.1). Purely geometric — not
 * filtered to the board.
 */
export function kingNeighbors(coord: Coord): Coord[] {
  const { row, col } = coord
  const result: Coord[] = []
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue
      result.push({ row: row + dr, col: col + dc })
    }
  }
  return result
}
