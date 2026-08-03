import { describe, it, expect } from 'vitest'
import { normalizeCv } from '@lib/cv/schema'
import { applyPatches, applyPatchesReport } from '../utils/applyPatches'

const base = () => normalizeCv({
  personal: { summary: 'Old summary' },
  education: [
    { institution: 'NTNU', degree: 'MSc' },
    { institution: 'UiO', degree: 'BSc' },
  ],
  skills: [{ category: 'Cloud', items: ['AWS'] }],
})

describe('applyPatches', () => {
  it('replaces a nested field', () => {
    const next = applyPatches(base(), [
      { op: 'replace', path: 'personal.summary', value: 'New summary' },
    ])
    expect(next.personal.summary).toBe('New summary')
  })

  it('appends to an array', () => {
    const next = applyPatches(base(), [
      { op: 'append', path: 'education', value: { institution: 'MIT', degree: 'PhD' } },
    ])
    expect(next.education).toHaveLength(3)
    expect(next.education[2].institution).toBe('MIT')
  })

  it('removes an array item by index', () => {
    const next = applyPatches(base(), [{ op: 'remove', path: 'education.0' }])
    expect(next.education).toHaveLength(1)
    expect(next.education[0].institution).toBe('UiO')
  })

  it('replaces a whole items array', () => {
    const next = applyPatches(base(), [
      { op: 'replace', path: 'skills.0.items', value: ['AWS', 'Azure'] },
    ])
    expect(next.skills[0].items).toEqual(['AWS', 'Azure'])
  })

  it('skips malformed patches without throwing and does not mutate the input', () => {
    const cv = base()
    const next = applyPatches(cv, [
      { op: 'replace' },
      null,
      { op: 'remove', path: 'education.notAnIndex' },
      { op: 'replace', path: 'personal.summary', value: 'Changed' },
    ])
    expect(next.personal.summary).toBe('Changed')
    expect(cv.personal.summary).toBe('Old summary')
  })

  it('returns the same cv for empty patch lists', () => {
    const cv = base()
    expect(applyPatches(cv, [])).toBe(cv)
  })
})

describe('applyPatchesReport', () => {
  it('reports applied patches', () => {
    const { applied, skipped } = applyPatchesReport(base(), [
      { op: 'replace', path: 'personal.summary', value: 'New' },
      { op: 'append', path: 'education', value: { institution: 'MIT' } },
      { op: 'remove', path: 'education.0' },
    ])
    expect(applied).toHaveLength(3)
    expect(skipped).toHaveLength(0)
  })

  it('reports a replace to a non-existent array index as skipped, not applied', () => {
    const { applied, skipped } = applyPatchesReport(base(), [
      { op: 'replace', path: 'experience.5.result', value: 'x' },
    ])
    expect(applied).toHaveLength(0)
    expect(skipped).toHaveLength(1)
    expect(skipped[0].reason).toBe('target not found')
  })

  it('reports remove of an out-of-range index as skipped', () => {
    const { applied, skipped } = applyPatchesReport(base(), [
      { op: 'remove', path: 'education.9' },
    ])
    expect(applied).toHaveLength(0)
    expect(skipped[0].reason).toBe('item not found')
  })

  it('reports malformed and unknown-op patches as skipped', () => {
    const { applied, skipped } = applyPatchesReport(base(), [
      { op: 'replace' },
      { op: 'frobnicate', path: 'personal.summary', value: 'x' },
    ])
    expect(applied).toHaveLength(0)
    expect(skipped).toHaveLength(2)
  })

  it('reports append to a non-list target as skipped', () => {
    const { applied, skipped } = applyPatchesReport(base(), [
      { op: 'append', path: 'personal.summary', value: 'x' },
    ])
    expect(applied).toHaveLength(0)
    expect(skipped[0].reason).toBe('target is not a list')
  })

  it('separates applied from skipped in a mixed batch', () => {
    const { applied, skipped } = applyPatchesReport(base(), [
      { op: 'replace', path: 'personal.summary', value: 'ok' },
      { op: 'replace', path: 'experience.0.result', value: 'nope' },
    ])
    expect(applied).toHaveLength(1)
    expect(skipped).toHaveLength(1)
  })
})
