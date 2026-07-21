import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request) {
  try {
    const { cv, prompt, lang = 'en' } = await request.json()
    if (!prompt) return Response.json({ error: 'No prompt provided' }, { status: 400 })

    const langNote = lang === 'no' ? 'Respond in Norwegian (Bokmål).' : 'Respond in English.'

    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: `${prompt}

${langNote}

CV Data:
${JSON.stringify(cv, null, 2)}`,
      }],
    })

    return Response.json({ text: msg.content[0].text })
  } catch (err) {
    console.error('[cv/agent]', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
