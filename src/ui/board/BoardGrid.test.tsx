import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CellState, type Coord } from '@/engine/types'
import { toLabel } from '@/ui/lib/coord-format'
import { BoardGrid } from './BoardGrid'

const SIZE = 10

function makeGrid(
  overrides: ReadonlyMap<string, CellState> = new Map(),
): CellState[][] {
  return Array.from({ length: SIZE }, (_, row) =>
    Array.from(
      { length: SIZE },
      (_, col) => overrides.get(toLabel({ row, col })) ?? CellState.Empty,
    ),
  )
}

function markerOf(cell: HTMLElement): string | null {
  return (
    cell.querySelector('[data-marker]')?.getAttribute('data-marker') ?? null
  )
}

describe('BoardGrid', () => {
  it('renders a role=grid with 100 gridcells labelled "<label>, <state>"', () => {
    render(<BoardGrid cells={makeGrid()} onFire={vi.fn()} label="Enemy" />)
    expect(screen.getByRole('grid', { name: 'Enemy' })).toBeInTheDocument()
    const cells = screen.getAllByRole('gridcell')
    expect(cells).toHaveLength(100)
    expect(screen.getByLabelText('A1, empty')).toBeInTheDocument()
    expect(screen.getByLabelText('J10, empty')).toBeInTheDocument()
  })

  it('labels each cell by its coordinate and state', () => {
    const overrides = new Map<string, CellState>([
      ['A1', CellState.Miss],
      ['B4', CellState.Hit],
      ['C3', CellState.Sunk],
      ['D2', CellState.Ship],
    ])
    render(<BoardGrid cells={makeGrid(overrides)} onFire={vi.fn()} />)
    expect(screen.getByLabelText('A1, miss')).toBeInTheDocument()
    expect(screen.getByLabelText('B4, hit')).toBeInTheDocument()
    expect(screen.getByLabelText('C3, sunk')).toBeInTheDocument()
    expect(screen.getByLabelText('D2, ship')).toBeInTheDocument()
  })

  it('is a single tab stop (roving tabindex)', () => {
    render(<BoardGrid cells={makeGrid()} onFire={vi.fn()} />)
    const focusable = screen
      .getAllByRole('gridcell')
      .filter((c) => c.getAttribute('tabindex') === '0')
    expect(focusable).toHaveLength(1)
    expect(focusable[0]).toHaveAttribute('aria-label', 'A1, empty')
  })

  it('moves the focus cursor with arrow keys and fires with Enter', () => {
    const onFire = vi.fn()
    render(<BoardGrid cells={makeGrid()} onFire={onFire} />)
    const grid = screen.getByRole('grid')

    fireEvent.keyDown(grid, { key: 'ArrowRight' })
    fireEvent.keyDown(grid, { key: 'ArrowRight' })
    fireEvent.keyDown(grid, { key: 'ArrowDown' })

    expect(screen.getByLabelText('C2, empty')).toHaveFocus()
    // Only the focused cell remains the single tab stop.
    expect(
      screen
        .getAllByRole('gridcell')
        .filter((c) => c.getAttribute('tabindex') === '0'),
    ).toHaveLength(1)

    fireEvent.keyDown(grid, { key: 'Enter' })
    expect(onFire).toHaveBeenCalledTimes(1)
    expect(onFire).toHaveBeenCalledWith<[Coord]>({ row: 1, col: 2 })
  })

  it('fires the focused cell with Space', () => {
    const onFire = vi.fn()
    render(<BoardGrid cells={makeGrid()} onFire={onFire} />)
    const grid = screen.getByRole('grid')
    fireEvent.keyDown(grid, { key: 'ArrowDown' })
    fireEvent.keyDown(grid, { key: ' ' })
    expect(onFire).toHaveBeenCalledWith<[Coord]>({ row: 1, col: 0 })
  })

  it('stays in bounds at the edges', () => {
    const onFire = vi.fn()
    render(<BoardGrid cells={makeGrid()} onFire={onFire} />)
    const grid = screen.getByRole('grid')
    fireEvent.keyDown(grid, { key: 'ArrowUp' })
    fireEvent.keyDown(grid, { key: 'ArrowLeft' })
    fireEvent.keyDown(grid, { key: 'Enter' })
    expect(onFire).toHaveBeenCalledWith<[Coord]>({ row: 0, col: 0 })
  })

  it('fires on click', () => {
    const onFire = vi.fn()
    render(<BoardGrid cells={makeGrid()} onFire={onFire} />)
    fireEvent.click(screen.getByLabelText('E5, empty'))
    expect(onFire).toHaveBeenCalledWith<[Coord]>({ row: 4, col: 4 })
  })

  it('does not fire already-fired cells (derived from state)', () => {
    const onFire = vi.fn()
    const overrides = new Map<string, CellState>([['A1', CellState.Miss]])
    render(<BoardGrid cells={makeGrid(overrides)} onFire={onFire} />)
    const grid = screen.getByRole('grid')

    fireEvent.click(screen.getByLabelText('A1, miss'))
    fireEvent.keyDown(grid, { key: 'Enter' })
    expect(onFire).not.toHaveBeenCalled()
    expect(screen.getByLabelText('A1, miss')).toHaveAttribute(
      'aria-disabled',
      'true',
    )
  })

  it('does not fire when the whole board is non-interactive', () => {
    const onFire = vi.fn()
    render(<BoardGrid cells={makeGrid()} onFire={onFire} interactive={false} />)
    const grid = screen.getByRole('grid')
    fireEvent.click(screen.getByLabelText('A1, empty'))
    fireEvent.keyDown(grid, { key: 'Enter' })
    expect(onFire).not.toHaveBeenCalled()
    expect(grid).toHaveAttribute('aria-disabled', 'true')
  })

  it('honors a custom disabledPredicate', () => {
    const onFire = vi.fn()
    render(
      <BoardGrid
        cells={makeGrid()}
        onFire={onFire}
        disabledPredicate={({ row, col }) => row === 0 && col === 0}
      />,
    )
    fireEvent.click(screen.getByLabelText('A1, empty'))
    expect(onFire).not.toHaveBeenCalled()
    fireEvent.click(screen.getByLabelText('B1, empty'))
    expect(onFire).toHaveBeenCalledWith<[Coord]>({ row: 0, col: 1 })
  })

  it('renders a DISTINCT colorblind-safe marker per state', () => {
    const overrides = new Map<string, CellState>([
      ['A1', CellState.Miss],
      ['A2', CellState.Hit],
      ['A3', CellState.Sunk],
      ['A4', CellState.Ship],
    ])
    render(<BoardGrid cells={makeGrid(overrides)} onFire={vi.fn()} />)

    const miss = markerOf(screen.getByLabelText('A1, miss'))
    const hit = markerOf(screen.getByLabelText('A2, hit'))
    const sunk = markerOf(screen.getByLabelText('A3, sunk'))
    const ship = markerOf(screen.getByLabelText('A4, ship'))

    expect(miss).toBe('dot')
    expect(hit).toBe('cross')
    expect(sunk).toBe('burst')
    expect(ship).toBe('ship')
    expect(new Set([miss, hit, sunk, ship]).size).toBe(4)

    // Empty water has no marker.
    expect(markerOf(screen.getByLabelText('B2, empty'))).toBeNull()
  })
})
