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
    <ul
      aria-label="Fleet"
      className={cn(
        'flex flex-col gap-2 rounded-2xl border-[3px] border-black bg-cyan-50 p-3',
        'shadow-[6px_6px_0_0_rgba(0,0,0,1)]',
        'dark:border-white dark:bg-slate-900 dark:shadow-[6px_6px_0_0_rgba(255,255,255,0.9)]',
      )}
    >
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
                'flex w-full items-center justify-between gap-3 rounded-xl border-[3px] px-3 py-2 text-left text-sm font-extrabold transition-all',
                'border-black bg-white text-slate-900 shadow-[3px_3px_0_0_rgba(0,0,0,1)]',
                'dark:border-white dark:bg-slate-800 dark:text-white dark:shadow-[3px_3px_0_0_rgba(255,255,255,0.85)]',
                'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-fuchsia-500',
                !isPlaced &&
                  'cursor-pointer hover:-translate-y-0.5 hover:bg-yellow-100 dark:hover:bg-slate-700',
                isSelected &&
                  '-translate-y-0.5 bg-fuchsia-600 text-white shadow-[3px_3px_0_0_rgba(0,0,0,1)] dark:bg-fuchsia-500 dark:text-white',
                isPlaced &&
                  'cursor-not-allowed opacity-60 line-through shadow-none',
              )}
            >
              <span className="uppercase tracking-wide">
                {SHIP_LABELS[entry.type]}
              </span>
              <span className="text-xs tabular-nums opacity-80">
                {'▮'.repeat(entry.size)} {entry.size}
              </span>
              <span
                data-status={isPlaced ? 'placed' : 'remaining'}
                className={cn(
                  'rounded-full border-2 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider',
                  isPlaced
                    ? 'border-emerald-700 bg-emerald-400 text-emerald-950'
                    : 'border-black bg-yellow-300 text-black dark:border-white',
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
