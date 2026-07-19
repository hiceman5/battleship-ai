/**
 * Shared type definitions for the Battleship game.
 *
 * This module is intentionally types-only: no runtime logic, no functions,
 * no implementations. Per AGENTS.md these types are edited only by explicit
 * instruction.
 */

/** Orientation of a ship on the board. */
export enum Orientation {
  Horizontal = 'horizontal',
  Vertical = 'vertical',
}

/** The two participants in a game. */
export enum Player {
  Human = 'human',
  Ai = 'ai',
}

/** The high-level phase the game is currently in. */
export enum GamePhase {
  Setup = 'setup',
  Playing = 'playing',
  GameOver = 'game-over',
}

/** The classic Battleship ship classes and their lengths. */
export enum ShipType {
  Carrier = 'carrier',
  Battleship = 'battleship',
  Cruiser = 'cruiser',
  Submarine = 'submarine',
  Destroyer = 'destroyer',
}

/** The rendered/logical state of a single board cell. */
export enum CellState {
  Empty = 'empty',
  Ship = 'ship',
  Hit = 'hit',
  Miss = 'miss',
  Sunk = 'sunk',
}

/** A zero-indexed coordinate on the board grid. */
export type Coord = {
  readonly row: number
  readonly col: number
}

/** A single ship, its placement, and which of its cells have been hit. */
export type Ship = {
  readonly id: string
  readonly type: ShipType
  readonly size: number
  /** Top-left-most cell of the ship. */
  readonly origin: Coord
  readonly orientation: Orientation
  /** Coordinates that have been hit so far. */
  readonly hits: readonly Coord[]
}

/** A single cell within a board grid. */
export type Cell = {
  readonly coord: Coord
  readonly state: CellState
  /** Id of the ship occupying this cell, if any. */
  readonly shipId: string | null
}

/** One player's board: its grid, its fleet, and the shots taken against it. */
export type Board = {
  readonly width: number
  readonly height: number
  readonly cells: readonly (readonly Cell[])[]
  readonly ships: readonly Ship[]
  /** Coordinates that have been fired upon on this board. */
  readonly shots: readonly Coord[]
}

/** The complete, serializable state of a game. */
export type GameState = {
  readonly phase: GamePhase
  readonly currentPlayer: Player
  readonly boards: {
    readonly [Player.Human]: Board
    readonly [Player.Ai]: Board
  }
  readonly winner: Player | null
}
