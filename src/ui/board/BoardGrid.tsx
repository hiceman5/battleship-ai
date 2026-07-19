import { useCallback, useRef, useState } from 'react'
import { CellState, type Coord } from '@/engine/types'
import { cn } from '@/lib/utils'
import { toLabel } from '@/ui/lib/coord-format'
import { Cell } from './Cell'
import styles from './board.module.css'

/** Cell states that represent a cell that has already been fired upon. */
const FIRED_STATES: ReadonlySet<CellState> = new Set([
  CellState.Hit,
  CellState.Miss,
  CellState.Sunk,
])

export type BoardGridProps = {
  /** A grid of cell states, row-major. Expected 10x10 but any rectangular grid renders. */
  readonly cells: readonly (readonly CellState[])[]
  /** Reports the fired coordinate. The grid never decides hit/miss — it only reports intent. */
  readonly onFire: (coord: Coord) => void
  /** When false the whole board is non-interactive (SPEC 4.2 / 5.1). Defaults to true. */
  readonly interactive?: boolean
  /**
   * Optional predicate marking a cell as already-fired/disabled. When omitted,
   * cells whose state is Hit/Miss/Sunk are treated as already fired.
   */
  readonly disabledPredicate?: (coord: Coord) => boolean
  /** Accessible name for the grid, e.g. "Enemy waters". */
  readonly label?: string
  readonly className?: string
}

/**
 * Shared presentational 10x10 board grid (SPEC 1, 9). Renders `role="grid"`
 * with `role="gridcell"` cells, a roving tabindex (single tab stop with
 * arrow-key navigation), and colorblind-safe markers. Contains NO game rules:
 * it renders the given cell states and reports the fired coord via `onFire`.
 */
export function BoardGrid({
  cells,
  onFire,
  interactive = true,
  disabledPredicate,
  label,
  className,
}: BoardGridProps) {
  const rowCount = cells.length
  const colCount = rowCount > 0 ? cells[0].length : 0

  const cellRefs = useRef<Map<string, HTMLDivElement | null>>(new Map())
  const [focused, setFocused] = useState<Coord>({ row: 0, col: 0 })

  const isDisabled = useCallback(
    (coord: Coord): boolean => {
      if (!interactive) return true
      if (disabledPredicate) return disabledPredicate(coord)
      return FIRED_STATES.has(cells[coord.row][coord.col])
    },
    [interactive, disabledPredicate, cells],
  )

  const focusCell = useCallback((coord: Coord) => {
    setFocused(coord)
    cellRefs.current.get(toLabel(coord))?.focus()
  }, [])

  const fire = useCallback(
    (coord: Coord) => {
      if (isDisabled(coord)) return
      onFire(coord)
    },
    [isDisabled, onFire],
  )

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      let next: Coord | null = null
      switch (event.key) {
        case 'ArrowUp':
          next = { row: Math.max(0, focused.row - 1), col: focused.col }
          break
        case 'ArrowDown':
          next = {
            row: Math.min(rowCount - 1, focused.row + 1),
            col: focused.col,
          }
          break
        case 'ArrowLeft':
          next = { row: focused.row, col: Math.max(0, focused.col - 1) }
          break
        case 'ArrowRight':
          next = {
            row: focused.row,
            col: Math.min(colCount - 1, focused.col + 1),
          }
          break
        case 'Home':
          next = { row: focused.row, col: 0 }
          break
        case 'End':
          next = { row: focused.row, col: colCount - 1 }
          break
        case 'Enter':
        case ' ':
        case 'Spacebar':
          event.preventDefault()
          fire(focused)
          return
        default:
          return
      }
      event.preventDefault()
      if (next && (next.row !== focused.row || next.col !== focused.col)) {
        focusCell(next)
      }
    },
    [focused, rowCount, colCount, fire, focusCell],
  )

  return (
    <div
      role="grid"
      aria-label={label}
      aria-disabled={!interactive || undefined}
      onKeyDown={handleKeyDown}
      className={cn('inline-grid gap-px', styles.grid, className)}
      style={{
        gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))`,
        backgroundColor: 'var(--ui-gap, #d4d4d8)',
      }}
    >
      {cells.map((row, r) =>
        row.map((state, c) => {
          const coord: Coord = { row: r, col: c }
          const isFocusTarget = focused.row === r && focused.col === c
          return (
            <Cell
              key={toLabel(coord)}
              ref={(node) => {
                cellRefs.current.set(toLabel(coord), node)
              }}
              coord={coord}
              state={state}
              label={toLabel(coord)}
              isFocusTarget={isFocusTarget}
              disabled={isDisabled(coord)}
              onFire={() => fire(coord)}
              onFocusCell={() => setFocused(coord)}
            />
          )
        }),
      )}
    </div>
  )
}
