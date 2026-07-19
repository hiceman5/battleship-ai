import { act, render, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { GamePhase } from '@/engine/types'
import { GameProvider, useGame } from './GameProvider'
import { clear } from './actions'

describe('GameProvider (SPEC §11)', () => {
  it('exposes a reducer-backed store starting in Setup', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <GameProvider>{children}</GameProvider>
    )
    const { result } = renderHook(() => useGame(), { wrapper })

    expect(result.current.state.phase).toBe(GamePhase.Setup)
    expect(typeof result.current.dispatch).toBe('function')
  })

  it('routes state transitions through the reducer via dispatch', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <GameProvider>{children}</GameProvider>
    )
    const { result } = renderHook(() => useGame(), { wrapper })

    // CLEAR is a Setup-phase no-op that still exercises the dispatch path
    // and returns a valid Setup state.
    act(() => {
      result.current.dispatch(clear())
    })
    expect(result.current.state.phase).toBe(GamePhase.Setup)
  })

  it('throws when useGame is used outside a GameProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    function Bad() {
      useGame()
      return null
    }
    expect(() => render(<Bad />)).toThrow(/within a GameProvider/i)
    spy.mockRestore()
  })
})
