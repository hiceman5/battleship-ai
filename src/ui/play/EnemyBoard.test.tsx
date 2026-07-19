import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import {
  GamePhase,
  Orientation,
  Player,
  ShipType,
} from '@/engine/types'
import type { GameState, Ship } from '@/engine/types'
import { createBoard, createEmptyBoard, resolveShot } from '@/engine'
import { ActionType } from '@/state/actions'
import { EnemyBoard } from './EnemyBoard'

function ship(
  type: ShipType,
  size: number,
  origin: { row: number; col: number },
  orientation: Orientation,
): Ship {
  return { id: type, type, size, origin, orientation, hits: [] }
}

/** A Playing state whose AI board carries `aiShips`, human to move. */
function playingState(aiShips: readonly Ship[]): GameState {
  return {
    phase: GamePhase.Playing,
    currentPlayer: Player.Human,
    boards: {
      [Player.Human]: createEmptyBoard(),
      [Player.Ai]: createBoard(aiShips),
    },
    winner: null,
  }
}

const CRUISER_AT_C3 = ship(
  ShipType.Cruiser,
  3,
  { row: 2, col: 2 }, // C3, C4, C5 (vertical -> down a column)
  Orientation.Vertical,
)

describe('EnemyBoard', () => {
  it('dispatches FIRE when a fresh cell is clicked', () => {
    const dispatch = vi.fn()
    render(<EnemyBoard state={playingState([])} dispatch={dispatch} />)
    fireEvent.click(screen.getByLabelText('E5, empty'))
    expect(dispatch).toHaveBeenCalledTimes(1)
    expect(dispatch).toHaveBeenCalledWith({
      type: ActionType.Fire,
      payload: { coord: { row: 4, col: 4 } },
    })
  })

  it('does not dispatch for an already-fired (disabled) cell', () => {
    const dispatch = vi.fn()
    const state = playingState([])
    // Record a miss at A1 so it is already fired.
    const withMiss = {
      ...state,
      boards: {
        ...state.boards,
        [Player.Ai]: resolveShot(state.boards[Player.Ai], { row: 0, col: 0 }),
      },
    }
    render(<EnemyBoard state={withMiss} dispatch={dispatch} />)
    const cell = screen.getByLabelText('A1, miss')
    expect(cell).toHaveAttribute('aria-disabled', 'true')
    fireEvent.click(cell)
    expect(dispatch).not.toHaveBeenCalled()
  })

  it('masks unfired AI ship cells as water while Playing', () => {
    render(
      <EnemyBoard state={playingState([CRUISER_AT_C3])} dispatch={vi.fn()} />,
    )
    // Ship cells are hidden (rendered as empty water), not revealed as ships.
    expect(screen.getByLabelText('C3, empty')).toBeInTheDocument()
    expect(screen.queryByLabelText('C3, ship')).not.toBeInTheDocument()
  })

  it('reveals the true AI ship cells at GameOver', () => {
    const state = { ...playingState([CRUISER_AT_C3]), phase: GamePhase.GameOver }
    render(<EnemyBoard state={state} dispatch={vi.fn()} />)
    expect(screen.getByLabelText('C3, ship')).toBeInTheDocument()
    expect(screen.queryByLabelText('C3, empty')).not.toBeInTheDocument()
  })

  it('is disabled when it is not the human turn', () => {
    const dispatch = vi.fn()
    const state = { ...playingState([]), currentPlayer: Player.Ai }
    render(<EnemyBoard state={state} dispatch={dispatch} />)
    expect(screen.getByRole('grid')).toHaveAttribute('aria-disabled', 'true')
    fireEvent.click(screen.getByLabelText('E5, empty'))
    expect(dispatch).not.toHaveBeenCalled()
  })

  it('is disabled while the AI is thinking', () => {
    const dispatch = vi.fn()
    render(
      <EnemyBoard state={playingState([])} dispatch={dispatch} disabled />,
    )
    expect(screen.getByRole('grid')).toHaveAttribute('aria-disabled', 'true')
    fireEvent.click(screen.getByLabelText('E5, empty'))
    expect(dispatch).not.toHaveBeenCalled()
  })
})
