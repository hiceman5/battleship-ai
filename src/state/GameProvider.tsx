import { createContext, useContext, useReducer } from 'react'
import type { ReactNode } from 'react'
import type { GameState } from '@/engine/types'
import { gameReducer } from './gameReducer'
import { createInitialState } from './initialState'
import type { GameAction } from './actions'

/**
 * The single React store for the app (SPEC §11). Holds the game state in a
 * `useReducer(gameReducer, createInitialState())` and exposes `{ state,
 * dispatch }` through context. This is UI wiring: every state transition still
 * flows through the pure reducer via dispatched actions.
 */
export type GameContextValue = {
  readonly state: GameState
  readonly dispatch: (action: GameAction) => void
}

const GameContext = createContext<GameContextValue | null>(null)

export type GameProviderProps = {
  readonly children: ReactNode
}

/** Provides the reducer-backed game store to the tree. */
export function GameProvider({ children }: GameProviderProps) {
  const [state, dispatch] = useReducer(gameReducer, undefined, createInitialState)
  return (
    <GameContext.Provider value={{ state, dispatch }}>
      {children}
    </GameContext.Provider>
  )
}

/** Access the game store. Must be used within a {@link GameProvider}. */
// eslint-disable-next-line react-refresh/only-export-components
export function useGame(): GameContextValue {
  const ctx = useContext(GameContext)
  if (!ctx) {
    throw new Error('useGame must be used within a GameProvider')
  }
  return ctx
}
