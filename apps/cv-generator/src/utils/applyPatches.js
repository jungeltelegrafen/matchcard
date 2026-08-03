// Applies surgical patches (from the chat agent) to a CV snapshot.
// Patch paths use numeric array indexes ('education.0.degree') — they are
// resolved against the snapshot they were generated for, applied atomically.

import { deepClone, deepGet, deepSet, parsePath } from '@lib/cv/paths'

// Applies patches and reports exactly what landed. `applied` holds the patches
// whose target existed and was changed; `skipped` holds the ones dropped (bad
// path, wrong shape, malformed) each with a reason. This is the ground truth
// used to tell the user what really changed vs. what the model claimed. The
// input CV is never mutated.
export function applyPatchesReport(cv, patches) {
  if (!Array.isArray(patches) || patches.length === 0) {
    return { cv, applied: [], skipped: [] }
  }
  const result = deepClone(cv)
  const applied = []
  const skipped = []

  for (const patch of patches) {
    const { op, path, value } = patch || {}
    if (!op || !path) { skipped.push({ patch, reason: 'malformed' }); continue }
    const parts = parsePath(path)
    try {
      if (op === 'replace') {
        // deepSet returns false without mutating when a parent segment is
        // missing — that's a hallucinated/stale path, not a real change.
        if (deepSet(result, parts, value)) applied.push(patch)
        else skipped.push({ patch, reason: 'target not found' })
      } else if (op === 'append') {
        const arr = deepGet(result, parts)
        if (Array.isArray(arr)) {
          if (deepSet(result, parts, [...arr, value])) applied.push(patch)
          else skipped.push({ patch, reason: 'target not found' })
        } else if (arr == null) {
          skipped.push({ patch, reason: 'target not found' })
        } else {
          skipped.push({ patch, reason: 'target is not a list' })
        }
      } else if (op === 'remove') {
        const last = parts[parts.length - 1]
        if (typeof last !== 'number') {
          skipped.push({ patch, reason: 'remove needs an item index' })
        } else {
          const parentParts = parts.slice(0, -1)
          const arr = deepGet(result, parentParts)
          if (Array.isArray(arr) && last >= 0 && last < arr.length) {
            deepSet(result, parentParts, arr.filter((_, i) => i !== last))
            applied.push(patch)
          } else {
            skipped.push({ patch, reason: 'item not found' })
          }
        }
      } else {
        skipped.push({ patch, reason: `unknown operation "${op}"` })
      }
    } catch (e) {
      skipped.push({ patch, reason: e?.message || 'error' })
    }
  }

  return { cv: result, applied, skipped }
}

// Back-compat wrapper: apply and return just the resulting CV.
export function applyPatches(cv, patches) {
  return applyPatchesReport(cv, patches).cv
}
