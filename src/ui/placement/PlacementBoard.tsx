import { useCallback } from 'react'
import {
  CellState,
  Orientation,
  Player,
  type Coord,
  type GameState,
  type Ship,
  type ShipType,
} from '@/engine/types'
import { FLEET, cellsFor, isLegalPlacement } from '@/engine'
import { placeShip, type GameAction } from '@/state/actions'
import { toLabel } from '@/ui/lib/coord-format'
import { CellMarker } from '@/ui/board/markers'
import cellStyles from '@/ui/board/cell.module.css'
import { cn } from '@/lib/utils'

export type PlacementBoardProps = {
  readonly state: GameState
  readonly dispatch: (action: GameAction) => void
  /** The ship class pending placement, or `null`. */
  readonly selectedType: ShipType | null
  /** Orientation the pending ship will use. */
  readonly orientation: Orientation
  /** The hovered cell driving the ghost preview, or `null`. */
  readonly hover: Coord | null
  /** Report a hovered cell for the ghost preview. */
  readonly onHover: (coord: Coord) => void
  /** Clear the ghost preview (pointer left the board). */
  readonly onClearHover: () => void
  /** Notify the parent that a ship was committed (to clear the selection). */
  readonly onPlaced?: (type: ShipType) => void
}

function keyOf(coord: Coord): string {
  return `${coord.row},${coord.col}`
}

/**
 * Build the pending {@link Ship} for a candidate origin. This is DISPLAY logic
 * only (SPEC §3.2): it lets us reuse the engine's `cellsFor`/`isLegalPlacement`
 * to render a valid/invalid ghost — it introduces no new game rule.
 */
function pendingShipAt(
  type: ShipType,
  origin: Coord,
  orientation: Orientation,
): Ship {
  const size = FLEET.find((e) => e.type === type)?.size ?? 0
  return { id: type, type, size, origin, orientation, hits: [] }
}

/**
 * The human's board during Setup (SPEC §3.2). Renders the placed fleet plus a
 * ghost preview of the pending ship at the hovered cell: emerald when the
 * placement is engine-legal, red hatch when illegal. Clicking a cell dispatches
 * `PLACE_SHIP` ONLY when `isLegalPlacement` passes — illegal targets are never
 * committed and simply surface the invalid indicator. Contains no game rules.
 */
export function PlacementBoard({
  state,
  dispatch,
  selectedType,
  orientation,
  hover,
  onHover,
  onClearHover,
  onPlaced,
}: PlacementBoardProps) {
  const board = state.boards[Player.Human]

  const pendingShip =
    selectedType && hover
      ? pendingShipAt(selectedType, hover, orientation)
      : null
  const previewValid = pendingShip
    ? isLegalPlacement(board, pendingShip)
    : false
  const previewCells = new Set(
    pendingShip ? cellsFor(pendingShip).map(keyOf) : [],
  )

  const handleClick = useCallback(
    (origin: Coord) => {
      if (!selectedType) return
      const ship = pendingShipAt(selectedType, origin, orientation)
      if (!isLegalPlacement(board, ship)) return
      dispatch(placeShip(selectedType, origin, orientation))
      onPlaced?.(selectedType)
    },
    [selectedType, orientation, board, dispatch, onPlaced],
  )

  return (
    <div
      role="grid"
      aria-label="Your waters"
      onMouseLeave={onClearHover}
      className={cn(
        'inline-grid gap-[3px] rounded-2xl border-[3px] border-black bg-black p-[3px]',
        'shadow-[6px_6px_0_0_rgba(0,0,0,1)]',
        'dark:border-white dark:bg-white dark:shadow-[6px_6px_0_0_rgba(255,255,255,0.9)]',
      )}
      style={{
        gridTemplateColumns: `repeat(${board.width}, minmax(0, 1fr))`,
      }}
    >
      {board.cells.map((row, r) =>
        row.map((cell, c) => {
          const coord: Coord = { row: r, col: c }
          const label = toLabel(coord)
          const isPreview = previewCells.has(keyOf(coord))
          const ghost = isPreview
            ? previewValid
              ? 'valid'
              : 'invalid'
            : undefined
          return (
            <div
              key={label}
              role="gridcell"
              aria-label={`${label}, ${cell.state}`}
              data-coord={label}
              data-state={cell.state}
              data-ghost={ghost}
              onMouseEnter={() => onHover(coord)}
              onClick={() => handleClick(coord)}
              className={cn(
                'flex aspect-square w-9 items-center justify-center rounded-[3px] text-sm outline-none transition-transform sm:w-9',
                !ghost && cell.state === CellState.Ship && cellStyles.ship,
                !ghost && cell.state !== CellState.Ship && cellStyles.empty,
                selectedType
                  ? 'cursor-pointer hover:z-10 hover:ring-2 hover:ring-inset hover:ring-yellow-300'
                  : 'cursor-default',
                ghost === 'valid' &&
                  'z-10 scale-105 bg-emerald-300 ring-[3px] ring-inset ring-emerald-600 dark:bg-emerald-500/40 dark:ring-emerald-400',
                ghost === 'invalid' &&
                  'z-10 scale-105 bg-red-300 ring-[3px] ring-inset ring-red-600 dark:bg-red-500/40 dark:ring-red-400',
              )}
            >
              <CellMarker state={cell.state} />
            </div>
          )
        }),
      )}
    </div>
  )
}
