import { useEffect, useRef } from 'react'
import { CellState, Player } from '@/engine/types'
import type { Board, GameState } from '@/engine/types'
import type { Rng } from '@/engine'
import { reset } from '@/state/actions'
import type { GameAction } from '@/state/actions'
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
    <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-10 py-8 text-foreground">
      <div className="flex flex-col items-center gap-3 border-b border-neutral-200 pb-8 dark:border-neutral-800">
        <span className="text-xs font-medium uppercase tracking-[0.3em] text-muted-foreground">
          Game over
        </span>
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="text-5xl font-bold tracking-tight outline-none sm:text-6xl"
        >
          {humanWon ? 'You win!' : 'You lose'}
        </h1>
      </div>

      <dl
        className="grid grid-cols-3 divide-x divide-neutral-200 dark:divide-neutral-800"
        aria-label="Your firing summary"
      >
        <div className="flex flex-col items-center gap-1 px-8">
          <dt className="text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
            Shots
          </dt>
          <dd className="text-4xl font-bold tabular-nums">{stats.shots}</dd>
        </div>
        <div className="flex flex-col items-center gap-1 px-8">
          <dt className="text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
            Hits
          </dt>
          <dd className="text-4xl font-bold tabular-nums">{stats.hits}</dd>
        </div>
        <div className="flex flex-col items-center gap-1 px-8">
          <dt className="text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
            Accuracy
          </dt>
          <dd className="text-4xl font-bold tabular-nums">{accuracyPct}%</dd>
        </div>
      </dl>

      <div className="flex flex-col items-start gap-10 md:flex-row md:gap-16">
        <section className="flex flex-col items-center gap-3">
          <h2 className="text-xs font-medium uppercase tracking-[0.3em] text-muted-foreground">
            Your fleet
          </h2>
          <OwnBoard state={state} />
        </section>
        <section className="flex flex-col items-center gap-3">
          <h2 className="text-xs font-medium uppercase tracking-[0.3em] text-muted-foreground">
            Enemy fleet
          </h2>
          <EnemyBoard state={state} dispatch={dispatch} label="Enemy fleet" />
        </section>
      </div>

      <button
        type="button"
        onClick={() => dispatch(reset(rng))}
        className="rounded-none border border-neutral-900 bg-neutral-900 px-8 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-50 transition-colors hover:bg-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300 dark:focus-visible:ring-neutral-100"
      >
        Play again
      </button>
    </div>
  )
}
