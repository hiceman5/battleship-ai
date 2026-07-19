/**
 * Shot resolution: miss / hit / sink (pure). See SPEC §4 and §5.
 */
import { CellState } from './types'
import type { Board, Cell, Coord, Ship } from './types'
import { coordEquals } from './coord'
import { cellsFor, isSunk } from './fleet'

function alreadyFired(board: Board, coord: Coord): boolean {
  return board.shots.some((shot) => coordEquals(shot, coord))
}

function shipAt(board: Board, coord: Coord): Ship | undefined {
  return board.ships.find((ship) =>
    cellsFor(ship).some((cell) => coordEquals(cell, coord)),
  )
}

function setCellStates(
  cells: readonly (readonly Cell[])[],
  updates: readonly { coord: Coord; state: CellState }[],
): Cell[][] {
  return cells.map((row) =>
    row.map((cell) => {
      const update = updates.find((u) => coordEquals(u.coord, cell.coord))
      return update ? { ...cell, state: update.state } : cell
    }),
  )
}

/**
 * Resolve a shot at `coord` against `board`, returning the resulting board.
 *
 * - Repeat shot on an already-fired cell: rejected no-op — the same board
 *   reference is returned unchanged (SPEC §4.2).
 * - Fresh miss: cell → {@link CellState.Miss}; coord appended to `shots`.
 * - Fresh hit: cell → {@link CellState.Hit}; coord appended to the owning
 *   ship's `hits` and to `shots`. If the hit completes the ship, all of its
 *   cells transition {@link CellState.Hit} → {@link CellState.Sunk}.
 */
export function resolveShot(board: Board, coord: Coord): Board {
  if (alreadyFired(board, coord)) return board

  const shots = [...board.shots, coord]
  const target = shipAt(board, coord)

  if (!target) {
    return {
      ...board,
      cells: setCellStates(board.cells, [{ coord, state: CellState.Miss }]),
      shots,
    }
  }

  const hitShip: Ship = { ...target, hits: [...target.hits, coord] }
  const ships = board.ships.map((s) => (s.id === target.id ? hitShip : s))

  if (isSunk(hitShip)) {
    const updates = cellsFor(hitShip).map((c) => ({
      coord: c,
      state: CellState.Sunk,
    }))
    return {
      ...board,
      cells: setCellStates(board.cells, updates),
      ships,
      shots,
    }
  }

  return {
    ...board,
    cells: setCellStates(board.cells, [{ coord, state: CellState.Hit }]),
    ships,
    shots,
  }
}
