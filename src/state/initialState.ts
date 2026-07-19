/**
 * The starting {@link GameState} for a new game (SPEC §11, §4).
 *
 * The game opens in the `Setup` phase with the human to move (the human
 * always fires first, §4) and empty boards for both players. The AI fleet is
 * laid down later via the `RESET` action using an injectable RNG (§3.3, §8),
 * so the initial state stays deterministic and persistence-free.
 */
import { GamePhase, Player } from '../engine/types'
import type { GameState } from '../engine/types'
import { createEmptyBoard } from '../engine'

/** Build a fresh, empty `Setup`-phase state (both boards empty). */
export function createInitialState(): GameState {
  return {
    phase: GamePhase.Setup,
    currentPlayer: Player.Human,
    boards: {
      [Player.Human]: createEmptyBoard(),
      [Player.Ai]: createEmptyBoard(),
    },
    winner: null,
  }
}

/** The canonical initial state (SPEC §11). */
export const initialState: GameState = createInitialState()
