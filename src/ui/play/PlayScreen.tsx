import { Player } from '@/engine/types'
import type { GameState } from '@/engine/types'
import type { GameAction } from '@/state/actions'
import { cn } from '@/lib/utils'
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

  const isHumanTurn = state.currentPlayer === Player.Human
  return (
    <div className="flex w-full max-w-4xl flex-col items-center gap-6 rounded-lg border border-border bg-card p-6 text-foreground shadow-sm">
      <Announcer state={state} />
      <div
        className="flex items-center gap-2 rounded-full border border-border bg-background/60 px-4 py-1.5 text-sm text-muted-foreground"
        aria-live="polite"
      >
        <span
          className={cn(
            'inline-block h-2 w-2 rounded-full',
            thinking
              ? 'animate-pulse bg-muted-foreground'
              : isHumanTurn
                ? 'bg-primary'
                : 'bg-muted-foreground',
          )}
          aria-hidden="true"
        />
        {thinking
          ? 'Enemy is thinking…'
          : isHumanTurn
            ? 'Your turn — fire at will'
            : 'Waiting…'}
      </div>
      <div className="flex flex-col items-start gap-8 md:flex-row md:gap-12">
        <section className="flex flex-col items-center gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            Your fleet
          </h2>
          <OwnBoard state={state} />
        </section>
        <section className="flex flex-col items-center gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            Enemy waters
          </h2>
          <EnemyBoard state={state} dispatch={dispatch} disabled={thinking} />
        </section>
      </div>
    </div>
  )
}
