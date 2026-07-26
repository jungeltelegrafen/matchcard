import Anthropic from '@anthropic-ai/sdk'
import { LANG_NAME } from '@/lib/cv/lang'
import { buildCvJsonSchema, normalizeCv, PARSE_CHAR_LIMIT } from '@/lib/cv/schema'
import { checkRateLimit, rateLimitedResponse, LIMITS } from '@/lib/rateLimit'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Forced tool use — the model must return a CV matching the shared schema.
// `competences` is excluded: the matrix is hand-curated per bid, never parsed.
// Note: no `strict: true` here — the full CV schema exceeds the API's strict-
// grammar size limit. Forced tool_choice + normalizeCv() at the boundary
// guarantee the response shape instead.
const SAVE_CV_TOOL = {
  name: 'save_cv',
  description: 'Save the structured CV data extracted from the source text.',
  input_schema: buildCvJsonSchema({ exclude: ['competences'] }),
}

export async function POST(request) {
  const limit = await checkRateLimit(request, LIMITS.ai)
  if (!limit.ok) return rateLimitedResponse(limit.retryAfter)

  try {
    const { text, userEdits = {}, lang = 'en' } = await request.json()
    if (!text) return Response.json({ error: 'No text provided' }, { status: 400 })

    const langName = LANG_NAME[lang] || 'English'
    const editsBlock = Object.keys(userEdits).length > 0
      ? `\nPreserve these user-edited fields exactly (only override if the new source clearly contradicts):\n${JSON.stringify(userEdits, null, 2)}\n`
      : ''

    // Sonnet, not Haiku: Haiku proved unstable emitting this large tool schema
    // (intermittently dropped whole sections or emitted arrays as JSON strings).
    // Parsing is the core boundary and runs once per explicit user action.
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8192,
      tools: [SAVE_CV_TOOL],
      tool_choice: { type: 'tool', name: 'save_cv' },
      messages: [{
        role: 'user',
        content: `You are a CV parser. Extract all information from the source text and save it with the save_cv tool.

Rules:
- Extract every section you can find; omit fields the source does not mention
- Preserve dates as written (e.g. "Jan 2021", "2019–2022")
- Output language for all text content: ${langName}. Keep names, dates, URLs, company and school names unchanged.${editsBlock}

Source text:
${text.slice(0, PARSE_CHAR_LIMIT)}`,
      }],
    })

    const toolUse = msg.content.find(b => b.type === 'tool_use')
    if (!toolUse) throw new Error('Model did not return structured CV data')

    // Normalize at the boundary — the client always receives a full-shape CV.
    return Response.json(normalizeCv(toolUse.input))
  } catch (err) {
    console.error('[cv/parse]', err)
    return Response.json({ error: 'Failed to parse CV' }, { status: 500 })
  }
}
