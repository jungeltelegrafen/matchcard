import * as cheerio from 'cheerio'
import { checkRateLimit, rateLimitedResponse, LIMITS } from '@/lib/rateLimit'
import { assertPublicHttpUrl, UrlGuardError } from '@/lib/urlGuard'

// Fetches a user-supplied PUBLIC url server-side and returns its readable text,
// for feeding into CV intake / job-ad tailoring. The risky part is SSRF — see
// lib/urlGuard.js. Everything here is bounded: timeout, byte cap, content-type
// allowlist, and manual redirects re-checked by the guard on every hop.

export const maxDuration = 30 // Node runtime (default); do NOT set edge.

const FETCH_TIMEOUT_MS = 12_000
const MAX_BYTES = 2 * 1024 * 1024 // 2 MB downloaded, hard stop
const MAX_REDIRECTS = 3
const OUTPUT_CHAR_LIMIT = 16_000
const USER_AGENT = 'MatchcardCVBot/1.0 (+https://matchcard.no)'

// Read the response body but stop once we've pulled MAX_BYTES — never trust
// Content-Length, and never buffer an unbounded page.
async function readCapped(res, maxBytes) {
  const reader = res.body?.getReader?.()
  if (!reader) return ''
  const chunks = []
  let total = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.length
    if (total > maxBytes) {
      chunks.push(value.subarray(0, value.length - (total - maxBytes)))
      try { await reader.cancel() } catch {}
      break
    }
    chunks.push(value)
  }
  return Buffer.concat(chunks).toString('utf8')
}

function htmlToText(html) {
  const $ = cheerio.load(html)
  const title = (
    $('meta[property="og:title"]').attr('content') ||
    $('title').first().text() ||
    ''
  ).trim()
  // Drop chrome/boilerplate/active content so only readable content survives.
  $('script, style, noscript, nav, header, footer, svg, iframe, form, template, aside').remove()
  const root = $('main').length ? $('main')
    : $('article').length ? $('article')
    : $('body')
  const text = root.text()
    .replace(/[^\S\n]+/g, ' ')  // collapse spaces/tabs, keep newlines
    .replace(/ *\n */g, '\n')   // trim around newlines
    .replace(/\n{3,}/g, '\n\n') // cap blank runs
    .trim()
  return { title, text }
}

export async function POST(request) {
  const limit = await checkRateLimit(request, LIMITS.urlFetch)
  if (!limit.ok) return rateLimitedResponse(limit.retryAfter)

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    const { url } = await request.json().catch(() => ({}))
    if (!url || typeof url !== 'string') {
      return Response.json({ error: 'A url is required' }, { status: 400 })
    }

    // Follow redirects manually, re-running the SSRF guard on every hop so a
    // public URL can't 30x-redirect into internal space.
    let current = await assertPublicHttpUrl(url)
    let res
    for (let hop = 0; ; hop++) {
      res = await fetch(current, {
        method: 'GET',
        redirect: 'manual',
        signal: controller.signal,
        headers: { 'user-agent': USER_AGENT, accept: 'text/html,text/plain;q=0.9,*/*;q=0.1' },
      })
      const isRedirect = res.status >= 300 && res.status < 400 && res.headers.get('location')
      if (!isRedirect) break
      if (hop >= MAX_REDIRECTS) {
        return Response.json({ error: 'Too many redirects' }, { status: 400 })
      }
      const next = new URL(res.headers.get('location'), current)
      current = await assertPublicHttpUrl(next.href)
      try { await res.body?.cancel?.() } catch {}
    }

    if (!res.ok) {
      return Response.json({ error: `The page could not be fetched (status ${res.status})` }, { status: 400 })
    }

    const contentType = (res.headers.get('content-type') || '').toLowerCase()
    const isHtml = contentType.includes('text/html') || contentType.includes('application/xhtml')
    const isPlain = contentType.includes('text/plain')
    if (!isHtml && !isPlain) {
      return Response.json(
        { error: 'Only web pages (HTML) or plain text can be fetched — not files like PDFs or images.' },
        { status: 400 }
      )
    }

    const body = await readCapped(res, MAX_BYTES)
    const { title, text } = isHtml
      ? htmlToText(body)
      : { title: '', text: body.replace(/\n{3,}/g, '\n\n').trim() }

    if (!text) {
      return Response.json({ error: 'No readable text found on that page.' }, { status: 400 })
    }

    return Response.json({
      text: text.slice(0, OUTPUT_CHAR_LIMIT),
      title: title.slice(0, 300),
      url: current.href,
      truncated: text.length > OUTPUT_CHAR_LIMIT,
    })
  } catch (err) {
    if (err instanceof UrlGuardError) {
      // Generic, non-reflective message — never echo the resolved IP.
      return Response.json({ error: 'That URL can’t be fetched.' }, { status: 400 })
    }
    if (err?.name === 'AbortError') {
      return Response.json({ error: 'The page took too long to load.' }, { status: 504 })
    }
    console.error('[cv/fetch-url]', err)
    return Response.json({ error: 'Failed to fetch the page.' }, { status: 500 })
  } finally {
    clearTimeout(timer)
  }
}
