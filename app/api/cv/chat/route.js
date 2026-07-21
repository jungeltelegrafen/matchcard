import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SCHEMA = `{
  "personal": {
    "firstName": "", "lastName": "", "title": "",
    "location": "", "educationSummary": "", "itExperienceSince": "",
    "phone": "", "email": "", "linkedin": "",
    "availableFrom": "", "workPreference": "",
    "showContactInfo": true, "birthYear": "", "summary": ""
  },
  "experience": [{ "company": "", "role": "", "startDate": "", "endDate": "", "location": "", "description": "", "bullets": [], "technologies": "", "methodologies": "", "result": "" }],
  "education": [{ "institution": "", "degree": "", "field": "", "startDate": "", "endDate": "" }],
  "skills": [{ "category": "", "items": [] }],
  "languages": [{ "language": "", "proficiency": "" }],
  "certifications": [{ "name": "", "issuer": "", "year": "" }],
  "courses": [{ "name": "", "institution": "", "year": "" }],
  "positions": {
    "enabled": false, "useProjectFormat": false,
    "items": [{ "company": "", "startDate": "", "endDate": "", "title": "", "description": "", "bullets": [], "technologies": "", "methodologies": "" }]
  },
  "competences": {
    "enabled": false, "projectLabel": "",
    "items": [{ "requirement": "", "level": "", "lastUsed": "", "yearsRelevant": "", "projects": "", "detail": "" }]
  }
}`

export async function POST(request) {
  try {
    const { cv, message, history = [], lang = 'en' } = await request.json()
    if (!message) return Response.json({ error: 'No message provided' }, { status: 400 })

    const langName = lang === 'no' ? 'Norwegian (Bokmål)' : 'English'

    const system = `You are a CV writing assistant for consultants. You can modify any part of their CV.

RULES — read carefully:
- Only use information already in the CV or explicitly provided by the user in this conversation
- Never invent experience, companies, dates, skills, or achievements that aren't there
- You CAN rephrase, reorder, emphasize, condense, or expand existing content
- You CAN ask clarifying questions if you need more info before making changes
- Output language for all CV text: ${langName}

Current CV (full JSON):
${JSON.stringify(cv, null, 2)}

Return ONLY valid JSON in this exact shape — no markdown, no code fences:
{
  "reply": "Short explanation of what changed or your answer (2-3 sentences)",
  "cv": { /* complete updated CV matching the schema below */ }
}

Schema:
${SCHEMA}`

    const messages = [
      ...history.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: message },
    ]

    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8192,
      system,
      messages,
    })

    const raw   = msg.content[0].text
    const start = raw.indexOf('{')
    const end   = raw.lastIndexOf('}')
    if (start === -1 || end === -1) return Response.json({ reply: raw.trim(), cv: null })

    const data = JSON.parse(raw.slice(start, end + 1))
    if (Array.isArray(data.cv?.skills)) {
      data.cv.skills = data.cv.skills.map(g => ({
        ...g,
        items: Array.isArray(g.items) ? g.items : String(g.items).split(/,\s*/).filter(Boolean),
      }))
    }

    return Response.json({ reply: data.reply || 'Done.', cv: data.cv || null })
  } catch (err) {
    console.error('[cv/chat]', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
