import type { Coord } from '@/engine/types'

/**
 * Coordinate <-> display-label conversion lives ONLY at the UI boundary
 * (SPEC 1). Columns A-J map to `col` (0-9), rows 1-10 map to `row` (0-9).
 * Engine/AI code never deals in letters.
 */

const COLUMN_LETTERS = 'ABCDEFGHIJ'
const BOARD_SIZE = COLUMN_LETTERS.length

/** Convert an internal zero-indexed coord to its display label, e.g. {row:1,col:1} -> "B2". */
export function toLabel({ row, col }: Coord): string {
  if (!Number.isInteger(row) || !Number.isInteger(col)) {
    throw new Error(`Coord must be integers, received row=${row}, col=${col}`)
  }
  if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) {
    throw new Error(`Coord out of bounds: row=${row}, col=${col}`)
  }
  return `${COLUMN_LETTERS[col]}${row + 1}`
}

/** Parse a display label like "A1" or "J10" back into an internal zero-indexed coord. */
export function fromLabel(label: string): Coord {
  const match = /^([A-J])(10|[1-9])$/.exec(label.trim().toUpperCase())
  if (!match) {
    throw new Error(`Invalid board label: "${label}"`)
  }
  const col = COLUMN_LETTERS.indexOf(match[1])
  const row = Number(match[2]) - 1
  return { row, col }
}
