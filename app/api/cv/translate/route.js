import Anthropic from '@anthropic-ai/sdk'
import { LANG_NAME } from '@/lib/cv/lang'
import { buildCvJsonSchema, normalizeCv, CV_SECTIONS } from '@/lib/cv/schema'
import { checkRateLimit, rateLimitedResponse, LIMITS } from '@/lib/rateLimit'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Translation fans out into small chunks translated concurrently (below), each
// with its OWN 40s timeout, so the whole request always returns inside the 60s
// Hobby cap — even if a chunk stalls on a rate-limit retry it fails fast and
// falls back to the untranslated original rather than hanging the function.
export const maxDuration = 60

const ALL_KEYS = Object.keys(CV_SECTIONS)
const ARRAY_SECTIONS = ['experience', 'education', 'skills', 'certifications', 'courses', 'languages', 'portfolio', 'videos']
const GROUP_SECTIONS = ['competences', 'positions'] // { ...flags, items: [] }
const BATCH = { experience: 3, competences: 4, positions: 3 }
const DEFAULT_BATCH = 8
const CONCURRENCY = 5       // simultaneous Anthropic calls — bounded to avoid rate limits
const CALL_TIMEOUT = 40000  // per-chunk hard cap (ms)

// Translate one fragment (only `sections` populated) via forced tool use scoped
// to just those sections, so output stays small. Bounded time + few retries.
async function translateChunk(fragment, sections, langName) {
  const tool = {
    name: 'save_translation',
    description: 'Save the translated fields.',
    input_schema: buildCvJsonSchema({ aiOnly: false, exclude: ALL_KEYS.filter(k => !sections.includes(k)) }),
  }
  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8192,
    tools: [tool],
    tool_choice: { type: 'tool', name: 'save_translation' },
    messages: [{
      role: 'user',
      content: `Translate all text content in this CV fragment to ${langName} and save it with the save_translation tool. Keep the structure and array order identical. Do NOT translate: dates, email addresses, phone numbers, URLs, company names, school names, or person names.

${JSON.stringify(fragment)}`,
    }],
  }, { timeout: CALL_TIMEOUT, maxRetries: 1 })
  const toolUse = msg.content.find(b => b.type === 'tool_use')
  if (!toolUse) throw new Error('Model did not return a translation')
  return toolUse.input
}

// Run async fn over items with bounded concurrency; never rejects (per-item
// settle) so one bad chunk can't fail the whole translation.
async function mapLimit(items, limit, fn) {
  const results = new Array(items.length)
  let next = 0
  async function worker() {
    while (next < items.length) {
      const i = next++
      results[i] = await fn(items[i]).then(v => ({ ok: true, value: v }), () => ({ ok: false }))
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}

const pick = (obj, keys) => Object.fromEntries(keys.filter(k => obj[k] !== undefined).map(k => [k, obj[k]]))

export async function POST(request) {
  const limit = await checkRateLimit(request, LIMITS.ai)
  if (!limit.ok) return rateLimitedResponse(limit.retryAfter)

  try {
    const { cv, targetLang } = await request.json()
    if (!cv || !targetLang) return Response.json({ error: 'cv and targetLang required' }, { status: 400 })

    const langName = LANG_NAME[targetLang] || 'English'

    // Build small, independent fragments. Each records how to merge its result
    // back. cvType is never translated (kept from the original).
    const fragments = []
    if (cv.personal) fragments.push({ merge: { type: 'object', key: 'personal' }, sections: ['personal'], payload: { personal: cv.personal } })
    for (const key of ARRAY_SECTIONS) {
      const arr = Array.isArray(cv[key]) ? cv[key] : []
      const b = BATCH[key] || DEFAULT_BATCH
      for (let i = 0; i < arr.length; i += b) {
        fragments.push({ merge: { type: 'array', key, start: i }, sections: [key], payload: { [key]: arr.slice(i, i + b) } })
      }
    }
    for (const key of GROUP_SECTIONS) {
      const grp = cv[key]
      const items = Array.isArray(grp?.items) ? grp.items : []
      const b = BATCH[key] || DEFAULT_BATCH
      for (let i = 0; i < items.length; i += b) {
        fragments.push({ merge: { type: 'group', key, start: i }, sections: [key], payload: { [key]: { ...grp, items: items.slice(i, i + b) } } })
      }
    }

    const results = await mapLimit(fragments, CONCURRENCY, f => translateChunk(f.payload, f.sections, langName))

    // Reassemble, starting from the originals so any failed chunk falls back.
    const merged = { ...cv, cvType: cv.cvType }
    const arrAcc = Object.fromEntries(ARRAY_SECTIONS.map(k => [k, Array.isArray(cv[k]) ? [...cv[k]] : []]))
    const grpAcc = Object.fromEntries(GROUP_SECTIONS.map(k => [k, Array.isArray(cv[k]?.items) ? [...cv[k].items] : []]))

    results.forEach((res, i) => {
      const { merge } = fragments[i]
      const val = res.ok ? res.value : null
      if (merge.type === 'object') {
        if (val?.[merge.key]) merged[merge.key] = val[merge.key]
      } else if (merge.type === 'array') {
        const orig = fragments[i].payload[merge.key]
        const t = Array.isArray(val?.[merge.key]) ? val[merge.key] : null
        const use = t && t.length === orig.length ? t : orig
        use.forEach((item, j) => { arrAcc[merge.key][merge.start + j] = item })
      } else { // group items
        const orig = fragments[i].payload[merge.key].items
        const t = Array.isArray(val?.[merge.key]?.items) ? val[merge.key].items : null
        const use = t && t.length === orig.length ? t : orig
        use.forEach((item, j) => { grpAcc[merge.key][merge.start + j] = item })
        // translated projectLabel/flags come from the first batch
        if (merge.start === 0 && val?.[merge.key]) merged[merge.key] = { ...cv[merge.key], ...val[merge.key] }
      }
    })

    for (const key of ARRAY_SECTIONS) if (cv[key] !== undefined) merged[key] = arrAcc[key]
    for (const key of GROUP_SECTIONS) if (cv[key] !== undefined) merged[key] = { ...cv[key], ...(merged[key] || {}), items: grpAcc[key] }

    return Response.json(normalizeCv(merged))
  } catch (err) {
    console.error('[cv/translate]', err)
    return Response.json({ error: 'Translation failed' }, { status: 500 })
  }
}
