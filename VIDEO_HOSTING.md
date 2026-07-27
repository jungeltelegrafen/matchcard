# Video hosting

The CV generator lets candidates record a short webcam presentation. Recording is
browser-native (`MediaRecorder`); the file is uploaded to object storage and
played back with a plain `<video>` element.

Hosting is deliberately isolated behind **one endpoint and one client helper**, so
swapping providers is a localized change:

- `app/api/cv/video/upload-url/route.js` — mints a one-time upload URL.
- `apps/cv-generator/src/utils/uploadVideo.js` — uploads the blob, returns the
  public playback URL.

If the hosting env vars are absent, the endpoint returns **501** and the studio
falls back to a **session-only local clip** (works, but doesn't persist or share).

---

## Current provider: Cloudflare R2 (free)

We use **R2** because it's free up to 10 GB with **zero egress fees** — ideal for
an internal tool / MVP. The browser uploads straight to R2 via an S3 presigned
`PUT` URL; we serve the raw file.

### Trade-offs (read this)
- **No transcoding / no adaptive bitrate.** Fine for short clips; long or HD
  videos start slower on poor connections, and a raw `MediaRecorder` file isn't
  "web-optimized" (may need to buffer more before seeking).
- **Format compatibility.** We record **MP4 (H.264)** wherever the browser
  supports it (Chrome, Edge, Safari) — MP4 plays everywhere. **Firefox can only
  record webm**, which **Safari may not play**. The studio shows a warning to
  users whose browser can't record MP4 (see `canRecordMp4()` /
  `t.mp4Warn` in `VideoStudioModal.jsx`). So the only failure case is
  *Firefox recorder → Safari viewer*.
- Thumbnails are generated **client-side** (a small JPEG data-URL stored on the
  CV) — R2 doesn't make thumbnails.

### ⭐ Recommended upgrade later: Cloudflare Stream
Once video matters commercially, **migrate to Cloudflare Stream.** It
**auto-transcodes to universal HLS/MP4** (always plays, including Safari, from
any recorder), adds **adaptive streaming** and **auto thumbnails**, for a small
cost (~**$5/mo** floor + ~$1 per 1,000 minutes watched + ~$5 per 1,000 minutes
stored/mo). This removes the Firefox→Safari gap and the long-video roughness.

Migration is small: change `upload-url/route.js` to call Stream's
`direct_upload` API (returns `{ uploadURL, uid }`), have `uploadVideo.js` POST
the file to that URL, and store `https://iframe.videodelivery.net/{uid}` as the
playback URL (the player components already recognize `videodelivery.net` /
`cloudflarestream.com` URLs). No UI changes needed.

### R2 setup (one time)
1. **Create an R2 bucket** (Cloudflare dashboard → R2).
2. **Enable public access:** either turn on the bucket's public `r2.dev` URL, or
   attach a custom domain. This is your `R2_PUBLIC_BASE_URL`.
3. **Add a CORS policy** on the bucket allowing browser uploads, e.g.:
   ```json
   [{ "AllowedOrigins": ["https://your-app-domain", "http://localhost:3000", "http://localhost:5199"],
      "AllowedMethods": ["PUT", "GET"],
      "AllowedHeaders": ["*"],
      "MaxAgeSeconds": 3600 }]
   ```
4. **Create an R2 API token** with **Object Read & Write** on the bucket — this
   gives an S3 **Access Key ID** and **Secret Access Key**.
5. **Set env vars** (`.env.local`) and restart the Next server:
   ```
   R2_ACCESS_KEY_ID=...
   R2_SECRET_ACCESS_KEY=...
   R2_BUCKET=your-bucket-name
   R2_PUBLIC_BASE_URL=https://pub-xxxx.r2.dev        # the bucket's public URL
   # S3 endpoint — use R2_ENDPOINT for EU/jurisdiction buckets:
   R2_ENDPOINT=https://<account-id>.eu.r2.cloudflarestorage.com
   # …or, for a standard (non-jurisdiction) bucket, just:
   # R2_ACCOUNT_ID=your-32-hex-account-id
   ```
   **Gotchas:** don't paste the *whole* S3 URL into `R2_ACCOUNT_ID` — it's just
   the 32-hex id (the route now tolerates a full URL, but `R2_ENDPOINT` is
   clearer). **EU-jurisdiction buckets** must use the `.eu.` endpoint, so set
   `R2_ENDPOINT`. `R2_PUBLIC_BASE_URL` is the bucket's own public `r2.dev` URL
   (must belong to the *same* bucket you upload to).
6. **Test:** record a clip → *Use this recording* → you should see *Uploading… %*,
   the "session only" badge disappears, and the clip plays on the share page and
   after a reload.

Signing uses `aws4fetch` (tiny S3 SigV4 signer); no AWS SDK needed.

> Note: automated tools (curl/Python) hitting the `r2.dev` public URL may get
> Cloudflare `error 1010` — that's bot protection on the public domain, not a
> bucket problem; real browsers are unaffected.
