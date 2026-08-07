import Anthropic from '@anthropic-ai/sdk'
import { LANG_NAME } from '@/lib/cv/lang'
import { checkAiRateLimit, rateLimitedResponse } from '@/lib/rateLimit'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request) {
  const limit = await checkAiRateLimit(request)
  if (!limit.ok) return rateLimitedResponse(limit.retryAfter)

  try {
    const { cv, lang = 'en' } = await request.json()
    if (!cv) return Response.json({ error: 'cv required' }, { status: 400 })

    const langName = LANG_NAME[lang] || 'English'

    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: `Write a professional 3–4 sentence email introduction in ${langName} for a job applicant attaching their CV. Base it on the CV data below. Return only the email body text — no subject line, no greeting like "Dear...", no signature.

${JSON.stringify(cv)}`,
      }],
    })

    return Response.json({ text: msg.content[0].text.trim() })
  } catch (err) {
    console.error('[cv/email]', err)
    return Response.json({ error: 'Failed to generate email' }, { status: 500 })
  }
}
