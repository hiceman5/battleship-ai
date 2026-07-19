import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const stateDir = dirname(fileURLToPath(import.meta.url))

describe('state purity (SPEC §11, AGENTS.md)', () => {
  it('no file under src/state imports React', () => {
    const files = readdirSync(stateDir).filter((f) => f.endsWith('.ts'))
    const reactImport = /\bfrom\s+['"]react(?:-dom)?['"]|require\(['"]react/

    const offenders = files.filter((f) => {
      if (f.endsWith('.test.ts')) return false
      const source = readFileSync(join(stateDir, f), 'utf8')
      return reactImport.test(source)
    })

    expect(offenders).toEqual([])
  })
})
