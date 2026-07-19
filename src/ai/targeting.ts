import type { Board, Coord, Ship } from '../engine/types'
import { isSearchParityCell } from './parity'

/**
 * AI targeting (SPEC §6).
 *
 * `selectShot` is a PURE, DETERMINISTIC function of the board's observable
 * state: the `shots` fired against it plus each ship's `hits`/sunk status.
 * The AI holds no persistent mode state; its next shot is recomputed from
 * scratch each turn. All ties are broken by a fixed ordering: lowest `row`,
 * then lowest `col` (§6).
 */

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

function inBounds(coord: Coord, board: Board): boolean {
  return (
    coord.row >= 0 &&
    coord.row < board.height &&
    coord.col >= 0 &&
    coord.col < board.width
  )
}

/** A ship is sunk when all its cells have been hit. */
function isSunk(ship: Ship): boolean {
  return ship.hits.length >= ship.size
}

/**
 * "Unresolved hits": hit cells that do NOT belong to an already-sunk ship
 * (SPEC §6.1). Because ships may not touch (§3.1), at most one ship can
 * have unresolved hits at any time.
 */
function unresolvedHits(board: Board): Coord[] {
  const hits: Coord[] = []
  for (const ship of board.ships) {
    if (isSunk(ship)) continue
    for (const hit of ship.hits) hits.push(hit)
  }
  return hits
}

function coordKey(coord: Coord): string {
  return `${coord.row},${coord.col}`
}

function makeFiredSet(board: Board): Set<string> {
  return new Set(board.shots.map(coordKey))
}

const ORTHOGONAL: readonly Coord[] = [
  { row: -1, col: 0 },
  { row: 1, col: 0 },
  { row: 0, col: -1 },
  { row: 0, col: 1 },
]

/** Search mode (§6.1): fire the lowest parity cell not yet fired upon. */
function searchShot(board: Board, fired: Set<string>): Coord | null {
  const candidates: Coord[] = []
  for (let row = 0; row < board.height; row++) {
    for (let col = 0; col < board.width; col++) {
      const coord = { row, col }
      if (!isSearchParityCell(coord)) continue
      if (fired.has(coordKey(coord))) continue
      candidates.push(coord)
    }
  }
  return pickByTieBreak(candidates)
}

/** Hunt mode (§6.2): probe the orthogonal neighbors of a single hit. */
function huntShot(hit: Coord, board: Board, fired: Set<string>): Coord | null {
  const candidates: Coord[] = []
  for (const delta of ORTHOGONAL) {
    const coord = { row: hit.row + delta.row, col: hit.col + delta.col }
    if (!inBounds(coord, board)) continue
    if (fired.has(coordKey(coord))) continue
    candidates.push(coord)
  }
  return pickByTieBreak(candidates)
}

/**
 * Find a maximal collinear group (>=2 cells sharing a row or column) among
 * the unresolved hits. Because a single un-sunk ship's hits are always
 * collinear, this identifies that ship's axis while ignoring any stray,
 * non-collinear hit.
 */
function findCollinearLine(
  hits: readonly Coord[],
): { axis: 'row' | 'col'; line: Coord[] } | null {
  const byRow = new Map<number, Coord[]>()
  const byCol = new Map<number, Coord[]>()
  for (const hit of hits) {
    const r = byRow.get(hit.row) ?? []
    r.push(hit)
    byRow.set(hit.row, r)
    const c = byCol.get(hit.col) ?? []
    c.push(hit)
    byCol.set(hit.col, c)
  }

  let best: { axis: 'row' | 'col'; line: Coord[] } | null = null
  const consider = (axis: 'row' | 'col', line: Coord[]): void => {
    if (line.length < 2) return
    if (
      best === null ||
      line.length > best.line.length ||
      (line.length === best.line.length &&
        compareCoords(pickByTieBreak(line)!, pickByTieBreak(best.line)!) < 0)
    ) {
      best = { axis, line }
    }
  }
  for (const line of byRow.values()) consider('row', line)
  for (const line of byCol.values()) consider('col', line)
  return best
}

/** Target mode (§6.3): fire at the open ends of a locked collinear line. */
function targetShot(
  line: Coord[],
  axis: 'row' | 'col',
  board: Board,
  fired: Set<string>,
): Coord | null {
  const values = line.map((c) => (axis === 'row' ? c.col : c.row))
  const min = Math.min(...values)
  const max = Math.max(...values)
  const fixed = axis === 'row' ? line[0].row : line[0].col

  const ends: Coord[] =
    axis === 'row'
      ? [
          { row: fixed, col: min - 1 },
          { row: fixed, col: max + 1 },
        ]
      : [
          { row: min - 1, col: fixed },
          { row: max + 1, col: fixed },
        ]

  const candidates = ends.filter(
    (coord) => inBounds(coord, board) && !fired.has(coordKey(coord)),
  )
  return pickByTieBreak(candidates)
}

/**
 * Choose the AI's next shot against the given board (SPEC §6).
 *
 * Modes are evaluated in order each turn and derived purely from board
 * state: target (2+ collinear unresolved hits) → hunt (one unresolved hit)
 * → search (no unresolved hits). On a sink, hits become resolved and the AI
 * cleanly returns to search (§6.4). Never returns an already-fired coord.
 */
export function selectShot(board: Board): Coord {
  const fired = makeFiredSet(board)
  const hits = unresolvedHits(board)

  if (hits.length >= 2) {
    const collinear = findCollinearLine(hits)
    if (collinear) {
      const shot = targetShot(collinear.line, collinear.axis, board, fired)
      if (shot) return shot
    }
    // Line ends exhausted: fall back to probing every unresolved hit.
    const huntCandidates = hits
      .map((hit) => huntShot(hit, board, fired))
      .filter((c): c is Coord => c !== null)
    const hunt = pickByTieBreak(huntCandidates)
    if (hunt) return hunt
  } else if (hits.length === 1) {
    const shot = huntShot(hits[0], board, fired)
    if (shot) return shot
  }

  const search = searchShot(board, fired)
  if (search) return search

  // No parity cell left: fire the lowest remaining unfired cell.
  const anyCell: Coord[] = []
  for (let row = 0; row < board.height; row++) {
    for (let col = 0; col < board.width; col++) {
      if (!fired.has(coordKey({ row, col }))) anyCell.push({ row, col })
    }
  }
  const fallback = pickByTieBreak(anyCell)
  if (fallback) return fallback

  throw new Error('selectShot: no unfired cell available')
}
