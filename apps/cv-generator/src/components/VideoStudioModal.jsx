import { useState, useRef, useEffect, useCallback } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import { renderPdfBlob } from '../utils/renderPdf'
import { hostRecording } from '../utils/uploadVideo'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

const T = {
  en: { studio: 'Recording studio', yourCV: 'Your CV', defaultTitle: 'Screen walkthrough', script: 'Script', cues: 'Cues — only you see these',
        consentTitle: 'Ready when you are', consentNote: 'Your camera stays off until you turn it on below. Nothing is recorded until you press Record — a red ● REC badge shows the whole time you’re recording.',
        turnOn: 'Turn on camera', turnOff: 'Turn off camera', camOn: 'Camera on', camErr: 'Could not access camera or microphone. Check browser permissions.',
        record: 'Record', pause: 'Pause', resume: 'Resume', stop: 'Stop', retake: 'Re-take', use: 'Use this recording',
        recording: 'REC', paused: 'Paused', review: 'Review your recording', target: 'Target', starts: 'Recording in',
        next: 'Next ›', prev: '‹ Prev', uploading: 'Uploading…',
        recMode: 'What to record', withScreen: '🖥️ Screen', withCv: '📄 CV walkthrough', justMe: '👤 Just me', page: 'Page',
        openLinks: 'Open a link to present', pillHint: 'Recording your screen — present. Stop here or from the browser bar.',
        startCam: 'Turn on camera & mic', turnOffMic: 'Turn off camera', shareRecord: 'Share screen & record',
        floatFace: '📹 Float my face', hideFace: '📹 Hide face bubble', noFace: 'This browser records screen + voice (no face bubble)',
        micErr: 'Could not access your camera or microphone. Check browser permissions.',
        screenTitle: 'Record your screen — showcase your best work',
        screenNote: 'Turn on your camera + mic and float your face in a bubble, then share your WHOLE screen and walk through your best work out loud: open your GitHub and show the code, open the live site, and say what you built, your role and the impact.',
        screenReadyTitle: 'Ready', screenReadyNote: '',
        screenHint: 'Float your face (bottom-right), share your WHOLE screen, then move freely between GitHub, the live site and your portfolio as you talk. On Safari the face bubble has a ⧉ button to jump back here.',
        scrollHint: 'Scroll over your CV to move through it while you talk — your cursor is highlighted so viewers follow along.',
        mp4Warn: 'Heads up: your browser records in a format that may not play for viewers on Safari. For best compatibility, record in Chrome, Edge, or Safari.',
        notUploaded: 'Saved to this session only (video hosting isn’t set up yet).' },
  no: { studio: 'Innspillingsstudio', yourCV: 'Din CV', defaultTitle: 'Skjermgjennomgang', script: 'Manus', cues: 'Stikkord — kun du ser disse',
        consentTitle: 'Klar når du er', consentNote: 'Kameraet er av til du slår det på nedenfor. Ingenting tas opp før du trykker Ta opp — et rødt ● REC-merke vises hele tiden mens du tar opp.',
        turnOn: 'Slå på kamera', turnOff: 'Slå av kamera', camOn: 'Kamera på', camErr: 'Fikk ikke tilgang til kamera eller mikrofon. Sjekk tillatelser.',
        record: 'Ta opp', pause: 'Pause', resume: 'Fortsett', stop: 'Stopp', retake: 'Ta opp på nytt', use: 'Bruk dette opptaket',
        recording: 'REC', paused: 'Pauset', review: 'Se gjennom opptaket', target: 'Mål', starts: 'Opptak om',
        next: 'Neste ›', prev: '‹ Forrige', uploading: 'Laster opp…',
        recMode: 'Hva skal tas opp', withScreen: '🖥️ Skjerm', withCv: '📄 CV-gjennomgang', justMe: '👤 Bare meg', page: 'Side',
        openLinks: 'Åpne en lenke å presentere', pillHint: 'Tar opp skjermen — presenter. Stopp her eller fra nettleserlinjen.',
        startCam: 'Slå på kamera og mikrofon', turnOffMic: 'Slå av kamera', shareRecord: 'Del skjerm og ta opp',
        floatFace: '📹 Vis ansiktet mitt', hideFace: '📹 Skjul ansikts-boble', noFace: 'Denne nettleseren tar opp skjerm + stemme (uten ansikts-boble)',
        micErr: 'Fikk ikke tilgang til kamera eller mikrofon. Sjekk tillatelser i nettleseren.',
        screenTitle: 'Ta opp skjermen — vis frem ditt beste arbeid',
        screenNote: 'Slå på kamera + mikrofon og la ansiktet flyte i en boble, del så HELE skjermen og gå gjennom ditt beste arbeid høyt: åpne GitHub og vis koden, åpne den live siden, og si hva du bygde, din rolle og effekten.',
        screenReadyTitle: 'Klar', screenReadyNote: '',
        screenHint: 'La ansiktet flyte (nederst til høyre), del HELE skjermen, og beveg deg fritt mellom GitHub, live side og portefølje mens du snakker. På Safari har ansikts-boblen en ⧉-knapp for å hoppe tilbake hit.',
        scrollHint: 'Bla over CV-en for å bevege deg gjennom den mens du snakker — markøren din er uthevet så seerne følger med.',
        mp4Warn: 'Merk: nettleseren din tar opp i et format som kanskje ikke spilles av for seere på Safari. For best kompatibilitet, ta opp i Chrome, Edge eller Safari.',
        notUploaded: 'Lagret kun for denne økten (videohosting er ikke satt opp ennå).' },
  es: { studio: 'Estudio de grabación', yourCV: 'Tu CV', defaultTitle: 'Recorrido de pantalla', script: 'Guion', cues: 'Notas — solo tú las ves',
        consentTitle: 'Cuando quieras', consentNote: 'La cámara está apagada hasta que la enciendas abajo. No se graba nada hasta que pulses Grabar — verás una insignia roja ● REC todo el tiempo que grabes.',
        turnOn: 'Encender cámara', turnOff: 'Apagar cámara', camOn: 'Cámara encendida', camErr: 'No se pudo acceder a la cámara o el micrófono. Revisa los permisos.',
        record: 'Grabar', pause: 'Pausar', resume: 'Reanudar', stop: 'Detener', retake: 'Regrabar', use: 'Usar esta grabación',
        recording: 'REC', paused: 'En pausa', review: 'Revisa tu grabación', target: 'Objetivo', starts: 'Grabando en',
        next: 'Siguiente ›', prev: '‹ Anterior', uploading: 'Subiendo…',
        recMode: 'Qué grabar', withScreen: '🖥️ Pantalla', withCv: '📄 Recorrido del CV', justMe: '👤 Solo yo', page: 'Página',
        openLinks: 'Abre un enlace para presentar', pillHint: 'Grabando tu pantalla — presenta. Detén aquí o desde la barra del navegador.',
        startCam: 'Activar cámara y micrófono', turnOffMic: 'Apagar cámara', shareRecord: 'Compartir pantalla y grabar',
        floatFace: '📹 Mostrar mi cara', hideFace: '📹 Ocultar burbuja', noFace: 'Este navegador graba pantalla + voz (sin burbuja de cara)',
        micErr: 'No se pudo acceder a la cámara o el micrófono. Revisa los permisos del navegador.',
        screenTitle: 'Graba tu pantalla — muestra tu mejor trabajo',
        screenNote: 'Activa tu cámara + micrófono y haz flotar tu cara en una burbuja, luego comparte TODA la pantalla y recorre tu mejor trabajo en voz alta: abre tu GitHub y muestra el código, abre el sitio en vivo, y di qué construiste, tu rol y el impacto.',
        screenReadyTitle: 'Listo', screenReadyNote: '',
        screenHint: 'Haz flotar tu cara (abajo a la derecha), comparte TODA la pantalla y muévete libremente entre GitHub, el sitio en vivo y tu portafolio mientras hablas. En Safari la burbuja tiene un botón ⧉ para volver aquí.',
        scrollHint: 'Desplázate sobre tu CV para recorrerlo mientras hablas — tu cursor se resalta para que los espectadores te sigan.',
        mp4Warn: 'Aviso: tu navegador graba en un formato que puede no reproducirse para quienes usan Safari. Para mayor compatibilidad, graba en Chrome, Edge o Safari.',
        notUploaded: 'Guardado solo para esta sesión (el alojamiento de vídeo aún no está configurado).' },
}

const MAX_SECONDS = 300 // hard cap so a recording can never run silently forever

function fmt(sec) {
  const m = Math.floor(sec / 60), s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

// Prefer MP4 (H.264) — it plays on every modern browser incl. Safari, so a
// raw-served R2 file works universally. Falls back to webm (Firefox, older
// Chrome), which is the combo that can fail for Safari viewers.
function pickMime() {
  const opts = [
    'video/mp4;codecs=h264,aac', 'video/mp4',
    'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm',
  ]
  return opts.find(m => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m)) || ''
}

// True when the browser can record MP4 (universal playback). When false
// (notably Firefox), we warn that Safari viewers may not be able to watch.
function canRecordMp4() {
  return typeof MediaRecorder !== 'undefined' &&
    (MediaRecorder.isTypeSupported('video/mp4;codecs=h264,aac') || MediaRecorder.isTypeSupported('video/mp4'))
}

// Grab a poster frame from a recorded clip → small JPEG data URL.
function makeThumb(url) {
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

export default function VideoStudioModal({ cv = {}, lang = 'en', onClose, onSave }) {
  const t = T[lang] || T.en
  const mp4Ok = canRecordMp4()
  // Picture-in-Picture = the only way (Safari/Chrome) to float the webcam face
  // over other tabs. Firefox has no scriptable PiP, so the face bubble is hidden.
  const canPip = typeof document !== 'undefined' && document.pictureInPictureEnabled
  // Links from the CV to open and share while presenting (screen mode).
  const portfolioLinks = (cv.portfolio || [])
    .filter(p => p && p.url)
    .map(p => ({ url: p.url, label: p.label || p.url }))

  const [phase, setPhase]       = useState('consent') // consent | ready | countdown | recording | paused | review | error
  const [count, setCount]       = useState(3)
  const [elapsed, setElapsed]   = useState(0)
  const [recordedUrl, setRecordedUrl] = useState(null)
  const [errMsg, setErrMsg]     = useState('')
  const [pdfUrl, setPdfUrl]     = useState(null)
  const [uploadPct, setUploadPct] = useState(0)
  const [mode, setMode]         = useState('screen') // 'screen' = screen + voice (default), 'cv' = CV composite, 'me' = webcam only
  const [pipOn, setPipOn]       = useState(false)    // webcam floating as a picture-in-picture face bubble

  const liveRef   = useRef(null)     // webcam self-view (screen ready / me modes)
  const pipVideoRef = useRef(null)   // persistent webcam source for the face-bubble PiP
  const camVideoRef = useRef(null)   // hidden webcam source for the CV composite
  const screenStreamRef = useRef(null) // getDisplayMedia stream (recorded directly)
  const audioCtxRef = useRef(null)    // mixes mic + shared-tab audio when recording a screen
  const compositeRef = useRef(null)  // canvas we draw + record in CV / screen mode
  const pagesRef  = useRef([])       // CV pages rendered to canvases
  const scrollRef = useRef(0)        // vertical scroll offset (dest px) into the CV strip
  const scrollMaxRef = useRef(0)     // max scrollable distance, computed each frame
  const cursorRef = useRef({ x: 0, y: 0, active: false }) // highlighted pointer on the recording
  const rafRef    = useRef(0)
  const compStreamRef = useRef(null)
  const streamRef = useRef(null)
  const recRef    = useRef(null)
  const chunksRef = useRef([])
  const blobRef   = useRef(null)
  const timerRef  = useRef(null)
  const savedRef  = useRef(false)
  const cdRef     = useRef(null)

  const cameraLive = ['ready', 'countdown', 'recording', 'paused'].includes(phase)

  const stopScreen = useCallback(() => {
    if (screenStreamRef.current) screenStreamRef.current.getTracks().forEach(tr => tr.stop())
    screenStreamRef.current = null
  }, [])

  const stopStream = useCallback(() => {
    if (streamRef.current) streamRef.current.getTracks().forEach(tr => tr.stop())
    streamRef.current = null
    if (compStreamRef.current) { compStreamRef.current.getTracks().forEach(tr => tr.stop()); compStreamRef.current = null }
    stopScreen()
    if (audioCtxRef.current) { audioCtxRef.current.close().catch(() => {}); audioCtxRef.current = null }
    if (document.pictureInPictureElement) document.exitPictureInPicture().catch(() => {})
    setPipOn(false)
  }, [stopScreen])

  async function enableCamera() {
    setErrMsg('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } }, audio: true,
      })
      streamRef.current = stream
      setPhase('ready')
    } catch {
      setErrMsg(t.camErr)
      setPhase('error')
    }
  }

  function turnOffCamera() {
    stopStream()
    setPhase('consent')
  }


  // Step 2: pick a screen/window (the browser's native picker) and start
  // recording immediately. getDisplayMedia is the gesture-critical call so it
  // runs first on the click. cursor:'always' keeps the real pointer in the video.
  async function startScreenRecording() {
    let s
    try {
      s = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30, cursor: 'always' }, audio: true })
    } catch {
      return // user cancelled the picker
    }
    screenStreamRef.current = s
    // Stopping from the browser's own "Stop sharing" bar ends the take.
    const vt = s.getVideoTracks()[0]
    if (vt) vt.addEventListener('ended', onScreenEnded)
    startRecording()
  }

  function onScreenEnded() {
    stopScreen()
    if (recRef.current && recRef.current.state !== 'inactive') stopRecording()
  }

  // Float the webcam as a native picture-in-picture bubble. It floats over every
  // tab/app, so your face lands in a whole-screen recording (personality) and, on
  // Safari, its window has a built-in "return to tab" button. Must run in the
  // click's user-gesture — no `await` before requestPictureInPicture().
  async function toggleWebcamOverlay() {
    const v = pipVideoRef.current
    try {
      if (document.pictureInPictureElement) { await document.exitPictureInPicture(); return }
      if (v) await v.requestPictureInPicture()
    } catch { /* not ready / unsupported — the user can click again */ }
  }

  // Mode pill click — reset streams and go back to the start for the new mode.
  function selectMode(m) {
    if (m === mode) return
    stopStream()
    setMode(m)
    setPhase('consent')
  }

  // Clean everything up on close — no lingering camera, ever.
  useEffect(() => {
    return () => {
      clearInterval(timerRef.current); clearInterval(cdRef.current)
      cancelAnimationFrame(rafRef.current)
      stopStream()
      if (!savedRef.current && recordedUrl) URL.revokeObjectURL(recordedUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Render the CV to a real PDF (the exact document a hiring manager sees): the
  // iframe reference pane, and per-page canvases used to composite the CV into
  // the recorded video (Loom-style).
  useEffect(() => {
    let cancelled = false, url
    ;(async () => {
      try {
        const blob = await renderPdfBlob(cv, lang)
        if (cancelled) return
        url = URL.createObjectURL(blob)
        setPdfUrl(url)
        const buf = await blob.arrayBuffer()
        const pdf = await pdfjsLib.getDocument({ data: buf }).promise
        const pages = []
        for (let i = 1; i <= pdf.numPages && !cancelled; i++) {
          const page = await pdf.getPage(i)
          const vp = page.getViewport({ scale: 2 })
          const c = document.createElement('canvas')
          c.width = vp.width; c.height = vp.height
          await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise
          pages.push(c)
        }
        if (cancelled) return
        pagesRef.current = pages
      } catch { /* composite falls back to camera-only if page render fails */ }
    })()
    return () => { cancelled = true; if (url) URL.revokeObjectURL(url) }
  }, [cv, lang])

  // Attach the webcam stream to the right elements: a hidden source for the CV
  // composite, the visible self-view (screen/me), and the persistent PiP source.
  useEffect(() => {
    const el = mode === 'cv' ? camVideoRef.current : liveRef.current
    if (el && streamRef.current && cameraLive) {
      el.srcObject = streamRef.current
      el.play().catch(() => {})
    }
    // Keep the always-mounted PiP source fed + playing so the face bubble is
    // ready to pop and never goes black when the studio collapses to the pill.
    if (mode === 'screen' && cameraLive && pipVideoRef.current && streamRef.current) {
      pipVideoRef.current.srcObject = streamRef.current
      pipVideoRef.current.play().catch(() => {})
    }
  }, [phase, cameraLive, mode])

  // Keep the "Float / Hide face" label in sync with the actual PiP window.
  useEffect(() => {
    const v = pipVideoRef.current
    if (!v) return
    const on = () => setPipOn(true), off = () => setPipOn(false)
    v.addEventListener('enterpictureinpicture', on)
    v.addEventListener('leavepictureinpicture', off)
    return () => { v.removeEventListener('enterpictureinpicture', on); v.removeEventListener('leavepictureinpicture', off) }
  }, [mode, cameraLive])

  // Composite draw loop (CV mode only): the CV pages + webcam PiP on a canvas
  // that gets recorded. (Screen mode records the shared display track directly —
  // a canvas here would freeze the moment you switch to another tab.)
  useEffect(() => {
    if (mode !== 'cv' || !cameraLive) { cancelAnimationFrame(rafRef.current); return }
    const canvas = compositeRef.current
    if (!canvas) return
    canvas.width = 1280; canvas.height = 720
    scrollRef.current = 0 // start each take at the top of the CV
    const ctx = canvas.getContext('2d')
    let stop = false
    const draw = () => {
      if (stop) return
      const W = canvas.width, H = canvas.height
      ctx.fillStyle = '#14110f'; ctx.fillRect(0, 0, W, H)
      // ── Background ──
      const pages = pagesRef.current
      if (mode === 'cv' && pages.length && pages[0].width) {
        // CV pages fit-to-WIDTH, stacked into one vertical strip, scrolled by
        // scrollRef — so wheel scrolling runs through the ENTIRE CV (every page).
        const s = W / pages[0].width
        const gap = 14 // dark seam between stacked pages
        let totalH = 0
        for (const p of pages) totalH += p.height * s
        totalH += gap * (pages.length - 1)
        const maxScroll = Math.max(0, totalH - H)
        scrollMaxRef.current = maxScroll
        if (scrollRef.current > maxScroll) scrollRef.current = maxScroll
        if (scrollRef.current < 0) scrollRef.current = 0
        let yTop = -scrollRef.current
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
          const thumbY = trackY + (trackH - thumbH) * (scrollRef.current / maxScroll)
          ctx.fillStyle = 'rgba(20,17,15,0.12)'; roundRect(ctx, W - 9, trackY, 4, trackH, 2); ctx.fill()
          ctx.fillStyle = 'rgba(201,123,75,0.75)'; roundRect(ctx, W - 9, thumbY, 4, thumbH, 2); ctx.fill()
        }
      }
      const v = camVideoRef.current
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
      // Highlighted cursor (CV mode only — a shared screen already shows the
      // real cursor) so viewers follow where the candidate points on the CV.
      const cur = cursorRef.current
      if (cur.active && mode === 'cv') {
        ctx.beginPath(); ctx.arc(cur.x, cur.y, 27, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(255,179,71,0.22)'; ctx.fill()
        ctx.beginPath(); ctx.arc(cur.x, cur.y, 16, 0, Math.PI * 2)
        ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(201,123,75,0.95)'; ctx.stroke()
        ctx.beginPath(); ctx.arc(cur.x, cur.y, 5.5, 0, Math.PI * 2)
        ctx.fillStyle = '#C97B4B'; ctx.fill()
      }
      rafRef.current = requestAnimationFrame(draw)
    }
    draw()
    return () => { stop = true; cancelAnimationFrame(rafRef.current) }
  }, [mode, cameraLive])

  // Wheel over the composite scrolls the CV (captured in the recording). Native
  // listener with passive:false so we can preventDefault the page from scrolling.
  useEffect(() => {
    if (mode !== 'cv' || !cameraLive) return
    const canvas = compositeRef.current
    if (!canvas) return
    const onWheel = e => {
      e.preventDefault()
      scrollRef.current = Math.max(0, Math.min(scrollMaxRef.current, scrollRef.current + e.deltaY))
    }
    canvas.addEventListener('wheel', onWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', onWheel)
  }, [mode, cameraLive])

  // Track the pointer over the composite so the draw loop can render a
  // highlighted cursor at that spot (in the recorded canvas coordinate space).
  function onCanvasPointer(e) {
    const canvas = compositeRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    cursorRef.current = {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
      active: true,
    }
  }
  function onCanvasLeave() { cursorRef.current = { ...cursorRef.current, active: false } }

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape' && !cameraLive) onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [cameraLive, onClose])

  function startTimer() {
    clearInterval(timerRef.current)
    timerRef.current = setInterval(() => setElapsed(s => {
      const n = s + 1
      if (n >= MAX_SECONDS) stopRecording()
      return n
    }), 1000)
  }

  function beginCountdown() {
    if (phase !== 'ready') return
    setCount(3); setPhase('countdown')
    let n = 3
    cdRef.current = setInterval(() => {
      n -= 1
      if (n <= 0) { clearInterval(cdRef.current); startRecording() } else setCount(n)
    }, 1000)
  }

  function startRecording() {
    const stream = streamRef.current
    if (!stream) { setPhase('ready'); return }
    chunksRef.current = []
    let recStream = stream
    if (mode === 'cv' && compositeRef.current) {
      // Record the composite canvas (CV pages + face).
      const cs = compositeRef.current.captureStream(30)
      compStreamRef.current = cs
      recStream = new MediaStream([...cs.getVideoTracks(), ...stream.getAudioTracks()])
    } else if (mode === 'screen' && screenStreamRef.current) {
      // Record the shared display track DIRECTLY — captured live by the browser,
      // so it never freezes when you switch tabs and shows exactly what you see
      // (real cursor included). The webcam rides along as a picture-in-picture
      // bubble that lands in the frame when you share your whole screen.
      const screenTrack = screenStreamRef.current.getVideoTracks()[0]
      // Audio = mic, plus the shared tab/system audio if present (mixed via WebAudio).
      let audioTrack = stream.getAudioTracks()[0] || null
      const dispAudio = screenStreamRef.current.getAudioTracks()
      if (dispAudio.length) {
        try {
          const ac = new (window.AudioContext || window.webkitAudioContext)()
          audioCtxRef.current = ac
          const dest = ac.createMediaStreamDestination()
          if (stream.getAudioTracks().length)
            ac.createMediaStreamSource(new MediaStream(stream.getAudioTracks())).connect(dest)
          ac.createMediaStreamSource(new MediaStream(dispAudio)).connect(dest)
          audioTrack = dest.stream.getAudioTracks()[0]
        } catch { /* fall back to mic only */ }
      }
      recStream = new MediaStream([screenTrack, ...(audioTrack ? [audioTrack] : [])])
    }
    const mr = new MediaRecorder(recStream, pickMime() ? { mimeType: pickMime() } : undefined)
    mr.ondataavailable = e => { if (e.data.size) chunksRef.current.push(e.data) }
    mr.onstop = () => {
      const type = recRef.current?.mimeType || chunksRef.current[0]?.type || 'video/webm'
      const blob = new Blob(chunksRef.current, { type })
      blobRef.current = blob
      setRecordedUrl(URL.createObjectURL(blob))
      stopStream()          // camera OFF the instant recording ends
      setPhase('review')
    }
    recRef.current = mr
    mr.start(1000) // timeslice → periodic chunks, more robust for long clips
    setElapsed(0); setPhase('recording'); startTimer()
  }

  function pauseRecording() {
    if (recRef.current?.state === 'recording') { recRef.current.pause(); clearInterval(timerRef.current); setPhase('paused') }
  }
  function resumeRecording() {
    if (recRef.current?.state === 'paused') { recRef.current.resume(); startTimer(); setPhase('recording') }
  }
  function stopRecording() {
    clearInterval(timerRef.current)
    if (recRef.current && recRef.current.state !== 'inactive') recRef.current.stop()
  }

  function retake() {
    if (recordedUrl) URL.revokeObjectURL(recordedUrl)
    setRecordedUrl(null); setElapsed(0); setCueIdx(0)
    enableCamera() // re-acquire the camera for another take
  }

  async function useRecording() {
    const thumb = recordedUrl ? await makeThumb(recordedUrl) : ''
    // Try to host on Cloudflare; if not configured or it fails, keep the local
    // session clip so the recording is never lost.
    setUploadPct(0); setPhase('uploading')
    let hosted = null
    try {
      hosted = await hostRecording(blobRef.current, { durationSeconds: elapsed, onProgress: setUploadPct })
    } catch { hosted = null }
    savedRef.current = true
    onSave({
      title: t.defaultTitle, kind: 'general', placement: 'general', description: '',
      provider: hosted ? 'cloudflare' : 'local',
      assetId: hosted?.uid || '',
      playbackUrl: hosted?.playbackUrl || recordedUrl || '',
      thumbnailUrl: thumb, // local poster frame — instant and reliable
      duration: fmt(elapsed), recordedAt: new Date().toISOString(),
    })
    onClose()
  }

  // MediaRecorder blobs report duration:Infinity, which leaves the review
  // player's timeline broken and can block playback. Force the browser to
  // compute a real duration by seeking to the end and back.
  function fixMediaDuration(e) {
    const v = e.currentTarget
    if (!isFinite(v.duration) || v.duration === 0) {
      const onSeek = () => { v.removeEventListener('timeupdate', onSeek); v.currentTime = 0 }
      v.addEventListener('timeupdate', onSeek)
      v.currentTime = 1e101
    }
  }

  const busy = phase === 'recording' || phase === 'paused' || phase === 'uploading'

  const screenRec = mode === 'screen' && (phase === 'recording' || phase === 'paused')

  // Only a click on the dark backdrop BEFORE the camera is on closes the studio —
  // once you're live an accidental outside click must never shut it down.
  const closeOnBackdrop = !cameraLive && !busy

  return (
    <>
      {/* Persistent webcam source for the floating face bubble (picture-in-
          picture). Kept mounted across ready↔recording so the bubble never loses
          its feed and goes black when the studio collapses to the pill. */}
      {mode === 'screen' && cameraLive && (
        <video ref={pipVideoRef} className="studio-pip-source" autoPlay muted playsInline />
      )}

      {screenRec ? (
        // While screen-recording, collapse to a small floating pill so the studio
        // never blocks the screen you present. Your face floats above via PiP;
        // stop from here or the browser's own "Stop sharing" bar.
        <div className={`studio-pill${phase === 'paused' ? ' paused' : ''}`}>
          <span className="studio-pill-dot" />
          <span className="studio-pill-time">{fmt(elapsed)}</span>
          <span className="studio-pill-hint">{t.pillHint}</span>
          {phase === 'recording'
            ? <button className="studio-pill-btn" onClick={pauseRecording} title={t.pause}>❙❙</button>
            : <button className="studio-pill-btn" onClick={resumeRecording} title={t.resume}>▶</button>}
          <button className="studio-pill-btn studio-pill-btn--stop" onClick={stopRecording}>■ {t.stop}</button>
        </div>
      ) : (
      <div className="modal-overlay" onClick={closeOnBackdrop ? onClose : undefined}>
        <div className="studio" onClick={e => e.stopPropagation()}>

        <div className="studio-header">
          <span className="studio-title">🎬 {t.studio}</span>
          <button className="modal-close" onClick={onClose} disabled={busy}>×</button>
        </div>

        <div className="studio-body">

          {/* Left (big) — the recorded view. The CV you look at, scroll through,
              and point at IS exactly what gets recorded, with your webcam in the
              corner. One CV — no separate, disconnected reference. */}
          <div className="studio-cvpane">
            <div className={`studio-video-wrap${phase === 'recording' ? ' recording' : ''}`}>
              {phase === 'review' || phase === 'uploading' ? (
                <video className="studio-video studio-video--contain" src={recordedUrl} controls playsInline
                  preload="auto" onLoadedMetadata={fixMediaDuration} />
              ) : cameraLive ? (
                mode === 'cv' ? (
                  <>
                    {/* Full-size webcam kept on-screen BEHIND the canvas so the
                        browser doesn't throttle its decoding (which froze the
                        composite PiP after a few seconds). The opaque canvas
                        covers it. */}
                    <video ref={camVideoRef} className="studio-camunder" autoPlay muted playsInline />
                    <canvas ref={compositeRef} className="studio-video studio-video--composite"
                      onMouseMove={onCanvasPointer} onMouseLeave={onCanvasLeave} />
                  </>
                ) : mode === 'screen' ? (
                  // Camera + mic on; self-view so you can frame your face bubble.
                  <>
                    <video ref={liveRef} className="studio-video studio-video--mirror" autoPlay muted playsInline />
                    <div className="studio-screenctl">
                      {canPip ? (
                        <button className="studio-btn studio-btn--ghost" onClick={toggleWebcamOverlay}>
                          {pipOn ? t.hideFace : t.floatFace}
                        </button>
                      ) : (
                        <span className="studio-screenstatus-badge">{t.noFace}</span>
                      )}
                    </div>
                  </>
                ) : (
                  <video ref={liveRef} className="studio-video studio-video--mirror" autoPlay muted playsInline />
                )
              ) : (
                <div className="studio-consent">
                  {phase === 'error' ? (
                    <>
                      <p className="studio-consent-err">{errMsg}</p>
                      <button className="studio-btn studio-btn--primary" onClick={enableCamera}>
                        {mode === 'screen' ? `🎥 ${t.startCam}` : t.turnOn}
                      </button>
                    </>
                  ) : mode === 'screen' ? (
                    <>
                      <span className="studio-consent-icon" aria-hidden>🖥️</span>
                      <h3>{t.screenTitle}</h3>
                      <p className="studio-consent-note">{t.screenNote}</p>
                      <button className="studio-btn studio-btn--primary" onClick={enableCamera}>🎥 {t.startCam}</button>
                    </>
                  ) : (
                    <>
                      <span className="studio-consent-icon" aria-hidden>📷</span>
                      <h3>{t.consentTitle}</h3>
                      <p className="studio-consent-note">{t.consentNote}</p>
                      <button className="studio-btn studio-btn--primary" onClick={enableCamera}>{t.turnOn}</button>
                    </>
                  )}
                </div>
              )}

              {cameraLive && phase !== 'recording' && phase !== 'paused' && mode !== 'screen' && (
                <div className="studio-camtag"><span className="studio-camtag-dot" />{t.camOn}</div>
              )}
              {phase === 'countdown' && <div className="studio-count">{count}<span>{t.starts}</span></div>}
              {phase === 'uploading' && (
                <div className="studio-uploading">
                  <span className="spinner-preview" />
                  <span>{t.uploading} {Math.round(uploadPct * 100)}%</span>
                  <div className="studio-uploadbar"><div style={{ width: `${Math.round(uploadPct * 100)}%` }} /></div>
                </div>
              )}
              {(phase === 'recording' || phase === 'paused') && (
                <div className={`studio-rec${phase === 'paused' ? ' paused' : ''}`}>
                  <span className="studio-rec-dot" />
                  {phase === 'paused' ? t.paused : t.recording} {fmt(elapsed)}
                </div>
              )}
            </div>
          </div>

          {/* Right — controls + teleprompter */}
          <div className="studio-stage">

            {/* Loom-style hint: scroll the CV + highlighted cursor */}
            {mode === 'cv' && cameraLive && (
              <p className="studio-scrollhint">🖱️ {t.scrollHint}</p>
            )}
            {mode === 'screen' && cameraLive && (
              <p className="studio-scrollhint">🖥️ {t.screenHint}</p>
            )}

            {/* Portfolio / links to open, then share that tab while you present */}
            {mode === 'screen' && cameraLive && portfolioLinks.length > 0 && (
              <div className="studio-links">
                <span className="studio-links-label">{t.openLinks}</span>
                <div className="studio-links-row">
                  {portfolioLinks.map((l, i) => (
                    <a key={i} className="studio-link-pill" href={l.url} target="_blank" rel="noopener noreferrer">
                      ↗ {l.label}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* What to record: CV + face composite, or just the webcam */}
            {(phase === 'consent' || phase === 'ready') && (
              <div className="studio-mode">
                <span className="studio-mode-label">{t.recMode}</span>
                <div className="studio-mode-pills">
                  <button className={mode === 'screen' ? 'active' : ''} onClick={() => selectMode('screen')}>{t.withScreen}</button>
                  <button className={mode === 'cv' ? 'active' : ''} onClick={() => selectMode('cv')}>{t.withCv}</button>
                  <button className={mode === 'me' ? 'active' : ''} onClick={() => selectMode('me')}>{t.justMe}</button>
                </div>
              </div>
            )}

            {/* Firefox etc. can only record webm → warn about Safari viewers */}
            {!mp4Ok && (phase === 'consent' || phase === 'ready' || phase === 'error') && (
              <p className="studio-warn">⚠️ {t.mp4Warn}</p>
            )}

            {phase === 'review' && <p className="studio-review-note">{t.review} — {t.notUploaded}</p>}

            {/* Controls */}
            <div className="studio-controls">
              {phase === 'uploading' ? (
                <button className="studio-btn studio-btn--primary" disabled>
                  ↑ {t.uploading} {Math.round(uploadPct * 100)}%
                </button>
              ) : phase === 'review' ? (
                <>
                  <button className="studio-btn studio-btn--ghost" onClick={retake}>↺ {t.retake}</button>
                  <button className="studio-btn studio-btn--primary" onClick={useRecording}>✓ {t.use}</button>
                </>
              ) : phase === 'recording' ? (
                <>
                  <button className="studio-btn studio-btn--ghost" onClick={pauseRecording}>❙❙ {t.pause}</button>
                  <button className="studio-btn studio-btn--stop" onClick={stopRecording}>■ {t.stop}</button>
                </>
              ) : phase === 'paused' ? (
                <>
                  <button className="studio-btn studio-btn--primary" onClick={resumeRecording}>▶ {t.resume}</button>
                  <button className="studio-btn studio-btn--stop" onClick={stopRecording}>■ {t.stop}</button>
                </>
              ) : phase === 'ready' ? (
                <>
                  <button className="studio-btn studio-btn--ghost" onClick={turnOffCamera}>
                    {mode === 'screen' ? t.turnOffMic : t.turnOff}
                  </button>
                  {mode === 'screen'
                    ? <button className="studio-btn studio-btn--record" onClick={startScreenRecording}>🔴 {t.shareRecord}</button>
                    : <button className="studio-btn studio-btn--record" onClick={beginCountdown}>● {t.record}</button>}
                </>
              ) : null}
            </div>
          </div>
        </div>
      </div>
      </div>
      )}
    </>
  )
}
