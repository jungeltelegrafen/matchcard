// Local draft persistence — the CV survives page reloads and browser restarts.
// Best-effort: storage failures (quota, private mode) never break the app.
// Server-side persistence will replace this once auth lands; the versioned
// payload gives that migration a stable format to read.
//
// v2 stores BOTH language versions of the CV side by side, plus the two
// independent language toggles (site UI vs CV content). Translating one
// language never touches the other.

import { normalizeCv, ensureIds, emptyCv, cvHasContent } from '@lib/cv/schema'

const KEY = 'cv-generator:draft:v2'
const KEY_V1 = 'cv-generator:draft:v1'
const LANGS = ['en', 'no']

function toLang(v, fallback = 'en') {
  return v === 'no' ? 'no' : v === 'en' ? 'en' : fallback
}

function normalizeCvByLang(raw) {
  const out = {}
  for (const l of LANGS) out[l] = ensureIds(normalizeCv(raw?.[l] ?? {}))
  return out
}

function objByLang(raw, coerce) {
  const out = {}
  for (const l of LANGS) out[l] = coerce(raw?.[l])
  return out
}

export function loadDraft() {
  try {
    const rawV2 = localStorage.getItem(KEY)
    if (rawV2) return parseV2(JSON.parse(rawV2))

    // Migrate a v1 draft (single-language) into the v2 shape once.
    const rawV1 = localStorage.getItem(KEY_V1)
    if (rawV1) {
      const migrated = migrateV1(JSON.parse(rawV1))
      if (migrated) return migrated
    }
    return null
  } catch {
    return null
  }
}

function parseV2(draft) {
  if (draft?.v !== 2 || !draft.cvByLang || typeof draft.cvByLang !== 'object') return null
  return {
    cvByLang: normalizeCvByLang(draft.cvByLang),
    metaByLang: objByLang(draft.metaByLang, m => (m && typeof m === 'object' ? m : {})),
    feedbackByLang: objByLang(draft.feedbackByLang, f => (Array.isArray(f) ? f : [])),
    uiLang: toLang(draft.uiLang),
    contentLang: toLang(draft.contentLang),
    savedAt: typeof draft.savedAt === 'number' ? draft.savedAt : null,
  }
}

function migrateV1(draft) {
  if (draft?.v !== 1 || !draft.cv || typeof draft.cv !== 'object') return null
  const lang = toLang(draft.lang)
  const other = lang === 'en' ? 'no' : 'en'
  return {
    cvByLang: {
      [lang]: ensureIds(normalizeCv(draft.cv)),
      [other]: emptyCv(),
    },
    metaByLang: {
      [lang]: draft.meta && typeof draft.meta === 'object' ? draft.meta : {},
      [other]: {},
    },
    feedbackByLang: {
      [lang]: Array.isArray(draft.feedbackItems) ? draft.feedbackItems : [],
      [other]: [],
    },
    uiLang: lang,
    contentLang: lang,
    savedAt: typeof draft.savedAt === 'number' ? draft.savedAt : null,
  }
}

export function saveDraft({ cvByLang, metaByLang, feedbackByLang, uiLang, contentLang }) {
  try {
    localStorage.setItem(KEY, JSON.stringify({
      v: 2,
      savedAt: Date.now(),
      cvByLang,
      metaByLang,
      feedbackByLang,
      uiLang,
      contentLang,
    }))
    // The old single-language draft is now superseded.
    localStorage.removeItem(KEY_V1)
  } catch {
    // quota exceeded / private mode — autosave is best-effort
  }
}

export function clearDraft() {
  try {
    localStorage.removeItem(KEY)
    localStorage.removeItem(KEY_V1)
  } catch {
    // ignore
  }
}

// True when either language version has content worth telling the user about.
export function draftHasContent(draft) {
  if (!draft?.cvByLang) return false
  return LANGS.some(l => cvHasContent(draft.cvByLang[l]))
}
