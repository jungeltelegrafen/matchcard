import Anthropic from '@anthropic-ai/sdk'
import { LANG_NAME } from '@/lib/cv/lang'
import { FEEDBACK_SECTION_KEYS } from '@/lib/cv/schema'
import { checkAiRateLimit, rateLimitedResponse } from '@/lib/rateLimit'

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
  const limit = await checkAiRateLimit(request)
  if (!limit.ok) return rateLimitedResponse(limit.retryAfter)

  try {
    const { cv, prompt, lang = 'en' } = await request.json()
    if (!prompt) return Response.json({ error: 'No prompt provided' }, { status: 400 })

    const langNote = `Write finding titles and details in ${LANG_NAME[lang] || 'English'}.`

    // Evidence-first guardrail for every agent — the common failure mode is
    // confidently reporting issues that aren't real (a false positive costs the
    // user's trust more than a missed nitpick).
    const system = `You are a meticulous, conservative CV review agent. Absolute rules, in priority order:
1. EVIDENCE ONLY. Report an issue only if you can prove it by quoting the exact offending text from the CV in the detail. For any inconsistency/comparison, quote BOTH pieces of text that conflict. If you cannot quote the specific text, do not report it. (Findings about something MISSING or demonstrated-but-unlisted are allowed — for those, quote the evidence and name the exact location instead.)
2. NO SPECULATION. Never flag something that is merely possible, likely, or "worth checking". If you are not certain it is a genuine issue, leave it out. An empty findings list is the correct answer for a clean CV.
3. JUDGE ONLY WHAT IS WRITTEN. Do not assess factual correctness, real-world plausibility, or whether dates are in the future/past — that is out of scope and not an error.
4. A false positive is worse than a missed issue. When in doubt, do not report.
5. ONE ISSUE PER FINDING, NO REPEATS. Each finding is a distinct problem. Never report the same underlying issue twice, never split one issue into several findings, and never restate something another of your findings already covers.
6. BE SELECTIVE — this is critical. Return only genuinely material issues, most important first; aim for the few that matter most (roughly 3–6), never an exhaustive list. Do not pad with minor or marginal points. A short, high-value list is far better than an overwhelming one.
7. NEVER FABRICATE DATA. When suggesting a metric or figure, use a placeholder (e.g. "X%", "from A to B", "N users") and make clear the user must supply the real number. Never invent specific statistics, numbers, dates, or facts.`

    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system,
      tools: [FINDINGS_TOOL],
      tool_choice: { type: 'tool', name: 'report_findings' },
      messages: [{
        role: 'user',
        content: `${prompt}

Report only genuine, evidence-backed issues via the report_findings tool (an empty array if there are none). ${langNote}

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
