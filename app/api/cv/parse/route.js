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
    const { text, userEdits = {}, lang = 'en' } = await request.json()
    if (!text) return Response.json({ error: 'No text provided' }, { status: 400 })

    const langName   = lang === 'no' ? 'Norwegian (Bokmål)' : 'English'
    const editsBlock = Object.keys(userEdits).length > 0
      ? `\nPreserve these user-edited fields exactly (only override if the new source clearly contradicts):\n${JSON.stringify(userEdits, null, 2)}\n`
      : ''

    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: `You are a CV parser. Extract all information from the source text and return ONLY a valid JSON object — no markdown, no code fences, no explanation.

Schema (empty string for missing text fields, empty array [] for missing lists):
${SCHEMA}

Rules:
- skills.items: array of strings (never comma-separated string)
- experience.bullets: array of strings, one per achievement
- Missing sections: empty array
- Preserve dates as written (e.g. "Jan 2021", "2019–2022")
- Output language: ${langName} — translate all text content to ${langName} (keep names, dates, URLs unchanged)${editsBlock}

Source text:
${text.slice(0, 14000)}`,
      }],
    })

    const data = parseJson(msg.content[0].text)
    return Response.json(data)
  } catch (err) {
    console.error('[cv/parse]', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}

function parseJson(raw) {
  const start = raw.indexOf('{')
  const end   = raw.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('Model did not return valid JSON')
  const data = JSON.parse(raw.slice(start, end + 1))
  if (Array.isArray(data.skills)) {
    data.skills = data.skills.map(g => ({
      ...g,
      items: Array.isArray(g.items) ? g.items : String(g.items).split(/,\s*/).filter(Boolean),
    }))
  }
  return data
}
