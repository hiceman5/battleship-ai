import { describe, expect, it } from 'vitest'
import {
  CellState,
  GamePhase,
  Orientation,
  Player,
  ShipType,
} from '../engine/types'
import type { Board, Coord, GameState, Ship } from '../engine/types'
import {
  FLEET,
  FLEET_CELL_COUNT,
  cellsFor,
  coordEquals,
  createBoard,
  createEmptyBoard,
  generateRandomLayout,
  isFleetDestroyed,
  isLegalPlacement,
  isSunk,
  resolveShot,
} from '../engine'
import { selectShot } from '../ai'
import { aiTurn, clear, fire, placeShip, reset, start } from './actions'
import { gameReducer } from './gameReducer'
import { createInitialState, initialState } from './initialState'

/** Deterministic, seedable RNG (mulberry32) for reproducible layouts. */
function seededRng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a += 0x6d2b79f5
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Legally place all five human ships (each on its own row, well separated so
 * the no-touch rule holds) and return the resulting state.
 */
function placeFullHumanFleet(state: GameState): GameState {
  const layout: ReadonlyArray<[ShipType, number]> = [
    [ShipType.Carrier, 0],
    [ShipType.Battleship, 2],
    [ShipType.Cruiser, 4],
    [ShipType.Submarine, 6],
    [ShipType.Destroyer, 8],
  ]
  let s = state
  for (const [type, row] of layout) {
    s = gameReducer(s, placeShip(type, { row, col: 0 }, Orientation.Horizontal))
  }
  return s
}

function shipOfType(board: Board, type: ShipType): Ship {
  const ship = board.ships.find((s) => s.type === type)
  if (!ship) throw new Error(`missing ship ${type}`)
  return ship
}

/** Fire every cell of every ship on `board`, forcing the attacker to move. */
function sinkEntireBoard(
  state: GameState,
  attacker: Player,
  defender: Player,
): GameState {
  let s: GameState = { ...state, currentPlayer: attacker }
  for (const ship of s.boards[defender].ships) {
    for (const cell of cellsFor(ship)) {
      s = { ...s, currentPlayer: attacker }
      s = gameReducer(s, fire(cell))
    }
  }
  return s
}

describe('initialState (SPEC §11, §4)', () => {
  it('opens in Setup with the human to move and empty boards', () => {
    expect(initialState.phase).toBe(GamePhase.Setup)
    expect(initialState.currentPlayer).toBe(Player.Human)
    expect(initialState.winner).toBeNull()
    expect(initialState.boards[Player.Human].ships).toEqual([])
    expect(initialState.boards[Player.Ai].ships).toEqual([])
  })
})

describe('gameReducer PLACE_SHIP (SPEC §3.2)', () => {
  it('commits a legal placement into the human board', () => {
    const next = gameReducer(
      createInitialState(),
      placeShip(ShipType.Destroyer, { row: 0, col: 0 }, Orientation.Horizontal),
    )
    const ships = next.boards[Player.Human].ships
    expect(ships).toHaveLength(1)
    expect(ships[0].type).toBe(ShipType.Destroyer)
    // Ship cells are marked on the board grid.
    expect(next.boards[Player.Human].cells[0][0].state).toBe(CellState.Ship)
    expect(next.boards[Player.Human].cells[0][1].state).toBe(CellState.Ship)
    // Still Setup: not all five ships are placed yet.
    expect(next.phase).toBe(GamePhase.Setup)
  })

  it('rejects an illegal (out-of-bounds) placement with no state change', () => {
    const start = createInitialState()
    // Carrier (size 5) horizontal at col 7 runs off the 10-wide board.
    const next = gameReducer(
      start,
      placeShip(ShipType.Carrier, { row: 0, col: 7 }, Orientation.Horizontal),
    )
    expect(next).toBe(start)
  })

  it('rejects a placement that touches an existing ship (no-touch rule)', () => {
    const afterFirst = gameReducer(
      createInitialState(),
      placeShip(ShipType.Destroyer, { row: 0, col: 0 }, Orientation.Horizontal),
    )
    // Cruiser starting at (1,0) is diagonally/orthogonally adjacent.
    const afterSecond = gameReducer(
      afterFirst,
      placeShip(ShipType.Cruiser, { row: 1, col: 0 }, Orientation.Horizontal),
    )
    expect(afterSecond).toBe(afterFirst)
  })

  it('does NOT auto-start once the full fleet is placed (stays Setup)', () => {
    const state = placeFullHumanFleet(createInitialState())
    expect(state.boards[Player.Human].ships).toHaveLength(FLEET.length)
    // Regression (start-bug): placing the 5th ship must NOT begin play.
    expect(state.phase).toBe(GamePhase.Setup)
    expect(state.currentPlayer).toBe(Player.Human)
    // The AI board is still untouched/empty until START lays its fleet.
    expect(state.boards[Player.Ai].ships).toEqual([])
  })
})

describe('start-bug regression (SPEC §3.2, §4)', () => {
  it('a fresh game does NOT auto-start with an empty AI board', () => {
    // From the canonical initial state, place every ship legally.
    const state = placeFullHumanFleet(createInitialState())
    // The game must remain in Setup — never reaching Playing with an
    // empty AI board (which would leave the game instantly decided).
    expect(state.phase).toBe(GamePhase.Setup)
    expect(state.boards[Player.Ai].ships).toEqual([])
    expect(state.winner).toBeNull()
  })
})

describe('gameReducer START (SPEC §3.2, §4)', () => {
  it('is a no-op (same reference) with fewer than five ships placed', () => {
    // Only one ship placed: START must not begin the game.
    const placedOne = gameReducer(
      createInitialState(),
      placeShip(ShipType.Destroyer, { row: 0, col: 0 }, Orientation.Horizontal),
    )
    const next = gameReducer(placedOne, start(seededRng(1)))
    expect(next).toBe(placedOne)
  })

  it('is a no-op (same reference) from the empty initial state', () => {
    const empty = createInitialState()
    expect(gameReducer(empty, start(seededRng(1)))).toBe(empty)
  })

  it('transitions to Playing with the human to move and a full AI fleet', () => {
    const ready = placeFullHumanFleet(createInitialState())
    const next = gameReducer(ready, start(seededRng(42)))

    expect(next.phase).toBe(GamePhase.Playing)
    expect(next.currentPlayer).toBe(Player.Human)
    // The human fleet placed during Setup is preserved.
    expect(next.boards[Player.Human].ships).toHaveLength(FLEET.length)

    const aiShips = next.boards[Player.Ai].ships
    expect(aiShips).toHaveLength(FLEET.length)
    const aiCells = aiShips.reduce((sum, s) => sum + s.size, 0)
    expect(aiCells).toBe(FLEET_CELL_COUNT)

    // No two AI ships touch (king-move buffer): each ship is legal on a
    // board containing the others.
    const aiBoard = next.boards[Player.Ai]
    for (const ship of aiShips) {
      expect(isLegalPlacement(aiBoard, ship)).toBe(true)
    }
  })

  it('lays the AI fleet deterministically under a seeded RNG', () => {
    const ready = placeFullHumanFleet(createInitialState())
    const a = gameReducer(ready, start(seededRng(123)))
    const b = gameReducer(ready, start(seededRng(123)))
    expect(a.boards[Player.Ai].ships).toEqual(b.boards[Player.Ai].ships)

    const c = gameReducer(ready, start(seededRng(999)))
    expect(c.boards[Player.Ai].ships).not.toEqual(a.boards[Player.Ai].ships)
  })
})

describe('gameReducer CLEAR (SPEC §3.2)', () => {
  it('empties the human fleet during Setup, preserving phase and AI board', () => {
    // A Setup state with human ships placed and an AI fleet already laid.
    const ready = placeFullHumanFleet(createInitialState())
    const withAi = gameReducer(ready, start(seededRng(5)))
    // Return to Setup with the AI fleet intact to exercise CLEAR's guarantees.
    const setupWithAi: GameState = { ...withAi, phase: GamePhase.Setup }

    const next = gameReducer(setupWithAi, clear())

    expect(next.phase).toBe(GamePhase.Setup)
    expect(next.currentPlayer).toBe(setupWithAi.currentPlayer)
    expect(next.boards[Player.Human].ships).toEqual([])
    // AI board is untouched.
    expect(next.boards[Player.Ai]).toBe(setupWithAi.boards[Player.Ai])
  })

  it('is a no-op (same reference) outside Setup', () => {
    const ready = placeFullHumanFleet(createInitialState())
    const playing = gameReducer(ready, start(seededRng(7)))
    expect(playing.phase).toBe(GamePhase.Playing)
    expect(gameReducer(playing, clear())).toBe(playing)
  })
})

describe('gameReducer FIRE (SPEC §4)', () => {
  function playingState(): GameState {
    const aiBoard = createBoard([
      {
        id: ShipType.Destroyer,
        type: ShipType.Destroyer,
        size: 2,
        origin: { row: 0, col: 0 },
        orientation: Orientation.Horizontal,
        hits: [],
      },
    ])
    return {
      phase: GamePhase.Playing,
      currentPlayer: Player.Human,
      boards: {
        [Player.Human]: createEmptyBoard(),
        [Player.Ai]: aiBoard,
      },
      winner: null,
    }
  }

  it('registers a hit on the opponent board and passes the turn', () => {
    const next = gameReducer(playingState(), fire({ row: 0, col: 0 }))
    const aiBoard = next.boards[Player.Ai]
    expect(aiBoard.cells[0][0].state).toBe(CellState.Hit)
    expect(aiBoard.shots).toContainEqual({ row: 0, col: 0 })
    expect(next.currentPlayer).toBe(Player.Ai)
  })

  it('registers a miss on the opponent board and passes the turn', () => {
    const next = gameReducer(playingState(), fire({ row: 5, col: 5 }))
    const aiBoard = next.boards[Player.Ai]
    expect(aiBoard.cells[5][5].state).toBe(CellState.Miss)
    expect(aiBoard.shots).toContainEqual({ row: 5, col: 5 })
    expect(next.currentPlayer).toBe(Player.Ai)
  })

  it('treats a repeat shot as a no-op that does NOT pass the turn', () => {
    const afterFirst = gameReducer(playingState(), fire({ row: 5, col: 5 }))
    // Same player fires the same cell again.
    const replay = { ...afterFirst, currentPlayer: Player.Human }
    const afterRepeat = gameReducer(replay, fire({ row: 5, col: 5 }))
    expect(afterRepeat).toBe(replay)
    expect(afterRepeat.currentPlayer).toBe(Player.Human)
  })
})

describe('gameReducer AI_TURN (SPEC §6, §4)', () => {
  it('applies ai.selectShot to the human board and toggles the turn', () => {
    const humanBoard = createBoard([
      {
        id: ShipType.Destroyer,
        type: ShipType.Destroyer,
        size: 2,
        origin: { row: 0, col: 0 },
        orientation: Orientation.Horizontal,
        hits: [],
      },
    ])
    const state: GameState = {
      phase: GamePhase.Playing,
      currentPlayer: Player.Ai,
      boards: {
        [Player.Human]: humanBoard,
        [Player.Ai]: createEmptyBoard(),
      },
      winner: null,
    }

    const expected: Coord = selectShot(humanBoard)
    const next = gameReducer(state, aiTurn())

    // The shot the AI fired matches selectShot and landed on the human board.
    const fired = next.boards[Player.Human].shots
    expect(fired).toHaveLength(1)
    expect(coordEquals(fired[0], expected)).toBe(true)
    expect(next.currentPlayer).toBe(Player.Human)
  })
})

describe('gameReducer win condition (SPEC §8)', () => {
  it('sets winner=human and GameOver when the AI fleet is destroyed', () => {
    const aiShips = generateRandomLayout(seededRng(1))
    const start: GameState = {
      phase: GamePhase.Playing,
      currentPlayer: Player.Human,
      boards: {
        [Player.Human]: createBoard(generateRandomLayout(seededRng(2))),
        [Player.Ai]: createBoard(aiShips),
      },
      winner: null,
    }

    const end = sinkEntireBoard(start, Player.Human, Player.Ai)

    expect(end.phase).toBe(GamePhase.GameOver)
    expect(end.winner).toBe(Player.Human)
    // Exactly one winner: the AI fleet is gone, the human fleet is intact.
    expect(isFleetDestroyed(end.boards[Player.Ai])).toBe(true)
    expect(isFleetDestroyed(end.boards[Player.Human])).toBe(false)
  })

  it('ignores further FIRE actions once the game is over', () => {
    const aiShips = generateRandomLayout(seededRng(1))
    const start: GameState = {
      phase: GamePhase.Playing,
      currentPlayer: Player.Human,
      boards: {
        [Player.Human]: createEmptyBoard(),
        [Player.Ai]: createBoard(aiShips),
      },
      winner: null,
    }
    const end = sinkEntireBoard(start, Player.Human, Player.Ai)
    const afterExtra = gameReducer(
      { ...end, currentPlayer: Player.Human },
      fire({ row: 9, col: 9 }),
    )
    expect(afterExtra).toEqual({ ...end, currentPlayer: Player.Human })
  })
})

describe('gameReducer RESET (SPEC §8 replay, §3.3)', () => {
  function afterGame(): GameState {
    // A used-up state: humans placed, game over, to prove RESET clears it.
    return {
      phase: GamePhase.GameOver,
      currentPlayer: Player.Ai,
      boards: {
        [Player.Human]: createBoard(generateRandomLayout(seededRng(7))),
        [Player.Ai]: createBoard(generateRandomLayout(seededRng(8))),
      },
      winner: Player.Ai,
    }
  }

  it('returns to Setup, clears the human fleet, and lays a full AI fleet', () => {
    const next = gameReducer(afterGame(), reset(seededRng(42)))
    expect(next.phase).toBe(GamePhase.Setup)
    expect(next.currentPlayer).toBe(Player.Human)
    expect(next.winner).toBeNull()
    expect(next.boards[Player.Human].ships).toEqual([])
    expect(next.boards[Player.Ai].ships).toHaveLength(FLEET.length)
    const aiCells = next.boards[Player.Ai].ships.reduce(
      (sum, s) => sum + s.size,
      0,
    )
    expect(aiCells).toBe(FLEET_CELL_COUNT)
  })

  it('re-randomizes the AI fleet deterministically under a seeded RNG', () => {
    const a = gameReducer(afterGame(), reset(seededRng(123)))
    const b = gameReducer(createInitialState(), reset(seededRng(123)))
    expect(a.boards[Player.Ai].ships).toEqual(b.boards[Player.Ai].ships)

    // A different seed generally yields a different layout.
    const c = gameReducer(createInitialState(), reset(seededRng(999)))
    expect(c.boards[Player.Ai].ships).not.toEqual(a.boards[Player.Ai].ships)
  })
})

describe('engine reuse sanity (state must not reimplement engine/ai)', () => {
  it('a sunk ship reported by the reducer matches engine.isSunk', () => {
    const aiBoard = createBoard([
      {
        id: ShipType.Destroyer,
        type: ShipType.Destroyer,
        size: 2,
        origin: { row: 0, col: 0 },
        orientation: Orientation.Horizontal,
        hits: [],
      },
    ])
    let state: GameState = {
      phase: GamePhase.Playing,
      currentPlayer: Player.Human,
      boards: {
        [Player.Human]: createEmptyBoard(),
        [Player.Ai]: aiBoard,
      },
      winner: null,
    }
    state = gameReducer(state, fire({ row: 0, col: 0 }))
    state = gameReducer(
      { ...state, currentPlayer: Player.Human },
      fire({ row: 0, col: 1 }),
    )
    // Cross-check against the engine's own resolution.
    const expectedBoard = resolveShot(
      resolveShot(aiBoard, { row: 0, col: 0 }),
      { row: 0, col: 1 },
    )
    expect(isSunk(shipOfType(state.boards[Player.Ai], ShipType.Destroyer))).toBe(
      true,
    )
    expect(state.boards[Player.Ai]).toEqual(expectedBoard)
  })
})
