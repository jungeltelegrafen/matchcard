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

const V2 = 'cv-generator:draft:v2'
const V1 = 'cv-generator:draft:v1'

beforeEach(() => store.clear())

describe('draftStorage v2', () => {
  it('round-trips both language versions and both toggles', () => {
    const enCv = ensureIds(normalizeCv({ personal: { firstName: 'Kari' }, experience: [{ company: 'Acme', role: 'Dev' }] }))
    const noCv = ensureIds(normalizeCv({ personal: { firstName: 'Kari' }, experience: [{ company: 'Acme', role: 'Utvikler' }] }))
    saveDraft({
      cvByLang: { en: enCv, no: noCv },
      metaByLang: { en: { 'personal.firstName': { source: 'user', aiSuggestion: null } }, no: {} },
      feedbackByLang: { en: [{ id: 'x', text: 'note' }], no: [] },
      uiLang: 'en',
      contentLang: 'no',
    })

    const draft = loadDraft()
    expect(draft.cvByLang.en.experience[0].role).toBe('Dev')
    expect(draft.cvByLang.no.experience[0].role).toBe('Utvikler')
    expect(draft.cvByLang.en.experience[0]._id).toBe(enCv.experience[0]._id)
    expect(draft.metaByLang.en['personal.firstName'].source).toBe('user')
    expect(draft.feedbackByLang.en).toHaveLength(1)
    expect(draft.uiLang).toBe('en')
    expect(draft.contentLang).toBe('no')
    expect(typeof draft.savedAt).toBe('number')
  })

  it('normalizes each language slot and fills a missing one', () => {
    store.set(V2, JSON.stringify({
      v: 2,
      cvByLang: { en: { personal: { firstName: 'Old' }, obsolete: [1, 2] } }, // no `no` slot, unknown key
    }))
    const draft = loadDraft()
    expect(draft.cvByLang.en.personal.firstName).toBe('Old')
    expect(draft.cvByLang.en.obsolete).toBeUndefined()
    expect(draft.cvByLang.no).toBeDefined()
    expect(draft.cvByLang.no.personal.firstName).toBe('')
    expect(draft.uiLang).toBe('en')
    expect(draft.contentLang).toBe('en')
  })

  it('migrates a v1 draft into the language slot it was saved under', () => {
    store.set(V1, JSON.stringify({
      v: 1,
      cv: { personal: { firstName: 'Nils' }, experience: [{ company: 'Telenor' }] },
      meta: { 'personal.firstName': { source: 'user', aiSuggestion: null } },
      lang: 'no',
      feedbackItems: [{ id: 'f1' }],
    }))
    const draft = loadDraft()
    expect(draft.cvByLang.no.personal.firstName).toBe('Nils')
    expect(draft.cvByLang.no.experience[0].company).toBe('Telenor')
    expect(draft.cvByLang.en.personal.firstName).toBe('') // empty EN slot created
    expect(draft.metaByLang.no['personal.firstName'].source).toBe('user')
    expect(draft.feedbackByLang.no).toHaveLength(1)
    expect(draft.uiLang).toBe('no')
    expect(draft.contentLang).toBe('no')
  })

  it('prefers a v2 draft over a stale v1 draft', () => {
    store.set(V1, JSON.stringify({ v: 1, cv: { personal: { firstName: 'OldV1' } }, lang: 'en' }))
    store.set(V2, JSON.stringify({ v: 2, cvByLang: { en: { personal: { firstName: 'NewV2' } } } }))
    expect(loadDraft().cvByLang.en.personal.firstName).toBe('NewV2')
  })

  it('saving clears any superseded v1 draft', () => {
    store.set(V1, JSON.stringify({ v: 1, cv: { personal: { firstName: 'x' } }, lang: 'en' }))
    saveDraft({
      cvByLang: { en: normalizeCv({}), no: normalizeCv({}) },
      metaByLang: { en: {}, no: {} },
      feedbackByLang: { en: [], no: [] },
      uiLang: 'en', contentLang: 'en',
    })
    expect(store.has(V1)).toBe(false)
    expect(store.has(V2)).toBe(true)
  })

  it('returns null for missing, corrupt, or wrong-version drafts', () => {
    expect(loadDraft()).toBeNull()
    store.set(V2, 'not json {{{')
    expect(loadDraft()).toBeNull()
    store.clear()
    store.set(V2, JSON.stringify({ v: 99, cvByLang: {} }))
    expect(loadDraft()).toBeNull()
  })

  it('clearDraft removes both v1 and v2 keys', () => {
    store.set(V1, 'x')
    saveDraft({ cvByLang: { en: normalizeCv({}), no: normalizeCv({}) }, metaByLang: { en: {}, no: {} }, feedbackByLang: { en: [], no: [] }, uiLang: 'en', contentLang: 'en' })
    clearDraft()
    expect(store.has(V1)).toBe(false)
    expect(store.has(V2)).toBe(false)
  })

  it('draftHasContent is true if either language has content', () => {
    expect(draftHasContent(null)).toBe(false)
    expect(draftHasContent({ cvByLang: { en: normalizeCv({}), no: normalizeCv({}) } })).toBe(false)
    expect(draftHasContent({ cvByLang: { en: normalizeCv({}), no: normalizeCv({ personal: { firstName: 'K' } }) } })).toBe(true)
  })
})
