import type { Coord } from '../engine/types'

/**
 * Search-mode parity for v1 (SPEC §6.1).
 *
 * The AI searches on a single checkerboard parity: cells where
 * `(row + col)` is even. Because the smallest ship (Destroyer, length 2)
 * always spans one cell of each parity, firing at this parity net is
 * guaranteed to eventually strike every ship while firing at roughly
 * half the cells. Parity is fixed at 2 for v1.
 */
export const SEARCH_PARITY = 0 as const

/** True when a coord lies on the search-mode parity net. */
export function isSearchParityCell(coord: Coord): boolean {
  return (coord.row + coord.col) % 2 === SEARCH_PARITY
}
