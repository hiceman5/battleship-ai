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
    <ul aria-label="Fleet" className="flex flex-col gap-1.5">
      {FLEET.map((entry) => {
        const isPlaced = placed.has(entry.type)
        const isSelected = selectedType === entry.type
        return (
          <li key={entry.type}>
            <button
              type="button"
              disabled={isPlaced}
              aria-pressed={isSelected}
              data-ship={entry.type}
              data-placed={isPlaced || undefined}
              onClick={() => onSelect(entry.type)}
              className={cn(
                'flex w-full items-center justify-between gap-3 rounded-md border px-3 py-2 text-left text-sm transition-colors',
                'border-border bg-background/60 text-foreground',
                !isPlaced &&
                  'cursor-pointer hover:border-primary/60 hover:bg-primary/5',
                isSelected &&
                  'border-primary/70 bg-primary/10 ring-1 ring-primary/50',
                isPlaced && 'cursor-not-allowed opacity-55 line-through',
              )}
            >
              <span className="font-medium">{SHIP_LABELS[entry.type]}</span>
              <span className="text-xs tabular-nums opacity-70">
                {'▮'.repeat(entry.size)} {entry.size}
              </span>
              <span
                data-status={isPlaced ? 'placed' : 'remaining'}
                className={cn(
                  'rounded px-1.5 py-0.5 text-[0.7rem] font-medium uppercase tracking-wide',
                  isPlaced
                    ? 'bg-primary/15 text-primary'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                {isPlaced ? 'Placed' : 'Remaining'}
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
