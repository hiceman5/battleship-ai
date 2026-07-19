/**
 * AI benchmark harness (pure TypeScript — no React, no DOM).
 *
 * Plays many full solitaire games against randomly placed fleets and reports
 * how efficiently a shot-selection strategy clears the board. Every fleet
 * layout is derived from a single seed, so a given `(gameCount, seed)` pair
 * reproduces byte-for-byte across runs.
 *
 * This module deliberately implements NO strategy of its own: the strategy is
 * injected by the caller. The `bench` npm script wires in the project's AI
 * (`selectShot`) purely as the CLI's default subject.
 */
import type { Board, Coord } from '../engine/types'
import {
  createBoard,
  generateRandomLayout,
  isFleetDestroyed,
  resolveShot,
} from '../engine'
import type { Rng } from '../engine'
import { selectShot } from './targeting'

/**
 * A shot-selection strategy: given the current board, return the next cell to
 * fire upon. Must be pure and must never return an already-fired coordinate.
 * This matches the signature of the project AI's {@link selectShot}.
 */
export type Strategy = (board: Board) => Coord

/** Aggregate statistics over the shots-to-clear of every benchmarked game. */
export type BenchmarkResult = {
  /** Number of games played. */
  readonly gameCount: number
  /** Seed the run was generated from (reproducible). */
  readonly seed: number
  /** Mean shots taken to clear a fleet. */
  readonly average: number
  /** Median shots to clear. */
  readonly median: number
  /** Fewest shots taken in any single game. */
  readonly best: number
  /** Most shots taken in any single game. */
  readonly worst: number
  /** Population standard deviation of shots to clear. */
  readonly stdDev: number
}

/** Deterministic seeded PRNG (mulberry32) yielding floats in `[0, 1)`. */
function mulberry32(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Play one full game: place a fleet, then fire with `strategy` until every
 * ship is sunk. Returns the number of shots taken to clear the board.
 *
 * Guards against a misbehaving strategy: a repeated/rejected shot (which
 * `resolveShot` returns as the unchanged board) or overshooting the grid
 * throws rather than looping forever.
 */
function playGame(strategy: Strategy, layout: Board): number {
  let board = layout
  const cellCount = board.width * board.height
  let shots = 0

  while (!isFleetDestroyed(board)) {
    const coord = strategy(board)
    const next = resolveShot(board, coord)
    if (next === board) {
      throw new Error(
        `strategy returned an invalid or already-fired shot at (${coord.row}, ${coord.col})`,
      )
    }
    board = next
    shots++
    if (shots > cellCount) {
      throw new Error('strategy failed to clear the board within every cell')
    }
  }

  return shots
}

function mean(values: readonly number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid]
}

function populationStdDev(values: readonly number[]): number {
  const avg = mean(values)
  const variance = mean(values.map((v) => (v - avg) ** 2))
  return Math.sqrt(variance)
}

/**
 * Play `gameCount` full games with `strategy` against fleets randomly placed
 * from `seed`, and report aggregate shots-to-clear statistics.
 *
 * Reproducible: a single seeded RNG drives every layout in sequence, so the
 * same `(gameCount, seed)` always produces the same games and the same result.
 */
export function runBenchmark(
  strategy: Strategy,
  gameCount: number,
  seed: number,
): BenchmarkResult {
  if (!Number.isInteger(gameCount) || gameCount <= 0) {
    throw new Error(`gameCount must be a positive integer, got ${gameCount}`)
  }

  const rng = mulberry32(seed)
  const shotCounts: number[] = []
  for (let i = 0; i < gameCount; i++) {
    const board = createBoard(generateRandomLayout(rng))
    shotCounts.push(playGame(strategy, board))
  }

  return {
    gameCount,
    seed,
    average: mean(shotCounts),
    median: median(shotCounts),
    best: Math.min(...shotCounts),
    worst: Math.max(...shotCounts),
    stdDev: populationStdDev(shotCounts),
  }
}

/** Render a benchmark result as an aligned two-column text table. */
export function formatResultTable(result: BenchmarkResult): string {
  const rows: readonly (readonly [string, string])[] = [
    ['Games', String(result.gameCount)],
    ['Seed', String(result.seed)],
    ['Average', result.average.toFixed(2)],
    ['Median', result.median.toFixed(2)],
    ['Best', String(result.best)],
    ['Worst', String(result.worst)],
    ['Std dev', result.stdDev.toFixed(2)],
  ]

  const labelWidth = Math.max(...rows.map(([label]) => label.length))
  const valueWidth = Math.max(...rows.map(([, value]) => value.length))
  const divider = `+-${'-'.repeat(labelWidth)}-+-${'-'.repeat(valueWidth)}-+`

  const lines = [divider]
  for (const [label, value] of rows) {
    lines.push(
      `| ${label.padEnd(labelWidth)} | ${value.padStart(valueWidth)} |`,
    )
  }
  lines.push(divider)
  return lines.join('\n')
}

/** CLI entry point: `bench [gameCount] [seed]`, benchmarking the project AI. */
function main(argv: readonly string[]): void {
  const gameCount = argv[0] === undefined ? 1000 : Number(argv[0])
  const seed = argv[1] === undefined ? 1 : Number(argv[1])

  if (Number.isNaN(gameCount) || Number.isNaN(seed)) {
    console.error('Usage: bench [gameCount] [seed]')
    process.exitCode = 1
    return
  }

  const result = runBenchmark(selectShot, gameCount, seed)
  console.log(`Battleship AI benchmark — strategy: selectShot`)
  console.log(formatResultTable(result))
}

// Run when invoked directly (e.g. `vite-node src/ai/benchmark.ts` via the
// `bench` script, or a compiled `node benchmark.js`), but stay inert when
// imported as a module. vite-node strips the script path from argv, leaving
// its own bin at argv[1], so match either the bin or the source filename.
const entry = process.argv[1] ?? ''
if (
  entry.endsWith('vite-node') ||
  entry.endsWith('benchmark.ts') ||
  entry.endsWith('benchmark.js')
) {
  main(process.argv.slice(2))
}
