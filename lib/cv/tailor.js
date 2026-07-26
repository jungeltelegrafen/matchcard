// ─────────────────────────────────────────────────────────────────────────────
// Job tailoring engine (pure, no React, no network).
//
// A "variant" tailors how the MASTER cv is presented for a specific role. It
// never copies or mutates facts — it only records:
//   - which master items to hide (by their stable _id)              → excludedIds
//   - which skill tags to hide within a group                       → excludedSkillTags
//   - an optional display order per section                         → order
//   - per-language text overrides (summary + re-angled descriptions)→ overrides
//   - the AI's rationale for the review panel                       → rationale
//
// deriveTailoredCv(master, variant, lang) computes the presented CV on the fly.
// Because every variant is a subset + reorder + emphasis of the same master
// facts, two variants can never contradict each other — the trust guarantee.
// ─────────────────────────────────────────────────────────────────────────────

import { deepClone, deepGet, deepSet } from './paths.js'
import { ARRAY_SECTION_PATHS, newId } from './schema.js'

// Map an array-section path to the key used in a variant's `order` map.
function sectionKeyOf(path) {
  return path.endsWith('.items') ? path.slice(0, -'.items'.length) : path
}

export function emptyVariant({ name = '', role = { title: '', text: '' }, tailoredInLang = 'en' } = {}) {
  return {
    id: newId(),
    name,
    role,
    tailoredInLang,
    createdAt: Date.now(),
    excludedIds: [],
    excludedSkillTags: {},          // { [skillGroupId]: [tag, …] }
    order: {},                      // { [sectionKey]: [id, …] }
    overrides: {                    // per language
      en: { summary: '', expDesc: {} },
      no: { summary: '', expDesc: {} },
    },
    rationale: { fitNote: '', reasons: {} }, // reasons: { [id]: 'why hidden/kept' }
  }
}

// Compute the presented CV for a given master language slice + variant.
// Returns the master unchanged when variant is null (the "Master" view).
export function deriveTailoredCv(masterCv, variant, lang) {
  if (!variant) return masterCv
  const cv = deepClone(masterCv)
  const excluded = new Set(variant.excludedIds || [])

  for (const path of ARRAY_SECTION_PATHS) {
    let arr = deepGet(cv, path)
    if (!Array.isArray(arr)) continue

    arr = arr.filter(it => !excluded.has(it?._id))

    const order = variant.order?.[sectionKeyOf(path)]
    if (Array.isArray(order) && order.length) {
      const byId = new Map(arr.map(it => [it._id, it]))
      const ordered = order.map(id => byId.get(id)).filter(Boolean)
      const rest = arr.filter(it => !order.includes(it._id))
      arr = [...ordered, ...rest]
    }
    deepSet(cv, path, arr)
  }

  // Skill tags hidden within a group; a group emptied of all tags disappears.
  const exTags = variant.excludedSkillTags || {}
  cv.skills = (cv.skills || [])
    .map(g => ({ ...g, items: (g.items || []).filter(t => !(exTags[g._id] || []).includes(t)) }))
    .filter(g => g.items.length > 0)

  // Text overrides for the active language. Missing overrides fall back to the
  // master text (still truthful, just untailored in that language).
  const ov = variant.overrides?.[lang] || {}
  if (ov.summary) cv.personal = { ...cv.personal, summary: ov.summary }
  if (ov.expDesc && Object.keys(ov.expDesc).length) {
    cv.experience = cv.experience.map(e =>
      ov.expDesc[e._id] ? { ...e, description: ov.expDesc[e._id] } : e
    )
  }

  return cv
}

// Build a variant from the AI tailoring plan, validating every referenced id
// against the master so a hallucinated id can never hide or mislabel anything.
export function variantFromPlan(masterCv, plan, { name, role, lang }) {
  const v = emptyVariant({ name, role, tailoredInLang: lang })

  const knownIds = new Set()
  for (const path of ARRAY_SECTION_PATHS) {
    for (const it of deepGet(masterCv, path) || []) if (it?._id) knownIds.add(it._id)
  }
  const expIds = new Set((masterCv.experience || []).map(e => e._id))
  const skillGroupById = new Map((masterCv.skills || []).map(g => [g._id, new Set(g.items || [])]))

  // Exclusions + reasons
  for (const ex of plan?.excluded || []) {
    if (ex?.id && knownIds.has(ex.id)) {
      v.excludedIds.push(ex.id)
      if (ex.reason) v.rationale.reasons[ex.id] = String(ex.reason)
    }
  }

  // Excluded skill tags (validated against the group's real tags)
  for (const es of plan?.excludedSkills || []) {
    const tags = skillGroupById.get(es?.groupId)
    if (!tags) continue
    const valid = (es.tags || []).filter(t => tags.has(t))
    if (valid.length) v.excludedSkillTags[es.groupId] = valid
  }

  // Order (validated + de-duplicated)
  for (const [key, ids] of Object.entries(plan?.order || {})) {
    if (!Array.isArray(ids)) continue
    const seen = new Set()
    const clean = ids.filter(id => knownIds.has(id) && !seen.has(id) && seen.add(id))
    if (clean.length) v.order[key] = clean
  }

  // Text overrides for the tailored language only
  if (typeof plan?.summary === 'string' && plan.summary.trim()) {
    v.overrides[lang].summary = plan.summary.trim()
  }
  for (const ed of plan?.experienceDescriptions || []) {
    if (ed?.id && expIds.has(ed.id) && typeof ed.description === 'string' && ed.description.trim()) {
      v.overrides[lang].expDesc[ed.id] = ed.description.trim()
    }
  }

  if (typeof plan?.fitNote === 'string') v.rationale.fitNote = plan.fitNote.trim()

  return v
}
