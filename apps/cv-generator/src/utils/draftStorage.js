// Local draft persistence — the CV survives page reloads and browser restarts.
// Best-effort: storage failures (quota, private mode) never break the app.
// Server-side persistence will replace this once auth lands; the versioned
// payload gives that migration a stable format to read.

import { normalizeCv, ensureIds } from '@lib/cv/schema'

const KEY = 'cv-generator:draft:v1'

export function loadDraft() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const draft = JSON.parse(raw)
    if (draft?.v !== 1 || !draft.cv || typeof draft.cv !== 'object') return null
    return {
      // Normalize on the way in — a draft saved by an older schema version
      // comes back full-shape, and items keep (or regain) stable ids.
      cv: ensureIds(normalizeCv(draft.cv)),
      meta: draft.meta && typeof draft.meta === 'object' ? draft.meta : {},
      lang: draft.lang === 'no' ? 'no' : 'en',
      feedbackItems: Array.isArray(draft.feedbackItems) ? draft.feedbackItems : [],
      savedAt: typeof draft.savedAt === 'number' ? draft.savedAt : null,
    }
  } catch {
    return null
  }
}

export function saveDraft({ cv, meta, lang, feedbackItems }) {
  try {
    localStorage.setItem(KEY, JSON.stringify({
      v: 1,
      savedAt: Date.now(),
      cv,
      meta,
      lang,
      feedbackItems,
    }))
  } catch {
    // quota exceeded / private mode — autosave is best-effort
  }
}

export function clearDraft() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // ignore
  }
}

// True when a draft contains something worth telling the user about.
export function draftHasContent(draft) {
  if (!draft) return false
  const { cv } = draft
  return Boolean(
    cv.personal.firstName || cv.personal.lastName || cv.personal.summary ||
    cv.experience.length || cv.education.length || cv.skills.length
  )
}
