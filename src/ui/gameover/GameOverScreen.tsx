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
    <div className="flex flex-col items-center gap-6 text-slate-900 dark:text-slate-200">
      <h1
        ref={headingRef}
        tabIndex={-1}
        className="text-4xl font-bold tracking-tight outline-none"
      >
        {humanWon ? 'You win!' : 'You lose'}
      </h1>

      <dl className="flex gap-8 text-center" aria-label="Your firing summary">
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Shots
          </dt>
          <dd className="text-2xl font-semibold">{stats.shots}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Hits
          </dt>
          <dd className="text-2xl font-semibold">{stats.hits}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Accuracy
          </dt>
          <dd className="text-2xl font-semibold">{accuracyPct}%</dd>
        </div>
      </dl>

      <div className="flex flex-col items-start gap-8 md:flex-row md:gap-12">
        <section className="flex flex-col items-center gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide">
            Your fleet
          </h2>
          <OwnBoard state={state} />
        </section>
        <section className="flex flex-col items-center gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide">
            Enemy fleet
          </h2>
          <EnemyBoard state={state} dispatch={dispatch} label="Enemy fleet" />
        </section>
      </div>

      <button
        type="button"
        onClick={() => dispatch(reset(rng))}
        className="rounded-md bg-cyan-700 px-6 py-2 font-semibold text-white shadow-sm transition-colors hover:bg-cyan-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 dark:bg-cyan-400 dark:text-slate-900 dark:hover:bg-cyan-300"
      >
        Play again
      </button>
    </div>
  )
}
