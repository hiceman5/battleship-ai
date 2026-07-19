import { forwardRef } from 'react'
import { CellState, type Coord } from '@/engine/types'
import { cn } from '@/lib/utils'
import { CellMarker } from './markers'

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
        'flex aspect-square w-8 items-center justify-center border border-slate-300 text-sm outline-none dark:border-slate-700',
        'focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-0',
        state === CellState.Empty && 'bg-sky-50 dark:bg-slate-900',
        state === CellState.Miss && 'bg-sky-100 dark:bg-slate-800',
        (state === CellState.Hit || state === CellState.Sunk) &&
          'bg-red-100 dark:bg-red-950',
        state === CellState.Ship && 'bg-slate-200 dark:bg-slate-700',
        disabled ? 'cursor-not-allowed' : 'cursor-pointer hover:brightness-95',
      )}
    >
      <CellMarker state={state} />
    </div>
  )
})
