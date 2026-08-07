import Anthropic from '@anthropic-ai/sdk'
import { LANG_NAME } from '@/lib/cv/lang'
import { checkAiRateLimit, rateLimitedResponse } from '@/lib/rateLimit'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export const maxDuration = 60

// Forced tool: returns anonymized rewrites of the free-text fields, keyed by the
// experience item's "_id". Structured PII (name/contact/location) is redacted
// deterministically on the client — this pass only handles the text that can
// leak identity (company names, client names, unique project references).
const ANON_TOOL = {
  name: 'report_anonymization',
  description: 'Return anonymized rewrites of the CV free-text so no specific person, employer, or client can be identified.',
  input_schema: {
    type: 'object',
    properties: {
      summary: {
        type: 'string',
        description: 'The professional summary, rewritten to remove any name, employer, or client that identifies the person. Keep seniority, domains, and strengths. Same language as the source.',
      },
      experience: {
        type: 'array',
        description: 'One entry per experience item to anonymize, referenced by its exact _id.',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'The experience item _id from the CV' },
            company: { type: 'string', description: 'A GENERIC descriptor replacing the employer/client name, e.g. "a major Nordic bank", "a public-sector agency", "a large telecom". Never the real name.' },
            description: { type: 'string', description: 'The project description rewritten with all identifying names (company, client, people, unique products) removed or genericized. Keep the substance of the work.' },
            bullets: { type: 'array', items: { type: 'string' }, description: 'The task/achievement bullets, anonymized the same way. Keep them if present; return [] if none.' },
            result: { type: 'string', description: 'The measurable result, anonymized. Empty string if none.' },
          },
          required: ['id', 'company', 'description', 'bullets', 'result'],
        },
      },
    },
    required: ['summary', 'experience'],
  },
}

const SYSTEM = `You anonymize a consultant's CV so it can be shared with a client WITHOUT revealing who the person is or which specific companies they worked for.

Rules:
- Remove or genericize every identifying name: the consultant's own name, employer names, client names, named people, and unique products/projects that would pin down the company.
- Replace a company/employer/client name with a GENERIC descriptor that keeps useful context: "a major Nordic bank", "a large energy company", "a public-sector agency", "a global logistics firm".
- Keep the professional substance: technologies, methodologies, seniority, scope, measurable results.
- Never invent facts or achievements. Only rewrite what is there.
- Output every rewritten field in the same language as the source CV.
- Reference each experience item by its exact "_id".`

export async function POST(request) {
  const limit = await checkAiRateLimit(request)
  if (!limit.ok) return rateLimitedResponse(limit.retryAfter)

  try {
    const { cv, lang = 'en' } = await request.json()
    if (!cv) return Response.json({ error: 'cv is required' }, { status: 400 })

    const langName = LANG_NAME[lang] || 'English'

    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 6144,
      system: SYSTEM,
      tools: [ANON_TOOL],
      tool_choice: { type: 'tool', name: 'report_anonymization' },
      messages: [{
        role: 'user',
        content: `Anonymize this CV. Write all rewritten text in ${langName}. Return one experience entry per item, referencing its exact "_id".

CV (items carry an "_id" you must reference exactly):
${JSON.stringify(cv)}`,
      }],
    })

    const toolUse = msg.content.find(b => b.type === 'tool_use' && b.name === 'report_anonymization')
    if (!toolUse) throw new Error('Model did not return an anonymization')

    return Response.json({ plan: toolUse.input })
  } catch (err) {
    console.error('[cv/anonymize]', err)
    return Response.json({ error: 'Failed to anonymize CV' }, { status: 500 })
  }
}
