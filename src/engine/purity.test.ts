import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const engineDir = dirname(fileURLToPath(import.meta.url))

describe('engine purity (AGENTS.md)', () => {
  it('no file under src/engine imports React', () => {
    const files = readdirSync(engineDir).filter((f) => f.endsWith('.ts'))
    const reactImport = /\bfrom\s+['"]react(?:-dom)?['"]|require\(['"]react/

    const offenders = files.filter((f) => {
      if (f.endsWith('.test.ts')) return false
      const source = readFileSync(join(engineDir, f), 'utf8')
      return reactImport.test(source)
    })

    expect(offenders).toEqual([])
  })
})
