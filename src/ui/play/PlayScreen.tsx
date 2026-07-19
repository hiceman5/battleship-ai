import { Player } from '@/engine/types'
import type { GameState } from '@/engine/types'
import type { GameAction } from '@/state/actions'
import { Announcer } from './Announcer'
import { EnemyBoard } from './EnemyBoard'
import { OwnBoard } from './OwnBoard'
import { useAiTurn } from './useAiTurn'

export type PlayScreenProps = {
  readonly state: GameState
  readonly dispatch: (action: GameAction) => void
  /** Overridable AI pacing delay (SPEC §7) — handy for tests. */
  readonly aiDelayMs?: number
}

/**
 * The Play screen (SPEC §4, §5, §7): two boards side-by-side on desktop and
 * stacked on narrow screens, an `aria-live` announcer, and AI turn pacing.
 * Presentation only — it dispatches actions and renders state.
 */
export function PlayScreen({ state, dispatch, aiDelayMs }: PlayScreenProps) {
  const { thinking } = useAiTurn(state, dispatch, aiDelayMs)

  return (
    <div className="flex flex-col items-center gap-6 text-slate-900 dark:text-slate-200">
      <Announcer state={state} />
      <p className="text-sm text-slate-500 dark:text-slate-400" aria-live="polite">
        {thinking
          ? 'Enemy is thinking…'
          : state.currentPlayer === Player.Human
            ? 'Your turn — fire at will'
            : 'Waiting…'}
      </p>
      <div className="flex flex-col items-start gap-8 md:flex-row md:gap-12">
        <section className="flex flex-col items-center gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide">
            Your fleet
          </h2>
          <OwnBoard state={state} />
        </section>
        <section className="flex flex-col items-center gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide">
            Enemy waters
          </h2>
          <EnemyBoard state={state} dispatch={dispatch} disabled={thinking} />
        </section>
      </div>
    </div>
  )
}
