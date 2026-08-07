import { NextResponse } from 'next/server'
import { pool } from './db'

// Interim cross-instance rate limiting for the public /api/cv/* routes, backed
// by Postgres (in-memory counters don't work on Vercel — instances are isolated
// and scale horizontally). This is a stopgap until Azure AD auth lands.
//
// Design choices:
//   - Fixed window, atomic single-query upsert (no read-then-write race).
//   - Fail-OPEN: if the limiter query errors, the request is allowed. A rate-
//     limit infra hiccup must never take down CV generation.
//   - Best-effort cleanup of expired rows, fired occasionally, never awaited.

// Tunable per-IP limits. AI routes share one bucket so a burst across routes
// (e.g. running all agents, then a chat, then a translate) counts together —
// generous enough for real editing, tight enough to stop a runaway loop.
export const LIMITS = {
  ai:         { group: 'cv-ai',          limit: 30,  windowSec: 60 },
  shareWrite: { group: 'cv-share-write', limit: 15,  windowSec: 60 },
  shareRead:  { group: 'cv-share-read',  limit: 120, windowSec: 60 },
  // Dedicated bucket for server-side URL fetching so it can't be abused as a
  // scraping/SSRF proxy independent of the AI budget.
  urlFetch:   { group: 'cv-url-fetch',   limit: 10,  windowSec: 60 },
}

// Per-IP DAILY ceiling on AI calls — a backstop against a single source looping
// all day and running up the shared Anthropic bill, on top of the per-minute
// limit above. Deliberately sized far above real usage: a heavy editing session
// is maybe a few dozen AI calls, so a normal user never comes close — this only
// trips on a runaway loop or sustained abuse from one IP. It is NOT the true
// spend cap (a determined attacker can rotate IPs); the Anthropic workspace
// spend limit in the Console is the hard dollar ceiling. This is the cheap
// app-layer seatbelt. Reuses the same rate_limits table — no migration needed.
export const DAILY_LIMITS = {
  ai: { group: 'cv-ai-daily', limit: 500, windowSec: 86400 },
}

function clientIp(request) {
  const xff = request.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  return request.headers.get('x-real-ip') || 'unknown'
}

// Atomically increments the caller's counter for `group` and reports whether
// they are over `limit` within the `windowSec` window.
// Returns { ok, remaining, retryAfter } — ok:true means allow the request.
export async function checkRateLimit(request, { group, limit, windowSec }) {
  const bucket = `${clientIp(request)}:${group}`
  try {
    const { rows } = await pool.query(
      `INSERT INTO rate_limits (bucket, count, expires_at)
       VALUES ($1, 1, NOW() + make_interval(secs => $2::int))
       ON CONFLICT (bucket) DO UPDATE SET
         count = CASE WHEN rate_limits.expires_at <= NOW() THEN 1
                      ELSE rate_limits.count + 1 END,
         expires_at = CASE WHEN rate_limits.expires_at <= NOW()
                           THEN NOW() + make_interval(secs => $2::int)
                           ELSE rate_limits.expires_at END
       RETURNING count, expires_at`,
      [bucket, windowSec]
    )

    maybeCleanup()

    const { count, expires_at } = rows[0]
    if (count > limit) {
      const retryAfter = Math.max(1, Math.ceil((new Date(expires_at) - Date.now()) / 1000))
      return { ok: false, remaining: 0, retryAfter }
    }
    return { ok: true, remaining: Math.max(0, limit - count), retryAfter: 0 }
  } catch (err) {
    // Fail open — never block real usage on a limiter fault.
    console.error('[rateLimit] fail-open:', err.message)
    return { ok: true, remaining: limit, retryAfter: 0 }
  }
}

// Convenience gate for the AI routes: the per-minute burst limit AND the daily
// ceiling, in one call. Returns the same { ok, remaining, retryAfter } shape as
// checkRateLimit, so call sites change by one line:
//     const limit = await checkAiRateLimit(request)
//     if (!limit.ok) return rateLimitedResponse(limit.retryAfter)
//
// Order matters: the per-minute check runs first (the common trip and cheapest
// to hit); only if it passes do we touch the daily counter, so a request already
// rejected for bursting doesn't consume daily budget. Both checks stay fail-OPEN
// — a limiter/DB hiccup must not take down CV generation (the workspace spend
// limit is the real backstop). Two small upserts per AI call; negligible next to
// the multi-second Anthropic request that follows.
export async function checkAiRateLimit(request) {
  const perMinute = await checkRateLimit(request, LIMITS.ai)
  if (!perMinute.ok) return perMinute

  const daily = await checkRateLimit(request, DAILY_LIMITS.ai)
  if (!daily.ok) return daily

  return { ok: true, remaining: Math.min(perMinute.remaining, daily.remaining), retryAfter: 0 }
}

// Standard 429 response with a Retry-After header.
export function rateLimitedResponse(retryAfter) {
  return NextResponse.json(
    { error: 'Too many requests. Please slow down and try again shortly.' },
    { status: 429, headers: { 'Retry-After': String(retryAfter) } }
  )
}

// Purges expired rows roughly 1% of the time so the table stays bounded as IPs
// rotate, without adding a round-trip to every request. Fire-and-forget.
function maybeCleanup() {
  if (Math.random() >= 0.01) return
  pool.query('DELETE FROM rate_limits WHERE expires_at <= NOW()').catch(() => {})
}
