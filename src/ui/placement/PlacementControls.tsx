import { useCallback } from 'react'
import { Orientation, Player, type GameState } from '@/engine/types'
import { FLEET, generateRandomLayout, type Rng } from '@/engine'
import { clear, placeShip, start, type GameAction } from '@/state/actions'
import { cn } from '@/lib/utils'
import {
  arcadeButton,
  arcadeButtonNeutral,
  arcadeButtonPrimary,
} from '@/ui/lib/arcade'

export type PlacementControlsProps = {
  readonly state: GameState
  readonly dispatch: (action: GameAction) => void
  /** The current pending orientation (shown on the rotate button). */
  readonly orientation: Orientation
  /** Toggle the pending orientation (SPEC §3.2 rotate). */
  readonly onRotate: () => void
  /** Called after Clear/Randomize so the parent can reset transient selection. */
  readonly onReset?: () => void
  /**
   * Injectable RNG (SPEC §3.2, §3.3) so tests can pin the Randomize layout and
   * the AI's Start layout. Defaults to `Math.random`.
   */
  readonly rng?: Rng
}

const buttonClass = cn(arcadeButton, arcadeButtonNeutral)

/**
 * The Setup-phase action bar (SPEC §3.2): rotate the pending ship, randomize a
 * full legal layout, clear all placed ships, and start the game. Every mutation
 * flows through the reducer via actions — this component holds no game rules and
 * never mutates state directly.
 */
export function PlacementControls({
  state,
  dispatch,
  orientation,
  onRotate,
  onReset,
  rng = Math.random,
}: PlacementControlsProps) {
  const placedCount = state.boards[Player.Human].ships.length
  const allPlaced = placedCount === FLEET.length

  const handleRandomize = useCallback(() => {
    // Clear first, then commit a fresh full legal layout, one ship per action.
    const layout = generateRandomLayout(rng)
    dispatch(clear())
    for (const ship of layout) {
      dispatch(placeShip(ship.type, ship.origin, ship.orientation))
    }
    onReset?.()
  }, [rng, dispatch, onReset])

  const handleClear = useCallback(() => {
    dispatch(clear())
    onReset?.()
  }, [dispatch, onReset])

  const handleStart = useCallback(() => {
    dispatch(start(rng))
  }, [dispatch, rng])

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={onRotate}
        data-orientation={orientation}
        className={buttonClass}
      >
        Rotate:{' '}
        {orientation === Orientation.Horizontal ? 'Horizontal' : 'Vertical'}
      </button>
      <button type="button" onClick={handleRandomize} className={buttonClass}>
        Randomize
      </button>
      <button type="button" onClick={handleClear} className={buttonClass}>
        Clear
      </button>
      <button
        type="button"
        onClick={handleStart}
        disabled={!allPlaced}
        className={cn(arcadeButton, arcadeButtonPrimary, 'px-6 text-base')}
      >
        Start
      </button>
    </div>
  )
}
