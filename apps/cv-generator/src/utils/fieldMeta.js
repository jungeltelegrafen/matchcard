// Tracks which fields were set by AI vs. edited by the user.
// Keys are dot-notation paths: 'personal.firstName', 'experience.0.role', etc.

export function emptyMeta() {
  return {}
}

export function markUserEdit(meta, path) {
  return { ...meta, [path]: { source: 'user', aiSuggestion: null } }
}

export function acceptSuggestion(meta, path) {
  return { ...meta, [path]: { source: 'ai', aiSuggestion: null } }
}

export function dismissSuggestion(meta, path) {
  const entry = meta[path] || {}
  return { ...meta, [path]: { ...entry, aiSuggestion: null } }
}

export function getSource(meta, path) {
  return meta[path]?.source ?? 'empty'
}

export function getAiSuggestion(meta, path) {
  return meta[path]?.aiSuggestion ?? null
}

export function getUserEdits(meta, cv) {
  const edits = {}
  for (const [path, info] of Object.entries(meta)) {
    if (info.source === 'user') {
      const val = deepGet(cv, path)
      if (val != null && val !== '') edits[path] = val
    }
  }
  return edits
}

// Merge a fresh AI result into the current cv+meta, preserving user edits
// and surfacing conflicts as aiSuggestions.
export function applyAiResult(prevMeta, prevCv, newCv) {
  const nextCv = deepClone(newCv)
  const nextMeta = {}
  const paths = gatherLeafPaths(newCv)

  for (const path of paths) {
    const isUserEdited = prevMeta[path]?.source === 'user'
    const userVal = deepGet(prevCv, path)
    const aiVal = deepGet(newCv, path)

    if (isUserEdited && userVal != null && userVal !== '') {
      deepSet(nextCv, path, userVal)
      const hasConflict = aiVal != null && aiVal !== '' && aiVal !== userVal
      nextMeta[path] = { source: 'user', aiSuggestion: hasConflict ? aiVal : null }
    } else {
      nextMeta[path] = { source: 'ai', aiSuggestion: null }
    }
  }

  return { cv: nextCv, meta: nextMeta }
}

export function setValueAtPath(cv, path, value) {
  const next = deepClone(cv)
  deepSet(next, path, value)
  return next
}

// ─── helpers ────────────────────────────────────────────────────────────────

function deepGet(obj, path) {
  return path.split('.').reduce((acc, k) => acc?.[k], obj)
}

function deepSet(obj, path, value) {
  const keys = path.split('.')
  let cur = obj
  for (let i = 0; i < keys.length - 1; i++) {
    if (cur[keys[i]] == null) return
    cur = cur[keys[i]]
  }
  cur[keys[keys.length - 1]] = value
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj))
}

function gatherLeafPaths(obj, prefix = '') {
  if (Array.isArray(obj)) {
    return obj.flatMap((v, i) => gatherLeafPaths(v, prefix ? `${prefix}.${i}` : `${i}`))
  }
  if (obj && typeof obj === 'object') {
    return Object.entries(obj).flatMap(([k, v]) =>
      gatherLeafPaths(v, prefix ? `${prefix}.${k}` : k)
    )
  }
  return prefix ? [prefix] : []
}
