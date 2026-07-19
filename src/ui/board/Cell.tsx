import { forwardRef } from 'react'
import { type CellState, type Coord } from '@/engine/types'
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
        'relative flex aspect-square w-8 items-center justify-center border text-sm outline-none transition-[filter]',
        'focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        disabled ? 'cursor-not-allowed' : 'cursor-pointer hover:brightness-105',
      )}
    >
      <CellMarker state={state} />
    </div>
  )
})
