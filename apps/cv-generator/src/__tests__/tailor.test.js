import { describe, it, expect } from 'vitest'
import { normalizeCv, ensureIds } from '@lib/cv/schema'
import {
  emptyVariant,
  deriveTailoredCv,
  variantFromPlan,
  anonymousVariant,
  anonymizeCv,
  cityOnly,
} from '@lib/cv/tailor'

function master() {
  return ensureIds(normalizeCv({
    personal: { firstName: 'Kari', summary: 'Full master summary.' },
    experience: [
      { company: 'Acme', role: 'Dev', startDate: '2020', description: 'Acme work' },
      { company: 'Globex', role: 'Lead', startDate: '2022', description: 'Globex work' },
      { company: 'Initech', role: 'Eng', startDate: '2018', description: 'Initech work' },
    ],
    skills: [
      { category: 'Cloud', items: ['AWS', 'Azure', 'GCP'] },
      { category: 'Lang', items: ['Go', 'Rust'] },
    ],
    competences: { enabled: true, items: [{ requirement: 'K8s', level: '4' }, { requirement: 'SAP', level: '2' }] },
  }))
}

const idOf = (cv, section, i) => cv[section][i]._id
const compId = (cv, i) => cv.competences.items[i]._id
const skillGroupId = (cv, i) => cv.skills[i]._id

describe('deriveTailoredCv', () => {
  it('returns the master unchanged for the null (Master) view', () => {
    const m = master()
    expect(deriveTailoredCv(m, null, 'en')).toBe(m)
  })

  it('hides excluded items without touching the master', () => {
    const m = master()
    const v = emptyVariant()
    v.excludedIds = [idOf(m, 'experience', 2), compId(m, 1)] // drop Initech + SAP
    const out = deriveTailoredCv(m, v, 'en')
    expect(out.experience.map(e => e.company)).toEqual(['Acme', 'Globex'])
    expect(out.competences.items.map(c => c.requirement)).toEqual(['K8s'])
    // master intact
    expect(m.experience).toHaveLength(3)
    expect(m.competences.items).toHaveLength(2)
  })

  it('applies a suggested order, appending anything not listed', () => {
    const m = master()
    const v = emptyVariant()
    v.order.experience = [idOf(m, 'experience', 1), idOf(m, 'experience', 2)] // Globex, Initech first
    const out = deriveTailoredCv(m, v, 'en')
    expect(out.experience.map(e => e.company)).toEqual(['Globex', 'Initech', 'Acme'])
  })

  it('hides individual skill tags and drops a fully-emptied group', () => {
    const m = master()
    const v = emptyVariant()
    v.excludedSkillTags = { [skillGroupId(m, 0)]: ['Azure', 'GCP'], [skillGroupId(m, 1)]: ['Go', 'Rust'] }
    const out = deriveTailoredCv(m, v, 'en')
    expect(out.skills).toHaveLength(1)
    expect(out.skills[0].category).toBe('Cloud')
    expect(out.skills[0].items).toEqual(['AWS'])
  })

  it('applies summary + experience overrides for the active language only', () => {
    const m = master()
    const v = emptyVariant()
    v.overrides.en.summary = 'Tailored EN summary.'
    v.overrides.en.expDesc = { [idOf(m, 'experience', 0)]: 'Acme, re-angled for the role.' }
    const en = deriveTailoredCv(m, v, 'en')
    expect(en.personal.summary).toBe('Tailored EN summary.')
    expect(en.experience[0].description).toBe('Acme, re-angled for the role.')
    // no NO override → falls back to master text
    const no = deriveTailoredCv(m, v, 'no')
    expect(no.personal.summary).toBe('Full master summary.')
    expect(no.experience[0].description).toBe('Acme work')
  })
})

describe('variantFromPlan', () => {
  it('applies a valid plan and ignores hallucinated ids', () => {
    const m = master()
    const plan = {
      excluded: [
        { id: compId(m, 1), section: 'competences', reason: 'not relevant to the role' },
        { id: 'totally-made-up-id', section: 'experience', reason: 'nope' },
      ],
      order: { experience: [idOf(m, 'experience', 1), 'bogus', idOf(m, 'experience', 1)] },
      excludedSkills: [
        { groupId: skillGroupId(m, 0), tags: ['GCP', 'NotARealTag'] },
        { groupId: 'bad-group', tags: ['x'] },
      ],
      summary: '  Tailored for the cloud role.  ',
      experienceDescriptions: [
        { id: idOf(m, 'experience', 0), description: 'Re-angled Acme.' },
        { id: 'ghost', description: 'should be dropped' },
      ],
      fitNote: 'Strong on Kubernetes; no SAP experience for this role.',
    }
    const v = variantFromPlan(m, plan, { name: 'Cloud role', role: { title: 'Cloud', text: '…' }, lang: 'en' })

    expect(v.excludedIds).toEqual([compId(m, 1)]) // bogus id dropped
    expect(v.rationale.reasons[compId(m, 1)]).toMatch(/not relevant/)
    expect(v.order.experience).toEqual([idOf(m, 'experience', 1)]) // bogus + dup removed
    expect(v.excludedSkillTags[skillGroupId(m, 0)]).toEqual(['GCP']) // invalid tag dropped
    expect(v.excludedSkillTags['bad-group']).toBeUndefined()
    expect(v.overrides.en.summary).toBe('Tailored for the cloud role.') // trimmed
    expect(v.overrides.en.expDesc[idOf(m, 'experience', 0)]).toBe('Re-angled Acme.')
    expect(v.overrides.en.expDesc.ghost).toBeUndefined()
    expect(v.rationale.fitNote).toMatch(/no SAP/)
    expect(v.tailoredInLang).toBe('en')
  })
})

describe('anonymize', () => {
  it('cityOnly keeps the first token', () => {
    expect(cityOnly('Oslo, Norway')).toBe('Oslo')
    expect(cityOnly('Bergen')).toBe('Bergen')
    expect(cityOnly('')).toBe('')
  })

  it('redacts PII deterministically via deriveTailoredCv', () => {
    const m = ensureIds(normalizeCv({
      personal: { firstName: 'Kari', lastName: 'Nordmann', location: 'Oslo, Norway', phone: '+47 999', email: 'k@x.no', linkedin: 'in/kari' },
      experience: [{ company: 'Equinor', role: 'Dev', startDate: '2020', location: 'Stavanger, Norway', description: 'Worked at Equinor', bullets: ['b1'], result: 'saved money' }],
      certifications: [{ name: 'AWS SA' }],
      portfolio: [{ label: 'GitHub', url: 'https://github.com/kari' }],
      positions: { enabled: true, items: [{ company: 'Board', title: 'Member' }] },
      education: [{ institution: 'NTNU', degree: 'MSc' }],
    }))
    const v = anonymousVariant({ tailoredInLang: 'en' })
    const out = deriveTailoredCv(m, v, 'en')

    expect(out.personal.firstName).toBe('Consultant')
    expect(out.personal.lastName).toBe('')
    expect(out.personal.showContactInfo).toBe(false)
    expect(out.personal.phone).toBe('')
    expect(out.personal.email).toBe('')
    expect(out.personal.location).toBe('Oslo')
    expect(out.experience[0].company).toBe('') // blanked (no AI descriptor yet)
    expect(out.experience[0].location).toBe('Stavanger')
    expect(out.certifications).toEqual([])
    expect(out.portfolio).toEqual([])
    expect(out.positions.items).toEqual([])
    expect(out.positions.enabled).toBe(false)
    expect(out.education.length).toBe(1) // kept by default
  })

  it('applies AI text redactions and honors toggles', () => {
    const m = ensureIds(normalizeCv({
      personal: { firstName: 'Kari', location: 'Oslo, Norway' },
      experience: [{ company: 'Equinor', role: 'Dev', startDate: '2020', description: 'orig' }],
    }))
    const expId = m.experience[0]._id
    const v = anonymousVariant({ tailoredInLang: 'en' })
    v.overrides.en.expDesc[expId] = 'Worked at a major energy company.'
    v.anonymize.text.en[expId] = { company: 'a major energy company', bullets: ['led a team'], result: 'cut cost 20%' }
    v.anonymize.name = false // re-add the name

    const out = deriveTailoredCv(m, v, 'en')
    expect(out.personal.firstName).toBe('Kari') // name re-added
    expect(out.experience[0].company).toBe('a major energy company')
    expect(out.experience[0].description).toBe('Worked at a major energy company.')
    expect(out.experience[0].bullets).toEqual(['led a team'])
    expect(out.experience[0].result).toBe('cut cost 20%')
  })
})
