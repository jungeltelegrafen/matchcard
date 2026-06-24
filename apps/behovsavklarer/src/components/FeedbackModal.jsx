import { useState, useEffect, useRef } from 'react'

const TYPES = [
  { key: 'bug',     emoji: '🐛', label: 'Noe funker ikke' },
  { key: 'feature', emoji: '💡', label: 'Jeg ønsker meg…' },
  { key: 'general', emoji: '💬', label: 'Generelt' },
]

const PLACEHOLDERS = {
  bug:     'Beskriv hva som skjer og hva du forventet skulle skje…',
  feature: 'Beskriv hva du savner eller hva som hadde gjort verktøyet bedre…',
  general: 'Del dine tanker om produktet…',
}

export default function FeedbackModal({ onClose, apiBase, briefRole }) {
  const [type,    setType]   = useState('general')
  const [subject, setSubject]= useState('Behovsavklarer')
  const [message, setMessage]= useState('')
  const [name,    setName]   = useState('')
  const [status,  setStatus] = useState('idle') // idle | sending | done | error
  const [result,  setResult] = useState(null)
  const textareaRef = useRef(null)

  useEffect(() => {
    setTimeout(() => textareaRef.current?.focus(), 50)
  }, [])

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

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
          subject: subject.trim() || 'Behovsavklarer',
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

  function handleTextareaKey(e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleSubmit(e)
  }

  const canSubmit = message.trim().length > 0 && name.trim().length > 0 && status === 'idle'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px]"
      onClick={handleBackdrop}
    >
      <div
        className="relative w-full max-w-xl mx-4 rounded-2xl border border-border bg-card shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Produkttilbakemelding"
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-1">
          <div>
            <h2 className="text-[17px] font-semibold text-primary">Produkttilbakemelding</h2>
            <p className="text-[11px] text-tx-muted mt-0.5">
              Hjelp oss forbedre verktøyet — alt er nyttig
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-tx-muted hover:text-primary transition-colors text-xl leading-none mt-0.5"
            aria-label="Lukk"
          >
            ×
          </button>
        </div>

        {status === 'done' ? (
          /* ── Success ─────────────────────────────────────────────────────── */
          <div className="px-6 pb-8 pt-4 flex flex-col items-center gap-3 text-center">
            <div className="text-4xl">✓</div>
            <p className="text-sm font-semibold text-primary">Takk for tilbakemeldingen!</p>
            <p className="text-xs text-tx-muted max-w-xs">
              Den er mottatt og vil bli gjennomgått.
            </p>
            <button
              onClick={onClose}
              className="mt-4 rounded-lg border border-border bg-white px-5 py-2 text-xs font-semibold text-tx hover:bg-bg transition-colors"
            >
              Lukk
            </button>
          </div>
        ) : (
          /* ── Form ────────────────────────────────────────────────────────── */
          <form onSubmit={handleSubmit} className="px-6 pb-6 pt-4 space-y-4">

            {/* Type selector */}
            <div className="flex gap-2">
              {TYPES.map(t => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => { setType(t.key); textareaRef.current?.focus() }}
                  className={[
                    'flex-1 flex flex-col items-center gap-1.5 rounded-xl border py-3 px-2 text-center transition-all',
                    type === t.key
                      ? 'border-accent/60 bg-accent/8 text-primary shadow-sm'
                      : 'border-border bg-bg/40 text-tx-muted hover:border-border/80 hover:bg-bg',
                  ].join(' ')}
                >
                  <span className="text-xl leading-none">{t.emoji}</span>
                  <span className="text-[11px] font-semibold leading-tight">{t.label}</span>
                </button>
              ))}
            </div>

            {/* Subject */}
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-widest text-tx-muted mb-1.5">
                Gjelder
              </label>
              <input
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="Hvilken funksjon eller del av produktet?"
                className="w-full rounded-xl border border-border bg-bg/60 px-3.5 py-2.5
                  text-sm text-primary placeholder:text-tx-muted/60
                  focus:outline-none focus:ring-1 focus:ring-accent/40 focus:border-accent/50 transition-colors"
              />
            </div>

            {/* Message */}
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-widest text-tx-muted mb-1.5">
                Melding
              </label>
              <textarea
                ref={textareaRef}
                value={message}
                onChange={e => setMessage(e.target.value)}
                onKeyDown={handleTextareaKey}
                placeholder={PLACEHOLDERS[type]}
                rows={5}
                className="w-full resize-none rounded-xl border border-border bg-bg/60 px-3.5 py-2.5
                  text-sm text-primary placeholder:text-tx-muted/60
                  focus:outline-none focus:ring-1 focus:ring-accent/40 focus:border-accent/50
                  transition-colors"
              />
              <p className="mt-1 text-right text-[10px] text-tx-muted/50">⌘ + Enter for å sende</p>
            </div>

            {/* Name — required */}
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-widest text-tx-muted mb-1.5">
                Navn
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ditt navn"
                required
                className="w-full rounded-xl border border-border bg-bg/60 px-3.5 py-2.5
                  text-sm text-primary placeholder:text-tx-muted/60
                  focus:outline-none focus:ring-1 focus:ring-accent/40 focus:border-accent/50 transition-colors"
              />
            </div>

            {/* Submit row */}
            <div className="flex items-center justify-between pt-1">
              {status === 'error' ? (
                <p className="text-[11px] text-red-400">Noe gikk galt — prøv igjen</p>
              ) : (
                <span />
              )}
              <button
                type="submit"
                disabled={!canSubmit}
                className="rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-white
                  hover:bg-accent/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {status === 'sending' ? 'Sender…' : 'Send produkttilbakemelding'}
              </button>
            </div>

          </form>
        )}
      </div>
    </div>
  )
}
