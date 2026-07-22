import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request) {
  try {
    const { cv, message, history = [], lang = 'en' } = await request.json()
    if (!message) return Response.json({ error: 'No message provided' }, { status: 400 })

    const langName = lang === 'no' ? 'Norwegian (Bokmål)' : 'English'

    const system = `You are a CV writing assistant for IT consultants.

CORE PRINCIPLE:
Only change what the user explicitly asked to change, or what new data clearly implies should be updated.
Never rephrase, rewrite, or "improve" content the user did not ask about — they may have spent significant time writing it by hand.

OUTPUT FORMAT — return ONLY valid JSON, no markdown, no code fences:
{
  "reply": "2-3 sentence explanation of what you changed, or your answer if no changes were made",
  "patches": [
    { "op": "replace", "path": "personal.summary", "value": "new text here" },
    { "op": "append",  "path": "education",         "value": { "institution": "NTNU", "degree": "MSc", "field": "Computer Science", "startDate": "2018", "endDate": "2020" } },
    { "op": "replace", "path": "education.0.degree", "value": "MSc" },
    { "op": "remove",  "path": "certifications.2"   }
  ]
}

PATCH OPERATIONS:
- "replace" — overwrite a specific field. Path uses dot notation; array positions are numbers.
    Examples: "personal.summary", "experience.0.result", "skills.1.items", "competences.items.0.level"
- "append"  — add a new item to an array.
    Examples: "education", "experience", "certifications", "courses", "skills", "positions.items", "competences.items"
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

NEVER:
- Rephrase, reword, or "improve" text the user did not ask you to change
- Invent experience, dates, companies, technologies, or skills not already in the CV or provided by the user
- Return an empty patches array if the user asked for a change — make the change
- Include patches array items for fields you are not actually changing

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
- positions[]               → board memberships and voluntary/non-employment roles
- competences[].items[i]    → rows in the competence matrix: { requirement, level, lastUsed, yearsRelevant, projects, detail }
- courses[]                 → short courses and training (not formal education or certifications)
- certifications[]          → professional certificates: { name, issuer, year }

OUTPUT LANGUAGE for all CV text: ${langName}

Current CV:
${JSON.stringify(cv, null, 2)}`

    const messages = [
      ...history.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: message },
    ]

    const msg = await client.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 4096,
      system,
      messages,
    })

    const raw   = msg.content[0].text
    const start = raw.indexOf('{')
    const end   = raw.lastIndexOf('}')
    if (start === -1 || end === -1) {
      return Response.json({ reply: raw.trim(), patches: [] })
    }

    const data = JSON.parse(raw.slice(start, end + 1))

    // Normalise any skills items patch where Claude returned a comma string instead of array
    const patches = (data.patches || []).map(p => {
      if (p.path?.match(/^skills\.\d+\.items$/) && p.op === 'replace' && !Array.isArray(p.value)) {
        return { ...p, value: String(p.value).split(/,\s*/).filter(Boolean) }
      }
      return p
    })

    return Response.json({ reply: data.reply || 'Done.', patches })
  } catch (err) {
    console.error('[cv/chat]', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
