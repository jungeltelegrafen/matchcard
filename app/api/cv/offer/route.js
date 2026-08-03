import Anthropic from '@anthropic-ai/sdk'
import { LANG_NAME } from '@/lib/cv/lang'
import { stripIds } from '@/lib/cv/schema'
import { checkRateLimit, rateLimitedResponse, LIMITS } from '@/lib/rateLimit'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Drafts the narrative part of a consultant "offer" (Tilbudsformat): a short
// hiring-manager teaser + keywords, and a suggested seniority. Factual only —
// derived strictly from the CV, never invented. Forced tool → clean structure.
const OFFER_TOOL = {
  name: 'draft_offer',
  description: 'Draft the teaser fields of a consultant offer from the CV.',
  strict: true,
  input_schema: {
    type: 'object',
    properties: {
      seniority: {
        type: 'string',
        description: 'Suggested seniority label from the years of experience, e.g. "Senior · ~11 yrs". Empty string if unclear.',
      },
      relevance: {
        type: 'string',
        description: 'A punchy 2–5 sentence teaser foregrounding the strongest, most relevant competence and experience — enough to make a hiring manager want to open the CV. No greeting, no name repetition.',
      },
      keywords: {
        type: 'array',
        items: { type: 'string' },
        description: '3–12 short scannable keywords (technologies, domains, roles) drawn from the CV.',
      },
    },
    required: ['seniority', 'relevance', 'keywords'],
    additionalProperties: false,
  },
}

export async function POST(request) {
  const limit = await checkRateLimit(request, LIMITS.ai)
  if (!limit.ok) return rateLimitedResponse(limit.retryAfter)

  try {
    const { cv, lang = 'en' } = await request.json()
    if (!cv) return Response.json({ error: 'No CV provided' }, { status: 400 })

    const langName = LANG_NAME[lang] || 'English'

    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      tools: [OFFER_TOOL],
      tool_choice: { type: 'tool', name: 'draft_offer' },
      messages: [{
        role: 'user',
        content: `You write concise consultant "offer" teasers for a tech recruiter presenting this person to a client. Use ONLY facts present in the CV below — never invent skills, roles, or achievements.

Write all text in ${langName}. Draft, via the draft_offer tool:
- relevance: a 2–5 sentence teaser highlighting the strongest, most relevant competence and experience, to make a hiring manager want to open the full CV.
- keywords: 3–12 short keywords (technologies, domains, roles) from the CV.
- seniority: a suggested level from the experience/years, or "" if unclear.

CV Data:
${JSON.stringify(stripIds(cv), null, 2)}`,
      }],
    })

    const toolUse = msg.content.find(b => b.type === 'tool_use' && b.name === 'draft_offer')
    const out = toolUse?.input || {}
    return Response.json({
      seniority: typeof out.seniority === 'string' ? out.seniority : '',
      relevance: typeof out.relevance === 'string' ? out.relevance : '',
      keywords: Array.isArray(out.keywords) ? out.keywords.filter(k => typeof k === 'string') : [],
    })
  } catch (err) {
    console.error('[cv/offer]', err)
    return Response.json({ error: 'Failed to draft offer' }, { status: 500 })
  }
}
