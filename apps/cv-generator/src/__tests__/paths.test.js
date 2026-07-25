import { describe, it, expect } from 'vitest'
import { parsePath, deepGet, deepSet, deepClone, gatherLeafPaths } from '@lib/cv/paths'

describe('parsePath', () => {
  it('converts numeric segments to integers', () => {
    expect(parsePath('experience.0.role')).toEqual(['experience', 0, 'role'])
    expect(parsePath('personal.summary')).toEqual(['personal', 'summary'])
  })
})

describe('deepGet / deepSet', () => {
  const base = { a: { b: [{ c: 'x' }] } }

  it('reads nested values via string or array paths', () => {
    expect(deepGet(base, 'a.b.0.c')).toBe('x')
    expect(deepGet(base, ['a', 'b', 0, 'c'])).toBe('x')
  })

  it('returns undefined for missing paths', () => {
    expect(deepGet(base, 'a.z.0')).toBeUndefined()
  })

  it('sets nested values and reports success', () => {
    const obj = deepClone(base)
    expect(deepSet(obj, 'a.b.0.c', 'y')).toBe(true)
    expect(obj.a.b[0].c).toBe('y')
  })

  it('returns false without mutating when a parent is missing', () => {
    const obj = deepClone(base)
    expect(deepSet(obj, 'a.z.0.c', 'y')).toBe(false)
    expect(obj).toEqual(base)
  })
})

describe('gatherLeafPaths', () => {
  it('collects all leaf paths and skips _id markers', () => {
    const paths = gatherLeafPaths({
      personal: { firstName: 'Ada' },
      experience: [{ _id: 'abc', role: 'Dev', bullets: ['a', 'b'] }],
    })
    expect(paths).toContain('personal.firstName')
    expect(paths).toContain('experience.0.role')
    expect(paths).toContain('experience.0.bullets.1')
    expect(paths.some(p => p.includes('_id'))).toBe(false)
  })
})
