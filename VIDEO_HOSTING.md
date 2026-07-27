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
   R2_ACCOUNT_ID=your-cloudflare-account-id
   R2_ACCESS_KEY_ID=...
   R2_SECRET_ACCESS_KEY=...
   R2_BUCKET=your-bucket-name
   R2_PUBLIC_BASE_URL=https://pub-xxxx.r2.dev      # or your custom domain
   ```
6. **Test:** record a clip → *Use this recording* → you should see *Uploading… %*,
   the "session only" badge disappears, and the clip plays on the share page and
   after a reload.

Signing uses `aws4fetch` (tiny S3 SigV4 signer); no AWS SDK needed.
