// Uploads a recorded clip to Cloudflare R2 via a one-time presigned PUT URL
// minted by /api/cv/video/upload-url. Returns the public playback URL, or null
// when hosting isn't configured (caller falls back to a local session clip).

async function requestUploadUrl(ext) {
  const res = await fetch('/api/cv/video/upload-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ext }),
  })
  if (res.status === 501) return { notConfigured: true }
  if (!res.ok) throw new Error(`upload-url failed (${res.status})`)
  return res.json() // { uploadURL, publicUrl, key }
}

function putToR2(uploadURL, blob, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', uploadURL)
    if (blob.type) xhr.setRequestHeader('Content-Type', blob.type)
    xhr.upload.onprogress = e => {
      if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total)
    }
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`upload failed (${xhr.status})`))
    xhr.onerror = () => reject(new Error('upload network error'))
    xhr.send(blob)
  })
}

export function extForBlob(blob) {
  const t = blob?.type || ''
  if (t.includes('mp4')) return 'mp4'
  if (t.includes('webm')) return 'webm'
  if (t.includes('quicktime') || t.includes('mov')) return 'mov'
  return 'mp4'
}

// → { uid, playbackUrl } when hosted, or null when not configured.
// Throws only on a genuine upload failure (caller should fall back to local).
export async function hostRecording(blob, { onProgress } = {}) {
  const u = await requestUploadUrl(extForBlob(blob))
  if (u.notConfigured) return null
  await putToR2(u.uploadURL, blob, onProgress)
  return { uid: u.key, playbackUrl: u.publicUrl }
}
