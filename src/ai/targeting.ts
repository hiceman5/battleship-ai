import type { Board, Coord, Ship } from '../engine/types'

/**
 * AI targeting — probability-density heat map (this experiment).
 *
 * `selectShot` is a PURE, DETERMINISTIC function of the board's OBSERVABLE
 * state only: the `shots` fired against it plus each ship's `hits`/sunk
 * status and its (publicly known) length. It never peeks at un-fired ship
 * positions. The AI holds no persistent mode state; its next shot is
 * recomputed from scratch each turn.
 *
 * Each turn it builds a heat map by enumerating, for every ship that is not
 * yet sunk, all legal placements consistent with the observable evidence,
 * and firing at the un-fired cell with the maximum density. Because the map
 * derives entirely from evidence, hunt/target behaviour and reset-on-sink
 * fall out naturally: while a ship is wounded the map concentrates on
 * completing it; once it sinks the wound clears and the map reopens to full
 * search. All ties are broken by a fixed ordering: lowest `row`, then lowest
 * `col`.
 */

/** Fixed tie-break: lowest row, then lowest col. */
function compareCoords(a: Coord, b: Coord): number {
  return a.row - b.row || a.col - b.col
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

function coordKey(coord: Coord): string {
  return `${coord.row},${coord.col}`
}

/**
 * Coordinates that have been fired upon and resulted in a MISS: every shot
 * that is not one of some ship's recorded hits.
 */
function missSet(board: Board, fired: Set<string>): Set<string> {
  const hitKeys = new Set<string>()
  for (const ship of board.ships) {
    for (const hit of ship.hits) hitKeys.add(coordKey(hit))
  }
  const misses = new Set<string>()
  for (const key of fired) {
    if (!hitKeys.has(key)) misses.add(key)
  }
  return misses
}

/** Coordinates belonging to an already-sunk ship (all of its hit cells). */
function sunkCells(board: Board): Coord[] {
  const cells: Coord[] = []
  for (const ship of board.ships) {
    if (!isSunk(ship)) continue
    for (const hit of ship.hits) cells.push(hit)
  }
  return cells
}

/**
 * Unresolved hits: hit cells that do NOT belong to an already-sunk ship.
 * Because ships may not touch (§3.1), these always belong to a single
 * wounded ship, so the map naturally concentrates on completing it.
 */
function unresolvedHits(board: Board): Coord[] {
  const hits: Coord[] = []
  for (const ship of board.ships) {
    if (isSunk(ship)) continue
    for (const hit of ship.hits) hits.push(hit)
  }
  return hits
}

/**
 * Enumerate the cells of one placement of `size` at `origin` with the given
 * orientation, or `null` if it runs off the board.
 */
function placementCells(
  origin: Coord,
  size: number,
  horizontal: boolean,
  board: Board,
): Coord[] | null {
  const cells: Coord[] = []
  for (let i = 0; i < size; i++) {
    const coord = horizontal
      ? { row: origin.row, col: origin.col + i }
      : { row: origin.row + i, col: origin.col }
    if (!inBounds(coord, board)) return null
    cells.push(coord)
  }
  return cells
}

/**
 * Accumulate probability density for every ship that is not yet sunk by
 * enumerating all evidence-consistent placements and, for each, incrementing
 * the heat of every covered cell that has not yet been fired.
 *
 * A placement is consistent when it: stays in bounds; covers no missed cell;
 * covers no cell of an already-sunk ship and never touches one (ships may not
 * touch, §3.1); and — when there are unresolved hits — covers ALL of them, so
 * the map focuses on finishing the wounded ship.
 */
function buildHeatMap(board: Board, fired: Set<string>): number[][] {
  const misses = missSet(board, fired)
  const sunk = sunkCells(board)
  const sunkKeys = new Set(sunk.map(coordKey))
  // No-touch buffer: cells king-adjacent to a sunk ship cannot hold a ship.
  const buffer = new Set<string>()
  for (const cell of sunk) {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue
        const c = { row: cell.row + dr, col: cell.col + dc }
        if (inBounds(c, board) && !sunkKeys.has(coordKey(c))) {
          buffer.add(coordKey(c))
        }
      }
    }
  }

  const hits = unresolvedHits(board)
  const hitKeys = new Set(hits.map(coordKey))

  const heat: number[][] = Array.from({ length: board.height }, () =>
    new Array<number>(board.width).fill(0),
  )

  for (const ship of board.ships) {
    if (isSunk(ship)) continue
    for (const horizontal of [true, false]) {
      const maxRow = horizontal ? board.height - 1 : board.height - ship.size
      const maxCol = horizontal ? board.width - ship.size : board.width - 1
      for (let row = 0; row <= maxRow; row++) {
        for (let col = 0; col <= maxCol; col++) {
          const cells = placementCells(
            { row, col },
            ship.size,
            horizontal,
            board,
          )
          if (cells === null) continue

          let legal = true
          let coversAllHits = true
          for (const cell of cells) {
            const key = coordKey(cell)
            if (misses.has(key) || sunkKeys.has(key) || buffer.has(key)) {
              legal = false
              break
            }
          }
          if (!legal) continue

          if (hitKeys.size > 0) {
            let covered = 0
            for (const cell of cells) {
              if (hitKeys.has(coordKey(cell))) covered++
            }
            coversAllHits = covered === hitKeys.size
          }
          if (!coversAllHits) continue

          for (const cell of cells) {
            if (!fired.has(coordKey(cell))) heat[cell.row][cell.col] += 1
          }
        }
      }
    }
  }

  return heat
}

/**
 * Choose the AI's next shot using the probability-density heat map.
 *
 * Fires at the un-fired cell with the maximum density (fixed tie-break:
 * lowest row, then lowest col). If the map is entirely flat (no consistent
 * placement contributes heat), falls back to the lowest un-fired cell so the
 * function always returns an in-bounds, never-before-fired coordinate.
 */
export function selectShot(board: Board): Coord {
  const fired = new Set(board.shots.map(coordKey))
  const heat = buildHeatMap(board, fired)

  let best: Coord | null = null
  let bestHeat = 0
  for (let row = 0; row < board.height; row++) {
    for (let col = 0; col < board.width; col++) {
      if (fired.has(coordKey({ row, col }))) continue
      if (heat[row][col] > bestHeat) {
        bestHeat = heat[row][col]
        best = { row, col }
      }
    }
  }
  if (best !== null) return best

  // Flat map: fire the lowest un-fired cell by the fixed tie-break.
  let fallback: Coord | null = null
  for (let row = 0; row < board.height; row++) {
    for (let col = 0; col < board.width; col++) {
      const coord = { row, col }
      if (fired.has(coordKey(coord))) continue
      if (fallback === null || compareCoords(coord, fallback) < 0) {
        fallback = coord
      }
    }
  }
  if (fallback !== null) return fallback

  throw new Error('selectShot: no unfired cell available')
}
