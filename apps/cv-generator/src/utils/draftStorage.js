// Local draft persistence — the CV survives page reloads and browser restarts.
// Best-effort: storage failures (quota, private mode) never break the app.
// Server-side persistence will replace this once auth lands; the versioned
// payload gives that migration a stable format to read.
//
// v3 adds job-tailoring `variants` (a saved selection + text overrides over the
// master, per role) and the `activeVariantId` currently in view. v2 stored both
// language versions; v1 was single-language. Older drafts migrate forward.

import { normalizeCv, ensureIds, emptyCv, cvHasContent, newId, resyncLangIds } from '@lib/cv/schema'
import { LANGS, toLang } from '@lib/cv/lang'
import { emptyOffer, normalizeOffer } from './offer'

const KEY = 'cv-generator:draft:v4'
const KEY_V3 = 'cv-generator:draft:v3'
const KEY_V2 = 'cv-generator:draft:v2'
const KEY_V1 = 'cv-generator:draft:v1'
const LEGACY_KEYS = [KEY_V3, KEY_V2, KEY_V1]

// Portfolio used to store a `platform` enum + `customPlatform`; it now stores a
// free-text `label` (title) + `category`. Map old items forward BEFORE
// normalizeCv drops the retired fields, so existing links keep their name/tag.
const LEGACY_PLATFORM = {
  github:        { title: 'GitHub',         category: 'code' },
  gitlab:        { title: 'GitLab',         category: 'code' },
  stackoverflow: { title: 'Stack Overflow', category: 'code' },
  dribbble:      { title: 'Dribbble',       category: 'design' },
  behance:       { title: 'Behance',        category: 'design' },
  website:       { title: '',               category: 'project' },
}
function migratePortfolioLegacy(cv) {
  if (!cv || !Array.isArray(cv.portfolio)) return cv
  const portfolio = cv.portfolio.map(item => {
    if (!item || (item.platform === undefined && item.customPlatform === undefined)) return item
    const { platform, customPlatform, ...rest } = item
    const map = LEGACY_PLATFORM[platform] || { title: '', category: '' }
    return {
      ...rest,
      label: rest.label || (platform === 'other' ? (customPlatform || '') : map.title),
      category: rest.category || map.category,
    }
  })
  return { ...cv, portfolio }
}

function normalizeCvByLang(raw) {
  const out = {}
  for (const l of LANGS) out[l] = ensureIds(normalizeCv(migratePortfolioLegacy(raw?.[l] ?? {})))
  return out
}

function objByLang(raw, coerce) {
  const out = {}
  for (const l of LANGS) out[l] = coerce(raw?.[l])
  return out
}

function normalizeVariant(v) {
  if (!v || typeof v !== 'object') return null
  const ov = v.overrides || {}
  const isAnon = v.kind === 'anonymous'
  const anonText = v.anonymize?.text && typeof v.anonymize.text === 'object' ? v.anonymize.text : {}
  return {
    id: typeof v.id === 'string' ? v.id : newId(),
    ...(isAnon ? {
      kind: 'anonymous',
      anonymize: {
        name: v.anonymize?.name !== false,
        contact: v.anonymize?.contact !== false,
        location: v.anonymize?.location !== false,
        company: v.anonymize?.company !== false,
        certifications: v.anonymize?.certifications !== false,
        portfolio: v.anonymize?.portfolio !== false,
        positions: v.anonymize?.positions !== false,
        videos: v.anonymize?.videos !== false,
        education: v.anonymize?.education === true,
        text: Object.fromEntries(LANGS.map(l => [l, (anonText[l] && typeof anonText[l] === 'object') ? anonText[l] : {}])),
      },
    } : {}),
    name: typeof v.name === 'string' && v.name.trim() ? v.name : 'Untitled role',
    role: {
      title: String(v.role?.title ?? ''),
      text: String(v.role?.text ?? ''),
    },
    tailoredInLang: toLang(v.tailoredInLang),
    createdAt: typeof v.createdAt === 'number' ? v.createdAt : Date.now(),
    excludedIds: Array.isArray(v.excludedIds) ? v.excludedIds.filter(x => typeof x === 'string') : [],
    excludedSkillTags: v.excludedSkillTags && typeof v.excludedSkillTags === 'object' ? v.excludedSkillTags : {},
    order: v.order && typeof v.order === 'object' ? v.order : {},
    overrides: Object.fromEntries(LANGS.map(l => [l, {
      summary: String(ov[l]?.summary ?? ''),
      expDesc: ov[l]?.expDesc && typeof ov[l].expDesc === 'object' ? ov[l].expDesc : {},
    }])),
    rationale: {
      fitNote: String(v.rationale?.fitNote ?? ''),
      reasons: v.rationale?.reasons && typeof v.rationale.reasons === 'object' ? v.rationale.reasons : {},
    },
  }
}

function normalizeVariants(raw) {
  return Array.isArray(raw) ? raw.map(normalizeVariant).filter(Boolean) : []
}

export function loadDraft() {
  try {
    const rawV4 = localStorage.getItem(KEY)
    if (rawV4) return parseV4(JSON.parse(rawV4))

    const rawV3 = localStorage.getItem(KEY_V3)
    if (rawV3) return parseV3(JSON.parse(rawV3))

    const rawV2 = localStorage.getItem(KEY_V2)
    if (rawV2) return migrateV2(JSON.parse(rawV2))

    const rawV1 = localStorage.getItem(KEY_V1)
    if (rawV1) return migrateV1(JSON.parse(rawV1))

    return null
  } catch {
    return null
  }
}

function baseFromV2Shape(draft) {
  return {
    cvByLang: normalizeCvByLang(draft.cvByLang),
    metaByLang: objByLang(draft.metaByLang, m => (m && typeof m === 'object' ? m : {})),
    feedbackByLang: objByLang(draft.feedbackByLang, f => (Array.isArray(f) ? f : [])),
    offerByLang: objByLang(draft.offerByLang, normalizeOffer),
    profilePicture: typeof draft.profilePicture === 'string' ? draft.profilePicture : '',
    includeBranding: typeof draft.includeBranding === 'boolean' ? draft.includeBranding : true,
    uiLang: toLang(draft.uiLang),
    contentLang: toLang(draft.contentLang),
    savedAt: typeof draft.savedAt === 'number' ? draft.savedAt : null,
  }
}

// v4 adds offerByLang (the consultant "offer"/Tilbudsformat). v3 shape is
// otherwise identical, so v3 drafts migrate forward by just gaining empty offers
// (baseFromV2Shape coerces a missing offerByLang to empties).
function parseV4(draft) {
  if (draft?.v !== 4 || !draft.cvByLang || typeof draft.cvByLang !== 'object') return null
  return withVariants(draft)
}

function parseV3(draft) {
  if (draft?.v !== 3 || !draft.cvByLang || typeof draft.cvByLang !== 'object') return null
  return withVariants(draft)
}

function withVariants(draft) {
  const base = baseFromV2Shape(draft)
  const variants = normalizeVariants(draft.variants)
  const activeVariantId = variants.some(v => v.id === draft.activeVariantId) ? draft.activeVariantId : null
  // Older drafts were translated before ids were shared across languages, so a
  // variant only applied in the language it was made in. Re-align every slice's
  // ids to the active language (best-effort, only where structures match) so
  // existing variants apply across languages too.
  base.cvByLang = resyncLangIds(base.cvByLang, base.contentLang)
  return { ...base, variants, activeVariantId }
}

function migrateV2(draft) {
  if (draft?.v !== 2 || !draft.cvByLang || typeof draft.cvByLang !== 'object') return null
  return { ...baseFromV2Shape(draft), variants: [], activeVariantId: null }
}

function migrateV1(draft) {
  if (draft?.v !== 1 || !draft.cv || typeof draft.cv !== 'object') return null
  const lang = toLang(draft.lang)
  const cvByLang = {}, metaByLang = {}, feedbackByLang = {}
  for (const l of LANGS) {
    cvByLang[l] = l === lang ? ensureIds(normalizeCv(migratePortfolioLegacy(draft.cv))) : emptyCv()
    metaByLang[l] = l === lang && draft.meta && typeof draft.meta === 'object' ? draft.meta : {}
    feedbackByLang[l] = l === lang && Array.isArray(draft.feedbackItems) ? draft.feedbackItems : []
  }
  return {
    cvByLang, metaByLang, feedbackByLang,
    offerByLang: Object.fromEntries(LANGS.map(l => [l, emptyOffer()])),
    uiLang: lang === 'no' ? 'no' : 'en',
    contentLang: lang,
    variants: [],
    activeVariantId: null,
    savedAt: typeof draft.savedAt === 'number' ? draft.savedAt : null,
  }
}

export function saveDraft({ cvByLang, metaByLang, feedbackByLang, offerByLang, profilePicture, includeBranding, uiLang, contentLang, variants, activeVariantId }) {
  try {
    localStorage.setItem(KEY, JSON.stringify({
      v: 4,
      savedAt: Date.now(),
      cvByLang,
      metaByLang,
      feedbackByLang,
      offerByLang,
      profilePicture: profilePicture ?? '',
      includeBranding: includeBranding !== false,
      uiLang,
      contentLang,
      variants: variants ?? [],
      activeVariantId: activeVariantId ?? null,
    }))
    for (const k of LEGACY_KEYS) localStorage.removeItem(k)
  } catch {
    // quota exceeded / private mode — autosave is best-effort
  }
}

export function clearDraft() {
  try {
    localStorage.removeItem(KEY)
    for (const k of LEGACY_KEYS) localStorage.removeItem(k)
  } catch {
    // ignore
  }
}

// True when either language version has content worth telling the user about.
export function draftHasContent(draft) {
  if (!draft?.cvByLang) return false
  return LANGS.some(l => cvHasContent(draft.cvByLang[l]))
}
