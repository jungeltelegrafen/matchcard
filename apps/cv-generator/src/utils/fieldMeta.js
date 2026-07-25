// Tracks which fields were set by AI vs. edited by the user.
// Meta keys are dot-notation index paths ('personal.firstName', 'experience.0.role').
//
// Index paths are only stable while arrays don't change shape, so every array
// mutation must go through a remap: items carry a stable `_id` (see
// @lib/cv/schema ensureIds/correlateIds), and remapMeta/applyAiResult rewrite
// meta keys from old indexes to new ones by following those ids. This is what
// keeps user-edit protection attached to the *right* item when the AI (or a
// structural edit) reorders, inserts, or removes array entries.

import { deepGet, deepSet, deepClone, gatherLeafPaths } from '@lib/cv/paths'
import { ARRAY_SECTION_PATHS, correlateIds, mergeAiCv } from '@lib/cv/schema'

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

export function setValueAtPath(cv, path, value) {
  const next = deepClone(cv)
  deepSet(next, path, value)
  return next
}

// ─── index remapping via item ids ────────────────────────────────────────────

// For each array section, map old index → new index by matching `_id`s.
function buildIndexMaps(oldCv, newCv) {
  const maps = {}
  for (const p of ARRAY_SECTION_PATHS) {
    const oldArr = deepGet(oldCv, p) || []
    const newArr = deepGet(newCv, p) || []
    const newIndexById = new Map()
    newArr.forEach((item, i) => { if (item?._id) newIndexById.set(item._id, i) })
    const m = new Map()
    oldArr.forEach((item, i) => {
      if (item?._id && newIndexById.has(item._id)) m.set(i, newIndexById.get(item._id))
    })
    maps[p] = m
  }
  return maps
}

// Rewrites one path from old indexes to new ones.
// Returns null when the path pointed into an item that no longer exists.
function remapPath(path, maps) {
  for (const prefix of Object.keys(maps)) {
    if (path !== prefix && !path.startsWith(prefix + '.')) continue
    const rest = path.slice(prefix.length + 1)
    if (!rest) return path
    const [idxStr, ...tail] = rest.split('.')
    if (!/^\d+$/.test(idxStr)) return path
    const m = maps[prefix]
    if (!m.has(Number(idxStr))) return null
    return [prefix, m.get(Number(idxStr)), ...tail].join('.')
  }
  return path
}

// Rewrites all meta keys after a structural change (add/remove/reorder items).
// Entries pointing into removed items are dropped.
export function remapMeta(meta, oldCv, newCv) {
  const maps = buildIndexMaps(oldCv, newCv)
  const next = {}
  for (const [path, info] of Object.entries(meta)) {
    const np = remapPath(path, maps)
    if (np) next[np] = info
  }
  return next
}

// ─── merging AI results ──────────────────────────────────────────────────────

// Merge a fresh AI result into the current cv+meta:
//   1. normalize the raw AI output and carry over client-only sections
//   2. correlate item ids so array items keep their identity
//   3. restore user-edited values (remapped to their new positions), surfacing
//      conflicting AI values as accept/dismiss suggestions
// `keepSections` marks extra sections the AI must never overwrite for this call.
export function applyAiResult(prevMeta, prevCv, rawNewCv, { keepSections = [] } = {}) {
  const nextCv = correlateIds(prevCv, mergeAiCv(prevCv, rawNewCv, { keep: keepSections }))
  const maps = buildIndexMaps(prevCv, nextCv)

  const nextMeta = {}
  for (const path of gatherLeafPaths(nextCv)) {
    nextMeta[path] = { source: 'ai', aiSuggestion: null }
  }

  for (const [oldPath, info] of Object.entries(prevMeta)) {
    if (info?.source !== 'user') continue
    const userVal = deepGet(prevCv, oldPath)
    if (userVal == null || userVal === '') continue
    const newPath = remapPath(oldPath, maps)
    if (!newPath) continue // the item this edit lived in was removed
    const aiVal = deepGet(nextCv, newPath)
    if (!deepSet(nextCv, newPath, deepClone(userVal))) continue
    const conflict = aiVal != null && aiVal !== '' &&
      JSON.stringify(aiVal) !== JSON.stringify(userVal)
    nextMeta[newPath] = { source: 'user', aiSuggestion: conflict ? aiVal : null }
  }

  return { cv: nextCv, meta: nextMeta }
}
