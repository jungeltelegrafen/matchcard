import Anthropic from '@anthropic-ai/sdk'
import { LANG_NAME } from '@/lib/cv/lang'
import { buildCvJsonSchema, normalizeCv, CV_SECTIONS } from '@/lib/cv/schema'
import { checkRateLimit, rateLimitedResponse, LIMITS } from '@/lib/rateLimit'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Translation runs several small Sonnet calls in PARALLEL (see below), so even a
// very long CV finishes in ~15-25s — well under the 60s Hobby-plan cap. Without
// this, one monolithic call over the full schema could exceed the limit and
// Vercel would 504.
export const maxDuration = 60

const ALL_KEYS = Object.keys(CV_SECTIONS)
const EXP_BATCH = 3 // experiences per parallel call — keeps each output small/fast

// Translate one fragment of the CV (only `sections` populated) via forced tool
// use, scoped to a schema containing just those sections so the output stays
// small. normalizeCv() at the merge boundary guarantees the final shape.
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
  })
  const toolUse = msg.content.find(b => b.type === 'tool_use')
  if (!toolUse) throw new Error('Model did not return a translation')
  return toolUse.input
}

const pick = (obj, keys) => Object.fromEntries(keys.filter(k => obj[k] !== undefined).map(k => [k, obj[k]]))

export async function POST(request) {
  const limit = await checkRateLimit(request, LIMITS.ai)
  if (!limit.ok) return rateLimitedResponse(limit.retryAfter)

  try {
    const { cv, targetLang } = await request.json()
    if (!cv || !targetLang) return Response.json({ error: 'cv and targetLang required' }, { status: 400 })

    const langName = LANG_NAME[targetLang] || 'English'
    const exp = Array.isArray(cv.experience) ? cv.experience : []

    // Split the CV into independent chunks translated concurrently. Experience
    // (the bulk) is batched; the rest is split into two groups. cvType is never
    // translated (set from the original at merge).
    const groupA = ['personal', 'competences', 'positions'].filter(k => ALL_KEYS.includes(k))
    const groupB = ['education', 'skills', 'certifications', 'courses', 'languages', 'portfolio', 'videos'].filter(k => ALL_KEYS.includes(k))

    const chunks = [
      { kind: 'sections', sections: groupA, fragment: pick(cv, groupA) },
      { kind: 'sections', sections: groupB, fragment: pick(cv, groupB) },
    ]
    for (let i = 0; i < exp.length; i += EXP_BATCH) {
      chunks.push({ kind: 'exp', sections: ['experience'], fragment: { experience: exp.slice(i, i + EXP_BATCH) } })
    }

    // Best-effort: a chunk that fails falls back to its untranslated original, so
    // one flaky call never fails the whole translation.
    const settled = await Promise.allSettled(
      chunks.map(c => translateChunk(c.fragment, c.sections, langName)),
    )

    const merged = { ...cv }
    const expOut = []
    settled.forEach((res, i) => {
      const chunk = chunks[i]
      const val = res.status === 'fulfilled' ? res.value : null
      if (chunk.kind === 'sections') {
        if (val) for (const k of chunk.sections) if (val[k] !== undefined) merged[k] = val[k]
      } else {
        const orig = chunk.fragment.experience
        const t = Array.isArray(val?.experience) ? val.experience : null
        // Only accept a translated batch if item count matches (else keep originals).
        expOut.push(...(t && t.length === orig.length ? t : orig))
      }
    })
    if (exp.length) merged.experience = expOut
    merged.cvType = cv.cvType

    return Response.json(normalizeCv(merged))
  } catch (err) {
    console.error('[cv/translate]', err)
    return Response.json({ error: 'Translation failed' }, { status: 500 })
  }
}
