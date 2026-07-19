import { useCallback, useReducer } from 'react'
import { fireEvent, render, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { GamePhase, Player, type GameState } from '@/engine/types'
import { FLEET_CELL_COUNT } from '@/engine'
import { gameReducer } from '@/state/gameReducer'
import { createInitialState } from '@/state/initialState'
import { ActionType, type GameAction } from '@/state/actions'
import { PlacementScreen } from './PlacementScreen'

/** A deterministic mulberry32 RNG so Randomize/Start layouts are pinned. */
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

type Harness = {
  readonly ui: React.ReactElement
  readonly actions: GameAction[]
  readonly latestState: () => GameState
}

function makeHarness(rng?: () => number): Harness {
  const actions: GameAction[] = []
  const states: GameState[] = []

  function HarnessComponent() {
    const [state, base] = useReducer(gameReducer, undefined, createInitialState)
    const dispatch = useCallback(
      (action: GameAction) => {
        actions.push(action)
        base(action)
      },
      [base],
    )
    states.push(state)
    return <PlacementScreen state={state} dispatch={dispatch} rng={rng} />
  }

  return {
    ui: <HarnessComponent />,
    actions,
    latestState: () => states[states.length - 1],
  }
}

function shipButton(container: HTMLElement, type: string): HTMLElement {
  const el = container.querySelector(`[data-ship="${type}"]`)
  if (!el) throw new Error(`ship button ${type} not found`)
  return el as HTMLElement
}

function cell(container: HTMLElement, label: string): HTMLElement {
  const el = container.querySelector(`[role="gridcell"][data-coord="${label}"]`)
  if (!el) throw new Error(`cell ${label} not found`)
  return el as HTMLElement
}

function shipCellCount(container: HTMLElement): number {
  return container.querySelectorAll('[data-state="ship"]').length
}

function ghostCoords(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('[data-ghost]')).map(
    (el) => el.getAttribute('data-coord') ?? '',
  )
}

describe('PlacementScreen (SPEC §3.2)', () => {
  it('places a ship on a legal click and rejects an illegal one with an invalid indicator', () => {
    const { ui, latestState } = makeHarness()
    const { container } = render(ui)

    // Legal placement: Carrier at A1 (horizontal, empty board).
    fireEvent.click(shipButton(container, 'carrier'))
    fireEvent.mouseEnter(cell(container, 'A1'))
    fireEvent.click(cell(container, 'A1'))

    expect(latestState().boards[Player.Human].ships).toHaveLength(1)
    expect(shipCellCount(container)).toBe(5)

    // Illegal placement: Battleship at A2 touches the Carrier -> rejected.
    fireEvent.click(shipButton(container, 'battleship'))
    fireEvent.mouseEnter(cell(container, 'A2'))
    expect(container.querySelector('[data-ghost="invalid"]')).not.toBeNull()

    fireEvent.click(cell(container, 'A2'))
    expect(latestState().boards[Player.Human].ships).toHaveLength(1)
    expect(shipCellCount(container)).toBe(5)
  })

  it('toggles the pending orientation with both the R key and the rotate button', () => {
    const { ui } = makeHarness()
    const { container } = render(ui)

    fireEvent.click(shipButton(container, 'carrier'))
    fireEvent.mouseEnter(cell(container, 'A1'))

    // Horizontal ghost spans a single row.
    expect(ghostCoords(container)).toEqual(['A1', 'B1', 'C1', 'D1', 'E1'])

    // R key -> vertical ghost spans a single column.
    fireEvent.keyDown(document.body, { key: 'r' })
    expect(ghostCoords(container)).toEqual(['A1', 'A2', 'A3', 'A4', 'A5'])

    // Rotate button -> back to horizontal.
    const rotate = container.querySelector('[data-orientation]') as HTMLElement
    fireEvent.click(rotate)
    expect(ghostCoords(container)).toEqual(['A1', 'B1', 'C1', 'D1', 'E1'])
  })

  it('Randomize fills a full legal fleet and Clear empties it', () => {
    const { ui, latestState } = makeHarness(makeRng(12345))
    const { container } = render(ui)

    fireEvent.click(within(container).getByText('Randomize'))

    const ships = latestState().boards[Player.Human].ships
    expect(ships).toHaveLength(5)
    expect(shipCellCount(container)).toBe(FLEET_CELL_COUNT)

    fireEvent.click(within(container).getByText('Clear'))
    expect(latestState().boards[Player.Human].ships).toHaveLength(0)
    expect(shipCellCount(container)).toBe(0)
  })

  it('enables Start only at 5 ships and starts the game on click', () => {
    const { ui, latestState } = makeHarness(makeRng(999))
    const { container } = render(ui)

    const startButton = within(container).getByText(
      'Start',
    ) as HTMLButtonElement
    expect(startButton).toBeDisabled()

    fireEvent.click(within(container).getByText('Randomize'))
    expect(startButton).toBeEnabled()

    fireEvent.click(startButton)
    expect(latestState().phase).toBe(GamePhase.Playing)
  })

  it('keeps transient placement state out of dispatched actions and GameState', () => {
    const { ui, actions, latestState } = makeHarness()
    const { container } = render(ui)

    // Selecting, hovering and rotating are purely UI-local: no action dispatched.
    fireEvent.click(shipButton(container, 'carrier'))
    fireEvent.mouseEnter(cell(container, 'C3'))
    fireEvent.keyDown(document.body, { key: 'r' })
    fireEvent.keyDown(document.body, { key: 'R' })
    fireEvent.mouseEnter(cell(container, 'D4'))
    expect(actions).toHaveLength(0)

    // Committing a placement dispatches exactly one well-formed PLACE_SHIP.
    fireEvent.click(cell(container, 'A1'))
    expect(actions).toHaveLength(1)
    const action = actions[0]
    expect(action.type).toBe(ActionType.PlaceShip)
    expect(Object.keys(action).sort()).toEqual(['payload', 'type'])
    if (action.type === ActionType.PlaceShip) {
      expect(Object.keys(action.payload).sort()).toEqual([
        'orientation',
        'origin',
        'shipType',
      ])
    }

    // GameState carries no transient fields (no hover/selection/orientation).
    expect(Object.keys(latestState()).sort()).toEqual([
      'boards',
      'currentPlayer',
      'phase',
      'winner',
    ])
  })
})
