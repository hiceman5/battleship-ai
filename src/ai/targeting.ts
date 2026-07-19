import type { Board, Coord } from '../engine/types'
import { isSearchParityCell } from './parity'
import { argMaxCell, densityMap, readEvidence } from './density'
import type { Evidence } from './density'

/**
 * AI targeting — hybrid probability-density + parity strategy.
 *
 * `selectShot` is a PURE, DETERMINISTIC function of the board's OBSERVABLE
 * state only: the `shots` fired against it plus each ship's `hits`/sunk
 * status (never the un-fired ship positions a real opponent cannot see).
 * The AI holds no persistent mode state; every turn it re-derives evidence
 * and recomputes a density heat map from scratch. All ties break by the
 * fixed ordering: lowest `row`, then lowest `col`.
 *
 * Two regimes, chosen purely from whether any hits are unresolved:
 *
 * - TARGETING (unresolved hits exist): score the density map over only the
 *   surviving-ship placements that cover EVERY unresolved hit, and fire the
 *   maximum-density un-fired cell — extending the wounded ship along its most
 *   likely axis.
 * - SEARCH (no unresolved hits): restrict firing candidates to a single
 *   fixed checkerboard parity `((row + col) even)` to roughly halve the
 *   work, compute density over those parity cells, and fire the maximum.
 *
 * On a sink the ship's hits become resolved, so the next turn has no
 * unresolved hits and the AI cleanly returns to parity search (SPEC §6.4).
 */

const ORTHOGONAL: readonly Coord[] = [
  { row: -1, col: 0 },
  { row: 1, col: 0 },
  { row: 0, col: -1 },
  { row: 0, col: 1 },
]

/** Fixed tie-break: lowest row, then lowest col. */
function compareCoords(a: Coord, b: Coord): number {
  return a.row - b.row || a.col - b.col
}

/** The lowest-ordered coord under the fixed tie-break, or null if none. */
function pickByTieBreak(coords: readonly Coord[]): Coord | null {
  let best: Coord | null = null
  for (const c of coords) {
    if (best === null || compareCoords(c, best) < 0) best = c
  }
  return best
}

function inBounds(coord: Coord, evidence: Evidence): boolean {
  return (
    coord.row >= 0 &&
    coord.row < evidence.height &&
    coord.col >= 0 &&
    coord.col < evidence.width
  )
}

function isFired(coord: Coord, evidence: Evidence): boolean {
  return evidence.fired.has(coord.row * evidence.width + coord.col)
}

/** Lowest un-fired parity cell, then any lowest un-fired cell. */
function fallbackSearch(evidence: Evidence): Coord {
  const parity: Coord[] = []
  const any: Coord[] = []
  for (let row = 0; row < evidence.height; row++) {
    for (let col = 0; col < evidence.width; col++) {
      const coord = { row, col }
      if (isFired(coord, evidence)) continue
      any.push(coord)
      if (isSearchParityCell(coord)) parity.push(coord)
    }
  }
  const shot = pickByTieBreak(parity) ?? pickByTieBreak(any)
  if (shot) return shot
  throw new Error('selectShot: no unfired cell available')
}

/** Orthogonal-neighbor probe around every unresolved hit (targeting fallback). */
function neighborProbe(evidence: Evidence): Coord | null {
  const candidates: Coord[] = []
  for (const hit of evidence.unresolved) {
    for (const delta of ORTHOGONAL) {
      const coord = { row: hit.row + delta.row, col: hit.col + delta.col }
      if (!inBounds(coord, evidence)) continue
      if (isFired(coord, evidence)) continue
      candidates.push(coord)
    }
  }
  return pickByTieBreak(candidates)
}

/**
 * Choose the AI's next shot against the given board.
 *
 * Never returns an already-fired or out-of-bounds coordinate, always makes
 * progress, and is fully deterministic.
 */
export function selectShot(board: Board): Coord {
  const evidence = readEvidence(board)

  if (evidence.unresolved.length > 0) {
    // TARGETING: density over placements covering all open hits.
    const map = densityMap(evidence, {
      coverAll: evidence.unresolved,
      restrictParity: false,
    })
    const shot = argMaxCell(map, evidence)
    if (shot) return shot
    // No consistent placement (e.g. contradictory evidence): probe neighbors.
    const probe = neighborProbe(evidence)
    if (probe) return probe
    return fallbackSearch(evidence)
  }

  // SEARCH: parity-restricted density heat map.
  const map = densityMap(evidence, { coverAll: [], restrictParity: true })
  const shot = argMaxCell(map, evidence)
  if (shot) return shot
  return fallbackSearch(evidence)
}
