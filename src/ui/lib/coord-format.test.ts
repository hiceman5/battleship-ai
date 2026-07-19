import { describe, expect, it } from 'vitest'
import { fromLabel, toLabel } from './coord-format'

describe('coord-format', () => {
  it('maps the corners: A1 <-> {0,0} and J10 <-> {9,9}', () => {
    expect(toLabel({ row: 0, col: 0 })).toBe('A1')
    expect(fromLabel('A1')).toEqual({ row: 0, col: 0 })
    expect(toLabel({ row: 9, col: 9 })).toBe('J10')
    expect(fromLabel('J10')).toEqual({ row: 9, col: 9 })
  })

  it('columns A-J map to col, rows 1-10 map to row+1', () => {
    expect(toLabel({ row: 3, col: 1 })).toBe('B4')
    expect(fromLabel('B4')).toEqual({ row: 3, col: 1 })
  })

  it('round-trips every cell of the 10x10 board', () => {
    for (let row = 0; row < 10; row++) {
      for (let col = 0; col < 10; col++) {
        expect(fromLabel(toLabel({ row, col }))).toEqual({ row, col })
      }
    }
  })

  it('parses labels case-insensitively and trims whitespace', () => {
    expect(fromLabel(' c7 ')).toEqual({ row: 6, col: 2 })
  })

  it('rejects invalid labels', () => {
    expect(() => fromLabel('K1')).toThrow()
    expect(() => fromLabel('A0')).toThrow()
    expect(() => fromLabel('A11')).toThrow()
    expect(() => fromLabel('11')).toThrow()
    expect(() => fromLabel('')).toThrow()
  })

  it('rejects out-of-bounds coords', () => {
    expect(() => toLabel({ row: -1, col: 0 })).toThrow()
    expect(() => toLabel({ row: 0, col: 10 })).toThrow()
  })
})
