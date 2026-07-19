import { useEffect, useRef, useState } from 'react'
import { Player } from '@/engine/types'
import type { Board, GameState, Ship } from '@/engine/types'
import { isSunk } from '@/engine'

/** Human-readable ship name for announcements, e.g. `cruiser` -> "Cruiser". */
function shipName(ship: Ship): string {
  const type = ship.type as string
  return type.charAt(0).toUpperCase() + type.slice(1)
}

/** The ids of the ships on `board` that are currently sunk. */
function sunkShipIds(board: Board): ReadonlySet<string> {
  return new Set(board.ships.filter(isSunk).map((s) => s.id))
}

/** Ships on `board` that became sunk relative to `previous`. */
function newlySunk(board: Board, previous: ReadonlySet<string>): Ship[] {
  return board.ships.filter((s) => isSunk(s) && !previous.has(s.id))
}

/**
 * Announce sinks by ship IDENTITY (SPEC §5) through an `aria-live="polite"`
 * region: "You sank the enemy Cruiser" when the human sinks an AI ship, and
 * "Your Battleship was sunk" when the AI sinks a human ship.
 *
 * Newly-sunk ships are derived by diffing sunk status across renders — this is
 * display logic, not a game rule.
 */
export function Announcer({ state }: { readonly state: GameState }) {
  const [message, setMessage] = useState('')
  const prevAi = useRef<ReadonlySet<string>>(new Set())
  const prevHuman = useRef<ReadonlySet<string>>(new Set())

  useEffect(() => {
    const aiBoard = state.boards[Player.Ai]
    const humanBoard = state.boards[Player.Human]

    const announcements = [
      ...newlySunk(aiBoard, prevAi.current).map(
        (s) => `You sank the enemy ${shipName(s)}`,
      ),
      ...newlySunk(humanBoard, prevHuman.current).map(
        (s) => `Your ${shipName(s)} was sunk`,
      ),
    ]

    prevAi.current = sunkShipIds(aiBoard)
    prevHuman.current = sunkShipIds(humanBoard)

    if (announcements.length > 0) {
      setMessage(announcements.join('. '))
    }
  }, [state])

  return (
    <div role="status" aria-live="polite" className="sr-only">
      {message}
    </div>
  )
}
