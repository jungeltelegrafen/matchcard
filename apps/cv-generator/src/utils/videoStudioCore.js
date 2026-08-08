// Shared, framework-agnostic helpers for the video recorders (desktop
// VideoStudioModal + the mobile MobileVideoStudio). Keeping the codec pick and
// the poster-frame extraction in ONE place means the hard-won Safari/mobile
// knowledge (mp4 preference, black-poster workaround) can't drift between the
// two recorders.

// Hard cap so a recording can never run silently forever.
export const MAX_SECONDS = 300

// Seconds → "m:ss".
export function fmt(sec) {
  const m = Math.floor(sec / 60), s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

// Prefer MP4 (H.264) — it plays on every modern browser incl. Safari, so a
// raw-served R2 file works universally. Falls back to webm (Firefox, older
// Chrome), which is the combo that can fail for Safari viewers. iPhones record
// MP4 natively, so this returns mp4 there.
export function pickMime() {
  const opts = [
    'video/mp4;codecs=h264,aac', 'video/mp4',
    'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm',
  ]
  return opts.find(m => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m)) || ''
}

// True when the browser can record MP4 (universal playback). When false
// (notably Firefox), we warn that Safari viewers may not be able to watch.
export function canRecordMp4() {
  return typeof MediaRecorder !== 'undefined' &&
    (MediaRecorder.isTypeSupported('video/mp4;codecs=h264,aac') || MediaRecorder.isTypeSupported('video/mp4'))
}

// pdfjs-dist is only needed for the CV-walkthrough composite. It's loaded lazily
// (a module-level singleton shared by both recorders) so bundles that never
// record a walkthrough can skip it — its ESM worker breaks webpack's Terser pass.
let pdfjsPromise
export function loadPdfjs() {
  pdfjsPromise ||= import('pdfjs-dist').then((pdfjsLib) => {
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url,
    ).toString()
    return pdfjsLib
  })
  return pdfjsPromise
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

// Draw ONE frame of the CV-walkthrough composite (shared by the desktop and
// mobile recorders): the CV pages fit-to-width and stacked into a vertical strip
// scrolled by `scroll`, the webcam PiP bubble bottom-right, and (desktop only,
// showCursor) a highlighted pointer. Returns the max scroll distance so the
// caller can clamp its own scroll offset for the next frame.
export function drawComposite(ctx, { W, H, pages, scroll, camVideo, showCursor = false, cursor }) {
  ctx.fillStyle = '#14110f'; ctx.fillRect(0, 0, W, H)
  let maxScroll = 0
  if (pages && pages.length && pages[0].width) {
    const s = W / pages[0].width
    const gap = 14 // dark seam between stacked pages
    let totalH = 0
    for (const p of pages) totalH += p.height * s
    totalH += gap * (pages.length - 1)
    maxScroll = Math.max(0, totalH - H)
    let sc = scroll
    if (sc > maxScroll) sc = maxScroll
    if (sc < 0) sc = 0
    let yTop = -sc
    for (const p of pages) {
      const ph = p.height * s
      if (yTop + ph > 0 && yTop < H) {
        ctx.fillStyle = '#fff'; ctx.fillRect(0, yTop, W, ph)
        ctx.drawImage(p, 0, yTop, W, ph)
      }
      yTop += ph + gap
    }
    // Subtle scroll indicator on the right edge when there's more below/above.
    if (maxScroll > 0) {
      const trackY = 12, trackH = H - 24
      const thumbH = Math.max(36, trackH * (H / totalH))
      const thumbY = trackY + (trackH - thumbH) * (sc / maxScroll)
      ctx.fillStyle = 'rgba(20,17,15,0.12)'; roundRect(ctx, W - 9, trackY, 4, trackH, 2); ctx.fill()
      ctx.fillStyle = 'rgba(201,123,75,0.75)'; roundRect(ctx, W - 9, thumbY, 4, thumbH, 2); ctx.fill()
    }
  }
  const v = camVideo
  if (v && v.readyState >= 2 && v.videoWidth) {
    const pipW = Math.round(W * 0.26), pipH = Math.round(pipW * 9 / 16)
    const px = W - pipW - 22, py = H - pipH - 22
    const vr = v.videoWidth / v.videoHeight, pr = pipW / pipH
    let sw, sh, sx, sy
    if (vr > pr) { sh = v.videoHeight; sw = sh * pr; sx = (v.videoWidth - sw) / 2; sy = 0 }
    else { sw = v.videoWidth; sh = sw / pr; sx = 0; sy = (v.videoHeight - sh) / 2 }
    ctx.save(); roundRect(ctx, px, py, pipW, pipH, 14); ctx.clip()
    ctx.drawImage(v, sx, sy, sw, sh, px, py, pipW, pipH)
    ctx.restore()
    ctx.strokeStyle = 'rgba(255,255,255,0.92)'; ctx.lineWidth = 3
    roundRect(ctx, px, py, pipW, pipH, 14); ctx.stroke()
  }
  if (showCursor && cursor && cursor.active) {
    ctx.beginPath(); ctx.arc(cursor.x, cursor.y, 27, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255,179,71,0.22)'; ctx.fill()
    ctx.beginPath(); ctx.arc(cursor.x, cursor.y, 16, 0, Math.PI * 2)
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(201,123,75,0.95)'; ctx.stroke()
    ctx.beginPath(); ctx.arc(cursor.x, cursor.y, 5.5, 0, Math.PI * 2)
    ctx.fillStyle = '#C97B4B'; ctx.fill()
  }
  return maxScroll
}

// Grab a poster frame from a recorded clip → small JPEG data URL. Done on a
// DETACHED <video> (a safe, in-range seek) so the review player shows a real
// frame instead of a black one — MediaRecorder mp4 blobs wedge black if you
// seek the live element. Ratio is derived from the clip, so portrait posters
// come out right too.
export function makeThumb(url) {
  return new Promise(resolve => {
    const v = document.createElement('video')
    v.src = url; v.muted = true; v.playsInline = true
    v.onloadeddata = () => { try { v.currentTime = Math.min(0.1, (v.duration || 1) / 2) } catch { resolve('') } }
    v.onseeked = () => {
      try {
        const w = 320, ratio = v.videoHeight && v.videoWidth ? v.videoHeight / v.videoWidth : 0.5625
        const c = document.createElement('canvas')
        c.width = w; c.height = Math.round(w * ratio)
        c.getContext('2d').drawImage(v, 0, 0, c.width, c.height)
        resolve(c.toDataURL('image/jpeg', 0.6))
      } catch { resolve('') }
    }
    v.onerror = () => resolve('')
  })
}
