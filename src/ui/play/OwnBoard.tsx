import { Player } from '@/engine/types'
import type { CellState, GameState } from '@/engine/types'
import { BoardGrid } from '@/ui/board/BoardGrid'

export type OwnBoardProps = {
  readonly state: GameState
  readonly label?: string
}

/**
 * The human's own fleet board (SPEC §5.1): always shows the human's own ship
 * positions plus the AI's incoming hits and misses. Non-interactive — the
 * human never fires on their own board.
 */
export function OwnBoard({ state, label = 'Your fleet' }: OwnBoardProps) {
  const board = state.boards[Player.Human]
  const cells: CellState[][] = board.cells.map((row) =>
    row.map((cell) => cell.state),
  )

  return (
    <BoardGrid cells={cells} onFire={() => {}} interactive={false} label={label} />
  )
}
