function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj))
}

function parsePath(path) {
  return path.split('.').map(p => (/^\d+$/.test(p) ? parseInt(p) : p))
}

function deepGet(obj, parts) {
  return parts.reduce((cur, key) => (cur == null ? undefined : cur[key]), obj)
}

function deepSet(obj, parts, value) {
  const last = parts[parts.length - 1]
  const parent = parts.slice(0, -1).reduce((cur, key) => cur[key], obj)
  parent[last] = value
}

export function applyPatches(cv, patches) {
  if (!Array.isArray(patches) || patches.length === 0) return cv
  const result = deepClone(cv)

  for (const { op, path, value } of patches) {
    if (!op || !path) continue
    const parts = parsePath(path)
    try {
      if (op === 'replace') {
        deepSet(result, parts, value)
      } else if (op === 'append') {
        const arr = deepGet(result, parts)
        deepSet(result, parts, Array.isArray(arr) ? [...arr, value] : [value])
      } else if (op === 'remove') {
        const lastPart = parts[parts.length - 1]
        if (typeof lastPart === 'number') {
          const parentParts = parts.slice(0, -1)
          const arr = deepGet(result, parentParts)
          if (Array.isArray(arr)) {
            deepSet(result, parentParts, arr.filter((_, i) => i !== lastPart))
          }
        }
      }
    } catch (e) {
      console.warn('[applyPatches] skipped patch:', { op, path }, e.message)
    }
  }

  return result
}
