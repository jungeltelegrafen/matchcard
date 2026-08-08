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
