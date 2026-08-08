import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { renderPdfBlob } from '../utils/renderPdf'
import { hostRecording } from '../utils/uploadVideo'
import { MAX_SECONDS, fmt, pickMime, canRecordMp4, makeThumb, loadPdfjs, drawComposite } from '../utils/videoStudioCore'

const T = {
  en: { studio: 'Recording studio', yourCV: 'Your CV', defaultTitle: 'Screen walkthrough', script: 'Script', cues: 'Cues — only you see these',
        consentTitle: 'Ready when you are', consentNote: 'Your camera stays off until you turn it on below. Nothing is recorded until you press Record — a red ● REC badge shows the whole time you’re recording.',
        turnOn: 'Turn on camera', turnOff: 'Turn off camera', camOn: 'Camera on', camErr: 'Could not access camera or microphone. Check browser permissions.',
        record: 'Record', pause: 'Pause', resume: 'Resume', stop: 'Stop', retake: 'Re-take', use: 'Use this recording',
        recording: 'REC', paused: 'Paused', review: 'Review your recording', target: 'Target', starts: 'Recording in',
        next: 'Next ›', prev: '‹ Prev', uploading: 'Uploading…',
        recMode: 'What to record', withScreen: '🖥️ Screen', withCv: '📄 CV walkthrough', justMe: '👤 Just me', page: 'Page',
        openLinks: 'Open a link to present',
        pillHint: 'Tip: finish anytime from your browser’s stop-screen-sharing control — it ends the take and brings you back here for keep/re-take. To pause, return to this tab.',
        startCam: 'Turn on camera & mic', turnOffMic: 'Turn off camera', shareRecord: 'Share a window or screen & record',
        startMic: 'Turn on microphone', micOnTitle: 'Microphone on', micOnNote: 'Share a window or your whole screen to start — your voice records with it.',
        floatFace: '📹 Float my face', hideFace: '📹 Hide face bubble',
        noFace: 'This browser records screen + voice (no face bubble). Finish from your browser’s “Stop sharing” control; switch back to this tab to pause.',
        floatFaceHint: 'This bubble floats on top of every tab and app — your face lands in the recording, and its ⧉ button brings you back here to pause or stop.',
        faceFloatingHint: 'Your face is floating. Its ⧉ button brings you back to this tab anytime to pause or stop.',
        recordHint: 'Pick a window or your whole screen, then talk through your best work out loud. To finish: come back to this tab (its title shows 🔴) and click Stop — or use your browser’s stop-sharing control.',
        floatFirst: 'Float your face first (step 1) so it shows in the recording.',
        openRecorder: 'Recorder', minimize: 'Minimise',
        micErr: 'Could not access your camera or microphone. Check browser permissions.',
        screenTitle: 'Record your screen — showcase your best work',
        screenNote: 'Turn on your microphone, then share a window or your whole screen and walk through your best work out loud: open your GitHub and show the code, open the live site, and say what you built, your role and the impact.',
        screenReadyTitle: 'Ready', screenReadyNote: '',
        screenHint: 'Float your face (bottom-right), share your WHOLE screen, then move freely between GitHub, the live site and your portfolio as you talk. On Safari the face bubble has a ⧉ button to jump back here.',
        scrollHint: 'Scroll over your CV to move through it while you talk — your cursor is highlighted so viewers follow along.',
        mp4Warn: 'Heads up: your browser records in a format that may not play for viewers on Safari. For best compatibility, record in Chrome, Edge, or Safari.',
        nameLabel: 'Name this video — this is what shows on your CV', namePlaceholder: 'e.g. “Why I fit this frontend role”',
        notUploaded: 'Saved to this session only (video hosting isn’t set up yet).',
        recTabTitle: '🔴 Recording — open this tab to Stop' },
  no: { studio: 'Innspillingsstudio', yourCV: 'Din CV', defaultTitle: 'Skjermgjennomgang', script: 'Manus', cues: 'Stikkord — kun du ser disse',
        consentTitle: 'Klar når du er', consentNote: 'Kameraet er av til du slår det på nedenfor. Ingenting tas opp før du trykker Ta opp — et rødt ● REC-merke vises hele tiden mens du tar opp.',
        turnOn: 'Slå på kamera', turnOff: 'Slå av kamera', camOn: 'Kamera på', camErr: 'Fikk ikke tilgang til kamera eller mikrofon. Sjekk tillatelser.',
        record: 'Ta opp', pause: 'Pause', resume: 'Fortsett', stop: 'Stopp', retake: 'Ta opp på nytt', use: 'Bruk dette opptaket',
        recording: 'REC', paused: 'Pauset', review: 'Se gjennom opptaket', target: 'Mål', starts: 'Opptak om',
        next: 'Neste ›', prev: '‹ Forrige', uploading: 'Laster opp…',
        recMode: 'Hva skal tas opp', withScreen: '🖥️ Skjerm', withCv: '📄 CV-gjennomgang', justMe: '👤 Bare meg', page: 'Side',
        openLinks: 'Åpne en lenke å presentere',
        pillHint: 'Tips: avslutt når som helst fra nettleserens «stopp deling» — opptaket avsluttes og du kommer tilbake hit for å beholde/ta på nytt. For å pause, gå tilbake til denne fanen.',
        startCam: 'Slå på kamera og mikrofon', turnOffMic: 'Slå av kamera', shareRecord: 'Del et vindu eller skjerm og ta opp',
        startMic: 'Slå på mikrofon', micOnTitle: 'Mikrofon på', micOnNote: 'Del et vindu eller hele skjermen for å starte — stemmen din tas opp sammen med den.',
        floatFace: '📹 Vis ansiktet mitt', hideFace: '📹 Skjul ansikts-boble',
        noFace: 'Denne nettleseren tar opp skjerm + stemme (uten ansikts-boble). Avslutt fra nettleserens «Stopp deling»; bytt tilbake til denne fanen for å pause.',
        floatFaceHint: 'Denne boblen flyter over alle faner og apper — ansiktet ditt havner i opptaket, og ⧉-knappen tar deg tilbake hit for å pause eller stoppe.',
        faceFloatingHint: 'Ansiktet ditt flyter. ⧉-knappen tar deg tilbake til denne fanen når som helst for å pause eller stoppe.',
        recordHint: 'Velg et vindu eller hele skjermen, og snakk deg gjennom ditt beste arbeid høyt. For å avslutte: gå tilbake til denne fanen (tittelen viser 🔴) og klikk Stopp — eller bruk nettleserens «stopp deling».',
        floatFirst: 'Vis ansiktet ditt først (steg 1) så det vises i opptaket.',
        openRecorder: 'Opptaker', minimize: 'Minimer',
        micErr: 'Fikk ikke tilgang til kamera eller mikrofon. Sjekk tillatelser i nettleseren.',
        screenTitle: 'Ta opp skjermen — vis frem ditt beste arbeid',
        screenNote: 'Slå på mikrofonen, del så et vindu eller hele skjermen og gå gjennom ditt beste arbeid høyt: åpne GitHub og vis koden, åpne den live siden, og si hva du bygde, din rolle og effekten.',
        screenReadyTitle: 'Klar', screenReadyNote: '',
        screenHint: 'La ansiktet flyte (nederst til høyre), del HELE skjermen, og beveg deg fritt mellom GitHub, live side og portefølje mens du snakker. På Safari har ansikts-boblen en ⧉-knapp for å hoppe tilbake hit.',
        scrollHint: 'Bla over CV-en for å bevege deg gjennom den mens du snakker — markøren din er uthevet så seerne følger med.',
        mp4Warn: 'Merk: nettleseren din tar opp i et format som kanskje ikke spilles av for seere på Safari. For best kompatibilitet, ta opp i Chrome, Edge eller Safari.',
        nameLabel: 'Gi videoen et navn — dette vises på CV-en din', namePlaceholder: 'f.eks. «Derfor passer jeg til frontend-rollen»',
        notUploaded: 'Lagret kun for denne økten (videohosting er ikke satt opp ennå).',
        recTabTitle: '🔴 Tar opp — åpne denne fanen for å stoppe' },
  es: { studio: 'Estudio de grabación', yourCV: 'Tu CV', defaultTitle: 'Recorrido de pantalla', script: 'Guion', cues: 'Notas — solo tú las ves',
        consentTitle: 'Cuando quieras', consentNote: 'La cámara está apagada hasta que la enciendas abajo. No se graba nada hasta que pulses Grabar — verás una insignia roja ● REC todo el tiempo que grabes.',
        turnOn: 'Encender cámara', turnOff: 'Apagar cámara', camOn: 'Cámara encendida', camErr: 'No se pudo acceder a la cámara o el micrófono. Revisa los permisos.',
        record: 'Grabar', pause: 'Pausar', resume: 'Reanudar', stop: 'Detener', retake: 'Regrabar', use: 'Usar esta grabación',
        recording: 'REC', paused: 'En pausa', review: 'Revisa tu grabación', target: 'Objetivo', starts: 'Grabando en',
        next: 'Siguiente ›', prev: '‹ Anterior', uploading: 'Subiendo…',
        recMode: 'Qué grabar', withScreen: '🖥️ Pantalla', withCv: '📄 Recorrido del CV', justMe: '👤 Solo yo', page: 'Página',
        openLinks: 'Abre un enlace para presentar',
        pillHint: 'Consejo: termina cuando quieras desde el control «dejar de compartir» del navegador — finaliza la toma y vuelves aquí para conservar/regrabar. Para pausar, vuelve a esta pestaña.',
        startCam: 'Activar cámara y micrófono', turnOffMic: 'Apagar cámara', shareRecord: 'Compartir una ventana o pantalla y grabar',
        startMic: 'Activar micrófono', micOnTitle: 'Micrófono activado', micOnNote: 'Comparte una ventana o toda tu pantalla para empezar — tu voz se graba con ella.',
        floatFace: '📹 Mostrar mi cara', hideFace: '📹 Ocultar burbuja',
        noFace: 'Este navegador graba pantalla + voz (sin burbuja de cara). Termina desde el control «Dejar de compartir» del navegador; vuelve a esta pestaña para pausar.',
        floatFaceHint: 'Esta burbuja flota sobre todas las pestañas y apps — tu cara sale en la grabación, y su botón ⧉ te trae de vuelta aquí para pausar o detener.',
        faceFloatingHint: 'Tu cara está flotando. Su botón ⧉ te trae de vuelta a esta pestaña cuando quieras para pausar o detener.',
        recordHint: 'Elige una ventana o toda tu pantalla y explica tu mejor trabajo en voz alta. Para terminar: vuelve a esta pestaña (su título muestra 🔴) y haz clic en Detener — o usa «dejar de compartir» del navegador.',
        floatFirst: 'Muestra tu cara primero (paso 1) para que salga en la grabación.',
        openRecorder: 'Grabadora', minimize: 'Minimizar',
        micErr: 'No se pudo acceder a la cámara o el micrófono. Revisa los permisos del navegador.',
        screenTitle: 'Graba tu pantalla — muestra tu mejor trabajo',
        screenNote: 'Activa tu micrófono, luego comparte una ventana o toda tu pantalla y recorre tu mejor trabajo en voz alta: abre tu GitHub y muestra el código, abre el sitio en vivo, y di qué construiste, tu rol y el impacto.',
        screenReadyTitle: 'Listo', screenReadyNote: '',
        screenHint: 'Haz flotar tu cara (abajo a la derecha), comparte TODA la pantalla y muévete libremente entre GitHub, el sitio en vivo y tu portafolio mientras hablas. En Safari la burbuja tiene un botón ⧉ para volver aquí.',
        scrollHint: 'Desplázate sobre tu CV para recorrerlo mientras hablas — tu cursor se resalta para que los espectadores te sigan.',
        mp4Warn: 'Aviso: tu navegador graba en un formato que puede no reproducirse para quienes usan Safari. Para mayor compatibilidad, graba en Chrome, Edge o Safari.',
        nameLabel: 'Nombra este vídeo — es lo que aparece en tu CV', namePlaceholder: 'p. ej. «Por qué encajo en este puesto de frontend»',
        notUploaded: 'Guardado solo para esta sesión (el alojamiento de vídeo aún no está configurado).',
        recTabTitle: '🔴 Grabando — abre esta pestaña para Detener' },
}

// A red-dot favicon shown while recording so the recorder tab stands out in the
// tab bar even when it's inactive/narrow (where the title text is hidden). Safari
// often ignores data-URI favicon changes, so we prefer an object URL (a "real"
// resource, which Safari is more willing to repaint) and pre-build it; the PNG
// data URI is the fallback (fine on Chrome/Edge/Firefox).
let _recIconData = null // synchronous PNG data URI
let _recIconObj = null  // async object URL (preferred, esp. Safari)
function buildRecIcon() {
  if (_recIconData != null) return
  try {
    const c = document.createElement('canvas')
    c.width = 32; c.height = 32
    const ctx = c.getContext('2d')
    ctx.fillStyle = '#e5484d'
    ctx.beginPath(); ctx.arc(16, 16, 13, 0, Math.PI * 2); ctx.fill()
    _recIconData = c.toDataURL('image/png')
    c.toBlob(b => { if (b) _recIconObj = URL.createObjectURL(b) }, 'image/png')
  } catch { _recIconData = '' }
}
function recIconHref() { buildRecIcon(); return _recIconObj || _recIconData || '' }

export default function VideoStudioModal({ cv = {}, lang = 'en', branding, filename = 'cv', onClose, onSave }) {
  const t = T[lang] || T.en
  const mp4Ok = canRecordMp4()
  // Links from the CV to open and share while presenting (screen mode).
  const portfolioLinks = (cv.portfolio || [])
    .filter(p => p && p.url)
    .map(p => ({ url: p.url, label: p.label || p.url }))

  const [phase, setPhase]       = useState('consent') // consent | ready | countdown | recording | paused | review | error
  const [count, setCount]       = useState(3)
  const [elapsed, setElapsed]   = useState(0)
  const [recordedUrl, setRecordedUrl] = useState(null)
  const [reviewPoster, setReviewPoster] = useState('') // poster frame for the review player
  const [videoName, setVideoName] = useState('') // explicit name entered at the review step
  const [errMsg, setErrMsg]     = useState('')
  const [pdfUrl, setPdfUrl]     = useState(null)
  const [uploadPct, setUploadPct] = useState(0)
  const [mode, setMode]         = useState('screen') // 'screen' = screen + voice (default), 'cv' = CV composite, 'me' = webcam only

  const liveRef   = useRef(null)     // webcam self-view ("just me" mode)
  const camVideoRef = useRef(null)   // hidden webcam source for the CV composite
  const screenStreamRef = useRef(null) // getDisplayMedia stream (recorded directly)
  const audioCtxRef = useRef(null)    // mixes mic + shared-tab audio when recording a screen
  const compositeRef = useRef(null)  // canvas we draw + record in CV / screen mode
  const recCloneRef = useRef(null)   // cloned cam/mic tracks recorded in "just me" mode
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
    // Cloned recording tracks ("just me" mode) are independent of the preview's
    // camera/mic, so stopStream() must stop them too or the camera stays live.
    if (recCloneRef.current) { recCloneRef.current.getTracks().forEach(tr => tr.stop()); recCloneRef.current = null }
    stopScreen()
    if (audioCtxRef.current) { audioCtxRef.current.close().catch(() => {}); audioCtxRef.current = null }
  }, [stopScreen])

  async function enableCamera() {
    setErrMsg('')
    try {
      // Screen mode records your screen + voice only (no webcam), so it just needs
      // the microphone. CV / "just me" modes need the camera too.
      const constraints = mode === 'screen'
        ? { audio: true }
        : { video: { width: { ideal: 1280 }, height: { ideal: 720 } }, audio: true }
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
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
    // Stopping from the browser's own "Stop sharing" control ends the take.
    const vt = s.getVideoTracks()[0]
    if (vt) vt.addEventListener('ended', onScreenEnded)
    startRecording()
  }

  function onScreenEnded() {
    stopScreen()
    if (recRef.current && recRef.current.state !== 'inactive') stopRecording()
  }

  // (The "open a clean CV in a tab" preview — web share link + PDF — was removed
  // to keep the flow simple; screen mode now just records whatever windows/tabs
  // you share. That code lives in git history if we want it back.)

  // Mode pill click — reset streams and go back to the start for the new mode.
  function selectMode(m) {
    if (m === mode) return
    stopStream()
    setMode(m)
    setPhase('consent')
  }

  // Clean everything up on close — no lingering camera, ever. Also pre-build the
  // recording favicon so its object URL is ready before the first recording.
  useEffect(() => {
    buildRecIcon()
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
        const blob = await renderPdfBlob(cv, lang, branding)
        if (cancelled) return
        url = URL.createObjectURL(blob)
        setPdfUrl(url)
        const buf = await blob.arrayBuffer()
        const pdfjsLib = await loadPdfjs()
        if (cancelled) return
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
  }, [cv, lang, branding])

  // Attach the webcam stream to the visible element for the modes that show it:
  // the hidden source for the CV composite, or the self-view in "just me" mode.
  // (Screen mode has no webcam — it records the shared screen + your voice.)
  useEffect(() => {
    const el = mode === 'cv' ? camVideoRef.current : liveRef.current
    if (mode !== 'screen' && el && streamRef.current && cameraLive) {
      el.srcObject = streamRef.current
      el.play().catch(() => {})
    }
  }, [phase, cameraLive, mode])

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
      const maxScroll = drawComposite(ctx, {
        W: canvas.width, H: canvas.height,
        pages: pagesRef.current,
        scroll: scrollRef.current,
        camVideo: camVideoRef.current,
        showCursor: true,
        cursor: cursorRef.current,
      })
      scrollMaxRef.current = maxScroll
      if (scrollRef.current > maxScroll) scrollRef.current = maxScroll
      if (scrollRef.current < 0) scrollRef.current = 0
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

  // While recording, flag the recorder tab with a red-dot favicon + title so it's
  // easy to spot and come back to among many tabs when sharing your whole screen
  // — the in-app Stop lives on this tab. The favicon shows even on narrow inactive
  // tabs where the title text is hidden. Both restored when recording ends.
  useEffect(() => {
    if (phase !== 'recording' && phase !== 'paused') return
    const prevTitle = document.title
    document.title = t.recTabTitle

    // Replace the icon link element (Safari re-reads a fresh node far more
    // reliably than an href mutation). Pull the originals, drop in a red-dot PNG.
    const originals = Array.from(document.querySelectorAll("link[rel~='icon']"))
    originals.forEach(l => l.remove())
    const link = document.createElement('link')
    link.rel = 'icon'; link.type = 'image/png'; link.href = recIconHref()
    document.head.appendChild(link)

    return () => {
      document.title = prevTitle
      link.remove()
      originals.forEach(l => document.head.appendChild(l))
    }
  }, [phase, t.recTabTitle])

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
    } else {
      // "Just me" (raw webcam). Record CLONED camera + mic tracks, not the live
      // tracks that are attached to the visible preview <video>. The browser
      // throttles the decode pipeline of an on-screen camera element (see the CV
      // composite note above), which starved the recorder of frames — the clip
      // came out black, and a black/malformed clip also swallowed the mic audio
      // on playback. Cloned tracks are independent sinks not gated by the preview
      // element, so both video and voice record. stopStream() stops these clones.
      recStream = new MediaStream([
        ...stream.getVideoTracks().map(tr => tr.clone()),
        ...stream.getAudioTracks().map(tr => tr.clone()),
      ])
      recCloneRef.current = recStream
    }
    if (!recStream.getAudioTracks().length) console.warn('[studio] recording stream has no audio track')
    const mr = new MediaRecorder(recStream, pickMime() ? { mimeType: pickMime() } : undefined)
    mr.ondataavailable = e => { if (e.data.size) chunksRef.current.push(e.data) }
    mr.onstop = () => {
      const type = recRef.current?.mimeType || chunksRef.current[0]?.type || 'video/webm'
      const blob = new Blob(chunksRef.current, { type })
      blobRef.current = blob
      const url = URL.createObjectURL(blob)
      setRecordedUrl(url)
      // Generate a poster frame off a detached element (a safe, in-range seek) so
      // the review player shows a real frame instead of a black one. The player
      // itself stays a plain <video> — seeking the live element wedged these
      // MediaRecorder MP4 blobs black.
      setReviewPoster('')
      makeThumb(url).then(setReviewPoster)
      stopStream()          // camera OFF the instant recording ends
      // Bring the recorder tab forward so keep/retake is right there, even when
      // the take was ended from the browser's Stop-sharing bar on another tab.
      // Best-effort: a backgrounded tab may not be allowed to focus itself.
      try { window.focus() } catch { /* focus may be denied */ }
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
    setRecordedUrl(null); setReviewPoster(''); setElapsed(0)
    enableCamera() // re-acquire the mic/camera for another take
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
      title: videoName.trim() || t.defaultTitle, kind: 'general', description: '',
      provider: hosted ? 'cloudflare' : 'local',
      assetId: hosted?.uid || '',
      playbackUrl: hosted?.playbackUrl || recordedUrl || '',
      thumbnailUrl: thumb, // local poster frame — instant and reliable
      duration: fmt(elapsed), recordedAt: new Date().toISOString(),
    })
    onClose()
  }

  const busy = phase === 'recording' || phase === 'paused' || phase === 'uploading'

  // While screen-recording, the studio collapses to a small bottom-left operator
  // (no pause — finish with the browser's own Stop-sharing control).
  const showPill = mode === 'screen' && phase === 'recording'

  // Only a click on the dark backdrop BEFORE the camera is on closes the studio —
  // once you're live an accidental outside click must never shut it down.
  const closeOnBackdrop = !cameraLive && !busy

  return (
    <>
      {showPill ? (
        // Screen recording: a small bottom-left operator that never blocks the
        // screen you present. Finish from here or (from any window) the browser's
        // own Stop-sharing control. Portaled to <body> so it sits above the export
        // footer (a taller footer, e.g. with the share-link bar, can't cover it).
        createPortal(
          <div className="studio-pill">
            <div className="studio-pill-row">
              <span className="studio-pill-dot" />
              <span className="studio-pill-time">{fmt(elapsed)}</span>
              <span className="studio-pill-state">{t.recording}</span>
              <button className="studio-pill-btn studio-pill-btn--stop" onClick={stopRecording}>■ {t.stop}</button>
            </div>
            <p className="studio-pill-help">{t.pillHint}</p>
          </div>,
          document.body,
        )
      ) : (
      <div className="modal-overlay" onClick={closeOnBackdrop ? onClose : undefined}>
        <div className={`studio${mode === 'cv' ? ' studio--cv' : ''}`} onClick={e => e.stopPropagation()}>

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
                  preload="auto" poster={reviewPoster || undefined} />
              ) : cameraLive ? (
                mode === 'cv' ? (
                  <>
                    {/* Full-size webcam kept on-screen BEHIND the canvas so the
                        browser doesn't throttle its decoding (which froze the
                        composite PiP after a few seconds). The opaque canvas
                        covers it. */}
                    <video ref={camVideoRef} className="studio-camunder" autoPlay muted playsInline
                      onLoadedMetadata={e => e.currentTarget.play().catch(() => {})} />
                    <canvas ref={compositeRef} className="studio-video studio-video--composite"
                      onMouseMove={onCanvasPointer} onMouseLeave={onCanvasLeave} />
                  </>
                ) : mode === 'screen' ? (
                  // Screen mode has no webcam — a simple placeholder while you get
                  // ready to pick a window/screen to share.
                  <div className="studio-consent">
                    <span className="studio-consent-icon" aria-hidden>🎤</span>
                    <h3>{t.micOnTitle}</h3>
                    <p className="studio-consent-note">{t.micOnNote}</p>
                  </div>
                ) : (
                  <video ref={liveRef} className="studio-video studio-video--mirror" autoPlay muted playsInline
                    onLoadedMetadata={e => e.currentTarget.play().catch(() => {})} />
                )
              ) : (
                <div className="studio-consent">
                  {phase === 'error' ? (
                    <>
                      <p className="studio-consent-err">{errMsg}</p>
                      <button className="studio-btn studio-btn--primary" onClick={enableCamera}>
                        {mode === 'screen' ? `🎤 ${t.startMic}` : t.turnOn}
                      </button>
                    </>
                  ) : mode === 'screen' ? (
                    <>
                      <span className="studio-consent-icon" aria-hidden>🖥️</span>
                      <h3>{t.screenTitle}</h3>
                      <p className="studio-consent-note">{t.screenNote}</p>
                      <button className="studio-btn studio-btn--primary" onClick={enableCamera}>🎤 {t.startMic}</button>
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
            {/* Screen mode ready: one button. Pick a window or screen and record;
                finish with the browser's own Stop-sharing control. */}
            {mode === 'screen' && phase === 'ready' && (
              <div className="studio-screenready">
                <button className="studio-btn studio-btn--record" onClick={startScreenRecording}>
                  🔴 {t.shareRecord}
                </button>
                <p className="studio-step-hint">{t.recordHint}</p>
              </div>
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

            {phase === 'review' && (
              <div className="studio-nameblock">
                <label className="studio-namelabel" htmlFor="studio-videoname">{t.nameLabel}</label>
                <input
                  id="studio-videoname" className="studio-nameinput" type="text"
                  value={videoName} onChange={e => setVideoName(e.target.value)}
                  placeholder={t.namePlaceholder} autoFocus maxLength={80}
                />
                <p className="studio-review-note">{t.notUploaded}</p>
              </div>
            )}

            {/* Controls */}
            <div className="studio-controls">
              {phase === 'uploading' ? (
                <button className="studio-btn studio-btn--primary" disabled>
                  ↑ {t.uploading} {Math.round(uploadPct * 100)}%
                </button>
              ) : phase === 'review' ? (
                <>
                  <button className="studio-btn studio-btn--ghost" onClick={retake}>↺ {t.retake}</button>
                  <button className="studio-btn studio-btn--primary" onClick={useRecording} disabled={!videoName.trim()}>✓ {t.use}</button>
                </>
              ) : phase === 'recording' ? (
                // CV / "just me" modes record in-studio, so pause/stop live here.
                // (Screen mode collapses to the operator pill, not this modal.)
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
                // Screen mode's record button lives in the step above, so here we
                // only offer "turn off mic". CV / me modes keep the countdown
                // record button alongside it.
                mode === 'screen' ? (
                  <button className="studio-btn studio-btn--ghost" onClick={turnOffCamera}>{t.turnOff}</button>
                ) : (
                  <>
                    <button className="studio-btn studio-btn--ghost" onClick={turnOffCamera}>{t.turnOff}</button>
                    <button className="studio-btn studio-btn--record" onClick={beginCountdown}>● {t.record}</button>
                  </>
                )
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
