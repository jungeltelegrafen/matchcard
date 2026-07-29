import Anthropic from '@anthropic-ai/sdk'
import { LANG_NAME } from '@/lib/cv/lang'
import { checkRateLimit, rateLimitedResponse, LIMITS } from '@/lib/rateLimit'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Sonnet + large CV tool schema exceeds the default serverless limit; raise it
// so Vercel doesn't kill the request mid-run. 60s is the Hobby-plan max.
export const maxDuration = 60

// Forced tool use. The model returns a *tailoring plan* over the master CV — it
// hides, reorders, and re-emphasizes, but never invents or alters facts. Items
// are referenced by the "_id" field present in the CV we send.
const TAILOR_TOOL = {
  name: 'report_tailoring',
  description: 'Report how to present the master CV for the target role: which items to hide, an optional order, a re-emphasized summary and experience descriptions, and an honest fit note.',
  input_schema: {
    type: 'object',
    properties: {
      excluded: {
        type: 'array',
        description: 'Master items to hide for this role (only weakly-relevant ones — never hide something that would misrepresent the candidate). Reference each by its exact _id.',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'The item\'s _id from the CV' },
            section: { type: 'string' },
            reason: { type: 'string', description: 'One short phrase: why it is less relevant to this role' },
          },
          required: ['id', 'reason'],
        },
      },
      excludedSkills: {
        type: 'array',
        description: 'Individual skill tags to hide, grouped by their skill group _id.',
        items: {
          type: 'object',
          properties: {
            groupId: { type: 'string', description: 'The skill group\'s _id' },
            tags: { type: 'array', items: { type: 'string' }, description: 'Exact tag strings to hide from that group' },
          },
          required: ['groupId', 'tags'],
        },
      },
      order: {
        type: 'object',
        description: 'Optional display order per section, as arrays of item _ids most-relevant first. Keys may include "experience" and "competences".',
        properties: {
          experience: { type: 'array', items: { type: 'string' } },
          competences: { type: 'array', items: { type: 'string' } },
        },
      },
      summary: {
        type: 'string',
        description: 'Rewritten professional summary emphasizing this role, built ONLY from facts already in the CV. No new claims, technologies, or achievements.',
      },
      experienceDescriptions: {
        type: 'array',
        description: 'Re-angled descriptions for included experience entries, foregrounding the role-relevant aspects. Facts unchanged; reference each entry by its _id.',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            description: { type: 'string' },
          },
          required: ['id', 'description'],
        },
      },
      fitNote: {
        type: 'string',
        description: 'An honest 2–4 sentence assessment of the candidate for this role: genuine strengths AND remaining gaps. Never oversell.',
      },
    },
    required: ['excluded', 'summary', 'fitNote'],
  },
}

const SYSTEM = `You tailor an IT consultant's CV to a specific role while keeping it completely truthful.

You are given the candidate's MASTER CV (the full, true superset of their experience) and a description of a target role. Produce a tailoring plan via the report_tailoring tool.

WHAT YOU MAY DO:
- Hide master items that are only weakly relevant to this role (excluded / excludedSkills), so the CV foregrounds what matters. Reference items by their exact "_id".
- Suggest an order that puts the most role-relevant experience and competences first.
- Rewrite the summary to emphasize the strengths this role cares about — using ONLY facts already present in the CV.
- Re-angle the descriptions of included experience entries to foreground the role-relevant work — facts unchanged.
- Write an honest fit note.

HARD RULES — these protect trust if a hiring manager reads this and another version of the CV side by side:
- NEVER invent or add skills, technologies, tools, dates, companies, results, or achievements that are not already in the master CV.
- NEVER change a fact: competence levels, years, dates, company names, and technology lists are immutable. You may only hide a competence row, never alter its numbers.
- NEVER inflate. "Exposure to X" must not become "expert in X". The rewritten summary and descriptions must be fully supported by the items that remain visible.
- Do NOT hide something so central that omitting it would misrepresent who the candidate is. Curate; don't distort.
- Prefer hiding over rewriting. Only rewrite text where re-emphasis genuinely helps.
- The fit note must be honest about gaps, not a sales pitch.

Every id you reference MUST be an "_id" that appears in the CV JSON. Do not invent ids.`

export async function POST(request) {
  const limit = await checkRateLimit(request, LIMITS.ai)
  if (!limit.ok) return rateLimitedResponse(limit.retryAfter)

  try {
    const { cv, role, lang = 'en' } = await request.json()
    if (!cv || !role?.trim?.()) {
      return Response.json({ error: 'cv and role description are required' }, { status: 400 })
    }

    const langName = LANG_NAME[lang] || 'English'

    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: SYSTEM,
      tools: [TAILOR_TOOL],
      tool_choice: { type: 'tool', name: 'report_tailoring' },
      messages: [{
        role: 'user',
        content: `Target role description:
${String(role).slice(0, 12000)}

Write all rewritten text (summary, descriptions, fit note) in ${langName}.

Master CV (items carry an "_id" you must reference exactly):
${JSON.stringify(cv)}`,
      }],
    })

    const toolUse = msg.content.find(b => b.type === 'tool_use')
    if (!toolUse) throw new Error('Model did not return a tailoring plan')

    return Response.json({ plan: toolUse.input })
  } catch (err) {
    console.error('[cv/tailor]', err)
    return Response.json({ error: 'Failed to tailor CV' }, { status: 500 })
  }
}
