import { useState, useEffect, useRef } from 'react'

const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname.startsWith('127.'))
  ? ''
  : 'https://matchcard.no'

const TYPES = [
  { key: 'bug',     emoji: '🐛', label: 'Bug report' },
  { key: 'feature', emoji: '💡', label: 'Feature idea' },
  { key: 'general', emoji: '💬', label: 'General' },
]

const PLACEHOLDERS = {
  bug:     'Describe what happened and what you expected…',
  feature: 'Describe the feature and why it would help…',
  general: 'Share any thoughts, suggestions or questions…',
}

export default function FeedbackModal({ onClose, candidateName }) {
  const [type,    setType]    = useState('general')
  const [subject, setSubject] = useState('CV Generator')
  const [message, setMessage] = useState('')
  const [name,    setName]    = useState('')
  const [status,  setStatus]  = useState('idle') // idle | sending | done | error
  const textareaRef = useRef(null)

  useEffect(() => { setTimeout(() => textareaRef.current?.focus(), 50) }, [])

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!message.trim() || !name.trim() || status === 'sending') return
    setStatus('sending')
    try {
      const res = await fetch(`${API_BASE}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          subject: subject.trim() || 'CV Generator',
          message: message.trim(),
          name: name.trim(),
          page: '/cv-generator',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error')
      setStatus('done')
    } catch {
      setStatus('error')
    }
  }

  return (
    <div className="feedback-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="feedback-box" role="dialog" aria-modal="true">

        {/* Header */}
        <div className="feedback-header">
          <div>
            <h2 className="feedback-title">Product feedback</h2>
            <p className="feedback-subtitle">Help us improve CV Generator</p>
          </div>
          <button className="feedback-close" onClick={onClose}>×</button>
        </div>

        {status === 'done' ? (
          <div className="feedback-done">
            <span className="feedback-done-icon">✓</span>
            <p className="feedback-done-heading">Thank you!</p>
            <p className="feedback-done-sub">Your feedback has been received.</p>
            <button className="feedback-close-btn" onClick={onClose}>Close</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="feedback-form">

            {/* Type selector */}
            <div className="feedback-types">
              {TYPES.map(ty => (
                <button
                  key={ty.key}
                  type="button"
                  onClick={() => { setType(ty.key); textareaRef.current?.focus() }}
                  className={`feedback-type-btn${type === ty.key ? ' active' : ''}`}
                >
                  <span className="feedback-type-emoji">{ty.emoji}</span>
                  <span className="feedback-type-label">{ty.label}</span>
                </button>
              ))}
            </div>

            {/* Subject */}
            <div className="feedback-field">
              <label className="feedback-label">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="What is your feedback about?"
                className="feedback-input"
              />
            </div>

            {/* Message */}
            <div className="feedback-field">
              <label className="feedback-label">Message</label>
              <textarea
                ref={textareaRef}
                value={message}
                onChange={e => setMessage(e.target.value)}
                onKeyDown={e => (e.metaKey || e.ctrlKey) && e.key === 'Enter' && handleSubmit(e)}
                placeholder={PLACEHOLDERS[type]}
                rows={5}
                className="feedback-textarea"
              />
              <p className="feedback-hint">⌘ Enter to send</p>
            </div>

            {/* Name */}
            <div className="feedback-field">
              <label className="feedback-label">Your name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="First name or full name"
                required
                className="feedback-input"
              />
            </div>

            {/* Submit */}
            <div className="feedback-submit-row">
              {status === 'error' && (
                <span className="feedback-error">Something went wrong. Please try again.</span>
              )}
              <button
                type="submit"
                disabled={!message.trim() || !name.trim() || status === 'sending'}
                className="feedback-submit-btn"
              >
                {status === 'sending' ? 'Sending…' : 'Send feedback'}
              </button>
            </div>

          </form>
        )}
      </div>
    </div>
  )
}
