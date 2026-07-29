import Anthropic from '@anthropic-ai/sdk'
import { LANG_NAME } from '@/lib/cv/lang'
import { buildCvJsonSchema, normalizeCv } from '@/lib/cv/schema'
import { checkRateLimit, rateLimitedResponse, LIMITS } from '@/lib/rateLimit'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Full-CV translation with Sonnet + the large tool schema takes well over the
// default serverless limit; without this Vercel kills the function mid-run and
// the client hangs on "Translating…". 60s is the Hobby-plan max.
export const maxDuration = 60

// Full schema (including client-only sections like video profiles) so
// translation returns the complete CV shape, guaranteed by forced tool use.
// Note: no `strict: true` here — the full CV schema exceeds the API's strict-
// grammar size limit. Forced tool_choice + normalizeCv() at the boundary
// guarantee the response shape instead.
const TRANSLATED_CV_TOOL = {
  name: 'save_translated_cv',
  description: 'Save the fully translated CV.',
  input_schema: buildCvJsonSchema({ aiOnly: false }),
}

export async function POST(request) {
  const limit = await checkRateLimit(request, LIMITS.ai)
  if (!limit.ok) return rateLimitedResponse(limit.retryAfter)

  try {
    const { cv, targetLang } = await request.json()
    if (!cv || !targetLang) return Response.json({ error: 'cv and targetLang required' }, { status: 400 })

    const langName = LANG_NAME[targetLang] || 'English'

    // Sonnet for the same reason as /parse: Haiku is unstable emitting the
    // large CV tool schema. Translation is an explicit, occasional action.
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8192,
      tools: [TRANSLATED_CV_TOOL],
      tool_choice: { type: 'tool', name: 'save_translated_cv' },
      messages: [{
        role: 'user',
        content: `Translate all text content in this CV to ${langName} and save it with the save_translated_cv tool. Keep the structure identical. Do NOT translate: dates, email addresses, phone numbers, URLs, company names, school names, or person names.

${JSON.stringify(cv)}`,
      }],
    })

    const toolUse = msg.content.find(b => b.type === 'tool_use')
    if (!toolUse) throw new Error('Model did not return a translated CV')

    return Response.json(normalizeCv(toolUse.input))
  } catch (err) {
    console.error('[cv/translate]', err)
    return Response.json({ error: 'Translation failed' }, { status: 500 })
  }
}
