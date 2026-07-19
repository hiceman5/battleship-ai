import { describe, expect, it } from 'vitest'
import {
  type Board,
  type Cell,
  type Coord,
  type Ship,
  CellState,
  Orientation,
  ShipType,
} from '../engine/types'
import {
  createBoard,
  generateRandomLayout,
  isFleetDestroyed,
  resolveShot,
} from '../engine'
import type { Rng } from '../engine'
import { selectShot } from './targeting'

const SIZE = 10

function emptyCells(width: number, height: number): Cell[][] {
  const rows: Cell[][] = []
  for (let row = 0; row < height; row++) {
    const cols: Cell[] = []
    for (let col = 0; col < width; col++) {
      cols.push({ coord: { row, col }, state: CellState.Empty, shipId: null })
    }
    rows.push(cols)
  }
  return rows
}

type ShipSpec = {
  id?: string
  type?: ShipType
  size: number
  origin: Coord
  orientation: Orientation
  hits?: Coord[]
}

function makeShip(spec: ShipSpec): Ship {
  return {
    id: spec.id ?? 'ship',
    type: spec.type ?? ShipType.Destroyer,
    size: spec.size,
    origin: spec.origin,
    orientation: spec.orientation,
    hits: spec.hits ?? [],
  }
}

function makeBoard(opts: {
  ships?: Ship[]
  shots?: Coord[]
  width?: number
  height?: number
}): Board {
  const width = opts.width ?? SIZE
  const height = opts.height ?? SIZE
  return {
    width,
    height,
    cells: emptyCells(width, height),
    ships: opts.ships ?? [],
    shots: opts.shots ?? [],
  }
}

function key(coord: Coord): string {
  return `${coord.row},${coord.col}`
}

/** Deterministic seeded PRNG (mulberry32), matching the benchmark harness. */
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

describe('selectShot — hybrid density + parity search (§6.1, assigned strategy)', () => {
  it('opens on an even-parity cell and is deterministic', () => {
    const shot = selectShot(makeBoard({}))
    expect((shot.row + shot.col) % 2).toBe(0)
    for (let i = 0; i < 10; i++) {
      expect(selectShot(makeBoard({}))).toEqual(shot)
    }
  })

  it('only ever fires even-parity cells while searching', () => {
    // A handful of scattered misses; the next search pick stays on parity.
    const shot = selectShot(
      makeBoard({
        shots: [
          { row: 0, col: 0 },
          { row: 2, col: 2 },
          { row: 5, col: 5 },
        ],
      }),
    )
    expect((shot.row + shot.col) % 2).toBe(0)
  })
})

describe('selectShot — targeting via density (§6.2/§6.3, assigned strategy)', () => {
  it('probes an orthogonal neighbor of a single unresolved hit', () => {
    const ship = makeShip({
      size: 3,
      origin: { row: 4, col: 4 },
      orientation: Orientation.Horizontal,
      hits: [{ row: 4, col: 5 }],
    })
    const shot = selectShot(
      makeBoard({ ships: [ship], shots: [{ row: 4, col: 5 }] }),
    )
    const neighbors = new Set([
      key({ row: 3, col: 5 }),
      key({ row: 5, col: 5 }),
      key({ row: 4, col: 4 }),
      key({ row: 4, col: 6 }),
    ])
    expect(neighbors.has(key(shot))).toBe(true)
  })

  it('extends along the axis of two collinear unresolved hits', () => {
    const ship = makeShip({
      size: 3,
      origin: { row: 4, col: 4 },
      orientation: Orientation.Horizontal,
      hits: [
        { row: 4, col: 4 },
        { row: 4, col: 5 },
      ],
    })
    const shot = selectShot(
      makeBoard({
        ships: [ship],
        shots: [
          { row: 4, col: 4 },
          { row: 4, col: 5 },
        ],
      }),
    )
    // Only placements covering both hits are the row-4 extensions; ends
    // (4,3) and (4,6) tie on density, so the fixed tie-break picks (4,3).
    expect(shot).toEqual({ row: 4, col: 3 })
  })

  it('locks onto the collinear line and never fires an unresolved hit', () => {
    const lineShip = makeShip({
      id: 'a',
      size: 4,
      origin: { row: 4, col: 4 },
      orientation: Orientation.Horizontal,
      hits: [
        { row: 4, col: 5 },
        { row: 4, col: 6 },
      ],
    })
    const shot = selectShot(
      makeBoard({
        ships: [lineShip],
        shots: [
          { row: 4, col: 5 },
          { row: 4, col: 6 },
        ],
      }),
    )
    // Open ends of the (4,5)-(4,6) line are (4,4) and (4,7); they tie on
    // density, so the fixed tie-break fires the lower-col end (4,4).
    expect(shot).toEqual({ row: 4, col: 4 })
  })
})

describe('selectShot — reset on sink (§6.4)', () => {
  it('returns to search and stops hunting the sunk ship', () => {
    // Corner destroyer fully hit → sunk → its hits are resolved. The rest of
    // the fleet is still afloat and untouched, so search density is driven by
    // those ships, not by the now-dead corner.
    const sunk = makeShip({
      id: 'destroyer',
      size: 2,
      origin: { row: 0, col: 0 },
      orientation: Orientation.Horizontal,
      hits: [
        { row: 0, col: 0 },
        { row: 0, col: 1 },
      ],
    })
    const afloat: Ship[] = [
      makeShip({ id: 'carrier', size: 5, origin: { row: 9, col: 0 }, orientation: Orientation.Horizontal }),
      makeShip({ id: 'battleship', size: 4, origin: { row: 7, col: 0 }, orientation: Orientation.Horizontal }),
      makeShip({ id: 'cruiser', size: 3, origin: { row: 5, col: 0 }, orientation: Orientation.Horizontal }),
      makeShip({ id: 'submarine', size: 3, origin: { row: 3, col: 0 }, orientation: Orientation.Horizontal }),
    ]
    const shot = selectShot(
      makeBoard({
        ships: [sunk, ...afloat],
        shots: [
          { row: 0, col: 0 },
          { row: 0, col: 1 },
        ],
      }),
    )
    // Back to parity search — never an orthogonal neighbor of the sunk ship.
    expect((shot.row + shot.col) % 2).toBe(0)
    const neighborsOfSunk = new Set([
      key({ row: 1, col: 0 }),
      key({ row: 0, col: 2 }),
      key({ row: 1, col: 1 }),
      key({ row: 1, col: 2 }),
    ])
    expect(neighborsOfSunk.has(key(shot))).toBe(false)
  })
})

describe('selectShot — determinism (§6)', () => {
  it('yields identical coords across repeated calls for identical state', () => {
    const ship = makeShip({
      size: 3,
      origin: { row: 2, col: 2 },
      orientation: Orientation.Horizontal,
      hits: [{ row: 2, col: 3 }],
    })
    const board = makeBoard({ ships: [ship], shots: [{ row: 2, col: 3 }] })
    const first = selectShot(board)
    for (let i = 0; i < 20; i++) {
      expect(selectShot(board)).toEqual(first)
    }
  })
})

describe('selectShot — never double-fires across a full game (required)', () => {
  it('clears a full random fleet without ever repeating a shot', () => {
    // Several deterministic layouts, each played to completion.
    for (const seed of [1, 7, 42, 123, 2024, 99999]) {
      const rng = mulberry32(seed)
      let board = createBoard(generateRandomLayout(rng))
      const fired = new Set<string>()
      let shots = 0

      while (!isFleetDestroyed(board)) {
        const shot = selectShot(board)
        // In bounds.
        expect(shot.row).toBeGreaterThanOrEqual(0)
        expect(shot.row).toBeLessThan(board.height)
        expect(shot.col).toBeGreaterThanOrEqual(0)
        expect(shot.col).toBeLessThan(board.width)
        // Never fired before.
        expect(fired.has(key(shot))).toBe(false)
        fired.add(key(shot))

        const next = resolveShot(board, shot)
        // resolveShot returns the same reference on a rejected/repeat shot.
        expect(next).not.toBe(board)
        board = next

        shots++
        expect(shots).toBeLessThanOrEqual(board.width * board.height)
      }

      // Actually finished the job.
      expect(isFleetDestroyed(board)).toBe(true)
    }
  })
})
