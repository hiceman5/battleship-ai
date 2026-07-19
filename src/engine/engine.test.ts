import { describe, expect, it } from 'vitest'
import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  coordEquals,
  inBounds,
  kingNeighbors,
  orthogonalNeighbors,
} from './coord'
import { FLEET, FLEET_CELL_COUNT, cellsFor, isSunk } from './fleet'
import {
  createBoard,
  createEmptyBoard,
  isFleetDestroyed,
  winnerOf,
} from './board'
import { generateRandomLayout, isLegalPlacement } from './placement'
import type { Rng } from './placement'
import { resolveShot } from './firing'
import { CellState, GamePhase, Orientation, Player, ShipType } from './types'
import type { Board, Coord, GameState, Ship } from './types'

/** Deterministic seeded PRNG (mulberry32) for pinning layouts in tests. */
function mulberry32(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function ship(
  id: string,
  type: ShipType,
  size: number,
  origin: Coord,
  orientation: Orientation,
  hits: Coord[] = [],
): Ship {
  return { id, type, size, origin, orientation, hits }
}

/** True when any cell of `a` is king-move adjacent to (or overlaps) `b`. */
function touchesOrOverlaps(a: Ship, b: Ship): boolean {
  const bKey = new Set(cellsFor(b).map((c) => `${c.row},${c.col}`))
  return cellsFor(a).some((cell) =>
    [cell, ...kingNeighbors(cell)].some((n) => bKey.has(`${n.row},${n.col}`)),
  )
}

describe('coord helpers', () => {
  it('inBounds respects the 10x10 grid', () => {
    expect(BOARD_WIDTH).toBe(10)
    expect(BOARD_HEIGHT).toBe(10)
    expect(inBounds({ row: 0, col: 0 })).toBe(true)
    expect(inBounds({ row: 9, col: 9 })).toBe(true)
    expect(inBounds({ row: -1, col: 0 })).toBe(false)
    expect(inBounds({ row: 0, col: 10 })).toBe(false)
    expect(inBounds({ row: 10, col: 0 })).toBe(false)
  })

  it('coordEquals compares by value', () => {
    expect(coordEquals({ row: 1, col: 2 }, { row: 1, col: 2 })).toBe(true)
    expect(coordEquals({ row: 1, col: 2 }, { row: 2, col: 1 })).toBe(false)
  })

  it('orthogonalNeighbors returns the four cardinal cells', () => {
    const n = orthogonalNeighbors({ row: 5, col: 5 })
    expect(n).toHaveLength(4)
    expect(n).toContainEqual({ row: 4, col: 5 })
    expect(n).toContainEqual({ row: 6, col: 5 })
    expect(n).toContainEqual({ row: 5, col: 4 })
    expect(n).toContainEqual({ row: 5, col: 6 })
  })

  it('kingNeighbors returns the eight surrounding cells', () => {
    const n = kingNeighbors({ row: 5, col: 5 })
    expect(n).toHaveLength(8)
    expect(n).toContainEqual({ row: 4, col: 4 })
    expect(n).toContainEqual({ row: 6, col: 6 })
    expect(n).not.toContainEqual({ row: 5, col: 5 })
  })
})

describe('fleet', () => {
  it('has the five standard ships totalling 17 cells (SPEC §2)', () => {
    expect(FLEET.map((e) => [e.type, e.size])).toEqual([
      [ShipType.Carrier, 5],
      [ShipType.Battleship, 4],
      [ShipType.Cruiser, 3],
      [ShipType.Submarine, 3],
      [ShipType.Destroyer, 2],
    ])
    expect(FLEET_CELL_COUNT).toBe(17)
  })

  it('cellsFor derives cells from origin/orientation/size (SPEC §3.1)', () => {
    const horiz = ship(
      'a',
      ShipType.Cruiser,
      3,
      { row: 2, col: 4 },
      Orientation.Horizontal,
    )
    expect(cellsFor(horiz)).toEqual([
      { row: 2, col: 4 },
      { row: 2, col: 5 },
      { row: 2, col: 6 },
    ])
    const vert = ship(
      'b',
      ShipType.Cruiser,
      3,
      { row: 2, col: 4 },
      Orientation.Vertical,
    )
    expect(cellsFor(vert)).toEqual([
      { row: 2, col: 4 },
      { row: 3, col: 4 },
      { row: 4, col: 4 },
    ])
  })
})

describe('isLegalPlacement (SPEC §3.1)', () => {
  const board = (ships: Ship[]): Board => ({
    width: BOARD_WIDTH,
    height: BOARD_HEIGHT,
    cells: [],
    ships,
    shots: [],
  })

  it('accepts a ship inside the grid', () => {
    const s = ship(
      'a',
      ShipType.Carrier,
      5,
      { row: 0, col: 0 },
      Orientation.Horizontal,
    )
    expect(isLegalPlacement(board([]), s)).toBe(true)
  })

  it('rejects out-of-bounds placements', () => {
    const offRight = ship(
      'a',
      ShipType.Carrier,
      5,
      { row: 0, col: 6 },
      Orientation.Horizontal,
    )
    expect(isLegalPlacement(board([]), offRight)).toBe(false)
    const offBottom = ship(
      'b',
      ShipType.Carrier,
      5,
      { row: 6, col: 0 },
      Orientation.Vertical,
    )
    expect(isLegalPlacement(board([]), offBottom)).toBe(false)
    const negative = ship(
      'c',
      ShipType.Destroyer,
      2,
      { row: -1, col: 0 },
      Orientation.Horizontal,
    )
    expect(isLegalPlacement(board([]), negative)).toBe(false)
  })

  it('rejects overlapping ships', () => {
    const existing = ship(
      'a',
      ShipType.Cruiser,
      3,
      { row: 0, col: 0 },
      Orientation.Horizontal,
    )
    const overlap = ship(
      'b',
      ShipType.Destroyer,
      2,
      { row: 0, col: 1 },
      Orientation.Horizontal,
    )
    expect(isLegalPlacement(board([existing]), overlap)).toBe(false)
  })

  it('rejects orthogonally touching ships (no-touch rule)', () => {
    const existing = ship(
      'a',
      ShipType.Cruiser,
      3,
      { row: 0, col: 0 },
      Orientation.Horizontal,
    )
    const below = ship(
      'b',
      ShipType.Destroyer,
      2,
      { row: 1, col: 0 },
      Orientation.Horizontal,
    )
    expect(isLegalPlacement(board([existing]), below)).toBe(false)
  })

  it('rejects diagonally touching ships (no-touch rule)', () => {
    const existing = ship(
      'a',
      ShipType.Cruiser,
      3,
      { row: 0, col: 0 },
      Orientation.Horizontal,
    )
    const diagonal = ship(
      'b',
      ShipType.Destroyer,
      2,
      { row: 1, col: 3 },
      Orientation.Horizontal,
    )
    expect(isLegalPlacement(board([existing]), diagonal)).toBe(false)
  })

  it('accepts a validly separated layout (one-cell buffer)', () => {
    const existing = ship(
      'a',
      ShipType.Cruiser,
      3,
      { row: 0, col: 0 },
      Orientation.Horizontal,
    )
    const separated = ship(
      'b',
      ShipType.Destroyer,
      2,
      { row: 2, col: 0 },
      Orientation.Horizontal,
    )
    expect(isLegalPlacement(board([existing]), separated)).toBe(true)
  })
})

describe('generateRandomLayout (SPEC §3.3)', () => {
  it('is deterministic for a fixed seed', () => {
    const a = generateRandomLayout(mulberry32(12345))
    const b = generateRandomLayout(mulberry32(12345))
    expect(a).toEqual(b)
  })

  it('produces a full, always-legal, non-touching fleet for many seeds', () => {
    for (let seed = 0; seed < 200; seed++) {
      const layout = generateRandomLayout(mulberry32(seed))

      // Full fleet: one of each class, 17 cells.
      expect(layout).toHaveLength(FLEET.length)
      expect(layout.map((s) => s.type).sort()).toEqual(
        FLEET.map((e) => e.type).sort(),
      )
      expect(layout.reduce((n, s) => n + s.size, 0)).toBe(FLEET_CELL_COUNT)

      const b: Board = {
        width: BOARD_WIDTH,
        height: BOARD_HEIGHT,
        cells: [],
        ships: layout,
        shots: [],
      }
      // Each ship legal against the rest.
      for (const s of layout) expect(isLegalPlacement(b, s)).toBe(true)
      // No pair touches (belt-and-braces on the no-touch rule).
      for (let i = 0; i < layout.length; i++) {
        for (let j = i + 1; j < layout.length; j++) {
          expect(touchesOrOverlaps(layout[i], layout[j])).toBe(false)
        }
      }
    }
  })
})

describe('resolveShot (SPEC §4 / §5)', () => {
  const layout: Ship[] = [
    ship(
      'cruiser',
      ShipType.Cruiser,
      3,
      { row: 0, col: 0 },
      Orientation.Horizontal,
    ),
    ship(
      'destroyer',
      ShipType.Destroyer,
      2,
      { row: 5, col: 5 },
      Orientation.Vertical,
    ),
  ]

  it('records a fresh miss and mutates only miss fields', () => {
    const before = createBoard(layout)
    const after = resolveShot(before, { row: 9, col: 9 })

    expect(after.cells[9][9].state).toBe(CellState.Miss)
    expect(after.shots).toContainEqual({ row: 9, col: 9 })
    expect(after.shots).toHaveLength(1)
    // Ships untouched on a miss.
    expect(after.ships).toEqual(before.ships)
  })

  it('records a fresh hit on the owning ship and board', () => {
    const before = createBoard(layout)
    const after = resolveShot(before, { row: 0, col: 0 })

    expect(after.cells[0][0].state).toBe(CellState.Hit)
    expect(after.shots).toContainEqual({ row: 0, col: 0 })
    const cruiser = after.ships.find((s) => s.id === 'cruiser')!
    expect(cruiser.hits).toContainEqual({ row: 0, col: 0 })
    // Other ship untouched.
    expect(after.ships.find((s) => s.id === 'destroyer')!.hits).toHaveLength(0)
  })

  it('rejects a repeat shot as a no-op with no state change', () => {
    const before = createBoard(layout)
    const once = resolveShot(before, { row: 0, col: 0 })
    const twice = resolveShot(once, { row: 0, col: 0 })
    // Same reference: nothing changed.
    expect(twice).toBe(once)
    expect(twice.shots).toHaveLength(1)

    // Repeat miss is likewise a no-op.
    const miss = resolveShot(before, { row: 9, col: 9 })
    expect(resolveShot(miss, { row: 9, col: 9 })).toBe(miss)
  })

  it("flips all a ship's cells from Hit to Sunk on completion (SPEC §5)", () => {
    let board = createBoard(layout)
    board = resolveShot(board, { row: 5, col: 5 })
    // First hit: not yet sunk.
    expect(board.cells[5][5].state).toBe(CellState.Hit)
    expect(isSunk(board.ships.find((s) => s.id === 'destroyer')!)).toBe(false)

    board = resolveShot(board, { row: 6, col: 5 })
    const destroyer = board.ships.find((s) => s.id === 'destroyer')!
    expect(isSunk(destroyer)).toBe(true)
    expect(board.cells[5][5].state).toBe(CellState.Sunk)
    expect(board.cells[6][5].state).toBe(CellState.Sunk)
  })
})

describe('win condition (SPEC §8)', () => {
  it('winnerOf returns the player who sank all opponent ships', () => {
    const humanFleet = generateRandomLayout(mulberry32(1))
    const aiFleet = generateRandomLayout(mulberry32(2))

    let human = createBoard(humanFleet)
    const ai = createBoard(aiFleet)

    // No winner initially.
    const mk = (h: Board, a: Board): GameState => ({
      phase: GamePhase.Playing,
      currentPlayer: Player.Human,
      boards: { [Player.Human]: h, [Player.Ai]: a },
      winner: null,
    })
    expect(winnerOf(mk(human, ai))).toBeNull()

    // Sink every human ship: the AI wins.
    for (const s of humanFleet) {
      for (const cell of cellsFor(s)) human = resolveShot(human, cell)
    }
    expect(isFleetDestroyed(human)).toBe(true)
    expect(winnerOf(mk(human, ai))).toBe(Player.Ai)
  })
})

describe('board helpers', () => {
  it('createEmptyBoard is all-empty with no ships or shots', () => {
    const b = createEmptyBoard()
    expect(b.ships).toHaveLength(0)
    expect(b.shots).toHaveLength(0)
    expect(b.cells.flat().every((c) => c.state === CellState.Empty)).toBe(true)
    expect(b.cells.flat().every((c) => c.shipId === null)).toBe(true)
  })

  it('createBoard marks ship cells with state and shipId', () => {
    const s = ship(
      'a',
      ShipType.Destroyer,
      2,
      { row: 3, col: 3 },
      Orientation.Horizontal,
    )
    const b = createBoard([s])
    expect(b.cells[3][3].state).toBe(CellState.Ship)
    expect(b.cells[3][3].shipId).toBe('a')
    expect(b.cells[3][4].shipId).toBe('a')
    expect(b.cells[0][0].state).toBe(CellState.Empty)
  })
})
