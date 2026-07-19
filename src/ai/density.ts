import type { Board, Coord, Ship } from '../engine/types'

/**
 * Probability-density heat map for the hybrid AI (this task's assigned
 * strategy — see the task brief; it deliberately supersedes SPEC §6/§6.5
 * for this experiment while every other SPEC rule still applies).
 *
 * The map is built PURELY from OBSERVABLE board evidence: the cells that
 * have been fired upon (`board.shots`), split into misses vs. hits via each
 * ship's `hits`, plus sunk-ship status. It never reads the un-fired ship
 * positions (`CellState.Ship`/`shipId`) that a real opponent could not see.
 *
 * For every un-sunk ship we enumerate its legal placements consistent with
 * that evidence and, for each placement, credit every cell it covers. The
 * result is how many surviving-fleet placements pass through each cell — an
 * estimate of where the remaining ships most likely sit.
 */

/** A ship is sunk once all of its cells have been hit. */
function isSunk(ship: Ship): boolean {
  return ship.hits.length >= ship.size
}

/** Observable evidence distilled from the board, used to build the map. */
export type Evidence = {
  readonly width: number
  readonly height: number
  /** Cells already fired upon (numeric `row * width + col` keys). */
  readonly fired: Set<number>
  /**
   * Cells no surviving ship can occupy: confirmed misses plus the cells of
   * ships that are already sunk.
   */
  readonly blocked: Set<number>
  /** Hit cells belonging to ships that are not yet sunk. */
  readonly unresolved: readonly Coord[]
  /** Lengths of the ships still afloat. */
  readonly unsunkSizes: readonly number[]
}

/** Distil a board into the observable evidence the heat map is built from. */
export function readEvidence(board: Board): Evidence {
  const { width, height } = board
  const keyOf = (c: Coord): number => c.row * width + c.col

  const fired = new Set<number>()
  for (const shot of board.shots) fired.add(keyOf(shot))

  const hitKeys = new Set<number>()
  for (const ship of board.ships) {
    for (const hit of ship.hits) hitKeys.add(keyOf(hit))
  }

  const blocked = new Set<number>()
  // A fired cell that is not a hit is a confirmed miss.
  for (const shot of board.shots) {
    const k = keyOf(shot)
    if (!hitKeys.has(k)) blocked.add(k)
  }

  const unresolved: Coord[] = []
  const unsunkSizes: number[] = []
  for (const ship of board.ships) {
    if (isSunk(ship)) {
      // Every cell of a sunk ship is known and cannot host another ship.
      for (const hit of ship.hits) blocked.add(keyOf(hit))
    } else {
      unsunkSizes.push(ship.size)
      for (const hit of ship.hits) unresolved.push(hit)
    }
  }

  return { width, height, fired, blocked, unresolved, unsunkSizes }
}

/**
 * Build the density heat map (`row * width + col` → placement count).
 *
 * When `coverAll` is provided (targeting), only placements that cover ALL of
 * those cells are counted, so the map describes just the surviving ship the
 * open hits belong to. When it is empty (search), every evidence-consistent
 * placement of every un-sunk ship contributes.
 *
 * `restrictParity` limits which cells accrue (and are therefore ever fired
 * at) to a fixed checkerboard parity — used in search to roughly halve the
 * work while still guaranteeing coverage of every ship.
 */
export function densityMap(
  evidence: Evidence,
  options: { coverAll: readonly Coord[]; restrictParity: boolean },
): number[] {
  const { width, height, fired, blocked, unsunkSizes } = evidence
  const { coverAll, restrictParity } = options
  const density = new Array<number>(width * height).fill(0)

  const coverKeys = coverAll.map((c) => c.row * width + c.col)
  const dedupedSizes = [...new Set(unsunkSizes)]

  for (const size of dedupedSizes) {
    // Horizontal (dr=0,dc=1) then vertical (dr=1,dc=0) placements.
    for (const [dr, dc] of [
      [0, 1],
      [1, 0],
    ] as const) {
      const rowMax = height - dr * (size - 1)
      const colMax = width - dc * (size - 1)
      for (let row = 0; row < rowMax; row++) {
        for (let col = 0; col < colMax; col++) {
          let legal = true
          for (let i = 0; i < size; i++) {
            const k = (row + dr * i) * width + (col + dc * i)
            if (blocked.has(k)) {
              legal = false
              break
            }
          }
          if (!legal) continue

          if (coverKeys.length > 0) {
            let coversAll = true
            for (const target of coverKeys) {
              let found = false
              for (let i = 0; i < size; i++) {
                if ((row + dr * i) * width + (col + dc * i) === target) {
                  found = true
                  break
                }
              }
              if (!found) {
                coversAll = false
                break
              }
            }
            if (!coversAll) continue
          }

          for (let i = 0; i < size; i++) {
            const r = row + dr * i
            const c = col + dc * i
            const k = r * width + c
            if (fired.has(k)) continue
            if (restrictParity && (r + c) % 2 !== 0) continue
            density[k] += 1
          }
        }
      }
    }
  }

  return density
}

/**
 * Pick the un-fired cell with the highest density, breaking ties by the
 * fixed ordering (lowest row, then lowest col). Row-major iteration with a
 * strict `>` keeps the earliest cell on ties. Returns null when no cell has
 * any density (e.g. evidence rules everything out).
 */
export function argMaxCell(
  density: readonly number[],
  evidence: Evidence,
): Coord | null {
  const { width, height, fired } = evidence
  let best: Coord | null = null
  let bestScore = 0
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const k = row * width + col
      if (fired.has(k)) continue
      const score = density[k]
      if (score > bestScore) {
        bestScore = score
        best = { row, col }
      }
    }
  }
  return best
}
