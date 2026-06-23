import { useState, useEffect, useRef } from 'react'

const TYPES = [
  { key: 'bug',     emoji: '🐛', label: 'Noe funker ikke' },
  { key: 'feature', emoji: '💡', label: 'Jeg ønsker meg…' },
  { key: 'general', emoji: '💬', label: 'Generelt' },
]

const PLACEHOLDERS = {
  bug:     'Beskriv hva som skjer og hva du forventet skulle skje…',
  feature: 'Beskriv hva du savner eller hva som hadde gjort verktøyet bedre…',
  general: 'Del dine tanker…',
}

export default function FeedbackModal({ onClose, apiBase, briefRole }) {
  const [type,     setType]    = useState('general')
  const [message,  setMessage] = useState('')
  const [name,     setName]    = useState('')
  const [showName, setShowName]= useState(false)
  const [status,   setStatus]  = useState('idle') // idle | sending | done | error
  const [result,   setResult]  = useState(null)
  const textareaRef = useRef(null)
  const modalRef    = useRef(null)

  // Focus textarea on open
  useEffect(() => {
    setTimeout(() => textareaRef.current?.focus(), 50)
  }, [])

  // Escape to close (only when not done)
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Click outside to close
  function handleBackdrop(e) {
    if (e.target === e.currentTarget) onClose()
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!message.trim() || status === 'sending') return
    setStatus('sending')
    try {
      const res = await fetch(`${apiBase}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          message: message.trim(),
          name: name.trim() || undefined,
          briefRole: briefRole || undefined,
          page: '/behovsavklarer',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Feil')
      setResult(data)
      setStatus('done')
    } catch {
      setStatus('error')
    }
  }

  // Cmd/Ctrl+Enter submits from textarea
  function handleTextareaKey(e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleSubmit(e)
  }

  const canSubmit = message.trim().length > 0 && status === 'idle'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px]"
      onClick={handleBackdrop}
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-md mx-4 rounded-2xl border border-border bg-card shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Send tilbakemelding"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 className="text-[15px] font-semibold text-primary">Tilbakemelding</h2>
          <button
            onClick={onClose}
            className="text-tx-muted hover:text-primary transition-colors text-lg leading-none"
            aria-label="Lukk"
          >
            ×
          </button>
        </div>

        {status === 'done' ? (
          /* ── Success state ───────────────────────────────────────────────── */
          <div className="px-5 pb-6 pt-2 flex flex-col items-center gap-3 text-center">
            <div className="text-3xl">✓</div>
            <p className="text-sm font-medium text-primary">Takk for tilbakemeldingen!</p>
            <p className="text-xs text-tx-muted">Den er mottatt og vil bli gjennomgått.</p>
            {result?.github_issue_url && (
              <a
                href={result.github_issue_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 text-xs text-accent hover:underline"
              >
                Sak #{result.github_issue_number} åpnet på GitHub →
              </a>
            )}
            <button
              onClick={onClose}
              className="mt-3 rounded-lg border border-border bg-white px-4 py-1.5 text-xs font-semibold text-tx hover:bg-bg transition-colors"
            >
              Lukk
            </button>
          </div>
        ) : (
          /* ── Form ────────────────────────────────────────────────────────── */
          <form onSubmit={handleSubmit} className="px-5 pb-5 space-y-4">

            {/* Type selector */}
            <div className="flex gap-2">
              {TYPES.map(t => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => { setType(t.key); textareaRef.current?.focus() }}
                  className={[
                    'flex-1 flex flex-col items-center gap-1 rounded-xl border py-2.5 px-1 text-center transition-all',
                    type === t.key
                      ? 'border-accent/60 bg-accent/8 text-primary shadow-sm'
                      : 'border-border bg-bg/40 text-tx-muted hover:border-border/80 hover:bg-bg',
                  ].join(' ')}
                >
                  <span className="text-lg leading-none">{t.emoji}</span>
                  <span className="text-[10px] font-semibold leading-tight">{t.label}</span>
                </button>
              ))}
            </div>

            {/* Message */}
            <div>
              <textarea
                ref={textareaRef}
                value={message}
                onChange={e => setMessage(e.target.value)}
                onKeyDown={handleTextareaKey}
                placeholder={PLACEHOLDERS[type]}
                rows={4}
                className="w-full resize-none rounded-xl border border-border bg-bg/60 px-3.5 py-2.5
                  text-sm text-primary placeholder:text-tx-muted/60
                  focus:outline-none focus:ring-1 focus:ring-accent/40 focus:border-accent/50
                  transition-colors"
              />
              <p className="mt-1 text-right text-[10px] text-tx-muted/50">
                ⌘ + Enter for å sende
              </p>
            </div>

            {/* Optional name */}
            {showName ? (
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Navn (valgfri)"
                className="w-full rounded-xl border border-border bg-bg/60 px-3.5 py-2
                  text-sm text-primary placeholder:text-tx-muted/60
                  focus:outline-none focus:ring-1 focus:ring-accent/40 focus:border-accent/50 transition-colors"
              />
            ) : (
              <button
                type="button"
                onClick={() => { setShowName(true); }}
                className="text-[11px] text-tx-muted/70 hover:text-tx-muted transition-colors"
              >
                + Legg til navn
              </button>
            )}

            {/* Submit */}
            <div className="flex items-center justify-between pt-1">
              {status === 'error' && (
                <p className="text-[11px] text-red-400">Noe gikk galt — prøv igjen</p>
              )}
              <div className="ml-auto">
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-white
                    hover:bg-accent/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {status === 'sending' ? 'Sender…' : 'Send tilbakemelding'}
                </button>
              </div>
            </div>

          </form>
        )}
      </div>
    </div>
  )
}
