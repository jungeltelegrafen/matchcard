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

const V3 = 'cv-generator:draft:v3'
const V2 = 'cv-generator:draft:v2'
const V1 = 'cv-generator:draft:v1'

const baseSave = extra => ({
  cvByLang: { en: normalizeCv({}), no: normalizeCv({}) },
  metaByLang: { en: {}, no: {} },
  feedbackByLang: { en: [], no: [] },
  uiLang: 'en', contentLang: 'en', variants: [], activeVariantId: null,
  ...extra,
})

beforeEach(() => store.clear())

describe('draftStorage v3', () => {
  it('round-trips languages, toggles, and tailoring variants', () => {
    const enCv = ensureIds(normalizeCv({ personal: { firstName: 'Kari' }, experience: [{ company: 'Acme' }] }))
    const variant = {
      id: 'var1', name: 'Cloud @ DNB', role: { title: 'Cloud', text: 'desc' }, tailoredInLang: 'en',
      createdAt: 123, excludedIds: [enCv.experience[0]._id], excludedSkillTags: {}, order: {},
      overrides: { en: { summary: 'Tailored', expDesc: {} }, no: { summary: '', expDesc: {} } },
      rationale: { fitNote: 'Strong fit', reasons: {} },
    }
    saveDraft(baseSave({
      cvByLang: { en: enCv, no: normalizeCv({}) },
      contentLang: 'no', variants: [variant], activeVariantId: 'var1',
    }))

    const draft = loadDraft()
    expect(draft.variants).toHaveLength(1)
    expect(draft.variants[0].name).toBe('Cloud @ DNB')
    expect(draft.variants[0].excludedIds).toEqual([enCv.experience[0]._id])
    expect(draft.variants[0].overrides.en.summary).toBe('Tailored')
    expect(draft.variants[0].rationale.fitNote).toBe('Strong fit')
    expect(draft.activeVariantId).toBe('var1')
    expect(draft.contentLang).toBe('no')
  })

  it('drops activeVariantId if it references a missing variant', () => {
    saveDraft(baseSave({ variants: [], activeVariantId: 'ghost' }))
    expect(loadDraft().activeVariantId).toBeNull()
  })

  it('coerces a malformed variant to a safe shape and skips non-objects', () => {
    store.set(V3, JSON.stringify({
      v: 3,
      cvByLang: { en: { personal: { firstName: 'X' } } },
      variants: [{ id: 'v', name: '' }, null, 'nope'],
    }))
    const draft = loadDraft()
    expect(draft.variants).toHaveLength(1)
    const v = draft.variants[0]
    expect(v.name).toBe('Untitled role')
    expect(v.excludedIds).toEqual([])
    expect(v.overrides.en.summary).toBe('')
    expect(v.rationale.reasons).toEqual({})
  })

  it('migrates a v2 draft, adding empty variants', () => {
    store.set(V2, JSON.stringify({
      v: 2,
      cvByLang: { en: { personal: { firstName: 'Kari' } }, no: {} },
      uiLang: 'en', contentLang: 'en',
    }))
    const draft = loadDraft()
    expect(draft.cvByLang.en.personal.firstName).toBe('Kari')
    expect(draft.variants).toEqual([])
    expect(draft.activeVariantId).toBeNull()
  })

  it('migrates a v1 draft into a language slot with empty variants', () => {
    store.set(V1, JSON.stringify({
      v: 1, cv: { personal: { firstName: 'Nils' } }, lang: 'no', feedbackItems: [],
    }))
    const draft = loadDraft()
    expect(draft.cvByLang.no.personal.firstName).toBe('Nils')
    expect(draft.cvByLang.en.personal.firstName).toBe('')
    expect(draft.variants).toEqual([])
    expect(draft.contentLang).toBe('no')
  })

  it('prefers v3 over older drafts', () => {
    store.set(V1, JSON.stringify({ v: 1, cv: { personal: { firstName: 'v1' } }, lang: 'en' }))
    store.set(V2, JSON.stringify({ v: 2, cvByLang: { en: { personal: { firstName: 'v2' } } } }))
    store.set(V3, JSON.stringify({ v: 3, cvByLang: { en: { personal: { firstName: 'v3' } } } }))
    expect(loadDraft().cvByLang.en.personal.firstName).toBe('v3')
  })

  it('saving clears superseded v1/v2 keys', () => {
    store.set(V1, 'x')
    store.set(V2, 'y')
    saveDraft(baseSave({}))
    expect(store.has(V1)).toBe(false)
    expect(store.has(V2)).toBe(false)
    expect(store.has(V3)).toBe(true)
  })

  it('returns null for missing, corrupt, or wrong-version drafts', () => {
    expect(loadDraft()).toBeNull()
    store.set(V3, 'not json {{{')
    expect(loadDraft()).toBeNull()
    store.clear()
    store.set(V3, JSON.stringify({ v: 99, cvByLang: {} }))
    expect(loadDraft()).toBeNull()
  })

  it('clearDraft removes all draft keys', () => {
    store.set(V1, 'x'); store.set(V2, 'y')
    saveDraft(baseSave({}))
    clearDraft()
    expect(store.has(V1)).toBe(false)
    expect(store.has(V2)).toBe(false)
    expect(store.has(V3)).toBe(false)
  })

  it('draftHasContent is true if either language has content', () => {
    expect(draftHasContent(null)).toBe(false)
    expect(draftHasContent({ cvByLang: { en: normalizeCv({}), no: normalizeCv({}) } })).toBe(false)
    expect(draftHasContent({ cvByLang: { en: normalizeCv({}), no: normalizeCv({ personal: { firstName: 'K' } }) } })).toBe(true)
  })
})
