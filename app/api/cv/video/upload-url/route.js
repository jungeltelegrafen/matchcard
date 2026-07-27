import { NextResponse } from 'next/server'
import { AwsClient } from 'aws4fetch'
import { checkRateLimit, rateLimitedResponse, LIMITS } from '@/lib/rateLimit'

// ─────────────────────────────────────────────────────────────────────────────
// Video hosting — Cloudflare R2 (the free / cheapest option).
//
// The browser records the clip, this route mints a one-time S3 presigned PUT URL
// for our R2 bucket, and the browser uploads straight to R2 (bytes never touch
// this server). We store the resulting public file URL on the CV and play it
// with a plain <video> element.
//
// WHY R2: free up to 10 GB with zero egress fees; great for an internal tool /
// MVP. Trade-offs vs a transcoding host:
//   • We serve the raw recording (no adaptive bitrate) — fine for short clips,
//     slower to start on long/HD videos over poor connections.
//   • No server-side transcode, so a webm recorded in FIREFOX may not play for a
//     viewer on SAFARI. We record MP4 wherever the browser supports it (Chrome/
//     Edge/Safari) and warn Firefox users; that covers all but the Firefox→Safari
//     corner.
//
// RECOMMENDED UPGRADE (see VIDEO_HOSTING.md): migrate to **Cloudflare Stream**
// once video matters commercially. It auto-transcodes to universal HLS/MP4
// (always plays incl. Safari), gives adaptive streaming + auto thumbnails, for a
// small (~$5/mo + pennies) cost. Hosting is intentionally behind this one
// endpoint + uploadVideo.js, so switching is a localized change, not a rewrite.
//
// Required env (absent → 501, client falls back to a session-only local clip):
//   R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_BASE_URL,
//   and the S3 endpoint via ONE of:
//     R2_ENDPOINT     — full endpoint base, e.g.
//                       https://<acct>.eu.r2.cloudflarestorage.com  (handles EU/
//                       jurisdiction buckets), or
//     R2_ACCOUNT_ID   — the bare 32-hex account id (→ …r2.cloudflarestorage.com).
//   (R2_ACCOUNT_ID also tolerates a full endpoint URL, with or without the
//    bucket appended, so a common paste mistake still works.)
// The bucket needs public read access and a CORS rule allowing PUT from the app
// origin — see VIDEO_HOSTING.md.
// ─────────────────────────────────────────────────────────────────────────────

const EXT_OK = new Set(['mp4', 'webm', 'mov', 'm4v'])

export async function POST(req) {
  const limit = await checkRateLimit(req, LIMITS.ai)
  if (!limit.ok) return rateLimitedResponse(limit.retryAfter)

  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
  const bucket = process.env.R2_BUCKET
  const publicBase = process.env.R2_PUBLIC_BASE_URL

  // Resolve the account-level S3 endpoint. Accept either R2_ENDPOINT, a bare
  // R2_ACCOUNT_ID (→ https://<id>.r2.cloudflarestorage.com), or a full endpoint
  // URL pasted into R2_ACCOUNT_ID (incl. EU/other jurisdictions, with or without
  // the bucket appended) — tolerant so common paste mistakes still work.
  let endpointBase = process.env.R2_ENDPOINT || ''
  if (!endpointBase && process.env.R2_ACCOUNT_ID) {
    const raw = process.env.R2_ACCOUNT_ID.trim()
    endpointBase = /^https?:\/\//.test(raw) ? raw : `https://${raw}.r2.cloudflarestorage.com`
  }
  endpointBase = endpointBase.replace(/\/+$/, '')
  if (bucket && endpointBase.endsWith(`/${bucket}`)) endpointBase = endpointBase.slice(0, -(bucket.length + 1))

  if (!endpointBase || !accessKeyId || !secretAccessKey || !bucket || !publicBase) {
    return NextResponse.json({ error: 'not_configured' }, { status: 501 })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const ext = EXT_OK.has(String(body.ext)) ? String(body.ext) : 'mp4'
    const key = `videos/${crypto.randomUUID()}.${ext}`

    const client = new AwsClient({ accessKeyId, secretAccessKey })
    const endpoint = `${endpointBase}/${bucket}/${key}`
    const signed = await client.sign(`${endpoint}?X-Amz-Expires=600`, {
      method: 'PUT',
      aws: { signQuery: true, service: 's3', region: 'auto' },
    })

    return NextResponse.json({
      uploadURL: signed.url,
      publicUrl: `${publicBase.replace(/\/$/, '')}/${key}`,
      key,
    })
  } catch (err) {
    console.error('[cv/video/upload-url]', err)
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
}
