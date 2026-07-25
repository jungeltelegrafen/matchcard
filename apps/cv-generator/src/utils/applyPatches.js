// Applies surgical patches (from the chat agent) to a CV snapshot.
// Patch paths use numeric array indexes ('education.0.degree') — they are
// resolved against the snapshot they were generated for, applied atomically.

import { deepClone, deepGet, deepSet, parsePath } from '@lib/cv/paths'

export function applyPatches(cv, patches) {
  if (!Array.isArray(patches) || patches.length === 0) return cv
  const result = deepClone(cv)

  for (const patch of patches) {
    const { op, path, value } = patch || {}
    if (!op || !path) continue
    const parts = parsePath(path)
    try {
      if (op === 'replace') {
        deepSet(result, parts, value)
      } else if (op === 'append') {
        const arr = deepGet(result, parts)
        deepSet(result, parts, Array.isArray(arr) ? [...arr, value] : [value])
      } else if (op === 'remove') {
        const last = parts[parts.length - 1]
        if (typeof last === 'number') {
          const parentParts = parts.slice(0, -1)
          const arr = deepGet(result, parentParts)
          if (Array.isArray(arr)) {
            deepSet(result, parentParts, arr.filter((_, i) => i !== last))
          }
        }
      }
    } catch (e) {
      console.warn('[applyPatches] skipped patch:', { op, path }, e?.message)
    }
  }

  return result
}
