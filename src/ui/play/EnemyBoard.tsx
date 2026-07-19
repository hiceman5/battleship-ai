import { CellState, GamePhase, Player } from '@/engine/types'
import type { Board, Coord, GameState } from '@/engine/types'
import { fire } from '@/state/actions'
import type { GameAction } from '@/state/actions'
import { BoardGrid } from '@/ui/board/BoardGrid'

/**
 * Derive the display grid for the AI's board — the human's firing target
 * (SPEC §5.1). This is DISPLAY logic, not a game rule.
 *
 * - While `Playing`, unfired ship cells are MASKED to water so the AI's ship
 *   locations stay hidden; only shot results (hit/miss/sunk) are shown.
 * - At `GameOver`, the true cell states are REVEALED (un-sunk ship cells
 *   become visible).
 */
function toEnemyDisplayGrid(board: Board, reveal: boolean): CellState[][] {
  return board.cells.map((row) =>
    row.map((cell) => {
      if (reveal) return cell.state
      return cell.state === CellState.Ship ? CellState.Empty : cell.state
    }),
  )
}

export type EnemyBoardProps = {
  readonly state: GameState
  readonly dispatch: (action: GameAction) => void
  /** Disable firing while the AI is "thinking" (SPEC §7). */
  readonly disabled?: boolean
  readonly label?: string
}

/**
 * The enemy waters board (SPEC §4, §5.1): renders the masked AI grid and
 * dispatches `FIRE` when the human clicks a fresh cell. Already-fired cells
 * are disabled by `BoardGrid` (their state is Hit/Miss/Sunk). The whole board
 * is non-interactive unless it is the human's turn during `Playing` and the AI
 * is not thinking.
 */
export function EnemyBoard({
  state,
  dispatch,
  disabled = false,
  label = 'Enemy waters',
}: EnemyBoardProps) {
  const board = state.boards[Player.Ai]
  const reveal = state.phase === GamePhase.GameOver
  const interactive =
    state.phase === GamePhase.Playing &&
    state.currentPlayer === Player.Human &&
    !disabled

  const cells = toEnemyDisplayGrid(board, reveal)

  return (
    <BoardGrid
      cells={cells}
      onFire={(coord: Coord) => dispatch(fire(coord))}
      interactive={interactive}
      label={label}
    />
  )
}
