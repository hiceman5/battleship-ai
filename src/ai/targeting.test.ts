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

function key(c: Coord): string {
  return `${c.row},${c.col}`
}

/** The standard five-ship fleet, all unplaced-hits, positions irrelevant. */
function fullFleet(): Ship[] {
  return [
    makeShip({ id: 'carrier', size: 5, origin: { row: 0, col: 0 }, orientation: Orientation.Horizontal }),
    makeShip({ id: 'battleship', size: 4, origin: { row: 2, col: 0 }, orientation: Orientation.Horizontal }),
    makeShip({ id: 'cruiser', size: 3, origin: { row: 4, col: 0 }, orientation: Orientation.Horizontal }),
    makeShip({ id: 'submarine', size: 3, origin: { row: 6, col: 0 }, orientation: Orientation.Horizontal }),
    makeShip({ id: 'destroyer', size: 2, origin: { row: 8, col: 0 }, orientation: Orientation.Horizontal }),
  ]
}

describe('selectShot — density search mode (no unresolved hits)', () => {
  it('opens on the maximum-density central cell of an empty board', () => {
    // With the full fleet and no evidence, density peaks at the centre; the
    // fixed tie-break (lowest row, then col) resolves the central plateau.
    const shot = selectShot(makeBoard({ ships: fullFleet() }))
    expect(shot).toEqual({ row: 4, col: 4 })
  })

  it('never fires an already-fired cell and stays in bounds', () => {
    const shots: Coord[] = [
      { row: 4, col: 4 },
      { row: 5, col: 5 },
    ]
    const shot = selectShot(makeBoard({ ships: fullFleet(), shots }))
    expect(shots.map(key)).not.toContain(key(shot))
    expect(shot.row).toBeGreaterThanOrEqual(0)
    expect(shot.row).toBeLessThan(SIZE)
    expect(shot.col).toBeGreaterThanOrEqual(0)
    expect(shot.col).toBeLessThan(SIZE)
  })
})

describe('selectShot — density target mode (unresolved hits present)', () => {
  it('concentrates on an orthogonal neighbor of a single unresolved hit', () => {
    const ship = makeShip({
      size: 3,
      origin: { row: 4, col: 4 },
      orientation: Orientation.Horizontal,
      hits: [{ row: 4, col: 5 }],
    })
    const shot = selectShot(
      makeBoard({ ships: [ship], shots: [{ row: 4, col: 5 }] }),
    )
    // Only placements covering the hit contribute, so the densest un-fired
    // cell is orthogonally adjacent to it. Tie-break picks (3,5).
    const manhattan = Math.abs(shot.row - 4) + Math.abs(shot.col - 5)
    expect(manhattan).toBe(1)
    expect(shot).toEqual({ row: 3, col: 5 })
  })

  it('extends the axis of two collinear unresolved hits toward an open end', () => {
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
    // Only horizontal placements can cover both hits; the open ends (4,4) and
    // (4,7) carry the most heat. Tie-break resolves to (4,4).
    expect([key({ row: 4, col: 4 }), key({ row: 4, col: 7 })]).toContain(
      key(shot),
    )
    expect(shot).toEqual({ row: 4, col: 4 })
  })
})

describe('selectShot — determinism', () => {
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

describe('selectShot — reset on sink (required test 2)', () => {
  it('returns to open search after a sink, not probing the dead ship', () => {
    // Destroyer sunk in the top-left corner; the rest of the fleet is intact
    // with no hits, so there are no unresolved hits.
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
    const others = [
      makeShip({ id: 'carrier', size: 5, origin: { row: 9, col: 0 }, orientation: Orientation.Horizontal }),
      makeShip({ id: 'battleship', size: 4, origin: { row: 7, col: 0 }, orientation: Orientation.Horizontal }),
      makeShip({ id: 'cruiser', size: 3, origin: { row: 5, col: 0 }, orientation: Orientation.Horizontal }),
      makeShip({ id: 'submarine', size: 3, origin: { row: 3, col: 0 }, orientation: Orientation.Horizontal }),
    ]
    const shot = selectShot(
      makeBoard({
        ships: [sunk, ...others],
        shots: [
          { row: 0, col: 0 },
          { row: 0, col: 1 },
        ],
      }),
    )

    // Back to open search: the densest cell is central, and crucially the AI
    // does NOT keep probing the neighbourhood of the now-sunk destroyer.
    expect(shot).toEqual({ row: 4, col: 4 })
    const sunkNeighborhood = new Set<string>()
    for (const cell of [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
    ]) {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          sunkNeighborhood.add(key({ row: cell.row + dr, col: cell.col + dc }))
        }
      }
    }
    expect(sunkNeighborhood.has(key(shot))).toBe(false)
  })
})

describe('selectShot — full simulated game (required test 1)', () => {
  it('never fires the same cell twice and clears a known fleet layout', () => {
    // A concrete legal layout (respecting the no-touch rule) played to the end.
    const layout: { size: number; cells: Coord[] }[] = [
      { size: 5, cells: [0, 1, 2, 3, 4].map((c) => ({ row: 0, col: c })) },
      { size: 4, cells: [0, 1, 2, 3].map((c) => ({ row: 2, col: c })) },
      { size: 3, cells: [0, 1, 2].map((r) => ({ row: r + 4, col: 9 })) },
      { size: 3, cells: [5, 6, 7].map((c) => ({ row: 9, col: c })) },
      { size: 2, cells: [4, 5].map((r) => ({ row: r, col: 0 })) },
    ]
    const cellOwner = new Map<string, number>()
    layout.forEach((ship, i) => ship.cells.forEach((c) => cellOwner.set(key(c), i)))
    const totalShipCells = layout.reduce((n, s) => n + s.size, 0)

    let shots: Coord[] = []
    const hitsByShip: Coord[][] = layout.map(() => [])
    const fired = new Set<string>()

    let hitCount = 0
    for (let turn = 0; turn < SIZE * SIZE + 1; turn++) {
      if (hitCount === totalShipCells) break

      const ships = layout.map((ship, i) =>
        makeShip({
          id: String(i),
          size: ship.size,
          origin: ship.cells[0],
          orientation:
            ship.cells[0].row === ship.cells[1].row
              ? Orientation.Horizontal
              : Orientation.Vertical,
          hits: [...hitsByShip[i]],
        }),
      )
      const board = makeBoard({ ships, shots: [...shots] })

      const shot = selectShot(board)
      const k = key(shot)
      // Required assertion: never fire the same cell twice.
      expect(fired.has(k)).toBe(false)

      fired.add(k)
      shots = [...shots, shot]
      const owner = cellOwner.get(k)
      if (owner !== undefined) {
        hitsByShip[owner] = [...hitsByShip[owner], shot]
        hitCount++
      }
    }

    // The AI actually finished the job (every ship cell hit).
    expect(hitCount).toBe(totalShipCells)
    // And it never wasted a shot on a repeat.
    expect(fired.size).toBe(shots.length)
  })
})
