import { describe, it, expect } from 'vitest'
import { normalizeCv, ensureIds } from '@lib/cv/schema'
import {
  emptyMeta,
  markUserEdit,
  getUserEdits,
  getSource,
  applyAiResult,
  remapMeta,
  setValueAtPath,
} from '../utils/fieldMeta'

function cvWith(experiences) {
  return ensureIds(normalizeCv({ experience: experiences }))
}

describe('markUserEdit / getUserEdits', () => {
  it('records user edits and returns their current values', () => {
    const cv = cvWith([{ company: 'Acme', role: 'Dev', startDate: '2020' }])
    let meta = emptyMeta()
    meta = markUserEdit(meta, 'experience.0.role')
    expect(getSource(meta, 'experience.0.role')).toBe('user')
    expect(getUserEdits(meta, cv)).toEqual({ 'experience.0.role': 'Dev' })
  })
})

describe('applyAiResult', () => {
  it('preserves a user edit at the same position and surfaces conflicts', () => {
    const prev = cvWith([{ company: 'Acme', startDate: '2020', role: 'Lead Developer' }])
    const meta = markUserEdit(emptyMeta(), 'experience.0.role')

    const { cv: next, meta: nextMeta } = applyAiResult(meta, prev, {
      experience: [{ company: 'Acme', startDate: '2020', role: 'Developer' }],
    })

    expect(next.experience[0].role).toBe('Lead Developer')
    expect(nextMeta['experience.0.role'].source).toBe('user')
    expect(nextMeta['experience.0.role'].aiSuggestion).toBe('Developer')
  })

  it('keeps user-edit protection attached when the AI reorders the array', () => {
    const prev = cvWith([
      { company: 'Acme', startDate: '2020', role: 'Backend Dev' },
      { company: 'Globex', startDate: '2022', role: 'Cloud Architect (hand-written)' },
    ])
    const meta = markUserEdit(emptyMeta(), 'experience.1.role')

    // AI returns the entries reordered — the Globex item is now index 0
    const { cv: next, meta: nextMeta } = applyAiResult(meta, prev, {
      experience: [
        { company: 'Globex', startDate: '2022', role: 'Architect' },
        { company: 'Acme', startDate: '2020', role: 'Backend Dev' },
      ],
    })

    expect(next.experience[0].company).toBe('Globex')
    expect(next.experience[0].role).toBe('Cloud Architect (hand-written)')
    expect(nextMeta['experience.0.role'].source).toBe('user')
    expect(nextMeta['experience.0.role'].aiSuggestion).toBe('Architect')
    // The unedited Acme entry is plain AI content at its new position
    expect(nextMeta['experience.1.role'].source).toBe('ai')
  })

  it('drops protection when the edited item was removed', () => {
    const prev = cvWith([
      { company: 'Acme', startDate: '2020', role: 'Dev' },
      { company: 'Globex', startDate: '2022', role: 'Edited' },
    ])
    const meta = markUserEdit(emptyMeta(), 'experience.1.role')

    const { cv: next, meta: nextMeta } = applyAiResult(meta, prev, {
      experience: [{ company: 'Acme', startDate: '2020', role: 'Dev' }],
    })

    expect(next.experience).toHaveLength(1)
    expect(Object.values(nextMeta).every(m => m.source === 'ai')).toBe(true)
  })

  it('never lets the AI overwrite keepSections', () => {
    const prev = ensureIds(normalizeCv({
      competences: { enabled: true, projectLabel: 'Tender X', items: [{ requirement: 'K8s', level: '4' }] },
    }))
    const { cv: next } = applyAiResult(emptyMeta(), prev, {
      competences: { enabled: false, projectLabel: '', items: [] },
    }, { keepSections: ['competences'] })

    expect(next.competences.enabled).toBe(true)
    expect(next.competences.items[0].requirement).toBe('K8s')
  })
})

describe('remapMeta', () => {
  it('follows items through removal and reindexing after a structural change', () => {
    const prev = cvWith([
      { company: 'Acme', startDate: '2020' },
      { company: 'Globex', startDate: '2022' },
    ])
    let meta = markUserEdit(emptyMeta(), 'experience.1.role')
    meta = markUserEdit(meta, 'experience.0.company')

    // User deletes the first entry — Globex shifts from index 1 to 0
    const next = { ...prev, experience: prev.experience.slice(1) }
    const remapped = remapMeta(meta, prev, next)

    expect(remapped['experience.0.role']).toEqual({ source: 'user', aiSuggestion: null })
    expect(remapped['experience.0.company']).toBeUndefined()
    expect(Object.keys(remapped)).toHaveLength(1)
  })

  it('leaves non-array paths untouched', () => {
    const prev = cvWith([{ company: 'Acme' }])
    const meta = markUserEdit(emptyMeta(), 'personal.summary')
    const remapped = remapMeta(meta, prev, prev)
    expect(remapped['personal.summary'].source).toBe('user')
  })
})

describe('setValueAtPath', () => {
  it('returns a new cv without mutating the original', () => {
    const cv = cvWith([{ company: 'Acme', role: 'Dev' }])
    const next = setValueAtPath(cv, 'experience.0.role', 'Lead')
    expect(next.experience[0].role).toBe('Lead')
    expect(cv.experience[0].role).toBe('Dev')
  })
})
