import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { pool } from '@/lib/db'
import { checkRateLimit, rateLimitedResponse, LIMITS } from '@/lib/rateLimit'

export async function POST(req) {
  const limit = await checkRateLimit(req, LIMITS.shareWrite)
  if (!limit.ok) return rateLimitedResponse(limit.retryAfter)

  try {
    const { cv, lang = 'en', filename = 'cv', recordable = false } = await req.json()
    if (!cv) return NextResponse.json({ error: 'cv required' }, { status: 400 })

    // A recordable share carries a secret token: only a link with the matching
    // token (?record=<token>) exposes the recorder and may write videos back.
    const recordToken = recordable ? randomUUID().replace(/-/g, '') : null

    const { rows } = await pool.query(
      'INSERT INTO shared_cvs (cv_data, lang, filename, record_token) VALUES ($1, $2, $3, $4) RETURNING id',
      [JSON.stringify(cv), lang, filename, recordToken]
    )
    const id = rows[0].id
    const base = process.env.NEXT_PUBLIC_BASE_URL || 'https://matchcard.no'
    const res = { id, url: `${base}/cv/${id}` }
    if (recordToken) res.recordUrl = `${base}/cv/${id}?record=${recordToken}`
    return NextResponse.json(res)
  } catch (err) {
    console.error('[cv/share:POST]', err)
    return NextResponse.json({ error: 'Failed to create share link' }, { status: 500 })
  }
}

export async function GET(req) {
  const limit = await checkRateLimit(req, LIMITS.shareRead)
  if (!limit.ok) return rateLimitedResponse(limit.retryAfter)

  try {
    const id = new URL(req.url).searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const { rows } = await pool.query(
      'SELECT cv_data, lang, filename FROM shared_cvs WHERE id = $1',
      [id]
    )
    if (rows.length === 0) return NextResponse.json({ error: 'not found' }, { status: 404 })

    const { cv_data, lang, filename } = rows[0]
    return NextResponse.json({ cv: cv_data, lang, filename })
  } catch (err) {
    console.error('[cv/share:GET]', err)
    return NextResponse.json({ error: 'Failed to load shared CV' }, { status: 500 })
  }
}
