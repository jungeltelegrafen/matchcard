import { NextResponse } from 'next/server'
import { pool } from '@/lib/db'
import { checkRateLimit, rateLimitedResponse, LIMITS } from '@/lib/rateLimit'

export async function POST(req) {
  const limit = await checkRateLimit(req, LIMITS.shareWrite)
  if (!limit.ok) return rateLimitedResponse(limit.retryAfter)

  try {
    const { cv, lang = 'en', filename = 'cv' } = await req.json()
    if (!cv) return NextResponse.json({ error: 'cv required' }, { status: 400 })

    const { rows } = await pool.query(
      'INSERT INTO shared_cvs (cv_data, lang, filename) VALUES ($1, $2, $3) RETURNING id',
      [JSON.stringify(cv), lang, filename]
    )
    const id = rows[0].id
    const base = process.env.NEXT_PUBLIC_BASE_URL || 'https://matchcard.no'
    return NextResponse.json({ id, url: `${base}/cv/${id}` })
  } catch (err) {
    console.error('[cv/share:POST]', err)
    // TEMP DIAGNOSTIC: surface the real cause to debug prod DB connectivity.
    return NextResponse.json({ error: 'Failed to create share link', detail: err.message, code: err.code }, { status: 500 })
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
