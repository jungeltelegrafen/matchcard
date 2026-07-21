import { useState, useRef, useEffect } from 'react'

const QUESTIONS = [
  {
    id: 0,
    topic: 'Introduction',
    question: 'Tell us about yourself — who you are and what you do professionally.',
  },
  {
    id: 1,
    topic: 'Experience',
    question: 'Walk us through your most significant work experience. What did you accomplish there?',
  },
  {
    id: 2,
    topic: 'Skills',
    question: 'Which skills are you most confident in, and how exactly did you develop them?',
  },
  {
    id: 3,
    topic: 'Learning',
    question: 'Describe a time you had to learn something new on the job. How did you go about it?',
  },
  {
    id: 4,
    topic: 'Achievements',
    question: 'What are you most proud of in your career so far, and what impact did it have?',
  },
  {
    id: 5,
    topic: 'Education',
    question: 'How has your education shaped your professional approach and expertise?',
  },
  {
    id: 6,
    topic: 'Future',
    question: 'Where do you want to take your career next, and how does your background support that?',
  },
]

export default function VideoPanel({ lang }) {
  const [cameraOn, setCameraOn] = useState(false)
  const [recording, setRecording] = useState(false)
  const [currentQ, setCurrentQ] = useState(0)
  const [recorded, setRecorded] = useState(new Set())
  const [cameraError, setCameraError] = useState('')
  const videoRef = useRef(null)
  const streamRef = useRef(null)

  async function enableCamera() {
    setCameraError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
      setCameraOn(true)
    } catch {
      setCameraError(
        lang === 'no'
          ? 'Kunne ikke få tilgang til kamera.'
          : 'Could not access camera or microphone.'
      )
    }
  }

  function disableCamera() {
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setCameraOn(false)
    setRecording(false)
  }

  function toggleRecord() {
    if (recording) {
      setRecording(false)
      setRecorded(prev => new Set([...prev, currentQ]))
    } else {
      setRecording(true)
    }
  }

  useEffect(() => {
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
    }
  }, [])

  const q = QUESTIONS[currentQ]

  return (
    <div className="tab-pane">

      {/* Camera preview */}
      <div className="video-camera-wrap">
        <video ref={videoRef} className="video-feed" autoPlay muted playsInline />
        {!cameraOn && (
          <div className="video-camera-off">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.95C18.88 4 12 4 12 4s-6.88 0-8.59.47A2.78 2.78 0 0 0 1.46 6.42C1 8.13 1 12 1 12s0 3.87.46 5.58a2.78 2.78 0 0 0 1.95 1.95C5.12 20 12 20 12 20s6.88 0 8.59-.47a2.78 2.78 0 0 0 1.95-1.95C23 15.87 23 12 23 12s0-3.87-.46-5.58z"/>
              <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="rgba(255,255,255,0.28)" stroke="none"/>
            </svg>
            <button className="video-enable-btn" onClick={enableCamera}>
              {lang === 'no' ? 'Slå på kamera' : 'Enable Camera'}
            </button>
            {cameraError && <p className="video-error">{cameraError}</p>}
          </div>
        )}
        {recording && <div className="video-rec-dot" />}
      </div>

      {/* Question progress dots */}
      <div className="video-progress">
        {QUESTIONS.map((_, i) => (
          <button
            key={i}
            className={`video-progress-dot${i === currentQ ? ' active' : ''}${recorded.has(i) ? ' done' : ''}`}
            onClick={() => { if (recording) return; setCurrentQ(i) }}
            title={QUESTIONS[i].topic}
          />
        ))}
      </div>

      {/* Current question */}
      <div className="video-question-block">
        <div className="video-question-meta">
          <span className="video-question-topic">{q.topic}</span>
          <span className="video-question-counter">{currentQ + 1} / {QUESTIONS.length}</span>
        </div>
        <p className="video-question-text">{q.question}</p>
      </div>

      {/* Controls */}
      <div className="video-controls">
        <button
          className="video-nav-btn"
          onClick={() => setCurrentQ(q => q - 1)}
          disabled={currentQ === 0 || recording}
        >
          ←
        </button>

        {cameraOn ? (
          <button
            className={`video-record-btn${recording ? ' recording' : ''}`}
            onClick={toggleRecord}
          >
            {recording
              ? (lang === 'no' ? 'Stopp' : 'Stop')
              : (lang === 'no' ? 'Ta opp' : 'Record')}
          </button>
        ) : (
          <button className="video-record-btn video-record-btn--disabled" disabled>
            {lang === 'no' ? 'Ta opp' : 'Record'}
          </button>
        )}

        <button
          className="video-nav-btn"
          onClick={() => setCurrentQ(q => q + 1)}
          disabled={currentQ === QUESTIONS.length - 1 || recording}
        >
          →
        </button>
      </div>

      {cameraOn && (
        <button className="video-disable-btn" onClick={disableCamera}>
          {lang === 'no' ? 'Slå av kamera' : 'Turn off camera'}
        </button>
      )}

      {/* Recorded sessions list */}
      {recorded.size > 0 && (
        <div className="video-recorded-list">
          <span className="video-recorded-label">
            {lang === 'no' ? 'Opptak' : 'Recordings'}
          </span>
          {[...recorded].sort().map(i => (
            <div key={i} className="video-recorded-item">
              <span>{QUESTIONS[i].topic}</span>
              <span className="video-recorded-badge">
                {lang === 'no' ? 'Opptatt' : 'Recorded'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
