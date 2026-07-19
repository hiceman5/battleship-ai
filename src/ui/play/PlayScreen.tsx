import { Player } from '@/engine/types'
import type { GameState } from '@/engine/types'
import type { GameAction } from '@/state/actions'
import { Announcer } from './Announcer'
import { EnemyBoard } from './EnemyBoard'
import { OwnBoard } from './OwnBoard'
import { useAiTurn } from './useAiTurn'
import { cn } from '@/lib/utils'
import { arcadeHeadline } from '@/ui/lib/arcade'

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

  const yourTurn = !thinking && state.currentPlayer === Player.Human
  const statusText = thinking
    ? 'Enemy is thinking…'
    : yourTurn
      ? 'Your turn — fire at will!'
      : 'Waiting…'

  return (
    <div className="flex flex-col items-center gap-6 text-slate-900 dark:text-slate-50">
      <Announcer state={state} />
      <p
        aria-live="polite"
        className={cn(
          'rounded-full border-[3px] border-black px-5 py-2 text-sm font-black uppercase tracking-wide shadow-[4px_4px_0_0_rgba(0,0,0,1)] dark:border-white dark:shadow-[4px_4px_0_0_rgba(255,255,255,0.85)]',
          thinking
            ? 'bg-fuchsia-600 text-white'
            : yourTurn
              ? 'bg-yellow-400 text-black'
              : 'bg-white text-slate-900 dark:bg-slate-800 dark:text-white',
        )}
      >
        {statusText}
      </p>
      <div className="flex flex-col items-start gap-8 md:flex-row md:gap-12">
        <section className="flex flex-col items-center gap-3">
          <h2
            className={cn(
              arcadeHeadline,
              'rounded-lg bg-indigo-600 px-3 py-1 text-sm text-white',
            )}
          >
            Your fleet
          </h2>
          <OwnBoard state={state} />
        </section>
        <section className="flex flex-col items-center gap-3">
          <h2
            className={cn(
              arcadeHeadline,
              'rounded-lg bg-red-600 px-3 py-1 text-sm text-white',
            )}
          >
            Enemy waters
          </h2>
          <EnemyBoard state={state} dispatch={dispatch} disabled={thinking} />
        </section>
      </div>
    </div>
  )
}
