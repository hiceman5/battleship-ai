import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  GamePhase,
  Orientation,
  Player,
  ShipType,
} from '@/engine/types'
import type { Board, GameState, Ship } from '@/engine/types'
import { cellsFor, createBoard } from '@/engine'
import { Announcer } from './Announcer'

function makeShip(
  type: ShipType,
  size: number,
  origin: { row: number; col: number },
  sunk: boolean,
): Ship {
  const base: Ship = {
    id: type,
    type,
    size,
    origin,
    orientation: Orientation.Horizontal,
    hits: [],
  }
  return sunk ? { ...base, hits: cellsFor(base) } : base
}

function stateWith(aiBoard: Board, humanBoard: Board): GameState {
  return {
    phase: GamePhase.Playing,
    currentPlayer: Player.Human,
    boards: { [Player.Human]: humanBoard, [Player.Ai]: aiBoard },
    winner: null,
  }
}

describe('Announcer', () => {
  it('is an aria-live=polite region', () => {
    render(
      <Announcer
        state={stateWith(createBoard([]), createBoard([]))}
      />,
    )
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite')
  })

  it('announces enemy sinks by ship identity when the human sinks one', () => {
    const cruiserLive = makeShip(ShipType.Cruiser, 3, { row: 0, col: 0 }, false)
    const cruiserSunk = makeShip(ShipType.Cruiser, 3, { row: 0, col: 0 }, true)

    const { rerender } = render(
      <Announcer
        state={stateWith(createBoard([cruiserLive]), createBoard([]))}
      />,
    )
    expect(screen.getByRole('status')).toHaveTextContent('')

    rerender(
      <Announcer
        state={stateWith(createBoard([cruiserSunk]), createBoard([]))}
      />,
    )
    expect(screen.getByRole('status')).toHaveTextContent(
      'You sank the enemy Cruiser',
    )
  })

  it('announces own ship losses by identity when the AI sinks one', () => {
    const battleshipLive = makeShip(
      ShipType.Battleship,
      4,
      { row: 3, col: 0 },
      false,
    )
    const battleshipSunk = makeShip(
      ShipType.Battleship,
      4,
      { row: 3, col: 0 },
      true,
    )

    const { rerender } = render(
      <Announcer
        state={stateWith(createBoard([]), createBoard([battleshipLive]))}
      />,
    )
    rerender(
      <Announcer
        state={stateWith(createBoard([]), createBoard([battleshipSunk]))}
      />,
    )
    expect(screen.getByRole('status')).toHaveTextContent(
      'Your Battleship was sunk',
    )
  })
})
