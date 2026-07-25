// Shared deep-path utilities for CV data.
// Single implementation used by the SPA (apps/cv-generator, via the @lib alias)
// and the Next.js API routes (via @/lib). Framework-free, dependency-free.

// 'experience.0.role' → ['experience', 0, 'role']
export function parsePath(path) {
  return path.split('.').map(p => (/^\d+$/.test(p) ? parseInt(p, 10) : p))
}

export function deepGet(obj, path) {
  const parts = Array.isArray(path) ? path : parsePath(path)
  return parts.reduce((cur, key) => (cur == null ? undefined : cur[key]), obj)
}

// Sets a value at path. Returns false (without mutating) when a parent
// segment does not exist — callers can treat that as "path no longer valid".
export function deepSet(obj, path, value) {
  const parts = Array.isArray(path) ? path : parsePath(path)
  let cur = obj
  for (let i = 0; i < parts.length - 1; i++) {
    if (cur[parts[i]] == null) return false
    cur = cur[parts[i]]
  }
  cur[parts[parts.length - 1]] = value
  return true
}

export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj))
}

// All leaf paths of a nested structure. Internal `_id` markers are skipped —
// they are bookkeeping, not CV content.
export function gatherLeafPaths(obj, prefix = '') {
  if (Array.isArray(obj)) {
    return obj.flatMap((v, i) => gatherLeafPaths(v, prefix ? `${prefix}.${i}` : String(i)))
  }
  if (obj && typeof obj === 'object') {
    return Object.entries(obj).flatMap(([k, v]) =>
      k === '_id' ? [] : gatherLeafPaths(v, prefix ? `${prefix}.${k}` : k)
    )
  }
  return prefix ? [prefix] : []
}
