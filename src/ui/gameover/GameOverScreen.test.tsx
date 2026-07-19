import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import {
  GamePhase,
  Orientation,
  Player,
  ShipType,
} from '@/engine/types'
import type { GameState, Ship } from '@/engine/types'
import { createBoard, resolveShot } from '@/engine'
import { ActionType } from '@/state/actions'
import { GameOverScreen } from './GameOverScreen'

function ship(
  type: ShipType,
  size: number,
  origin: { row: number; col: number },
  orientation: Orientation,
): Ship {
  return { id: type, type, size, origin, orientation, hits: [] }
}

/** GameOver state: human won; AI board records 3 shots / 2 hits (67%). */
function gameOverState(): GameState {
  let ai = createBoard([
    ship(ShipType.Destroyer, 2, { row: 0, col: 0 }, Orientation.Horizontal),
    // Unfired cruiser (D4,E4,F4) — should be revealed at game over.
    ship(ShipType.Cruiser, 3, { row: 3, col: 3 }, Orientation.Horizontal),
  ])
  ai = resolveShot(ai, { row: 0, col: 0 }) // hit
  ai = resolveShot(ai, { row: 0, col: 1 }) // hit -> destroyer sunk
  ai = resolveShot(ai, { row: 5, col: 5 }) // miss

  return {
    phase: GamePhase.GameOver,
    currentPlayer: Player.Human,
    boards: {
      [Player.Human]: createBoard([
        ship(ShipType.Submarine, 3, { row: 8, col: 0 }, Orientation.Horizontal),
      ]),
      [Player.Ai]: ai,
    },
    winner: Player.Human,
  }
}

describe('GameOverScreen (SPEC §8, §9)', () => {
  it('shows the Win headline and moves focus to it on mount', () => {
    render(<GameOverScreen state={gameOverState()} dispatch={vi.fn()} />)
    const heading = screen.getByRole('heading', { name: 'You win!' })
    expect(heading).toBeInTheDocument()
    expect(heading).toHaveFocus()
  })

  it('shows a Lose headline when the AI wins', () => {
    const state = { ...gameOverState(), winner: Player.Ai }
    render(<GameOverScreen state={state} dispatch={vi.fn()} />)
    expect(screen.getByRole('heading', { name: 'You lose' })).toBeInTheDocument()
  })

  it('reports correct shots / hits / accuracy', () => {
    render(<GameOverScreen state={gameOverState()} dispatch={vi.fn()} />)
    const summary = screen.getByLabelText('Your firing summary')
    expect(within(summary).getByText('3')).toBeInTheDocument()
    expect(within(summary).getByText('2')).toBeInTheDocument()
    expect(within(summary).getByText('67%')).toBeInTheDocument()
  })

  it('reveals un-sunk enemy ships', () => {
    render(<GameOverScreen state={gameOverState()} dispatch={vi.fn()} />)
    const enemyGrid = screen.getByRole('grid', { name: 'Enemy fleet' })
    expect(within(enemyGrid).getByLabelText('D4, ship')).toBeInTheDocument()
  })

  it('dispatches RESET with the injected rng on "Play again"', () => {
    const dispatch = vi.fn()
    const rng = () => 0.42
    render(
      <GameOverScreen state={gameOverState()} dispatch={dispatch} rng={rng} />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Play again' }))
    expect(dispatch).toHaveBeenCalledWith({
      type: ActionType.Reset,
      payload: { rng },
    })
  })
})
