import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { pool } from '@/lib/db'
import { checkRateLimit, rateLimitedResponse, LIMITS } from '@/lib/rateLimit'

const HOSTED = url => /^https?:\/\//.test(url || '')

// Append a recorded video to a shared CV — the write-back for the consultant
// record-invite link. Gated by the row's record_token (only a ?record=<token>
// link can write). This is the reusable write-back foundation: a future
// full-field-edit phase would add a whole-cv_data replace behind the same guard.
export async function PATCH(req, { params }) {
  const limit = await checkRateLimit(req, LIMITS.shareWrite)
  if (!limit.ok) return rateLimitedResponse(limit.retryAfter)

  try {
    const { id } = params
    const { token, video } = await req.json()
    if (!id || !token) return NextResponse.json({ error: 'token required' }, { status: 400 })
    // A session blob: URL can't play for anyone else — only accept hosted videos.
    if (!video || !HOSTED(video.playbackUrl)) {
      return NextResponse.json(
        { error: 'A hosted video is required — the recording could not be uploaded (video hosting not configured).' },
        { status: 400 },
      )
    }

    // Sanitise: only known fields, server-stamped id + anchor.
    const entry = {
      _id: randomUUID().slice(0, 8),
      title: String(video.title || 'Video').slice(0, 120),
      kind: 'general',
      description: String(video.description || '').slice(0, 500),
      anchor: String(video.anchor || ''),
      provider: video.provider === 'cloudflare' ? 'cloudflare' : 'link',
      assetId: String(video.assetId || '').slice(0, 200),
      playbackUrl: String(video.playbackUrl).slice(0, 2000),
      thumbnailUrl: typeof video.thumbnailUrl === 'string' ? video.thumbnailUrl : '',
      duration: String(video.duration || '').slice(0, 12),
      recordedAt: typeof video.recordedAt === 'string' ? video.recordedAt : new Date().toISOString(),
    }

    // Append atomically; the WHERE clause is the token check (write only when it matches).
    const upd = await pool.query(
      `UPDATE shared_cvs
         SET cv_data = jsonb_set(cv_data, '{videos}',
               COALESCE(cv_data->'videos', '[]'::jsonb) || $2::jsonb),
             updated_at = NOW()
       WHERE id = $1 AND record_token IS NOT NULL AND record_token = $3
       RETURNING id`,
      [id, JSON.stringify([entry]), token],
    )
    if (!upd.rows.length) {
      return NextResponse.json({ error: 'Not authorized to record on this link.' }, { status: 401 })
    }
    return NextResponse.json({ ok: true, video: entry })
  } catch (err) {
    console.error('[cv/share/[id]:PATCH]', err)
    return NextResponse.json({ error: 'Failed to save video' }, { status: 500 })
  }
}
