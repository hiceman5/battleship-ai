import { useEffect } from 'react'
import { GamePhase, Player } from '@/engine/types'
import type { GameState } from '@/engine/types'
import { aiTurn } from '@/state/actions'
import type { GameAction } from '@/state/actions'

/** Default pacing delay before the AI's shot resolves (SPEC §7). */
export const DEFAULT_AI_DELAY_MS = 500

/**
 * Turn pacing (SPEC §7): after the human's shot resolves and it becomes the
 * AI's turn, wait a short delay (in a disabled "thinking" state) then dispatch
 * `AI_TURN`. The delay is injectable so tests can drive it with fake timers.
 *
 * Returns `{ thinking }` — true while the game is waiting on the AI's move, so
 * the caller can disable the enemy board.
 */
export function useAiTurn(
  state: GameState,
  dispatch: (action: GameAction) => void,
  delayMs: number = DEFAULT_AI_DELAY_MS,
): { readonly thinking: boolean } {
  const isAiTurn =
    state.phase === GamePhase.Playing && state.currentPlayer === Player.Ai

  useEffect(() => {
    if (!isAiTurn) return
    const id = setTimeout(() => dispatch(aiTurn()), delayMs)
    return () => clearTimeout(id)
  }, [isAiTurn, delayMs, dispatch])

  return { thinking: isAiTurn }
}
