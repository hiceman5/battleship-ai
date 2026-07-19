/**
 * The single, pure state reducer for the Battleship game loop (SPEC §11).
 *
 * Every state transition flows through here via a {@link GameAction}. This
 * module is PURE and deterministic: it computes shot/sink/win results with the
 * `engine` slice and the AI's target with the `ai` slice, and NEVER imports
 * React or mutates its inputs. Any randomness needed for a reset is injected
 * through the action (SPEC §3.3), never sourced from `Math.random` here.
 */
import { GamePhase, Player } from '../engine/types'
import type { GameState, Ship } from '../engine/types'
import {
  FLEET,
  createBoard,
  createEmptyBoard,
  generateRandomLayout,
  isFleetDestroyed,
  isLegalPlacement,
  resolveShot,
} from '../engine'
import { selectShot } from '../ai'
import { ActionType } from './actions'
import type { GameAction } from './actions'

/** The opponent of `player` (the board a shot from `player` targets). */
function opponentOf(player: Player): Player {
  return player === Player.Human ? Player.Ai : Player.Human
}

/**
 * `PLACE_SHIP` (SPEC §3.2): commit a single human ship if — and only if —
 * the placement is engine-legal. Illegal placements (out of bounds, overlap,
 * touching) and duplicate ship classes are rejected with NO state change: the
 * exact same state reference is returned. Placing the fifth legal ship
 * completes the fleet but does NOT begin play: the game stays in `Setup`
 * until an explicit `START` action (SPEC §3.2). The human fires first (§4).
 */
function placeShip(
  state: GameState,
  payload: Extract<GameAction, { type: ActionType.PlaceShip }>['payload'],
): GameState {
  if (state.phase !== GamePhase.Setup) return state

  const humanBoard = state.boards[Player.Human]
  const { shipType, origin, orientation } = payload

  if (humanBoard.ships.some((s) => s.type === shipType)) return state

  const entry = FLEET.find((e) => e.type === shipType)
  if (!entry) return state

  const ship: Ship = {
    id: shipType,
    type: shipType,
    size: entry.size,
    origin,
    orientation,
    hits: [],
  }

  if (!isLegalPlacement(humanBoard, ship)) return state

  const ships = [...humanBoard.ships, ship]
  const board = createBoard(ships, humanBoard.width, humanBoard.height)

  return {
    ...state,
    boards: { ...state.boards, [Player.Human]: board },
  }
}

/**
 * `START` (SPEC §3.2, §4): begin the game. Valid only in `Setup` and only
 * once the human has legally placed all five ships (otherwise a no-op that
 * returns the same state reference). Lays down the AI fleet with the injected
 * RNG (§3.3), enters `Playing`, and leaves the human to move first (§4).
 */
function start(
  state: GameState,
  payload: Extract<GameAction, { type: ActionType.Start }>['payload'],
): GameState {
  if (state.phase !== GamePhase.Setup) return state
  if (state.boards[Player.Human].ships.length !== FLEET.length) return state

  const aiShips = generateRandomLayout(payload.rng)
  return {
    ...state,
    phase: GamePhase.Playing,
    currentPlayer: Player.Human,
    boards: { ...state.boards, [Player.Ai]: createBoard(aiShips) },
  }
}

/**
 * `CLEAR` (SPEC §3.2): during `Setup`, remove all of the human's placed ships
 * (returning the human board to empty) while leaving phase, current player and
 * the AI board untouched. A no-op outside `Setup`.
 */
function clear(state: GameState): GameState {
  if (state.phase !== GamePhase.Setup) return state

  return {
    ...state,
    boards: { ...state.boards, [Player.Human]: createEmptyBoard() },
  }
}

/**
 * `FIRE` (SPEC §4): resolve the current player's shot on the OPPONENT's board.
 * A fresh hit or miss updates that board and passes the turn; sinking the last
 * ship sets `winner` and `phase = GameOver` (§8). A repeat shot on an
 * already-fired cell is a rejected no-op with NO turn pass (§4.2) — detected
 * via the engine returning the same board reference.
 */
function fire(
  state: GameState,
  payload: Extract<GameAction, { type: ActionType.Fire }>['payload'],
): GameState {
  if (state.phase !== GamePhase.Playing) return state

  const attacker = state.currentPlayer
  const defender = opponentOf(attacker)
  const targetBoard = state.boards[defender]
  const resolved = resolveShot(targetBoard, payload.coord)

  // Repeat shot: engine returns the same reference — no-op, turn does not pass.
  if (resolved === targetBoard) return state

  const boards = { ...state.boards, [defender]: resolved }

  if (isFleetDestroyed(resolved)) {
    return { ...state, boards, winner: attacker, phase: GamePhase.GameOver }
  }

  return { ...state, boards, currentPlayer: defender }
}

/**
 * `AI_TURN` (SPEC §6, §4): ask the AI for a target from the human board's
 * observable state, resolve it against the human board, and toggle the turn.
 * Winning by sinking the human fleet sets `winner` and `phase = GameOver`.
 */
function aiTurn(state: GameState): GameState {
  if (state.phase !== GamePhase.Playing) return state

  const humanBoard = state.boards[Player.Human]
  const coord = selectShot(humanBoard)
  const resolved = resolveShot(humanBoard, coord)
  const boards = { ...state.boards, [Player.Human]: resolved }

  if (isFleetDestroyed(resolved)) {
    return { ...state, boards, winner: Player.Ai, phase: GamePhase.GameOver }
  }

  return { ...state, boards, currentPlayer: opponentOf(state.currentPlayer) }
}

/**
 * `RESET` (SPEC §8 replay): return to `Setup` with the human to move, clear
 * the human fleet, and re-randomize the AI fleet using the injected RNG. No
 * state is persisted; the previous layout is not reused.
 */
function reset(
  payload: Extract<GameAction, { type: ActionType.Reset }>['payload'],
): GameState {
  const aiShips = generateRandomLayout(payload.rng)
  return {
    phase: GamePhase.Setup,
    currentPlayer: Player.Human,
    boards: {
      [Player.Human]: createEmptyBoard(),
      [Player.Ai]: createBoard(aiShips),
    },
    winner: null,
  }
}

/** The pure game reducer (SPEC §11). */
export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case ActionType.PlaceShip:
      return placeShip(state, action.payload)
    case ActionType.Start:
      return start(state, action.payload)
    case ActionType.Clear:
      return clear(state)
    case ActionType.Fire:
      return fire(state, action.payload)
    case ActionType.AiTurn:
      return aiTurn(state)
    case ActionType.Reset:
      return reset(action.payload)
    default:
      return state
  }
}
