import { useReducer } from 'react'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  GamePhase,
  Orientation,
  Player,
  ShipType,
} from '@/engine/types'
import type { GameState, Ship } from '@/engine/types'
import { createBoard } from '@/engine'
import { gameReducer } from '@/state/gameReducer'
import { PlayScreen } from './PlayScreen'

function ship(
  type: ShipType,
  size: number,
  origin: { row: number; col: number },
  orientation: Orientation,
): Ship {
  return { id: type, type, size, origin, orientation, hits: [] }
}

function initialPlayingState(): GameState {
  return {
    phase: GamePhase.Playing,
    currentPlayer: Player.Human,
    boards: {
      // A lone human ship well away from A1 (the AI's first search shot).
      [Player.Human]: createBoard([
        ship(ShipType.Destroyer, 2, { row: 5, col: 5 }, Orientation.Horizontal),
      ]),
      // AI ship away from E5 so the human's click resolves as a miss.
      [Player.Ai]: createBoard([
        ship(ShipType.Destroyer, 2, { row: 0, col: 0 }, Orientation.Horizontal),
      ]),
    },
    winner: null,
  }
}

function Harness({ aiDelayMs }: { readonly aiDelayMs: number }) {
  const [state, dispatch] = useReducer(gameReducer, undefined, initialPlayingState)
  return <PlayScreen state={state} dispatch={dispatch} aiDelayMs={aiDelayMs} />
}

/** Number of already-fired cells (hit/miss/sunk) inside a named grid. */
function firedCellCount(gridName: string): number {
  const grid = screen.getByRole('grid', { name: gridName })
  return within(grid).queryAllByLabelText(/,\s(hit|miss|sunk)$/).length
}

describe('PlayScreen turn pacing (SPEC §7)', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('dispatches AI_TURN only after the delay and disables the board while thinking', () => {
    render(<Harness aiDelayMs={500} />)

    // Human turn: enemy board is interactive.
    const enemyGrid = () => screen.getByRole('grid', { name: 'Enemy waters' })
    expect(enemyGrid()).not.toHaveAttribute('aria-disabled', 'true')

    // Fire a fresh enemy cell — a miss — which passes the turn to the AI.
    act(() => {
      fireEvent.click(within(enemyGrid()).getByLabelText('E5, empty'))
    })

    // Now "thinking": the enemy board is disabled and the AI has NOT fired yet.
    expect(screen.getByText('Enemy is thinking…')).toBeInTheDocument()
    expect(enemyGrid()).toHaveAttribute('aria-disabled', 'true')
    expect(firedCellCount('Your fleet')).toBe(0)

    // Just before the delay elapses: still no AI shot.
    act(() => {
      vi.advanceTimersByTime(499)
    })
    expect(firedCellCount('Your fleet')).toBe(0)

    // After the delay: AI_TURN fires exactly one shot and the turn returns.
    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(firedCellCount('Your fleet')).toBe(1)
    expect(enemyGrid()).not.toHaveAttribute('aria-disabled', 'true')
  })
})
