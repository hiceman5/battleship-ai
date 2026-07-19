/**
 * Board construction and fleet/win status helpers (pure).
 */
import { CellState, Player } from './types'
import type { Board, Cell, GameState, Ship } from './types'
import { BOARD_HEIGHT, BOARD_WIDTH } from './coord'
import { cellsFor, isSunk } from './fleet'

/** An empty `width`×`height` board with no ships and no shots. */
export function createEmptyBoard(
  width: number = BOARD_WIDTH,
  height: number = BOARD_HEIGHT,
): Board {
  const cells: Cell[][] = []
  for (let row = 0; row < height; row++) {
    const rowCells: Cell[] = []
    for (let col = 0; col < width; col++) {
      rowCells.push({
        coord: { row, col },
        state: CellState.Empty,
        shipId: null,
      })
    }
    cells.push(rowCells)
  }
  return { width, height, cells, ships: [], shots: [] }
}

/**
 * Build a board from a fleet, marking each ship's cells as
 * {@link CellState.Ship} with its `shipId`. Assumes the placement is legal.
 */
export function createBoard(
  ships: readonly Ship[],
  width: number = BOARD_WIDTH,
  height: number = BOARD_HEIGHT,
): Board {
  const empty = createEmptyBoard(width, height)
  const cells = empty.cells.map((row) => row.map((cell) => ({ ...cell })))
  for (const ship of ships) {
    for (const { row, col } of cellsFor(ship)) {
      cells[row][col] = {
        coord: { row, col },
        state: CellState.Ship,
        shipId: ship.id,
      }
    }
  }
  return { width, height, cells, ships: [...ships], shots: [] }
}

/** True when every ship in the board's fleet is sunk (SPEC §8). */
export function isFleetDestroyed(board: Board): boolean {
  return board.ships.length > 0 && board.ships.every(isSunk)
}

/**
 * The winner of the game, or `null` if neither fleet is fully sunk yet
 * (SPEC §8). A player wins by sinking all of the opponent's ships.
 */
export function winnerOf(state: GameState): Player | null {
  if (isFleetDestroyed(state.boards[Player.Ai])) return Player.Human
  if (isFleetDestroyed(state.boards[Player.Human])) return Player.Ai
  return null
}
