import { useEffect } from 'react'
import { Player, type GameState } from '@/engine/types'
import { FLEET, type Rng } from '@/engine'
import { type GameAction } from '@/state/actions'
import { ShipTray } from './ShipTray'
import { PlacementBoard } from './PlacementBoard'
import { PlacementControls } from './PlacementControls'
import { usePlacement } from './usePlacement'

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
      className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-2 py-8 text-foreground"
    >
      <header className="flex flex-col gap-3 border-b border-neutral-200 pb-6 dark:border-neutral-800">
        <span className="text-xs font-medium uppercase tracking-[0.3em] text-muted-foreground">
          Setup
        </span>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Place your fleet
        </h1>
        <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
          Select a ship, press{' '}
          <kbd className="rounded-sm border border-neutral-300 px-1.5 font-mono text-xs dark:border-neutral-700">
            R
          </kbd>{' '}
          or Rotate to turn it, then click a cell.
        </p>
        <p className="text-sm font-medium tabular-nums">
          <span className="text-2xl font-bold">{placedCount}</span>
          <span className="text-muted-foreground">
            {' '}
            / {FLEET.length} ships placed
          </span>
        </p>
      </header>

      <div className="flex flex-col gap-10 md:flex-row md:items-start">
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
