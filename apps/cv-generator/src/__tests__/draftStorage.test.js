import { describe, it, expect, beforeEach } from 'vitest'
import { normalizeCv, ensureIds } from '@lib/cv/schema'

// Minimal localStorage stub for the node test environment
const store = new Map()
globalThis.localStorage = {
  getItem: k => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: k => store.delete(k),
}

const { loadDraft, saveDraft, clearDraft, draftHasContent } = await import('../utils/draftStorage')

beforeEach(() => store.clear())

describe('draftStorage', () => {
  it('round-trips a draft with normalization and ids', () => {
    const cv = ensureIds(normalizeCv({
      personal: { firstName: 'Kari' },
      experience: [{ company: 'Acme', role: 'Dev' }],
    }))
    const meta = { 'experience.0.role': { source: 'user', aiSuggestion: null } }
    saveDraft({ cv, meta, lang: 'no', feedbackItems: [{ id: 'x', text: 'note' }] })

    const draft = loadDraft()
    expect(draft.cv.personal.firstName).toBe('Kari')
    expect(draft.cv.experience[0]._id).toBe(cv.experience[0]._id)
    expect(draft.meta).toEqual(meta)
    expect(draft.lang).toBe('no')
    expect(draft.feedbackItems).toHaveLength(1)
    expect(typeof draft.savedAt).toBe('number')
  })

  it('normalizes stale drafts to the current schema shape', () => {
    // Simulate a draft saved before a schema change: unknown key, missing sections
    store.set('cv-generator:draft:v1', JSON.stringify({
      v: 1,
      cv: { personal: { firstName: 'Old' }, obsoleteSection: [1, 2] },
    }))
    const draft = loadDraft()
    expect(draft.cv.personal.firstName).toBe('Old')
    expect(draft.cv.obsoleteSection).toBeUndefined()
    expect(draft.cv.competences).toEqual({ enabled: false, projectLabel: '', items: [] })
    expect(draft.lang).toBe('en')
    expect(draft.feedbackItems).toEqual([])
  })

  it('returns null for missing, corrupt, or wrong-version drafts', () => {
    expect(loadDraft()).toBeNull()

    store.set('cv-generator:draft:v1', 'not json {{{')
    expect(loadDraft()).toBeNull()

    store.set('cv-generator:draft:v1', JSON.stringify({ v: 99, cv: {} }))
    expect(loadDraft()).toBeNull()
  })

  it('clearDraft removes the stored draft', () => {
    saveDraft({ cv: normalizeCv({}), meta: {}, lang: 'en', feedbackItems: [] })
    expect(loadDraft()).not.toBeNull()
    clearDraft()
    expect(loadDraft()).toBeNull()
  })

  it('draftHasContent distinguishes empty from meaningful drafts', () => {
    expect(draftHasContent(null)).toBe(false)

    saveDraft({ cv: normalizeCv({}), meta: {}, lang: 'en', feedbackItems: [] })
    expect(draftHasContent(loadDraft())).toBe(false)

    saveDraft({ cv: normalizeCv({ personal: { firstName: 'K' } }), meta: {}, lang: 'en', feedbackItems: [] })
    expect(draftHasContent(loadDraft())).toBe(true)
  })
})
