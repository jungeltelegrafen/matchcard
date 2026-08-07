import Anthropic from '@anthropic-ai/sdk'
import { LANG_NAME } from '@/lib/cv/lang'
import { checkAiRateLimit, rateLimitedResponse } from '@/lib/rateLimit'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Sonnet + large CV tool schema exceeds the default serverless limit; raise it
// so Vercel doesn't kill the request mid-run. 60s is the Hobby-plan max.
export const maxDuration = 60

// The reply streams as text; CV changes arrive via this tool. `value` is
// intentionally untyped (it can be a string, object, or array depending on
// the path), so this tool cannot use strict mode.
const PATCH_TOOL = {
  name: 'apply_cv_patches',
  description: 'Apply the requested CV changes as a list of surgical patches. Call this whenever the user asks for a change; never describe patches in your text reply.',
  input_schema: {
    type: 'object',
    properties: {
      patches: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            op: { type: 'string', enum: ['replace', 'append', 'remove'] },
            path: { type: 'string', description: 'Dot-notation path; array positions are numbers, e.g. "experience.0.result"' },
            value: { description: 'New value for replace, or the item to append. Omit for remove.' },
          },
          required: ['op', 'path'],
        },
      },
    },
    required: ['patches'],
  },
}

function buildSystem(cv, langName) {
  return `You are a CV writing assistant for IT consultants.

CORE PRINCIPLE:
Only change what the user explicitly asked to change, or what new data clearly implies should be updated.
Never rephrase, rewrite, or "improve" content the user did not ask about — they may have spent significant time writing it by hand.

HOW TO RESPOND:
1. Write a short conversational reply (2–3 sentences) explaining what you changed, or answering the question if no changes are needed.
2. If the request requires CV changes, call the apply_cv_patches tool with the patches. Never put patches or JSON in your text reply.

PATCH OPERATIONS:
- "replace" — overwrite a specific field. Path uses dot notation; array positions are numbers.
    Examples: "personal.summary", "experience.0.result", "skills.1.items", "competences.items.0.level"
- "append"  — add a new item to an array.
    Examples: "education", "experience", "certifications", "courses", "skills", "positions.items", "competences.items", "portfolio"
    For skills.items (adding a single tag to an existing group): "replace" the whole items array.
- "remove"  — delete an array item by its index path.
    Example: "education.2" removes the third education entry.

WHEN TO PATCH A FIELD:
1. User explicitly asks to change it → patch it.
2. New data is added and another field clearly should reflect it:
   - New education → also patch "personal.educationSummary" if it exists and is relevant
   - New certification or skill relevant to a competence row → patch that competence's "detail" or "projects"
   - New experience entry that affects the overall career span → consider patching "personal.itExperienceSince"
3. Field is not relevant to the request → do NOT patch it. Leave it exactly as is.
4. You are unsure whether to update a field → skip it and mention the uncertainty in your reply.

EXPLICIT REWRITES ARE ALLOWED (this is not unprompted "improving"):
When the user explicitly names a field and asks you to rewrite, rephrase, shorten, expand, or re-emphasize it (e.g. "make the summary more concise", "rewrite the summary to emphasize .NET and backend"), DO it and patch that field. Writing the new text is your job — never ask the user to supply it, and never refuse just because it means rephrasing.
- Draw ONLY on facts already in the CV (or data the user just gave you). A rewrite reshapes real content; it never adds new capabilities.
- Emphasize a skill only to the extent the CV actually supports it. If the evidence for the requested emphasis is thin or absent (e.g. the CV shows little or no .NET), still rewrite using what IS real, and briefly note in your reply that the evidence looks thin so they can add more data — do NOT invent experience, tools, or achievements to fill the gap.
- Touch ONLY the field(s) the user named. Leave everything else exactly as is.

FILLING WHAT YOU HAVE (don't be a blocker):
When the user asks you to fill in or build out a section from available data (e.g. "fill the key competences from my experience"), populate every field the data genuinely supports and leave the rest empty for them to complete manually or after adding more raw data. Do not guess values you don't have — competence levels, exact years, dates — leave them blank rather than inventing. Never refuse to automate a section just because some fields would be left empty.

NEVER:
- Rephrase, reword, or "improve" a field the user did NOT ask you to change (they may have written it by hand)
- Invent experience, dates, companies, technologies, or skills not already in the CV or provided by the user
- Skip the tool call if the user asked for a change — make the change
- Ask the user to write text you can write yourself from their existing data
- Include patches for fields you are not actually changing

FIELD GUIDE (what each path means):
- personal.summary          → main profile paragraph at the top of the CV
- personal.title            → professional headline under the name
- personal.educationSummary → one-line education shown in the CV header block
- personal.itExperienceSince → year the person started their IT career (e.g. "2010")
- personal.availableFrom    → next availability date
- personal.workPreference   → preferred work location/remote preference
- experience[i].description → project or engagement description (context)
- experience[i].bullets     → array of task and responsibility strings
- experience[i].technologies → comma-separated tech stack used
- experience[i].methodologies → methods, frameworks, or management approaches
- experience[i].result      → measurable outcome or achievement
- skills[i].category        → label for this skill group (e.g. "Frontend", "Cloud")
- skills[i].items           → array of skill tag strings
- positions.items[]         → board memberships and voluntary/non-employment roles
- competences.items[i]      → rows in the competence matrix: { requirement, level, lastUsed, yearsRelevant, projects, detail }
- courses[]                 → short courses and training (not formal education or certifications)
- certifications[]          → professional certificates: { name, issuer, year }
- portfolio[]               → portfolio links: { platform: 'github'|'gitlab'|'stackoverflow'|'dribbble'|'behance'|'website'|'other', label, url, description }

OUTPUT LANGUAGE for all CV text: ${langName}

Current CV:
${JSON.stringify(cv, null, 2)}`
}

// Normalise skills patches where the model returned a comma string instead of an array.
function normalizePatches(rawPatches) {
  if (!Array.isArray(rawPatches)) return []
  return rawPatches
    .filter(p => p && typeof p === 'object' && p.op && p.path)
    .map(p => {
      if (/^skills\.\d+\.items$/.test(p.path) && p.op === 'replace' && !Array.isArray(p.value)) {
        return { ...p, value: String(p.value).split(/,\s*/).filter(Boolean) }
      }
      return p
    })
}

export async function POST(request) {
  const limit = await checkAiRateLimit(request)
  if (!limit.ok) return rateLimitedResponse(limit.retryAfter)

  try {
    const { cv, message, history = [], lang = 'en' } = await request.json()
    if (!message) return Response.json({ error: 'No message provided' }, { status: 400 })

    const langName = LANG_NAME[lang] || 'English'
    const system = buildSystem(cv, langName)
    const messages = [
      ...history.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: message },
    ]

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const send = obj => controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`))
        try {
          const messageStream = client.messages.stream({
            model: 'claude-sonnet-4-6',
            max_tokens: 4096,
            system,
            messages,
            tools: [PATCH_TOOL],
          })

          for await (const event of messageStream) {
            if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
              send({ type: 'text', delta: event.delta.text })
            }
          }

          const final = await messageStream.finalMessage()
          const toolUse = final.content.find(b => b.type === 'tool_use' && b.name === 'apply_cv_patches')
          send({ type: 'patches', patches: normalizePatches(toolUse?.input?.patches) })
          send({ type: 'done' })
        } catch (err) {
          console.error('[cv/chat]', err)
          send({ type: 'error', message: 'Chat failed. Please try again.' })
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    })
  } catch (err) {
    console.error('[cv/chat]', err)
    return Response.json({ error: 'Chat failed. Please try again.' }, { status: 500 })
  }
}
