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
 * Near-monochrome greyscale fill per cell state. Applied as an inline style so
 * it overrides the unlayered global `background-color` rules in `src/index.css`
 * (out of scope to edit). The values are dark-aware CSS variables defined in
 * `board.module.css` on the grid container, so light/dark mode keep working.
 */
function fillVar(state: CellState): string | undefined {
  switch (state) {
    case CellState.Empty:
    case CellState.Miss:
      return 'var(--ui-water, #f2f2f2)'
    case CellState.Ship:
      return 'var(--ui-ship, #52525b)'
    case CellState.Hit:
      return 'var(--ui-hit, #d4d4d8)'
    case CellState.Sunk:
      return 'var(--ui-sunk, #171717)'
    default:
      return undefined
  }
}

/**
 * A single board cell (SPEC §9). Presentation only: it renders the given state
 * and reports intent via callbacks — it never decides hits/misses. The visual
 * treatment is a quiet, editorial greyscale: flat fills, hairline borders, and
 * colorblind-safe marker SHAPES (dot / ✕ / burst / block) carry the meaning.
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
      style={{ backgroundColor: fillVar(state) }}
      className={cn(
        'flex aspect-square w-8 items-center justify-center text-sm outline-none',
        'border border-neutral-300 dark:border-neutral-700',
        'focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-0 dark:focus-visible:ring-neutral-100',
        disabled ? 'cursor-not-allowed' : 'cursor-pointer hover:brightness-95',
      )}
    >
      <CellMarker state={state} />
    </div>
  )
})
