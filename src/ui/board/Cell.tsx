import { forwardRef } from 'react'
import { CellState, type Coord } from '@/engine/types'
import { cn } from '@/lib/utils'
import { CellMarker } from './markers'
import styles from './cell.module.css'

/** ARCADE fill classes per state (re-expressing SPEC §10 fills inside src/ui). */
const FILL_CLASS: Readonly<Record<CellState, string>> = {
  [CellState.Empty]: styles.empty,
  [CellState.Miss]: styles.miss,
  [CellState.Ship]: styles.ship,
  [CellState.Hit]: styles.hit,
  [CellState.Sunk]: styles.sunk,
}

export type CellProps = {
  readonly coord: Coord
  readonly state: CellState
  /** Display label for this cell, e.g. "B4". */
  readonly label: string
  /** Whether this cell is the current roving-tabindex target (single tab stop). */
  readonly isFocusTarget: boolean
  /** Disabled cells (already-fired or non-interactive board) never fire. */
  readonly disabled: boolean
  readonly onFire: () => void
  readonly onFocusCell: () => void
}

/**
 * A single board cell (SPEC 9). Presentation only: it renders the given state
 * and reports intent via callbacks — it never decides hits/misses.
 */
export const Cell = forwardRef<HTMLDivElement, CellProps>(function Cell(
  { state, label, isFocusTarget, disabled, onFire, onFocusCell },
  ref,
) {
  return (
    <div
      ref={ref}
      role="gridcell"
      aria-label={`${label}, ${state}`}
      aria-disabled={disabled || undefined}
      data-coord={label}
      data-state={state}
      tabIndex={isFocusTarget ? 0 : -1}
      onFocus={onFocusCell}
      onClick={() => {
        if (!disabled) onFire()
      }}
      className={cn(
        'relative flex aspect-square w-8 items-center justify-center rounded-[3px] text-sm outline-none transition-transform',
        'focus-visible:relative focus-visible:z-10 focus-visible:ring-4 focus-visible:ring-fuchsia-500 focus-visible:ring-offset-0',
        FILL_CLASS[state],
        disabled
          ? 'cursor-not-allowed'
          : 'cursor-pointer hover:z-10 hover:scale-[1.08] hover:brightness-110 hover:ring-2 hover:ring-inset hover:ring-yellow-300',
      )}
    >
      <CellMarker state={state} />
    </div>
  )
})
