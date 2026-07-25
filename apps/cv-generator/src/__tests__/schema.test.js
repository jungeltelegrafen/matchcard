import { describe, it, expect } from 'vitest'
import {
  CV_SECTIONS,
  ARRAY_SECTION_PATHS,
  emptyCv,
  normalizeCv,
  mergeAiCv,
  ensureIds,
  stripIds,
  correlateIds,
  buildCvJsonSchema,
} from '@lib/cv/schema'

describe('emptyCv', () => {
  it('produces the full section shape', () => {
    const cv = emptyCv()
    expect(Object.keys(cv).sort()).toEqual(Object.keys(CV_SECTIONS).sort())
    expect(cv.cvType).toBe('technical')
    expect(cv.personal.showContactInfo).toBe(true)
    expect(cv.experience).toEqual([])
    expect(cv.positions).toEqual({ enabled: false, useProjectFormat: false, items: [] })
    expect(cv.videoProfile.title).toBe('Professional Introduction')
  })
})

describe('normalizeCv', () => {
  it('coerces comma-string skill items to arrays', () => {
    const cv = normalizeCv({ skills: [{ category: 'Cloud', items: 'AWS, Azure, GCP' }] })
    expect(cv.skills[0].items).toEqual(['AWS', 'Azure', 'GCP'])
  })

  it('coerces numbers to strings and drops unknown keys', () => {
    const cv = normalizeCv({
      certifications: [{ name: 'CKA', issuer: 'CNCF', year: 2024, bogus: 'x' }],
    })
    expect(cv.certifications[0]).toEqual({ name: 'CKA', issuer: 'CNCF', year: '2024' })
  })

  it('fills missing sections with defaults and rejects invalid scalars', () => {
    const cv = normalizeCv({ cvType: 'nonsense' })
    expect(cv.cvType).toBe('technical')
    expect(cv.competences).toEqual({ enabled: false, projectLabel: '', items: [] })
  })

  it('preserves _id markers on items', () => {
    const cv = normalizeCv({ experience: [{ _id: 'e1', company: 'Acme' }] })
    expect(cv.experience[0]._id).toBe('e1')
  })
})

describe('mergeAiCv', () => {
  it('keeps client-only sections and explicitly kept sections from the current cv', () => {
    const current = emptyCv()
    current.cvType = 'management'
    current.videoProfile.enabled = true
    current.competences = { enabled: true, projectLabel: 'Tender X', items: [{ requirement: 'K8s' }] }

    const merged = mergeAiCv(current, {
      cvType: 'technical',
      personal: { firstName: 'Ada' },
      competences: { enabled: false, projectLabel: '', items: [] },
    }, { keep: ['competences'] })

    expect(merged.cvType).toBe('management')
    expect(merged.videoProfile.enabled).toBe(true)
    expect(merged.competences.projectLabel).toBe('Tender X')
    expect(merged.personal.firstName).toBe('Ada')
  })
})

describe('ensureIds / stripIds', () => {
  it('assigns unique ids to every array item and stripIds removes them', () => {
    const cv = normalizeCv({
      experience: [{ company: 'A' }, { company: 'B' }],
      positions: { enabled: true, items: [{ company: 'C' }] },
    })
    const withIds = ensureIds(cv)
    const ids = [
      withIds.experience[0]._id,
      withIds.experience[1]._id,
      withIds.positions.items[0]._id,
    ]
    expect(ids.every(Boolean)).toBe(true)
    expect(new Set(ids).size).toBe(3)

    const stripped = stripIds(withIds)
    for (const p of ARRAY_SECTION_PATHS) {
      const arr = p.split('.').reduce((o, k) => o?.[k], stripped)
      for (const item of arr || []) expect(item._id).toBeUndefined()
    }
  })
})

describe('correlateIds', () => {
  it('matches reordered items by identity keys', () => {
    const prev = ensureIds(normalizeCv({
      experience: [
        { company: 'Acme', startDate: '2020' },
        { company: 'Globex', startDate: '2022' },
      ],
    }))
    const [acmeId, globexId] = prev.experience.map(e => e._id)

    // Model returned them reordered, without ids
    const next = correlateIds(prev, normalizeCv({
      experience: [
        { company: 'Globex', startDate: '2022' },
        { company: 'Acme', startDate: '2020' },
      ],
    }))
    expect(next.experience[0]._id).toBe(globexId)
    expect(next.experience[1]._id).toBe(acmeId)
  })

  it('keeps existing ids and mints fresh ones for new items', () => {
    const prev = ensureIds(normalizeCv({ education: [{ institution: 'NTNU', degree: 'MSc' }] }))
    const keptId = prev.education[0]._id
    const next = correlateIds(prev, normalizeCv({
      education: [
        { _id: keptId, institution: 'NTNU', degree: 'MSc' },
        { institution: 'UiO', degree: 'BSc' },
      ],
    }))
    expect(next.education[0]._id).toBe(keptId)
    expect(next.education[1]._id).toBeTruthy()
    expect(next.education[1]._id).not.toBe(keptId)
  })
})

describe('buildCvJsonSchema', () => {
  it('excludes client-only sections by default and supports exclude', () => {
    const schema = buildCvJsonSchema({ exclude: ['competences'] })
    expect(schema.properties.personal).toBeDefined()
    expect(schema.properties.portfolio).toBeDefined()
    expect(schema.properties.competences).toBeUndefined()
    expect(schema.properties.videoProfile).toBeUndefined()
    expect(schema.properties.cvType).toBeUndefined()
  })

  it('includes everything with aiOnly: false and closes objects to unknown keys', () => {
    const schema = buildCvJsonSchema({ aiOnly: false })
    expect(schema.properties.videoProfile).toBeDefined()
    expect(schema.properties.cvType.enum).toEqual(['technical', 'management'])
    expect(schema.additionalProperties).toBe(false)
    expect(schema.properties.personal.additionalProperties).toBe(false)
    expect(schema.properties.experience.items.additionalProperties).toBe(false)
    // fields are deliberately not required — normalizeCv fills defaults
    expect(schema.required).toBeUndefined()
  })
})
