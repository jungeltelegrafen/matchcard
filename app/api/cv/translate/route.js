import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request) {
  try {
    const { cv, targetLang } = await request.json()
    if (!cv || !targetLang) return Response.json({ error: 'cv and targetLang required' }, { status: 400 })

    const langName = targetLang === 'no' ? 'Norwegian (Bokmål)' : 'English'

    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: `Translate all text content in this CV JSON to ${langName}. Keep the exact JSON structure and keys unchanged. Do NOT translate: dates, email addresses, phone numbers, URLs, company names, school names, or person names. Return ONLY valid JSON.

${JSON.stringify(cv)}`,
      }],
    })

    const raw   = msg.content[0].text
    const start = raw.indexOf('{')
    const end   = raw.lastIndexOf('}')
    if (start === -1 || end === -1) throw new Error('Model did not return valid JSON')

    const data = JSON.parse(raw.slice(start, end + 1))
    return Response.json(data)
  } catch (err) {
    console.error('[cv/translate]', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
