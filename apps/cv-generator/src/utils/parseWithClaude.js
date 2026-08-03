// All Claude calls are proxied through Next.js API routes — no Anthropic SDK in
// the browser. CVs are stripped of internal `_id` markers before leaving the app.

import { stripIds } from '@lib/cv/schema'

async function apiFetch(path, body) {
  // Abort after 70s (just above the routes' 60s maxDuration) so a stalled request
  // surfaces a clear error instead of hanging the UI on "…" forever.
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 70000)
  let res
  try {
    res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('Request timed out. Please try again.')
    throw e
  } finally {
    clearTimeout(timer)
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || `API error ${res.status}`)
  }
  return res
}

async function apiJson(path, body) {
  return (await apiFetch(path, body)).json()
}

export async function parseWithClaude(text, { userEdits = {}, lang = 'en' } = {}) {
  return apiJson('/api/cv/parse', { text, userEdits, lang })
}

export async function translateCv(cv, targetLang) {
  return apiJson('/api/cv/translate', { cv: stripIds(cv), targetLang })
}

export async function generateEmailSummary(cv, lang) {
  const { text } = await apiJson('/api/cv/email', { cv: stripIds(cv), lang })
  return text
}

// Drafts the offer teaser fields (seniority, relevance, keywords) from the CV.
export async function draftOffer(cv, lang = 'en') {
  return apiJson('/api/cv/offer', { cv: stripIds(cv), lang })
}

export async function runAgent(cv, agentPrompt, lang = 'en') {
  const { findings } = await apiJson('/api/cv/agent', { cv: stripIds(cv), prompt: agentPrompt, lang })
  return findings || []
}

// Tailoring keeps the _id markers: the plan references master items by _id.
export async function tailorCv(cv, role, lang = 'en') {
  const { plan } = await apiJson('/api/cv/tailor', { cv, role, lang })
  return plan
}

// Fetches a public URL server-side and returns its readable text. The server
// enforces the SSRF guard, timeout, and size cap. Returns { text, title, url,
// truncated }.
export async function fetchUrlText(url) {
  return apiJson('/api/cv/fetch-url', { url })
}

// Streaming chat. Calls onDelta with the accumulated reply text as it streams;
// resolves with { reply, patches } once the server finishes.
export async function chatWithClaude(cv, userMessage, history, { lang = 'en', onDelta } = {}) {
  const res = await apiFetch('/api/cv/chat', {
    cv: stripIds(cv),
    message: userMessage,
    history,
    lang,
  })

  // Non-streaming fallback (e.g. an error JSON that still came back 200)
  const contentType = res.headers.get('content-type') || ''
  if (!contentType.includes('text/event-stream')) {
    const data = await res.json()
    if (data.error) throw new Error(data.error)
    return { reply: data.reply || '', patches: data.patches || [] }
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let reply = ''
  let patches = []

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop()
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      let event
      try { event = JSON.parse(line.slice(6)) } catch { continue }
      if (event.type === 'text') {
        reply += event.delta
        onDelta?.(reply)
      } else if (event.type === 'patches') {
        patches = Array.isArray(event.patches) ? event.patches : []
      } else if (event.type === 'error') {
        throw new Error(event.message || 'Chat failed')
      }
    }
  }

  return { reply: reply.trim(), patches }
}
