import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  GamePhase,
  Orientation,
  ShipType,
  type Coord,
  type GameState,
} from '@/engine/types'
import { GameProvider, useGame } from '@/state/GameProvider'
import { aiTurn, placeShip, start } from '@/state/actions'
import App, { AppContent } from './App'

/** Deterministic mulberry32 RNG so the AI's Start layout is pinned. */
function makeRng(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** A legal, no-touch human fleet (rows spaced by an empty buffer row). */
const HUMAN_FLEET: ReadonlyArray<{
  type: ShipType
  origin: Coord
}> = [
  { type: ShipType.Carrier, origin: { row: 0, col: 0 } },
  { type: ShipType.Battleship, origin: { row: 2, col: 0 } },
  { type: ShipType.Cruiser, origin: { row: 4, col: 0 } },
  { type: ShipType.Submarine, origin: { row: 6, col: 0 } },
  { type: ShipType.Destroyer, origin: { row: 8, col: 0 } },
]

/** Captures the live `{ state, dispatch }` from the real provider for driving. */
type Api = { state: GameState; dispatch: ReturnType<typeof useGame>['dispatch'] }
function makeCapture(): { Capture: () => null; api: Api } {
  const api = {} as Api
  function Capture() {
    const game = useGame()
    api.state = game.state
    api.dispatch = game.dispatch
    return null
  }
  return { Capture, api }
}

function placeFleet(api: Api) {
  for (const { type, origin } of HUMAN_FLEET) {
    act(() => {
      api.dispatch(placeShip(type, origin, Orientation.Horizontal))
    })
  }
}

describe('App integration (SPEC §11)', () => {
  it('renders the PlacementScreen while in Setup', () => {
    render(<App />)
    expect(
      screen.getByRole('heading', { name: /place your fleet/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /battleship ai/i })).toBeInTheDocument()
  })

  it('renders the PlayScreen once all five ships are placed and START fires', () => {
    const { Capture, api } = makeCapture()
    render(
      <GameProvider>
        <AppContent />
        <Capture />
      </GameProvider>,
    )

    expect(api.state.phase).toBe(GamePhase.Setup)
    placeFleet(api)
    act(() => {
      api.dispatch(start(makeRng(1)))
    })

    expect(api.state.phase).toBe(GamePhase.Playing)
    expect(screen.getByRole('grid', { name: 'Enemy waters' })).toBeInTheDocument()
    expect(screen.getByRole('grid', { name: 'Your fleet' })).toBeInTheDocument()
  })

  describe('to game over and back', () => {
    beforeEach(() => vi.useFakeTimers())
    afterEach(() => vi.useRealTimers())

    it('renders the GameOverScreen at game over and returns to Setup on Play again', () => {
      const { Capture, api } = makeCapture()
      render(
        <GameProvider>
          <AppContent />
          <Capture />
        </GameProvider>,
      )

      placeFleet(api)
      act(() => {
        api.dispatch(start(makeRng(1)))
      })
      expect(api.state.phase).toBe(GamePhase.Playing)

      // Drive the AI to sink the whole human fleet (deterministic targeting).
      let guard = 0
      while (api.state.phase === GamePhase.Playing && guard < 300) {
        act(() => {
          api.dispatch(aiTurn())
        })
        guard += 1
      }

      expect(api.state.phase).toBe(GamePhase.GameOver)
      expect(
        screen.getByRole('heading', { name: /you win|you lose/i }),
      ).toBeInTheDocument()

      // "Play again" resets back to Setup (SPEC §8).
      act(() => {
        fireEvent.click(screen.getByRole('button', { name: /play again/i }))
      })
      expect(api.state.phase).toBe(GamePhase.Setup)
      expect(
        screen.getByRole('heading', { name: /place your fleet/i }),
      ).toBeInTheDocument()
    })
  })
})
