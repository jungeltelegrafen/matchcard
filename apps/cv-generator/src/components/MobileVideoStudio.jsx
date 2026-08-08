import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { hostRecording } from '../utils/uploadVideo'
import { MAX_SECONDS, fmt, pickMime, canRecordMp4, makeThumb, drawComposite } from '../utils/videoStudioCore'
import { useCvPages } from '../hooks/useCvPages'

// A phone-native recorder: full-screen portrait. Two modes —
//  • 'me'  talking-head selfie (the priority path, always reliable)
//  • 'cv'  CV-walkthrough composite: the CV pages scroll behind a webcam PiP
//          bubble, finger-dragged instead of mouse-wheeled.
// It deliberately drops the desktop "screen share" mode (iOS has no
// getDisplayMedia). It emits the exact same video entry shape as
// VideoStudioModal, so App's anchor / ensureIds plumbing is untouched.
//
// Two Safari/mobile invariants are honoured (see VIDEO_RECORDING_LEARNINGS.md):
//  1. The camera <video> must stay mounted and actively play, or the clip
//     records black — so the preview element is always rendered while the camera
//     is live (in 'cv' mode a full-size element sits behind the opaque canvas)
//     and .play() is forced on loadedmetadata.
//  2. MediaRecorder must be handed a freshly-built MediaStream of CLONED tracks
//     (talking-head), never the same stream the preview <video> is consuming, or
//     Safari silently drops the audio track. The 'cv' composite records the
//     canvas captureStream + the live (unconsumed) mic track.

const T = {
  en: {
    title: 'Record a video',
    consentTitle: 'Ready when you are',
    consentNote: 'Your camera and mic turn on only when you tap below. Nothing is recorded until you press Record.',
    turnOn: 'Turn on camera', flip: 'Flip', record: 'Record', pause: 'Pause', resume: 'Resume',
    stop: 'Stop', retake: 'Re-take', use: 'Use this video', recording: 'REC', paused: 'Paused',
    starts: 'Recording in', review: 'Review your video', uploading: 'Uploading…',
    nameLabel: 'Name this video — this is what shows on your CV', namePlaceholder: 'e.g. “Why I fit this role”',
    notUploaded: 'Saved to this session only (video hosting isn’t set up yet).',
    camErr: 'Could not access your camera or microphone. Check browser permissions and try again.',
    permErr: 'Camera/microphone permission was denied. Enable it in your browser settings, then try again.',
    retry: 'Try again',
    unsupported: 'This browser can’t record video. Try a recent Chrome or Safari.',
    mp4Warn: 'Heads up: your browser records in a format that may not play for viewers on Safari.',
    defaultTitle: 'My video', close: 'Close',
    justMe: 'Just me', cvWalk: 'CV walkthrough', scrollHint: 'Drag to scroll your CV as you talk',
  },
  no: {
    title: 'Ta opp video',
    consentTitle: 'Klar når du er',
    consentNote: 'Kamera og mikrofon slås på først når du trykker nedenfor. Ingenting tas opp før du trykker Ta opp.',
    turnOn: 'Slå på kamera', flip: 'Snu', record: 'Ta opp', pause: 'Pause', resume: 'Fortsett',
    stop: 'Stopp', retake: 'Ta opp på nytt', use: 'Bruk denne videoen', recording: 'REC', paused: 'Pauset',
    starts: 'Opptak om', review: 'Se gjennom videoen', uploading: 'Laster opp…',
    nameLabel: 'Gi videoen et navn — dette vises på CV-en din', namePlaceholder: 'f.eks. «Derfor passer jeg til rollen»',
    notUploaded: 'Lagret kun for denne økten (videohosting er ikke satt opp ennå).',
    camErr: 'Fikk ikke tilgang til kamera eller mikrofon. Sjekk tillatelser og prøv igjen.',
    permErr: 'Tilgang til kamera/mikrofon ble avslått. Slå det på i nettleserinnstillingene og prøv igjen.',
    retry: 'Prøv igjen',
    unsupported: 'Denne nettleseren kan ikke ta opp video. Prøv en nyere Chrome eller Safari.',
    mp4Warn: 'Merk: nettleseren din tar opp i et format som kanskje ikke spilles av for seere på Safari.',
    defaultTitle: 'Min video', close: 'Lukk',
    justMe: 'Bare meg', cvWalk: 'CV-gjennomgang', scrollHint: 'Dra for å bla i CV-en mens du snakker',
  },
  es: {
    title: 'Graba un vídeo',
    consentTitle: 'Cuando quieras',
    consentNote: 'La cámara y el micrófono se activan solo cuando pulsas abajo. No se graba nada hasta que pulses Grabar.',
    turnOn: 'Encender cámara', flip: 'Girar', record: 'Grabar', pause: 'Pausar', resume: 'Reanudar',
    stop: 'Detener', retake: 'Regrabar', use: 'Usar este vídeo', recording: 'REC', paused: 'En pausa',
    starts: 'Grabando en', review: 'Revisa tu vídeo', uploading: 'Subiendo…',
    nameLabel: 'Nombra este vídeo — es lo que aparece en tu CV', namePlaceholder: 'p. ej. «Por qué encajo en este puesto»',
    notUploaded: 'Guardado solo para esta sesión (el alojamiento de vídeo aún no está configurado).',
    camErr: 'No se pudo acceder a la cámara o el micrófono. Revisa los permisos e inténtalo de nuevo.',
    permErr: 'Se denegó el permiso de cámara/micrófono. Actívalo en los ajustes del navegador e inténtalo de nuevo.',
    retry: 'Reintentar',
    unsupported: 'Este navegador no puede grabar vídeo. Prueba con un Chrome o Safari reciente.',
    mp4Warn: 'Aviso: tu navegador graba en un formato que puede no reproducirse para quienes usan Safari.',
    defaultTitle: 'Mi vídeo', close: 'Cerrar',
    justMe: 'Solo yo', cvWalk: 'Recorrido del CV', scrollHint: 'Arrastra para desplazar tu CV mientras hablas',
  },
}

function recorderSupported() {
  return typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== 'undefined' &&
    pickMime() !== ''
}

export default function MobileVideoStudio({ cv = {}, lang = 'en', branding, onClose, onSave }) {
  const t = T[lang] || T.en
  const mp4Ok = canRecordMp4()

  const [phase, setPhase]   = useState(() => (recorderSupported() ? 'consent' : 'unsupported'))
  const [mode, setMode]     = useState('me') // 'me' talking-head | 'cv' walkthrough
  const [facing, setFacing] = useState('user') // 'user' (selfie) | 'environment' (rear)
  const [count, setCount]   = useState(3)
  const [elapsed, setElapsed] = useState(0)
  const [recordedUrl, setRecordedUrl] = useState(null)
  const [reviewPoster, setReviewPoster] = useState('')
  const [videoName, setVideoName] = useState('')
  const [errMsg, setErrMsg] = useState('')
  const [uploadPct, setUploadPct] = useState(0)

  const liveRef    = useRef(null)   // visible preview ('me' mode)
  const camVideoRef = useRef(null)  // hidden webcam source for the 'cv' composite PiP
  const compositeRef = useRef(null) // canvas drawn + recorded in 'cv' mode
  const streamRef  = useRef(null)   // live cam+mic feeding the preview
  const recCloneRef = useRef(null)  // cloned tracks recorded in 'me' mode
  const compStreamRef = useRef(null) // canvas captureStream recorded in 'cv' mode
  const scrollRef  = useRef(0)      // vertical scroll offset into the CV strip (canvas px)
  const scrollMaxRef = useRef(0)
  const dragRef    = useRef({ active: false, lastY: 0 })
  const rafRef     = useRef(0)
  const recRef     = useRef(null)
  const chunksRef  = useRef([])
  const blobRef    = useRef(null)
  const timerRef   = useRef(null)
  const cdRef      = useRef(null)
  const savedRef   = useRef(false)

  const cameraLive = ['ready', 'countdown', 'recording', 'paused'].includes(phase)
  const busy = phase === 'recording' || phase === 'paused' || phase === 'uploading'
  const reviewing = phase === 'review' || phase === 'uploading'

  // Rasterize the CV to page canvases only while the walkthrough mode is chosen.
  // Lower scale + a page cap keep memory/encode load sane on phones.
  const pagesRef = useCvPages(cv, lang, branding, { scale: 1.5, maxPages: 6, enabled: mode === 'cv' })

  const stopStream = useCallback(() => {
    if (streamRef.current) { streamRef.current.getTracks().forEach(tr => tr.stop()); streamRef.current = null }
    if (recCloneRef.current) { recCloneRef.current.getTracks().forEach(tr => tr.stop()); recCloneRef.current = null }
    if (compStreamRef.current) { compStreamRef.current.getTracks().forEach(tr => tr.stop()); compStreamRef.current = null }
  }, [])

  const enableCamera = useCallback(async (nextFacing) => {
    setErrMsg('')
    const face = nextFacing || facing
    try {
      let stream
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: face }, width: { ideal: 720 }, height: { ideal: 1280 } },
          audio: true,
        })
      } catch (err) {
        if (err?.name === 'OverconstrainedError') {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        } else throw err
      }
      streamRef.current = stream
      setPhase('ready')
    } catch (err) {
      setErrMsg(err?.name === 'NotAllowedError' || err?.name === 'SecurityError' ? t.permErr : t.camErr)
      setPhase('error')
    }
  }, [facing, t])

  async function flip() {
    if (phase !== 'ready') return
    const next = facing === 'user' ? 'environment' : 'user'
    stopStream()
    setFacing(next)
    await enableCamera(next)
  }

  function turnOff() { stopStream(); setPhase('consent') }

  // Switching mode re-starts from consent (each mode acquires the camera the way
  // it needs). Only offered before the camera is live.
  function selectMode(m) {
    if (m === mode) return
    stopStream()
    setMode(m)
    setErrMsg('')
    setPhase('consent')
  }

  // Attach the live stream to the visible <video> for the active mode. Both keep
  // the element rendered + playing (black-clip rule); in 'cv' the element is a
  // full-size underlay behind the opaque composite canvas.
  useEffect(() => {
    if (!cameraLive || !streamRef.current) return
    const el = mode === 'cv' ? camVideoRef.current : liveRef.current
    if (el) { el.srcObject = streamRef.current; el.play().catch(() => {}) }
  }, [phase, cameraLive, mode, facing])

  // Composite draw loop ('cv' mode): CV pages + webcam PiP on the recorded canvas.
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
        showCursor: false, // touch: the finger occludes the point, so no cursor
      })
      scrollMaxRef.current = maxScroll
      if (scrollRef.current > maxScroll) scrollRef.current = maxScroll
      if (scrollRef.current < 0) scrollRef.current = 0
      rafRef.current = requestAnimationFrame(draw)
    }
    draw()
    return () => { stop = true; cancelAnimationFrame(rafRef.current) }
  }, [mode, cameraLive, pagesRef])

  // Cleanup: never leave the camera on.
  useEffect(() => {
    return () => {
      clearInterval(timerRef.current); clearInterval(cdRef.current)
      cancelAnimationFrame(rafRef.current)
      stopStream()
      if (!savedRef.current && recordedUrl) URL.revokeObjectURL(recordedUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape' && !busy) onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [busy, onClose])

  // Finger-drag the composite to scroll the CV (captured in the recording).
  function onCanvasPointerDown(e) { dragRef.current = { active: true, lastY: e.clientY }; try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* unsupported */ } }
  function onCanvasPointerMove(e) {
    if (!dragRef.current.active) return
    const canvas = compositeRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const dy = e.clientY - dragRef.current.lastY
    dragRef.current.lastY = e.clientY
    const scale = rect.height ? canvas.height / rect.height : 1
    // Drag up (dy<0) → scroll down through the CV.
    scrollRef.current = Math.max(0, Math.min(scrollMaxRef.current, scrollRef.current - dy * scale))
  }
  function onCanvasPointerUp(e) { dragRef.current.active = false; try { e.currentTarget.releasePointerCapture(e.pointerId) } catch { /* ignore */ } }

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
    let recStream
    if (mode === 'cv' && compositeRef.current) {
      // Record the composite canvas (CV + face) + the live mic. The mic track is
      // not consumed by any playing element (the camVideo underlay is muted), so
      // it doesn't need cloning here.
      const cs = compositeRef.current.captureStream(24) // 24fps eases phone encode/thermal
      compStreamRef.current = cs
      recStream = new MediaStream([...cs.getVideoTracks(), ...stream.getAudioTracks()])
    } else {
      // Talking-head: record CLONED tracks, independent of the preview element's
      // sinks — the fix for black / silent clips on Safari.
      recStream = new MediaStream([
        ...stream.getVideoTracks().map(tr => tr.clone()),
        ...stream.getAudioTracks().map(tr => tr.clone()),
      ])
      recCloneRef.current = recStream
    }
    if (!recStream.getAudioTracks().length) console.warn('[mstudio] recording stream has no audio track')
    const mime = pickMime()
    const mr = new MediaRecorder(recStream, mime ? { mimeType: mime } : undefined)
    mr.ondataavailable = e => { if (e.data.size) chunksRef.current.push(e.data) }
    mr.onstop = () => {
      const type = recRef.current?.mimeType || chunksRef.current[0]?.type || 'video/webm'
      const blob = new Blob(chunksRef.current, { type })
      blobRef.current = blob
      const url = URL.createObjectURL(blob)
      setRecordedUrl(url)
      setReviewPoster('')
      makeThumb(url).then(setReviewPoster)
      stopStream() // camera OFF the instant recording ends
      setPhase('review')
    }
    recRef.current = mr
    mr.start(1000)
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
    setRecordedUrl(null); setReviewPoster(''); setElapsed(0); setVideoName('')
    enableCamera(facing)
  }

  async function useRecording() {
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
      thumbnailUrl: reviewPoster,
      duration: fmt(elapsed), recordedAt: new Date().toISOString(),
    })
    onClose()
  }

  return createPortal(
    <div className="mstudio">
      {phase === 'unsupported' ? (
        <div className="mstudio-msg">
          <span className="mstudio-msg-icon" aria-hidden>🎥</span>
          <p>{t.unsupported}</p>
          <button className="mstudio-btn mstudio-btn--ghost" onClick={onClose}>{t.close}</button>
        </div>
      ) : (
        <>
          <div className="mstudio-top">
            <button className="mstudio-close" onClick={onClose} disabled={busy} aria-label={t.close}>×</button>
            <span className="mstudio-top-title">{t.title}</span>
            {(phase === 'recording' || phase === 'paused') ? (
              <span className={`mstudio-rec${phase === 'paused' ? ' mstudio-rec--paused' : ''}`}>
                <span className="mstudio-rec-dot" />{phase === 'paused' ? t.paused : t.recording} {fmt(elapsed)}
              </span>
            ) : <span className="mstudio-top-spacer" />}
          </div>

          <div className="mstudio-stage">
            {reviewing ? (
              <video
                className="mstudio-video mstudio-video--review"
                src={recordedUrl} controls playsInline preload="auto"
                poster={reviewPoster || undefined}
              />
            ) : cameraLive ? (
              mode === 'cv' ? (
                <div className="mstudio-compbox">
                  <video
                    ref={camVideoRef} className="mstudio-camunder" autoPlay muted playsInline
                    onLoadedMetadata={e => e.currentTarget.play().catch(() => {})}
                  />
                  <canvas
                    ref={compositeRef} className="mstudio-composite"
                    onPointerDown={onCanvasPointerDown}
                    onPointerMove={onCanvasPointerMove}
                    onPointerUp={onCanvasPointerUp}
                    onPointerCancel={onCanvasPointerUp}
                  />
                  <div className="mstudio-scrollhint">🖐 {t.scrollHint}</div>
                </div>
              ) : (
                <video
                  ref={liveRef}
                  className={`mstudio-video${facing === 'user' ? ' mstudio-video--mirror' : ''}`}
                  autoPlay muted playsInline
                  onLoadedMetadata={e => e.currentTarget.play().catch(() => {})}
                />
              )
            ) : (
              <div className="mstudio-consent">
                {phase === 'error' ? (
                  <>
                    <span className="mstudio-consent-icon" aria-hidden>⚠️</span>
                    <p className="mstudio-consent-err">{errMsg}</p>
                    <button className="mstudio-btn mstudio-btn--primary" onClick={() => enableCamera(facing)}>{t.retry}</button>
                  </>
                ) : (
                  <>
                    <span className="mstudio-consent-icon" aria-hidden>📷</span>
                    <h3 className="mstudio-consent-title">{t.consentTitle}</h3>
                    <p className="mstudio-consent-note">{t.consentNote}</p>
                    <div className="mstudio-modes" role="group">
                      <button className={mode === 'me' ? 'active' : ''} onClick={() => selectMode('me')}>👤 {t.justMe}</button>
                      <button className={mode === 'cv' ? 'active' : ''} onClick={() => selectMode('cv')}>📄 {t.cvWalk}</button>
                    </div>
                    <button className="mstudio-btn mstudio-btn--primary" onClick={() => enableCamera(facing)}>{t.turnOn}</button>
                    {!mp4Ok && <p className="mstudio-warn">⚠️ {t.mp4Warn}</p>}
                  </>
                )}
              </div>
            )}

            {phase === 'countdown' && (
              <div className="mstudio-count">{count}<span>{t.starts}</span></div>
            )}
            {phase === 'uploading' && (
              <div className="mstudio-uploading">
                <span>{t.uploading} {Math.round(uploadPct * 100)}%</span>
                <div className="mstudio-uploadbar"><div style={{ width: `${Math.round(uploadPct * 100)}%` }} /></div>
              </div>
            )}
          </div>

          {phase === 'review' && (
            <div className="mstudio-nameblock">
              <label className="mstudio-namelabel" htmlFor="mstudio-name">{t.nameLabel}</label>
              <input
                id="mstudio-name" className="mstudio-nameinput" type="text"
                value={videoName} onChange={e => setVideoName(e.target.value)}
                placeholder={t.namePlaceholder} autoFocus maxLength={80}
              />
              <p className="mstudio-review-note">{t.notUploaded}</p>
            </div>
          )}

          <div className="mstudio-controls">
            {phase === 'review' ? (
              <>
                <button className="mstudio-btn mstudio-btn--ghost" onClick={retake}>↺ {t.retake}</button>
                <button className="mstudio-btn mstudio-btn--primary" onClick={useRecording} disabled={!videoName.trim()}>✓ {t.use}</button>
              </>
            ) : phase === 'recording' ? (
              <>
                <button className="mstudio-btn mstudio-btn--ghost" onClick={pauseRecording}>❙❙ {t.pause}</button>
                <button className="mstudio-recbtn mstudio-recbtn--stop" onClick={stopRecording} aria-label={t.stop}><span /></button>
              </>
            ) : phase === 'paused' ? (
              <>
                <button className="mstudio-btn mstudio-btn--primary" onClick={resumeRecording}>▶ {t.resume}</button>
                <button className="mstudio-recbtn mstudio-recbtn--stop" onClick={stopRecording} aria-label={t.stop}><span /></button>
              </>
            ) : phase === 'ready' ? (
              <>
                <button className="mstudio-flip" onClick={flip} aria-label={t.flip}>⟲ {t.flip}</button>
                <button className="mstudio-recbtn" onClick={beginCountdown} aria-label={t.record}><span /></button>
                <button className="mstudio-btn mstudio-btn--ghost" onClick={turnOff}>×</button>
              </>
            ) : null}
          </div>
        </>
      )}
    </div>,
    document.body,
  )
}
