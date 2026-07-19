import { useEffect } from 'react'
import { Player, type GameState } from '@/engine/types'
import { FLEET, type Rng } from '@/engine'
import { type GameAction } from '@/state/actions'
import { ShipTray } from './ShipTray'
import { PlacementBoard } from './PlacementBoard'
import { PlacementControls } from './PlacementControls'
import { usePlacement } from './usePlacement'
import { arcadeHeadline } from '@/ui/lib/arcade'
import { cn } from '@/lib/utils'

export type PlacementScreenProps = {
  readonly state: GameState
  readonly dispatch: (action: GameAction) => void
  /**
   * Injectable RNG (SPEC §3.2, §3.3) forwarded to Randomize/Start so tests can
   * pin layouts. Defaults to `Math.random`.
   */
  readonly rng?: Rng
}

/**
 * The Setup-phase Placement screen (SPEC §3.2). Owns the transient placement
 * UI state via {@link usePlacement} and composes {@link ShipTray},
 * {@link PlacementBoard} and {@link PlacementControls} around the reducer-owned
 * `{ state, dispatch }`. It dispatches actions and renders state only.
 */
export function PlacementScreen({
  state,
  dispatch,
  rng = Math.random,
}: PlacementScreenProps) {
  const placement = usePlacement()
  const {
    selectedType,
    orientation,
    hover,
    selectShip,
    rotate,
    setHover,
    clearHover,
    clearSelection,
  } = placement

  // `R` rotates the pending ship (SPEC §3.2). Keyboard is a first-class input.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'r' || event.key === 'R') rotate()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [rotate])

  const placedCount = state.boards[Player.Human].ships.length

  return (
    <section
      aria-label="Ship placement"
      className="flex w-full max-w-5xl flex-col gap-6 p-2 text-slate-900 dark:text-slate-50 sm:p-4"
    >
      <header className="flex flex-col gap-2">
        <h1 className={cn(arcadeHeadline, 'text-3xl sm:text-4xl')}>
          <span className="text-fuchsia-600 dark:text-fuchsia-400">Place</span>{' '}
          your fleet
        </h1>
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
          Select a ship, press{' '}
          <kbd className="rounded-md border-2 border-black bg-yellow-300 px-1.5 font-black text-black shadow-[2px_2px_0_0_rgba(0,0,0,1)] dark:border-white">
            R
          </kbd>{' '}
          or Rotate to turn it, then click a cell.{' '}
          <span className="rounded-full bg-fuchsia-600 px-2 py-0.5 font-black text-white">
            {placedCount}/{FLEET.length}
          </span>{' '}
          ships placed.
        </p>
      </header>

      <div className="flex flex-col gap-6 md:flex-row md:items-start">
        <div className="md:w-56 md:shrink-0">
          <ShipTray
            state={state}
            selectedType={selectedType}
            onSelect={selectShip}
          />
        </div>

        <div className="flex flex-col gap-4">
          <PlacementBoard
            state={state}
            dispatch={dispatch}
            selectedType={selectedType}
            orientation={orientation}
            hover={hover}
            onHover={setHover}
            onClearHover={clearHover}
            onPlaced={clearSelection}
          />
          <PlacementControls
            state={state}
            dispatch={dispatch}
            orientation={orientation}
            onRotate={rotate}
            onReset={clearSelection}
            rng={rng}
          />
        </div>
      </div>
    </section>
  )
}
