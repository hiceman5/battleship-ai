import { useEffect, useRef } from 'react'
import { CellState, Player } from '@/engine/types'
import type { Board, GameState } from '@/engine/types'
import type { Rng } from '@/engine'
import { reset } from '@/state/actions'
import type { GameAction } from '@/state/actions'
import { cn } from '@/lib/utils'
import { EnemyBoard } from '@/ui/play/EnemyBoard'
import { OwnBoard } from '@/ui/play/OwnBoard'

/** Human firing stats (SPEC §8) derived from the AI board's shot results. */
type Stats = {
  readonly shots: number
  readonly hits: number
  readonly accuracy: number
}

/**
 * Human shots land on the AI board, so its `shots` and resulting cell states
 * yield shots-fired / hits / accuracy. Display logic, not a game rule.
 */
function humanStats(enemyBoard: Board): Stats {
  const shots = enemyBoard.shots.length
  const hits = enemyBoard.shots.filter((coord) => {
    const s = enemyBoard.cells[coord.row][coord.col].state
    return s === CellState.Hit || s === CellState.Sunk
  }).length
  const accuracy = shots === 0 ? 0 : hits / shots
  return { shots, hits, accuracy }
}

export type GameOverScreenProps = {
  readonly state: GameState
  readonly dispatch: (action: GameAction) => void
  /** Injectable RNG for the new game's AI layout (SPEC §3.3, §8). */
  readonly rng?: Rng
}

/**
 * The game-over screen (SPEC §8): a Win/Lose headline from `state.winner`, the
 * human's shots/hits/accuracy summary, the REVEALED boards, and a "Play again"
 * button that dispatches `RESET`. On mount, focus moves to the headline so
 * keyboard and screen-reader users are not stranded (SPEC §9).
 */
export function GameOverScreen({
  state,
  dispatch,
  rng = Math.random,
}: GameOverScreenProps) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  const humanWon = state.winner === Player.Human
  const stats = humanStats(state.boards[Player.Ai])
  const accuracyPct = Math.round(stats.accuracy * 100)

  return (
    <div className="flex w-full max-w-4xl flex-col items-center gap-6 rounded-lg border border-border bg-card p-8 text-foreground shadow-sm">
      <div className="flex flex-col items-center gap-1">
        <span className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          {humanWon ? 'Victory' : 'Defeat'}
        </span>
        <h1
          ref={headingRef}
          tabIndex={-1}
          className={cn(
            'text-4xl font-bold tracking-tight outline-none',
            humanWon ? 'text-primary' : 'text-foreground',
          )}
        >
          {humanWon ? 'You win!' : 'You lose'}
        </h1>
      </div>

      <dl className="flex gap-6 text-center" aria-label="Your firing summary">
        {(
          [
            ['Shots', stats.shots],
            ['Hits', stats.hits],
            ['Accuracy', `${accuracyPct}%`],
          ] as const
        ).map(([label, value]) => (
          <div
            key={label}
            className="min-w-24 rounded-md border border-border bg-background/60 px-4 py-3"
          >
            <dt className="text-[0.7rem] uppercase tracking-[0.12em] text-muted-foreground">
              {label}
            </dt>
            <dd className="text-2xl font-semibold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-col items-start gap-8 md:flex-row md:gap-12">
        <section className="flex flex-col items-center gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            Your fleet
          </h2>
          <OwnBoard state={state} />
        </section>
        <section className="flex flex-col items-center gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            Enemy fleet
          </h2>
          <EnemyBoard state={state} dispatch={dispatch} label="Enemy fleet" />
        </section>
      </div>

      <button
        type="button"
        onClick={() => dispatch(reset(rng))}
        className="rounded-md border border-primary bg-primary px-6 py-2 font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        Play again
      </button>
    </div>
  )
}
