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

describe('selectShot — search mode (§6.1)', () => {
  it('picks the lowest even-parity, not-yet-fired cell by tie-break', () => {
    const shot = selectShot(makeBoard({}))
    // (0,0): row+col even → lowest by tie-break.
    expect(shot).toEqual({ row: 0, col: 0 })
  })

  it('only fires on even-parity cells (never odd parity)', () => {
    const shot = selectShot(makeBoard({}))
    expect((shot.row + shot.col) % 2).toBe(0)
  })

  it('skips already-fired parity cells', () => {
    const shot = selectShot(
      makeBoard({
        shots: [
          { row: 0, col: 0 },
          { row: 0, col: 2 },
        ],
      }),
    )
    // (0,1) is odd parity → skipped; next even cell is (0,4).
    expect(shot).toEqual({ row: 0, col: 4 })
  })
})

describe('selectShot — hunt mode (§6.2)', () => {
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
    // Neighbors of (4,5): (3,5),(5,5),(4,4),(4,6). Lowest by tie-break: (3,5).
    expect(shot).toEqual({ row: 3, col: 5 })
  })

  it('skips out-of-bounds and already-fired neighbors', () => {
    // Hit at top-left corner: only (1,0) and (0,1) are in bounds.
    const ship = makeShip({
      size: 2,
      origin: { row: 0, col: 0 },
      orientation: Orientation.Vertical,
      hits: [{ row: 0, col: 0 }],
    })
    const shot = selectShot(
      makeBoard({
        ships: [ship],
        shots: [
          { row: 0, col: 0 },
          { row: 0, col: 1 },
        ],
      }),
    )
    // (0,1) fired, (-1,0)/(0,-1) OOB → only (1,0) remains.
    expect(shot).toEqual({ row: 1, col: 0 })
  })
})

describe('selectShot — target mode (§6.3)', () => {
  it('fires an open end of a horizontal collinear pair', () => {
    const ship = makeShip({
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
        ships: [ship],
        shots: [
          { row: 4, col: 5 },
          { row: 4, col: 6 },
        ],
      }),
    )
    // Ends: (4,4) and (4,7). Lowest col → (4,4).
    expect(shot).toEqual({ row: 4, col: 4 })
  })

  it('fires the other open end when the lower end is already fired', () => {
    const ship = makeShip({
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
        ships: [ship],
        shots: [
          { row: 4, col: 4 },
          { row: 4, col: 5 },
          { row: 4, col: 6 },
        ],
      }),
    )
    expect(shot).toEqual({ row: 4, col: 7 })
  })

  it('fires an open end of a vertical collinear pair', () => {
    const ship = makeShip({
      size: 3,
      origin: { row: 3, col: 2 },
      orientation: Orientation.Vertical,
      hits: [
        { row: 3, col: 2 },
        { row: 4, col: 2 },
      ],
    })
    const shot = selectShot(
      makeBoard({
        ships: [ship],
        shots: [
          { row: 3, col: 2 },
          { row: 4, col: 2 },
        ],
      }),
    )
    // Ends: (2,2) and (5,2). Lowest row → (2,2).
    expect(shot).toEqual({ row: 2, col: 2 })
  })

  it('locks onto the collinear line and ignores a non-collinear stray hit', () => {
    // Two collinear hits (row 4) plus a stray hit on another un-sunk ship.
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
    const strayShip = makeShip({
      id: 'b',
      size: 3,
      origin: { row: 8, col: 8 },
      orientation: Orientation.Horizontal,
      hits: [{ row: 8, col: 9 }],
    })
    const shot = selectShot(
      makeBoard({
        ships: [lineShip, strayShip],
        shots: [
          { row: 4, col: 5 },
          { row: 4, col: 6 },
          { row: 8, col: 9 },
        ],
      }),
    )
    // Should extend the row-4 line, not probe the stray.
    expect(shot).toEqual({ row: 4, col: 4 })
  })
})

describe('selectShot — reset on sink (§6.4)', () => {
  it('returns a search move after the ship sinks (no leftover hunting)', () => {
    // Destroyer fully hit → sunk → its hits are resolved.
    const sunk = makeShip({
      size: 2,
      origin: { row: 4, col: 4 },
      orientation: Orientation.Horizontal,
      hits: [
        { row: 4, col: 4 },
        { row: 4, col: 5 },
      ],
    })
    const shot = selectShot(
      makeBoard({
        ships: [sunk],
        shots: [
          { row: 4, col: 4 },
          { row: 4, col: 5 },
        ],
      }),
    )
    // No unresolved hits → search mode → lowest parity cell (0,0).
    expect(shot).toEqual({ row: 0, col: 0 })
    expect((shot.row + shot.col) % 2).toBe(0)
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

describe('selectShot — never returns an already-fired cell (§6, task 7)', () => {
  it('never selects a fired coord across a full simulated game', () => {
    // Place a single ship; the AI must sink it and never repeat a shot.
    const shipCells: Coord[] = [
      { row: 5, col: 2 },
      { row: 5, col: 3 },
      { row: 5, col: 4 },
    ]
    const shipCellSet = new Set(shipCells.map((c) => `${c.row},${c.col}`))

    let shots: Coord[] = []
    let hits: Coord[] = []

    for (let turn = 0; turn < 200; turn++) {
      const sunk = hits.length >= shipCells.length
      const ship = makeShip({
        size: shipCells.length,
        origin: { row: 5, col: 2 },
        orientation: Orientation.Horizontal,
        hits: [...hits],
      })
      const board = makeBoard({ ships: [ship], shots: [...shots] })

      // Once the ship is sunk the game would be over; stop.
      if (sunk) break

      const firedSet = new Set(shots.map((c) => `${c.row},${c.col}`))
      const shot = selectShot(board)
      const key = `${shot.row},${shot.col}`
      expect(firedSet.has(key)).toBe(false)

      shots = [...shots, shot]
      if (shipCellSet.has(key)) hits = [...hits, shot]
    }

    // The AI actually finished the job.
    expect(hits.length).toBe(shipCells.length)
  })
})
