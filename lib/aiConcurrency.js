// Shared bounded-concurrency + global-deadline helpers for AI routes that fan a
// large job out into small parallel Anthropic calls under Vercel's 60s cap.
// Used by /api/cv/translate and /api/cv/parse.

// Run `fn` over `items` with at most `limit` in flight at once. NEVER rejects —
// each item is settled to { ok:true, value } | { ok:false, error } so one bad
// chunk can't fail the whole batch. Results are index-aligned with `items`.
export async function mapLimit(items, limit, fn) {
  const results = new Array(items.length)
  let next = 0
  async function worker() {
    while (next < items.length) {
      const i = next++
      results[i] = await fn(items[i], i).then(
        value => ({ ok: true, value }),
        error => ({ ok: false, error }),
      )
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}

// Runs `fn(signal)` with an AbortController that fires after `ms`, so any
// in-flight/queued work aborts before the function's own duration cap. The
// caller passes `signal` into each Anthropic call; stragglers reject and are
// handled by the caller's per-item fallback. Always clears the timer.
export async function withDeadline(ms, fn) {
  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), ms)
  try {
    return await fn(ac.signal)
  } finally {
    clearTimeout(timer)
  }
}
