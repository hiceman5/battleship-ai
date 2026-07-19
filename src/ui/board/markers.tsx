import { CellState } from '@/engine/types'
import { cn } from '@/lib/utils'

/**
 * Colorblind-safe cell markers (SPEC 9): hit/miss/sunk are distinguished by
 * SHAPE/ICON, not color alone. Each marker carries a distinct `data-marker`
 * attribute so its identity is verifiable independent of color.
 *
 * Presentation only: these components render given state, they never decide it.
 */

type MarkerProps = {
  readonly className?: string
}

/** Miss: a bold ringed dot (splash). */
function DotMarker({ className }: MarkerProps) {
  return (
    <svg
      data-marker="dot"
      viewBox="0 0 24 24"
      className={cn('h-3.5 w-3.5 text-slate-800 dark:text-sky-200', className)}
      aria-hidden="true"
      focusable="false"
    >
      <circle
        cx="12"
        cy="12"
        r="8"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        opacity="0.5"
      />
      <circle cx="12" cy="12" r="4" fill="currentColor" />
    </svg>
  )
}

/** Hit: a bold white ✕ / cross that pops on the vivid red fill. */
function CrossMarker({ className }: MarkerProps) {
  return (
    <svg
      data-marker="cross"
      viewBox="0 0 24 24"
      className={cn(
        'h-5 w-5 text-white [filter:drop-shadow(0_1px_1px_rgba(0,0,0,0.55))]',
        className,
      )}
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M5 5 L19 19 M19 5 L5 19"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  )
}

/** Sunk: a filled gold burst — dramatic and celebratory on the near-black fill. */
function BurstMarker({ className }: MarkerProps) {
  return (
    <svg
      data-marker="burst"
      viewBox="0 0 24 24"
      className={cn(
        'h-5 w-5 text-yellow-300 [filter:drop-shadow(0_1px_1px_rgba(0,0,0,0.6))]',
        className,
      )}
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M12 1 L14.6 8.2 L21.8 6.2 L17.4 12 L21.8 17.8 L14.6 15.8 L12 23 L9.4 15.8 L2.2 17.8 L6.6 12 L2.2 6.2 L9.4 8.2 Z"
        fill="currentColor"
      />
    </svg>
  )
}

/** Own ship (visible on the human's own board): a filled square. */
function ShipMarker({ className }: MarkerProps) {
  return (
    <svg
      data-marker="ship"
      viewBox="0 0 24 24"
      className={cn(
        'h-4 w-4 text-white dark:text-indigo-950',
        className,
      )}
      aria-hidden="true"
      focusable="false"
    >
      <rect x="4" y="4" width="16" height="16" rx="3" fill="currentColor" />
    </svg>
  )
}

/** Render the colorblind-safe marker for a given cell state, or nothing for empty water. */
export function CellMarker({
  state,
  className,
}: {
  readonly state: CellState
  readonly className?: string
}) {
  switch (state) {
    case CellState.Miss:
      return <DotMarker className={className} />
    case CellState.Hit:
      return <CrossMarker className={className} />
    case CellState.Sunk:
      return <BurstMarker className={className} />
    case CellState.Ship:
      return <ShipMarker className={className} />
    case CellState.Empty:
    default:
      return null
  }
}
