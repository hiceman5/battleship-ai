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
import boardStyles from '@/ui/board/board.module.css'
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
 * ghost preview of the pending ship at the hovered cell: a solid hairline ring
 * when the placement is engine-legal, a dashed outline when illegal (shape, not
 * hue, distinguishes the two — colorblind-safe). Clicking a cell dispatches
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
      className={cn('inline-grid gap-px', boardStyles.grid)}
      style={{
        gridTemplateColumns: `repeat(${board.width}, minmax(0, 1fr))`,
        backgroundColor: 'var(--ui-gap, #d4d4d8)',
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
              style={{
                backgroundColor:
                  cell.state === CellState.Ship
                    ? 'var(--ui-ship, #52525b)'
                    : 'var(--ui-water, #f2f2f2)',
              }}
              className={cn(
                'flex aspect-square w-9 items-center justify-center border text-sm outline-none sm:w-9',
                'border-neutral-300 dark:border-neutral-700',
                selectedType ? 'cursor-pointer' : 'cursor-default',
                ghost === 'valid' &&
                  'ring-2 ring-inset ring-neutral-900 dark:ring-neutral-100',
                ghost === 'invalid' &&
                  'opacity-60 outline outline-2 -outline-offset-2 outline-dashed outline-neutral-500 dark:outline-neutral-400',
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
