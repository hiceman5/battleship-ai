import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { SEARCH_PARITY, isSearchParityCell } from './parity'

describe('parity (§6.1)', () => {
  it('search parity is fixed at even (0) for v1', () => {
    expect(SEARCH_PARITY).toBe(0)
  })

  it('identifies even-parity cells only', () => {
    expect(isSearchParityCell({ row: 0, col: 0 })).toBe(true)
    expect(isSearchParityCell({ row: 1, col: 1 })).toBe(true)
    expect(isSearchParityCell({ row: 0, col: 1 })).toBe(false)
    expect(isSearchParityCell({ row: 2, col: 3 })).toBe(false)
  })
})

describe('purity (AGENTS.md) — src/ai never imports React', () => {
  it('no source file under src/ai imports React', () => {
    const here = dirname(fileURLToPath(import.meta.url))
    const files = ['parity.ts', 'targeting.ts', 'index.ts']
    for (const file of files) {
      const contents = readFileSync(join(here, file), 'utf8')
      expect(contents).not.toMatch(/from ['"]react['"]/)
      expect(contents).not.toMatch(/require\(['"]react['"]\)/)
    }
  })
})
