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
    <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-10 py-8 text-foreground">
      <Announcer state={state} />
      <div
        className="flex flex-col items-center gap-2 border-b border-neutral-200 pb-6 dark:border-neutral-800"
        aria-live="polite"
      >
        <span className="text-xs font-medium uppercase tracking-[0.3em] text-muted-foreground">
          {thinking ? 'Enemy turn' : 'Your turn'}
        </span>
        <p className="text-2xl font-bold tracking-tight sm:text-3xl">
          {thinking
            ? 'Enemy is thinking…'
            : state.currentPlayer === Player.Human
              ? 'Fire at will'
              : 'Waiting…'}
        </p>
      </div>
      <div className="flex flex-col items-start gap-10 md:flex-row md:gap-16">
        <section className="flex flex-col items-center gap-3">
          <h2 className="text-xs font-medium uppercase tracking-[0.3em] text-muted-foreground">
            Your fleet
          </h2>
          <OwnBoard state={state} />
        </section>
        <section className="flex flex-col items-center gap-3">
          <h2 className="text-xs font-medium uppercase tracking-[0.3em] text-muted-foreground">
            Enemy waters
          </h2>
          <EnemyBoard state={state} dispatch={dispatch} disabled={thinking} />
        </section>
      </div>
    </div>
  )
}
