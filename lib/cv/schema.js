// ─────────────────────────────────────────────────────────────────────────────
// Single source of truth for the CV data model.
//
// Everything that needs to know the shape of a CV derives it from CV_SECTIONS:
//   - emptyCv()            → the editor's empty state
//   - normalizeCv()        → validation/coercion at every AI and storage boundary
//   - buildCvJsonSchema()  → the JSON Schema given to Claude via forced tool use
//   - ensureIds/stripIds/correlateIds → stable per-item identity for edit tracking
//
// Do NOT hand-maintain the CV shape anywhere else (prompts, renderers, share
// page). If you add a field or section, add it here and the prompts, empty
// state, and validation all pick it up.
// ─────────────────────────────────────────────────────────────────────────────

import { deepGet, deepClone } from './paths.js'

// Source text beyond this limit is truncated before parsing. The client warns
// the user when their input exceeds it — never truncate silently.
export const PARSE_CHAR_LIMIT = 24000

const str = 'string'
const strArr = 'string[]'
const bool = 'boolean'

// Field spec: either a bare type string, or { type, default?, desc?, values? }.
export const CV_SECTIONS = {
  cvType: { kind: 'scalar', ai: false, default: 'technical', values: ['technical', 'management'] },

  personal: {
    kind: 'object', ai: true,
    fields: {
      firstName: str,
      lastName: str,
      title: { type: str, desc: 'Professional headline shown under the name' },
      location: str,
      educationSummary: { type: str, desc: 'One-line education summary for the CV header block' },
      itExperienceSince: { type: str, desc: 'Year the person started their IT career, e.g. "2010"' },
      phone: str,
      email: str,
      linkedin: str,
      availableFrom: { type: str, desc: 'Next availability date' },
      workPreference: { type: str, desc: 'Preferred work location / remote preference' },
      showContactInfo: { type: bool, default: true },
      summary: { type: str, desc: 'Main profile paragraph at the top of the CV' },
    },
  },

  experience: {
    kind: 'array', ai: true, identity: ['company', 'startDate'],
    itemFields: {
      company: str,
      role: str,
      startDate: { type: str, desc: 'Preserve dates as written in the source, e.g. "Jan 2021"' },
      endDate: str,
      location: str,
      description: { type: str, desc: 'Project or engagement description (context)' },
      bullets: { type: strArr, desc: 'Tasks and responsibilities, one string per achievement' },
      technologies: { type: str, desc: 'Comma-separated tech stack used' },
      methodologies: { type: str, desc: 'Methods, frameworks, or management approaches' },
      result: { type: str, desc: 'Measurable outcome or achievement' },
    },
  },

  education: {
    kind: 'array', ai: true, identity: ['institution', 'degree'],
    itemFields: { institution: str, degree: str, field: str, startDate: str, endDate: str },
  },

  skills: {
    kind: 'array', ai: true, identity: ['category'],
    itemFields: {
      category: { type: str, desc: 'Label for this skill group, e.g. "Frontend", "Cloud"' },
      items: { type: strArr, desc: 'Skill tags — always an array of strings, never a comma-separated string' },
    },
  },

  languages: {
    kind: 'array', ai: true, identity: ['language'],
    itemFields: { language: str, proficiency: str },
  },

  certifications: {
    kind: 'array', ai: true, identity: ['name'],
    itemFields: { name: str, issuer: str, year: str },
  },

  courses: {
    kind: 'array', ai: true, identity: ['name'],
    itemFields: {
      name: { type: str, desc: 'Short courses and training — not formal education or certifications' },
      institution: str,
      year: str,
    },
  },

  positions: {
    kind: 'group', ai: true, identity: ['company', 'title'],
    flags: {
      enabled: { type: bool, default: false },
      useProjectFormat: { type: bool, default: false },
    },
    desc: 'Board memberships and voluntary/non-employment roles',
    itemFields: {
      company: str, startDate: str, endDate: str, title: str, description: str,
      bullets: strArr, technologies: str, methodologies: str,
    },
  },

  competences: {
    kind: 'group', ai: true, identity: ['requirement'],
    flags: {
      enabled: { type: bool, default: false },
      projectLabel: str,
    },
    desc: 'Competence matrix rows mapping requirements to evidence',
    itemFields: {
      requirement: { type: str, desc: 'Competence name' },
      level: { type: str, desc: '1–5 (5 = expert)' },
      lastUsed: { type: str, desc: 'Year last used, e.g. "2025"' },
      yearsRelevant: { type: str, desc: 'Total years of relevant experience' },
      projects: { type: str, desc: 'Comma-separated project names' },
      detail: { type: str, desc: 'Evidence paragraph' },
    },
  },

  portfolio: {
    kind: 'array', ai: true, identity: ['url', 'label'],
    itemFields: {
      platform: { type: str, values: ['github', 'gitlab', 'stackoverflow', 'dribbble', 'behance', 'website', 'other'] },
      label: str,
      url: str,
      description: str,
    },
  },

  videos: {
    kind: 'array', ai: false, identity: ['assetId', 'title'],
    desc: 'Recorded video presentations attached to the CV',
    itemFields: {
      title: { type: str, desc: 'Card title, e.g. "Why I fit this role"' },
      kind: { type: str, default: 'intro', desc: 'intro | match | motivation | general' },
      description: { type: str, desc: 'Short "why watch this" blurb shown on the card' },
      placement: { type: str, default: 'general', desc: 'intro | experience | motivation | general' },
      experienceId: { type: str, desc: 'Optional _id of the experience this video belongs to' },
      provider: { type: str, default: 'link', desc: 'link | cloudflare' },
      assetId: str,
      playbackUrl: str,
      thumbnailUrl: str,
      duration: str,
      recordedAt: str,
    },
  },
}

// Paths of every item array in the CV — used for id management and meta remapping.
export const ARRAY_SECTION_PATHS = Object.entries(CV_SECTIONS).flatMap(([key, def]) =>
  def.kind === 'array' ? [key] : def.kind === 'group' ? [`${key}.items`] : []
)

// Section keys agents may attach feedback to (must match SectionWrap keys in the
// editor where a visual anchor exists; extras degrade gracefully to no highlight).
export const FEEDBACK_SECTION_KEYS = [
  'summary', 'skills', 'competences', 'experience', 'positions',
  'education', 'certifications', 'languages', 'portfolio', 'general',
]

// ── field spec helpers ───────────────────────────────────────────────────────

function spec(f) {
  const s = typeof f === 'string' ? { type: f } : f
  return { default: defaultFor(s.type), ...s }
}

function defaultFor(type) {
  if (type === bool) return false
  if (type === strArr) return []
  return ''
}

// Models occasionally emit a nested array/object as a JSON *string* inside
// tool input — decode it before normal coercion.
function maybeParseJson(value) {
  if (typeof value === 'string' && /^\s*[[{]/.test(value)) {
    try { return JSON.parse(value) } catch { return value }
  }
  return value
}

function coerce(rawValue, type, fallback) {
  const value = maybeParseJson(rawValue)
  if (type === bool) return typeof value === 'boolean' ? value : fallback
  if (type === strArr) {
    if (Array.isArray(value)) return value.map(v => String(v)).filter(s => s.trim() !== '')
    if (typeof value === 'string') return value.split(/,\s*/).map(s => s.trim()).filter(Boolean)
    return fallback
  }
  // string
  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  if (Array.isArray(value)) return value.map(String).join(', ')
  return fallback
}

function normalizeItem(raw, fields) {
  const item = {}
  for (const [key, f] of Object.entries(fields)) {
    const s = spec(f)
    item[key] = coerce(raw?.[key], s.type, s.default)
  }
  if (raw && typeof raw._id === 'string') item._id = raw._id
  return item
}

// ── normalization (the boundary contract) ────────────────────────────────────

// Coerces arbitrary input (AI output, stored data) into a fully-shaped CV:
// every section present, every field the right type, unknown keys dropped.
export function normalizeCv(raw = {}) {
  const cv = {}
  for (const [key, def] of Object.entries(CV_SECTIONS)) {
    const val = maybeParseJson(raw?.[key])
    if (def.kind === 'scalar') {
      cv[key] = def.values?.includes(val) ? val : def.default
    } else if (def.kind === 'object') {
      cv[key] = normalizeItem(val, def.fields)
    } else if (def.kind === 'array') {
      cv[key] = Array.isArray(val) ? val.map(it => normalizeItem(it, def.itemFields)) : []
    } else if (def.kind === 'group') {
      const group = {}
      for (const [fk, ff] of Object.entries(def.flags)) {
        const s = spec(ff)
        group[fk] = coerce(val?.[fk], s.type, s.default)
      }
      const items = maybeParseJson(val?.items)
      group.items = Array.isArray(items) ? items.map(it => normalizeItem(it, def.itemFields)) : []
      cv[key] = group
    }
  }
  return cv
}

export function emptyCv() {
  return normalizeCv({})
}

// True when a CV has enough real content to be worth persisting, exporting, or
// offering as a translation source. Used to decide which language slots are
// "filled" for the toggle, translate offers, and export menus.
export function cvHasContent(cv) {
  if (!cv || !cv.personal) return false
  return Boolean(
    cv.personal.firstName || cv.personal.lastName || cv.personal.summary ||
    cv.experience?.length || cv.education?.length || cv.skills?.length
  )
}

// Merges an AI-produced CV over the current one: normalizes the AI output and
// carries over client-only sections (ai: false) plus any sections named in
// `keep` — those are never overwritten by the model.
export function mergeAiCv(currentCv, aiCv, { keep = [] } = {}) {
  const merged = normalizeCv(aiCv)
  for (const [key, def] of Object.entries(CV_SECTIONS)) {
    if (!def.ai || keep.includes(key)) {
      merged[key] = currentCv?.[key] !== undefined ? deepClone(currentCv[key]) : merged[key]
    }
  }
  return merged
}

// ── stable item identity ─────────────────────────────────────────────────────

let idCounter = 0
export function newId() {
  const c = globalThis.crypto
  if (c?.randomUUID) return c.randomUUID().slice(0, 8)
  return `id${Date.now().toString(36)}${idCounter++}`
}

// Returns a clone where every item in every array section has a stable `_id`.
export function ensureIds(cv) {
  const next = deepClone(cv)
  for (const p of ARRAY_SECTION_PATHS) {
    const arr = deepGet(next, p)
    if (!Array.isArray(arr)) continue
    for (const item of arr) {
      if (item && typeof item === 'object' && !item._id) item._id = newId()
    }
  }
  return next
}

// Returns a clone with `_id` markers removed — use before sending a CV to the
// model, to storage, or to any renderer-facing export.
export function stripIds(cv) {
  const next = deepClone(cv)
  for (const p of ARRAY_SECTION_PATHS) {
    const arr = deepGet(next, p)
    if (!Array.isArray(arr)) continue
    for (const item of arr) {
      if (item && typeof item === 'object') delete item._id
    }
  }
  return next
}

// First identity key must match (non-empty); any further keys must not conflict.
function identityMatch(a, b, keys) {
  const norm = v => String(v ?? '').trim().toLowerCase()
  if (!keys?.length) return false
  if (!norm(a[keys[0]]) || norm(a[keys[0]]) !== norm(b[keys[0]])) return false
  for (const k of keys.slice(1)) {
    const av = norm(a[k])
    const bv = norm(b[k])
    if (av && bv && av !== bv) return false
  }
  return true
}

// Assigns `_id`s to the items of newCv by correlating them with prevCv:
//   1. an item that already carries a known _id keeps it (patch-derived CVs)
//   2. otherwise match by the section's identity keys (AI-regenerated CVs)
//   3. otherwise a fresh id (genuinely new items)
// This is what lets user-edit protection survive the model reordering arrays.
export function correlateIds(prevCv, newCv) {
  const next = deepClone(newCv)
  for (const [key, def] of Object.entries(CV_SECTIONS)) {
    const arrPath = def.kind === 'array' ? key : def.kind === 'group' ? `${key}.items` : null
    if (!arrPath) continue
    const oldArr = deepGet(prevCv, arrPath) || []
    const newArr = deepGet(next, arrPath) || []
    const known = new Set(oldArr.map(it => it?._id).filter(Boolean))
    const taken = new Set()

    for (const item of newArr) {
      if (item._id && known.has(item._id) && !taken.has(item._id)) taken.add(item._id)
      else if (item._id) delete item._id // unknown or duplicate id — re-correlate below
    }
    for (const item of newArr) {
      if (item._id) continue
      const match = oldArr.find(o => o?._id && !taken.has(o._id) && identityMatch(o, item, def.identity))
      if (match) { item._id = match._id; taken.add(match._id) }
    }
    for (const item of newArr) {
      if (!item._id) item._id = newId()
    }
  }
  return next
}

// Copies `_id`s from sourceCv onto targetCv by POSITION within each array
// section. Translation preserves item count and order, so the same logical item
// ends up sharing one id across the en/no/es slices. That is what lets a tailored
// variant — whose excludedIds/order/overrides are keyed by `_id` — resolve in
// every language, not just the one it was created in. Items with no positional
// source (e.g. a slice that's longer) get a fresh id.
export function alignIds(sourceCv, targetCv) {
  const next = deepClone(targetCv)
  for (const p of ARRAY_SECTION_PATHS) {
    const src = deepGet(sourceCv, p)
    const tgt = deepGet(next, p)
    if (!Array.isArray(tgt)) continue
    for (let i = 0; i < tgt.length; i++) {
      const item = tgt[i]
      if (!item || typeof item !== 'object') continue
      const srcId = Array.isArray(src) && src[i] && src[i]._id
      if (srcId) item._id = srcId
      else if (!item._id) item._id = newId()
    }
  }
  return next
}

// Best-effort migration for CVs whose language slices were translated before
// alignIds existed (their ids diverged across languages). Aligns every slice to
// the canonical language's ids, per section, ONLY where item counts match — so
// it can fix matching structures and never scrambles a diverged one.
export function resyncLangIds(cvByLang, canonicalLang) {
  const canon = cvByLang[canonicalLang]
  if (!canon) return cvByLang
  const out = { ...cvByLang }
  for (const [lang, cv] of Object.entries(cvByLang)) {
    if (lang === canonicalLang || !cv) continue
    let changed = false
    const next = deepClone(cv)
    for (const p of ARRAY_SECTION_PATHS) {
      const src = deepGet(canon, p)
      const tgt = deepGet(next, p)
      if (!Array.isArray(src) || !Array.isArray(tgt) || src.length !== tgt.length) continue
      for (let i = 0; i < tgt.length; i++) {
        if (tgt[i] && typeof tgt[i] === 'object' && src[i]?._id && tgt[i]._id !== src[i]._id) {
          tgt[i]._id = src[i]._id; changed = true
        }
      }
    }
    if (changed) out[lang] = next
  }
  return out
}

// ── JSON Schema generation (for forced tool use) ─────────────────────────────

function fieldSchema(f) {
  const s = spec(f)
  const js =
    s.type === bool ? { type: 'boolean' } :
    s.type === strArr ? { type: 'array', items: { type: 'string' } } :
    { type: 'string' }
  if (s.desc) js.description = s.desc
  if (s.values) js.enum = s.values
  return js
}

function objectSchema(fields) {
  const properties = {}
  for (const [key, f] of Object.entries(fields)) properties[key] = fieldSchema(f)
  return {
    type: 'object',
    properties,
    additionalProperties: false,
  }
}

// Builds the tool input_schema for a CV. By default only AI-facing sections
// (ai: true) are included; `aiOnly: false` includes everything (translation).
// `exclude` drops named sections (e.g. parse skips the hand-curated matrix).
//
// Fields are deliberately NOT `required`: forcing every field makes the model
// emit filler for unknowns and destabilises large tool inputs. The model emits
// what it found; normalizeCv() fills the rest with typed defaults.
export function buildCvJsonSchema({ aiOnly = true, exclude = [] } = {}) {
  const properties = {}
  for (const [key, def] of Object.entries(CV_SECTIONS)) {
    if ((aiOnly && !def.ai) || exclude.includes(key)) continue
    if (def.kind === 'scalar') {
      properties[key] = fieldSchema({ type: str, values: def.values })
    } else if (def.kind === 'object') {
      properties[key] = objectSchema(def.fields)
    } else if (def.kind === 'array') {
      properties[key] = { type: 'array', items: objectSchema(def.itemFields) }
    } else if (def.kind === 'group') {
      const flagProps = {}
      for (const [fk, ff] of Object.entries(def.flags)) flagProps[fk] = fieldSchema(ff)
      properties[key] = {
        type: 'object',
        description: def.desc,
        properties: { ...flagProps, items: { type: 'array', items: objectSchema(def.itemFields) } },
        additionalProperties: false,
      }
    }
  }
  return {
    type: 'object',
    properties,
    additionalProperties: false,
  }
}
