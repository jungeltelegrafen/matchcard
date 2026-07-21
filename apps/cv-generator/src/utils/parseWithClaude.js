// All Claude calls are proxied through Next.js API routes — no Anthropic SDK in the browser.

async function apiFetch(path, body) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || `API error ${res.status}`)
  }
  return res.json()
}

export async function parseWithClaude(text, { userEdits = {}, lang = 'en' } = {}) {
  return apiFetch('/api/cv/parse', { text, userEdits, lang })
}

export async function translateCv(cv, targetLang) {
  return apiFetch('/api/cv/translate', { cv, targetLang })
}

export async function generateEmailSummary(cv, lang) {
  const { text } = await apiFetch('/api/cv/email', { cv, lang })
  return text
}

export async function chatWithClaude(cv, userMessage, history, { lang = 'en' } = {}) {
  return apiFetch('/api/cv/chat', { cv, message: userMessage, history, lang })
}

export async function runAgent(cv, agentPrompt, lang = 'en') {
  const { text } = await apiFetch('/api/cv/agent', { cv, prompt: agentPrompt, lang })
  return text
}
