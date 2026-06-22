import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const CORS = {
  'Access-Control-Allow-Origin': 'https://jungeltelegrafen.github.io',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS })
}

export async function GET() {
  const configured = Boolean(process.env.ANTHROPIC_API_KEY) || Boolean(process.env.TAVILY_API_KEY)
  return Response.json({ ok: true, configured }, { headers: CORS })
}

// ── AI system prompt ──────────────────────────────────────────────────────────
// Full criteria documented in CRITERIA.md next to this file.
const SYSTEM = `Du hjelper norske IT-rekrutterere med å presentere kunder som arbeidsgivere for tech-kandidater.

Skriv NØYAKTIG to avsnitt på norsk. Ingen titler, headers, markdown eller avsnittoverskrifter av noe slag.

Avsnitt 1 — Selskapet: Størrelse, bransje, markedsposisjon og annen relevant kontekst om hvem de er.

Avsnitt 2 — Som arbeidsgiver: Hva som er kjent om arbeidsmiljø, fagkultur og hvordan selskapet fremstår for tech-kandidater. Trekk frem ekte, positive aspekter basert på hva selskapet faktisk kommuniserer om seg selv. Skriv det som en naturlig, faktabasert presentasjon — ikke en oppramsing av punkter.

Absolutte regler:
- Ingen titler, seksjonsnavn, overskrifter eller labels foran avsnittene ("Selskapet:", "IT-avdeling:", osv.)
- Ikke nevn spesifikke teknologier, tech stack eller systemvalg — det hører hjemme i egne felt i skjemaet
- Baser deg utelukkende på bekreftet offentlig informasjon (nettside, LinkedIn, pressemeldinger, årsrapporter)
- Gjør ALDRI antagelser om hva IT-avdelingen jobber med hvis det ikke er eksplisitt dokumentert
- Spekuler ikke — utelat heller informasjon du ikke finner
- Hvis lite finnes: skriv ett kortfattet avsnitt med det du vet, og ikke fyll inn med gjetning`

async function synthesize(rawContext, companyName) {
  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 600,
    system: SYSTEM,
    messages: [{
      role: 'user',
      content: `Selskap: "${companyName}"\n\nKildemateriale fra søk:\n${rawContext}\n\nSkriv to faktabaserte avsnitt basert utelukkende på det ovenfor. Ingen titler eller labels.`,
    }],
  })
  return message.content[0]?.text?.trim()
}

export async function POST(request) {
  let body
  try { body = await request.json() } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400, headers: CORS })
  }

  const { query } = body
  if (!query?.trim()) return Response.json({ error: 'No query' }, { status: 400, headers: CORS })

  const searchQuery = `"${query}" ansatte arbeidsmiljø kultur arbeidsgiver Norge`

  // ── Option 1: Tavily → Claude synthesis ──────────────────────────────────
  if (process.env.TAVILY_API_KEY) {
    try {
      const res = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: process.env.TAVILY_API_KEY,
          query: searchQuery,
          search_depth: 'advanced',
          max_results: 5,
          include_answer: false,
          exclude_domains: ['linkedin.com'],
        }),
      })
      if (res.ok) {
        const data = await res.json()
        const snippets = (data.results || [])
          .map(r => `[${r.url}]\n${r.content}`)
          .filter(Boolean)
          .join('\n\n')
          .slice(0, 4000)

        if (snippets) {
          const summary = await synthesize(snippets, query)
          if (summary) return Response.json({ summary }, { headers: CORS })
        }
      }
    } catch { /* fall through */ }
  }

  // ── Option 2: Claude web_search tool ─────────────────────────────────────
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: 'Ingen søke-API konfigurert' }, { status: 503, headers: CORS })
  }

  try {
    const messages = [{
      role: 'user',
      content: `Søk etter "${query}" og finn offentlig informasjon om selskapet: størrelse, bransje, markedsposisjon, og hva de kommuniserer om arbeidsmiljø og kultur som tech-arbeidsgiver. Ikke nevn tech stack.`,
    }]
    const tools = [{ type: 'web_search_20250305', name: 'web_search' }]

    let response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: SYSTEM,
      tools,
      messages,
    })

    for (let i = 0; i < 2 && response.stop_reason === 'tool_use'; i++) {
      messages.push({ role: 'assistant', content: response.content })
      const toolResults = response.content
        .filter(b => b.type === 'tool_use')
        .map(b => ({ type: 'tool_result', tool_use_id: b.id, content: 'Search completed.' }))
      messages.push({ role: 'user', content: toolResults })
      response = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: SYSTEM,
        tools,
        messages,
      })
    }

    const text = response.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('')
      .trim()

    if (text) return Response.json({ summary: text }, { headers: CORS })
  } catch { /* web_search tool not available — fall through */ }

  // ── Option 3: Claude knowledge fallback ──────────────────────────────────
  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system: SYSTEM,
      messages: [{
        role: 'user',
        content: `Selskap: "${query}" (Norge). Du har ikke live søkeresultater. Del kun det du med sikkerhet vet fra treningsdata — ikke spekuler. Ingen titler eller labels.`,
      }],
    })
    const summary = message.content[0]?.text?.trim()
    if (summary) return Response.json({ summary }, { headers: CORS })
  } catch (e) {
    return Response.json({ error: 'Søk feilet', detail: e.message }, { status: 500, headers: CORS })
  }

  return Response.json({ error: 'Ingen resultater' }, { status: 500, headers: CORS })
}
