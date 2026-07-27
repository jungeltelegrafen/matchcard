import { useState, useRef, useEffect, useCallback } from 'react'
import { renderPdfBlob } from '../utils/renderPdf'

// ── Teleprompter scripts (private cues, per language) ────────────────────────
// Selecting a script pre-fills the saved card's title/kind/placement. The cues
// are shown only on the recorder's screen — MediaRecorder captures the camera
// stream, never this overlay, so they never appear in the video.
const SCRIPTS = {
  en: [
    { id: 'intro', title: 'Introduction', kind: 'intro', placement: 'intro', target: 60,
      cues: ['Who you are and your current role', 'Your core strengths in one line', 'One standout achievement', 'What you want to do next'] },
    { id: 'match', title: 'Why I fit this role', kind: 'match', placement: 'general', target: 90,
      cues: ['The role you’re applying for', 'Your most relevant experience', 'A concrete, measurable result', 'Why you’re a strong match'] },
    { id: 'motivation', title: 'My motivation', kind: 'motivation', placement: 'motivation', target: 60,
      cues: ['Why this company or mission excites you', 'What drives you in your work', 'Where you want to grow'] },
  ],
  no: [
    { id: 'intro', title: 'Introduksjon', kind: 'intro', placement: 'intro', target: 60,
      cues: ['Hvem du er og din nåværende rolle', 'Dine sterkeste sider i én setning', 'Én fremragende prestasjon', 'Hva du vil gjøre videre'] },
    { id: 'match', title: 'Hvorfor jeg passer', kind: 'match', placement: 'general', target: 90,
      cues: ['Rollen du søker på', 'Din mest relevante erfaring', 'Et konkret, målbart resultat', 'Hvorfor du passer godt'] },
    { id: 'motivation', title: 'Min motivasjon', kind: 'motivation', placement: 'motivation', target: 60,
      cues: ['Hvorfor selskapet eller oppdraget engasjerer deg', 'Hva som driver deg i arbeidet', 'Hvor du vil vokse'] },
  ],
  es: [
    { id: 'intro', title: 'Introducción', kind: 'intro', placement: 'intro', target: 60,
      cues: ['Quién eres y tu puesto actual', 'Tus puntos fuertes en una frase', 'Un logro destacado', 'Qué quieres hacer a continuación'] },
    { id: 'match', title: 'Por qué encajo en el puesto', kind: 'match', placement: 'general', target: 90,
      cues: ['El puesto al que te presentas', 'Tu experiencia más relevante', 'Un resultado concreto y medible', 'Por qué eres un buen candidato'] },
    { id: 'motivation', title: 'Mi motivación', kind: 'motivation', placement: 'motivation', target: 60,
      cues: ['Por qué te ilusiona la empresa o el proyecto', 'Qué te impulsa en tu trabajo', 'Dónde quieres crecer'] },
  ],
}

const T = {
  en: { studio: 'Recording studio', yourCV: 'Your CV', script: 'Script', cues: 'Cues — only you see these',
        consentTitle: 'Ready when you are', consentNote: 'Your camera stays off until you turn it on below. Nothing is recorded until you press Record — a red ● REC badge shows the whole time you’re recording.',
        turnOn: 'Turn on camera', turnOff: 'Turn off camera', camOn: 'Camera on', camErr: 'Could not access camera or microphone. Check browser permissions.',
        record: 'Record', pause: 'Pause', resume: 'Resume', stop: 'Stop', retake: 'Re-take', use: 'Use this recording',
        recording: 'REC', paused: 'Paused', review: 'Review your recording', target: 'Target', starts: 'Recording in',
        next: 'Next ›', prev: '‹ Prev', notUploaded: 'Saved to this session. Hosting (so it plays for others) comes next.' },
  no: { studio: 'Innspillingsstudio', yourCV: 'Din CV', script: 'Manus', cues: 'Stikkord — kun du ser disse',
        consentTitle: 'Klar når du er', consentNote: 'Kameraet er av til du slår det på nedenfor. Ingenting tas opp før du trykker Ta opp — et rødt ● REC-merke vises hele tiden mens du tar opp.',
        turnOn: 'Slå på kamera', turnOff: 'Slå av kamera', camOn: 'Kamera på', camErr: 'Fikk ikke tilgang til kamera eller mikrofon. Sjekk tillatelser.',
        record: 'Ta opp', pause: 'Pause', resume: 'Fortsett', stop: 'Stopp', retake: 'Ta opp på nytt', use: 'Bruk dette opptaket',
        recording: 'REC', paused: 'Pauset', review: 'Se gjennom opptaket', target: 'Mål', starts: 'Opptak om',
        next: 'Neste ›', prev: '‹ Forrige', notUploaded: 'Lagret for denne økten. Hosting (så andre kan se) kommer snart.' },
  es: { studio: 'Estudio de grabación', yourCV: 'Tu CV', script: 'Guion', cues: 'Notas — solo tú las ves',
        consentTitle: 'Cuando quieras', consentNote: 'La cámara está apagada hasta que la enciendas abajo. No se graba nada hasta que pulses Grabar — verás una insignia roja ● REC todo el tiempo que grabes.',
        turnOn: 'Encender cámara', turnOff: 'Apagar cámara', camOn: 'Cámara encendida', camErr: 'No se pudo acceder a la cámara o el micrófono. Revisa los permisos.',
        record: 'Grabar', pause: 'Pausar', resume: 'Reanudar', stop: 'Detener', retake: 'Regrabar', use: 'Usar esta grabación',
        recording: 'REC', paused: 'En pausa', review: 'Revisa tu grabación', target: 'Objetivo', starts: 'Grabando en',
        next: 'Siguiente ›', prev: '‹ Anterior', notUploaded: 'Guardado para esta sesión. El alojamiento (para que otros lo vean) llega pronto.' },
}

const MAX_SECONDS = 300 // hard cap so a recording can never run silently forever

function fmt(sec) {
  const m = Math.floor(sec / 60), s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function pickMime() {
  const opts = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4']
  return opts.find(m => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m)) || ''
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
  const scripts = SCRIPTS[lang] || SCRIPTS.en

  const [scriptId, setScriptId] = useState(scripts[0].id)
  const [phase, setPhase]       = useState('consent') // consent | ready | countdown | recording | paused | review | error
  const [count, setCount]       = useState(3)
  const [elapsed, setElapsed]   = useState(0)
  const [cueIdx, setCueIdx]     = useState(0)
  const [recordedUrl, setRecordedUrl] = useState(null)
  const [errMsg, setErrMsg]     = useState('')
  const [pdfUrl, setPdfUrl]     = useState(null)

  const liveRef   = useRef(null)
  const streamRef = useRef(null)
  const recRef    = useRef(null)
  const chunksRef = useRef([])
  const timerRef  = useRef(null)
  const savedRef  = useRef(false)
  const cdRef     = useRef(null)

  const script = scripts.find(s => s.id === scriptId) || scripts[0]
  const cameraLive = ['ready', 'countdown', 'recording', 'paused'].includes(phase)

  const stopStream = useCallback(() => {
    if (streamRef.current) streamRef.current.getTracks().forEach(tr => tr.stop())
    streamRef.current = null
  }, [])

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

  // Clean everything up on close — no lingering camera, ever.
  useEffect(() => {
    return () => {
      clearInterval(timerRef.current); clearInterval(cdRef.current)
      stopStream()
      if (!savedRef.current && recordedUrl) URL.revokeObjectURL(recordedUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Render the CV to a real PDF (the exact document a hiring manager sees) for
  // the reference pane — accurate and legible.
  useEffect(() => {
    let cancelled = false, url
    renderPdfBlob(cv, lang).then(blob => {
      if (cancelled) return
      url = URL.createObjectURL(blob)
      setPdfUrl(url)
    }).catch(() => {})
    return () => { cancelled = true; if (url) URL.revokeObjectURL(url) }
  }, [cv, lang])

  // Keep the live feed attached whenever the camera is live.
  useEffect(() => {
    if (liveRef.current && streamRef.current && cameraLive) liveRef.current.srcObject = streamRef.current
  }, [phase, cameraLive])

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape' && phase !== 'recording' && phase !== 'paused') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [phase, onClose])

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
    setCueIdx(0); setCount(3); setPhase('countdown')
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
    const mr = new MediaRecorder(stream, pickMime() ? { mimeType: pickMime() } : undefined)
    mr.ondataavailable = e => { if (e.data.size) chunksRef.current.push(e.data) }
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: chunksRef.current[0]?.type || 'video/webm' })
      setRecordedUrl(URL.createObjectURL(blob))
      stopStream()          // camera OFF the instant recording ends
      setPhase('review')
    }
    recRef.current = mr
    mr.start()
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
    savedRef.current = true
    onSave({
      title: script.title, kind: script.kind, placement: script.placement, description: '',
      provider: 'local', assetId: '', playbackUrl: recordedUrl || '', thumbnailUrl: thumb,
      duration: fmt(elapsed), recordedAt: new Date().toISOString(),
    })
    onClose()
  }

  const busy = phase === 'recording' || phase === 'paused'

  return (
    <div className="modal-overlay" onClick={busy ? undefined : onClose}>
      <div className="studio" onClick={e => e.stopPropagation()}>

        <div className="studio-header">
          <span className="studio-title">🎬 {t.studio}</span>
          <button className="modal-close" onClick={onClose} disabled={busy}>×</button>
        </div>

        <div className="studio-body">

          {/* Left — the CV as its real PDF (exactly what a hiring manager sees) */}
          <div className="studio-cvpane">
            {pdfUrl ? (
              <iframe
                className="studio-pdf"
                src={`${pdfUrl}#toolbar=0&navpanes=0&view=FitH`}
                title={t.yourCV}
              />
            ) : (
              <div className="studio-pdf-loading"><span className="spinner-preview" /></div>
            )}
          </div>

          {/* Right — camera + teleprompter */}
          <div className="studio-stage">
            <div className={`studio-video-wrap${phase === 'recording' ? ' recording' : ''}`}>
              {phase === 'review' ? (
                <video className="studio-video" src={recordedUrl} controls playsInline />
              ) : cameraLive ? (
                <video ref={liveRef} className="studio-video studio-video--mirror" autoPlay muted playsInline />
              ) : (
                <div className="studio-consent">
                  {phase === 'error' ? (
                    <>
                      <p className="studio-consent-err">{errMsg}</p>
                      <button className="studio-btn studio-btn--primary" onClick={enableCamera}>{t.turnOn}</button>
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

              {cameraLive && phase !== 'recording' && phase !== 'paused' && (
                <div className="studio-camtag"><span className="studio-camtag-dot" />{t.camOn}</div>
              )}
              {phase === 'countdown' && <div className="studio-count">{count}<span>{t.starts}</span></div>}
              {(phase === 'recording' || phase === 'paused') && (
                <div className={`studio-rec${phase === 'paused' ? ' paused' : ''}`}>
                  <span className="studio-rec-dot" />
                  {phase === 'paused' ? t.paused : t.recording} {fmt(elapsed)}
                  <span className="studio-rec-target"> / {t.target} {fmt(script.target)}</span>
                </div>
              )}
            </div>

            {/* Private teleprompter — below the camera, readable, only you see it */}
            {(phase === 'recording' || phase === 'paused') && (
              <div className="studio-teleprompt">
                <span className="studio-tp-label">{t.cues}</span>
                <p className="studio-tp-current">{script.cues[cueIdx]}</p>
                {script.cues[cueIdx + 1] && <p className="studio-tp-next">{script.cues[cueIdx + 1]}</p>}
                <div className="studio-tp-nav">
                  <button onClick={() => setCueIdx(i => Math.max(0, i - 1))} disabled={cueIdx === 0}>{t.prev}</button>
                  <span>{cueIdx + 1}/{script.cues.length}</span>
                  <button onClick={() => setCueIdx(i => Math.min(script.cues.length - 1, i + 1))}
                    disabled={cueIdx >= script.cues.length - 1}>{t.next}</button>
                </div>
              </div>
            )}

            {/* Script picker (before recording) */}
            {phase === 'ready' && (
              <div className="studio-scripts">
                <span className="studio-scripts-label">{t.script}</span>
                <div className="studio-scripts-row">
                  {scripts.map(s => (
                    <button key={s.id}
                      className={`studio-script-pill${s.id === scriptId ? ' active' : ''}`}
                      onClick={() => setScriptId(s.id)}>
                      {s.title} · {fmt(s.target)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {phase === 'review' && <p className="studio-review-note">{t.review} — {t.notUploaded}</p>}

            {/* Controls */}
            <div className="studio-controls">
              {phase === 'review' ? (
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
                  <button className="studio-btn studio-btn--ghost" onClick={turnOffCamera}>{t.turnOff}</button>
                  <button className="studio-btn studio-btn--record" onClick={beginCountdown}>● {t.record}</button>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
