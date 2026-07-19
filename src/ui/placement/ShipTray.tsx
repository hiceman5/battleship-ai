import { Player, type GameState, ShipType } from '@/engine/types'
import { FLEET } from '@/engine'
import { cn } from '@/lib/utils'

export type ShipTrayProps = {
  readonly state: GameState
  /** The ship class currently selected for placement, or `null`. */
  readonly selectedType: ShipType | null
  /** Select a ship class to place next. */
  readonly onSelect: (type: ShipType) => void
}

/** Human-readable label for a ship class. */
const SHIP_LABELS: Readonly<Record<ShipType, string>> = {
  [ShipType.Carrier]: 'Carrier',
  [ShipType.Battleship]: 'Battleship',
  [ShipType.Cruiser]: 'Cruiser',
  [ShipType.Submarine]: 'Submarine',
  [ShipType.Destroyer]: 'Destroyer',
}

/**
 * Lists the five ship classes (SPEC §2, §3.2), showing which are already placed
 * versus remaining, and lets the human select the next ship to place. Placed
 * ships are non-selectable; selecting a remaining ship makes it the pending
 * placement. Presentation only — it never mutates game state.
 */
export function ShipTray({ state, selectedType, onSelect }: ShipTrayProps) {
  const placed = new Set(state.boards[Player.Human].ships.map((s) => s.type))

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-xs font-medium uppercase tracking-[0.3em] text-muted-foreground">
        Fleet
      </h2>
      <ul aria-label="Fleet" className="flex flex-col">
        {FLEET.map((entry) => {
          const isPlaced = placed.has(entry.type)
          const isSelected = selectedType === entry.type
          return (
            <li
              key={entry.type}
              className="border-b border-neutral-200 last:border-b-0 dark:border-neutral-800"
            >
              <button
                type="button"
                disabled={isPlaced}
                aria-pressed={isSelected}
                data-ship={entry.type}
                data-placed={isPlaced || undefined}
                onClick={() => onSelect(entry.type)}
                className={cn(
                  'group flex w-full items-center justify-between gap-3 border-l-2 px-3 py-3 text-left transition-colors',
                  'border-l-transparent text-foreground',
                  !isPlaced &&
                    'cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-900',
                  isSelected &&
                    'border-l-neutral-900 bg-neutral-100 dark:border-l-neutral-100 dark:bg-neutral-900',
                  isPlaced && 'cursor-not-allowed opacity-45',
                )}
              >
                <span className="flex flex-col gap-0.5">
                  <span
                    className={cn(
                      'text-sm font-semibold tracking-tight',
                      isPlaced && 'line-through',
                    )}
                  >
                    {SHIP_LABELS[entry.type]}
                  </span>
                  <span className="font-mono text-xs tabular-nums text-muted-foreground">
                    {'▮'.repeat(entry.size)} {entry.size}
                  </span>
                </span>
                <span
                  data-status={isPlaced ? 'placed' : 'remaining'}
                  className={cn(
                    'text-[0.65rem] font-semibold uppercase tracking-wider',
                    isPlaced
                      ? 'text-foreground'
                      : 'text-muted-foreground',
                  )}
                >
                  {isPlaced ? '● Placed' : '○ Remaining'}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
