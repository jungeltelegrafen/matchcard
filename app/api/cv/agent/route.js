import Anthropic from '@anthropic-ai/sdk'
import { FEEDBACK_SECTION_KEYS } from '@/lib/cv/schema'
import { checkRateLimit, rateLimitedResponse, LIMITS } from '@/lib/rateLimit'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Forced tool use — agents return structured findings with an exact section
// key, so the client never has to parse markdown or guess the section.
const FINDINGS_TOOL = {
  name: 'report_findings',
  description: 'Report review findings for the CV, one finding per distinct issue. If there are no issues, return an empty findings array.',
  strict: true,
  input_schema: {
    type: 'object',
    properties: {
      findings: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            section: {
              type: 'string',
              enum: FEEDBACK_SECTION_KEYS,
              description: 'The CV section the issue belongs to; use "general" only when it spans the whole CV',
            },
            title: { type: 'string', description: 'Short issue title (3–8 words)' },
            detail: { type: 'string', description: '1–2 sentence explanation with the specific location and a concrete suggestion' },
          },
          required: ['section', 'title', 'detail'],
          additionalProperties: false,
        },
      },
    },
    required: ['findings'],
    additionalProperties: false,
  },
}

export async function POST(request) {
  const limit = await checkRateLimit(request, LIMITS.ai)
  if (!limit.ok) return rateLimitedResponse(limit.retryAfter)

  try {
    const { cv, prompt, lang = 'en' } = await request.json()
    if (!prompt) return Response.json({ error: 'No prompt provided' }, { status: 400 })

    const langNote = lang === 'no'
      ? 'Write finding titles and details in Norwegian (Bokmål).'
      : 'Write finding titles and details in English.'

    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      tools: [FINDINGS_TOOL],
      tool_choice: { type: 'tool', name: 'report_findings' },
      messages: [{
        role: 'user',
        content: `${prompt}

Report every issue via the report_findings tool. ${langNote}

CV Data:
${JSON.stringify(cv, null, 2)}`,
      }],
    })

    const toolUse = msg.content.find(b => b.type === 'tool_use')
    return Response.json({ findings: toolUse?.input?.findings ?? [] })
  } catch (err) {
    console.error('[cv/agent]', err)
    return Response.json({ error: 'Agent run failed' }, { status: 500 })
  }
}
