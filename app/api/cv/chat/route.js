import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SCHEMA = `{
  "personal": {
    "firstName": "",
    "lastName": "",
    "title": "",            // professional headline / job title
    "location": "",         // city or region
    "educationSummary": "", // one-line education summary shown in header
    "itExperienceSince": "", // year IT career started, e.g. "2010"
    "phone": "",
    "email": "",
    "linkedin": "",
    "availableFrom": "",    // availability date, e.g. "2024-09-01"
    "workPreference": "",   // e.g. "Remote / Oslo"
    "showContactInfo": true,
    "birthYear": "",
    "summary": ""           // profile summary paragraph (2-5 sentences)
  },
  "experience": [
    {
      "company": "",
      "role": "",
      "startDate": "",      // e.g. "2021-03"
      "endDate": "",        // e.g. "2023-06" or "Present"
      "location": "",
      "description": "",    // project/engagement description
      "bullets": [],        // array of task/responsibility strings
      "technologies": "",   // comma-separated tech stack
      "methodologies": "",  // methodologies or frameworks used
      "result": ""          // measurable outcome or result
    }
  ],
  "education": [
    {
      "institution": "",
      "degree": "",
      "field": "",
      "startDate": "",
      "endDate": ""
    }
  ],
  "skills": [
    {
      "category": "",       // skill group label, e.g. "Frontend", "Cloud"
      "items": []           // array of skill strings
    }
  ],
  "languages": [
    { "language": "", "proficiency": "" }
  ],
  "certifications": [
    { "name": "", "issuer": "", "year": "" }
  ],
  "courses": [
    { "name": "", "institution": "", "year": "" }
  ],
  "positions": {
    "enabled": false,
    "useProjectFormat": false,
    "items": [
      {
        "company": "",        // organisation name
        "startDate": "",
        "endDate": "",
        "title": "",          // role or position title
        "description": "",
        "bullets": [],
        "technologies": "",
        "methodologies": ""
      }
    ]
  },
  "competences": {
    "enabled": false,
    "projectLabel": "",
    "items": [
      {
        "requirement": "",    // competence area / skill name
        "level": "",          // e.g. "Expert", "Advanced"
        "lastUsed": "",       // year last used
        "yearsRelevant": "",  // years of experience
        "projects": "",       // relevant projects or clients
        "detail": ""          // additional context
      }
    ]
  }
}`

export async function POST(request) {
  try {
    const { cv, message, history = [], lang = 'en' } = await request.json()
    if (!message) return Response.json({ error: 'No message provided' }, { status: 400 })

    const langName = lang === 'no' ? 'Norwegian (Bokmål)' : 'English'

    const system = `You are a CV writing assistant for consultants. You can read and modify any part of their CV.

RULES — follow precisely:
- Only use information already in the CV or explicitly provided by the user in this conversation
- Never invent experience, companies, dates, skills, or achievements that are not there
- You CAN rephrase, reorder, emphasise, condense, or expand existing content
- You CAN ask clarifying questions before making changes if needed
- All CV text must be written in: ${langName}

FIELD GUIDE (what each section contains):
- personal.summary: the main profile paragraph at the top of the CV
- personal.title: the professional headline under the name
- personal.educationSummary: a short education line shown in the CV header
- personal.itExperienceSince: the year the person started their IT career
- experience[]: each entry is a role or consulting engagement — includes bullets (tasks), technologies, methodologies, and result
- skills[]: grouped skill tags, each group has a category label and an items array
- positions[]: board memberships, volunteer roles, or non-employment positions
- competences[]: a structured competence matrix used in consultant CVs (requirement, level, years, projects)
- courses[]: short courses and training (separate from formal education and certifications)
- certifications[]: professional certificates with issuer and year

CRITICAL — output format:
Return ONLY valid JSON with no markdown, no code fences, no commentary outside the JSON:
{
  "reply": "2-3 sentence explanation of what you changed or your answer",
  "cv": { complete CV object — see schema below }
}

CRITICAL — completeness:
The "cv" object MUST include ALL sections and ALL fields from the current CV, even sections you did not touch.
Do NOT omit any top-level key (personal, experience, education, skills, languages, certifications, courses, positions, competences).
If a section was not changed, copy it exactly from the current CV.
Omitting a section will DELETE that data permanently.

Current CV:
${JSON.stringify(cv, null, 2)}

Schema reference:
${SCHEMA}`

    const messages = [
      ...history.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: message },
    ]

    const msg = await client.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 8192,
      system,
      messages,
    })

    const raw   = msg.content[0].text
    const start = raw.indexOf('{')
    const end   = raw.lastIndexOf('}')
    if (start === -1 || end === -1) return Response.json({ reply: raw.trim(), cv: null })

    const data = JSON.parse(raw.slice(start, end + 1))

    // Normalise skills items — Claude occasionally returns a comma string instead of array
    if (Array.isArray(data.cv?.skills)) {
      data.cv.skills = data.cv.skills.map(g => ({
        ...g,
        items: Array.isArray(g.items)
          ? g.items
          : String(g.items).split(/,\s*/).filter(Boolean),
      }))
    }

    return Response.json({ reply: data.reply || 'Done.', cv: data.cv || null })
  } catch (err) {
    console.error('[cv/chat]', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
