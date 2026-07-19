import { useEffect, useRef } from 'react'
import { CellState, Player } from '@/engine/types'
import type { Board, GameState } from '@/engine/types'
import type { Rng } from '@/engine'
import { reset } from '@/state/actions'
import type { GameAction } from '@/state/actions'
import { EnemyBoard } from '@/ui/play/EnemyBoard'
import { OwnBoard } from '@/ui/play/OwnBoard'
import { cn } from '@/lib/utils'
import { arcadeButton, arcadeButtonPrimary } from '@/ui/lib/arcade'

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
    <div className="flex flex-col items-center gap-6 text-slate-900 dark:text-slate-50">
      <div
        className={cn(
          'flex flex-col items-center gap-2 rounded-3xl border-[4px] border-black px-8 py-5 text-center',
          'shadow-[8px_8px_0_0_rgba(0,0,0,1)] dark:border-white dark:shadow-[8px_8px_0_0_rgba(255,255,255,0.9)]',
          humanWon
            ? 'bg-yellow-400'
            : 'bg-slate-900 dark:bg-slate-800',
        )}
      >
        <p
          className={cn(
            'text-xs font-black uppercase tracking-[0.35em]',
            humanWon ? 'text-fuchsia-700' : 'text-fuchsia-300',
          )}
        >
          {humanWon ? 'Victory' : 'Defeated'}
        </p>
        <h1
          ref={headingRef}
          tabIndex={-1}
          className={cn(
            'text-5xl font-black uppercase tracking-tight outline-none',
            humanWon ? 'text-black' : 'text-white',
          )}
        >
          {humanWon ? 'You win!' : 'You lose'}
        </h1>
      </div>

      <dl
        className="flex flex-wrap justify-center gap-4 text-center"
        aria-label="Your firing summary"
      >
        {(
          [
            ['Shots', String(stats.shots), 'bg-indigo-600'],
            ['Hits', String(stats.hits), 'bg-red-600'],
            ['Accuracy', `${accuracyPct}%`, 'bg-emerald-600'],
          ] as const
        ).map(([label, value, accent]) => (
          <div
            key={label}
            className={cn(
              'min-w-[7rem] rounded-2xl border-[3px] border-black px-5 py-3',
              accent,
              'text-white shadow-[4px_4px_0_0_rgba(0,0,0,1)] dark:border-white dark:shadow-[4px_4px_0_0_rgba(255,255,255,0.85)]',
            )}
          >
            <dt className="text-[10px] font-black uppercase tracking-widest opacity-90">
              {label}
            </dt>
            <dd className="text-3xl font-black tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-col items-start gap-8 md:flex-row md:gap-12">
        <section className="flex flex-col items-center gap-3">
          <h2 className="rounded-lg bg-indigo-600 px-3 py-1 text-sm font-black uppercase tracking-wide text-white">
            Your fleet
          </h2>
          <OwnBoard state={state} />
        </section>
        <section className="flex flex-col items-center gap-3">
          <h2 className="rounded-lg bg-red-600 px-3 py-1 text-sm font-black uppercase tracking-wide text-white">
            Enemy fleet
          </h2>
          <EnemyBoard state={state} dispatch={dispatch} label="Enemy fleet" />
        </section>
      </div>

      <button
        type="button"
        onClick={() => dispatch(reset(rng))}
        className={cn(arcadeButton, arcadeButtonPrimary, 'px-8 py-3 text-lg')}
      >
        Play again
      </button>
    </div>
  )
}
