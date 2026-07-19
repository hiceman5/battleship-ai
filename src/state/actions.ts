/**
 * Redux-style actions for the Battleship game loop (SPEC §11).
 *
 * UI components only ever dispatch these actions; every state transition is
 * resolved by the pure reducer in `gameReducer.ts`. This module is pure
 * TypeScript — it must never import React.
 */
import type { Coord, Orientation, ShipType } from '../engine/types'
import type { Rng } from '../engine'

/** The four action kinds that drive the game (SPEC §11). */
export enum ActionType {
  PlaceShip = 'PLACE_SHIP',
  Fire = 'FIRE',
  AiTurn = 'AI_TURN',
  Reset = 'RESET',
}

/**
 * Commit a single human ship placement during the `Setup` phase (SPEC §3.2).
 * Only completed, legal placements reach the reducer; transient placement
 * state (selected ship, pending orientation, hover cell) stays UI-local.
 */
export type PlaceShipAction = {
  readonly type: ActionType.PlaceShip
  readonly payload: {
    readonly shipType: ShipType
    readonly origin: Coord
    readonly orientation: Orientation
  }
}

/** Fire the current player's single shot at `coord` on the opponent board. */
export type FireAction = {
  readonly type: ActionType.Fire
  readonly payload: {
    readonly coord: Coord
  }
}

/** Let the AI take its turn (SPEC §6): it derives its own target coord. */
export type AiTurnAction = {
  readonly type: ActionType.AiTurn
}

/**
 * Start a fresh game (SPEC §8 replay): back to `Setup`, human fleet cleared,
 * AI fleet re-randomized with the injected RNG so tests can pin layouts.
 */
export type ResetAction = {
  readonly type: ActionType.Reset
  readonly payload: {
    readonly rng: Rng
  }
}

/** The full discriminated union of game actions. */
export type GameAction =
  | PlaceShipAction
  | FireAction
  | AiTurnAction
  | ResetAction

/** Create a {@link PlaceShipAction}. */
export function placeShip(
  shipType: ShipType,
  origin: Coord,
  orientation: Orientation,
): PlaceShipAction {
  return { type: ActionType.PlaceShip, payload: { shipType, origin, orientation } }
}

/** Create a {@link FireAction}. */
export function fire(coord: Coord): FireAction {
  return { type: ActionType.Fire, payload: { coord } }
}

/** Create an {@link AiTurnAction}. */
export function aiTurn(): AiTurnAction {
  return { type: ActionType.AiTurn }
}

/** Create a {@link ResetAction} with the injectable RNG (SPEC §3.3, §8). */
export function reset(rng: Rng): ResetAction {
  return { type: ActionType.Reset, payload: { rng } }
}
