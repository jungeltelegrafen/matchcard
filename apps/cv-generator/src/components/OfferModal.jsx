import { useState, useEffect } from 'react'
import { getL } from '../utils/labels'
import { draftOffer } from '../utils/parseWithClaude'
import { factsFromCv, composeOffer } from '../utils/offer'

const splitKw = s => String(s || '').split(',').map(x => x.trim()).filter(Boolean)

// Tilbudsformat — the consultant "offer" a recruiter pastes into an email.
// Factual fields pre-fill from the CV; the Relevance teaser + keywords + a
// suggested seniority are AI-drafted lazily on first open; everything is editable.
export default function OfferModal({ cv, offer, onChange, lang = 'en', uiLang = 'en', onClose }) {
  const lb = getL(lang)
  const [drafting, setDrafting] = useState(false)
  const [copied, setCopied]     = useState(false)
  const [error, setError]       = useState('')
  const [kwText, setKwText]     = useState((offer.keywords || []).join(', '))

  const name = [cv?.personal?.firstName, cv?.personal?.lastName].filter(Boolean).join(' ')

  const set = (field, value) => onChange(prev => ({ ...prev, [field]: value }))

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // First open: pre-fill factual fields from the CV instantly, then AI-draft the
  // teaser. Runs once; subsequent opens (generated) are instant.
  useEffect(() => {
    if (offer.generated) return
    const f = factsFromCv(cv)
    onChange(prev => ({
      ...prev,
      role:          prev.role          || f.role,
      location:      prev.location      || f.location,
      availableFrom: prev.availableFrom || f.availableFrom,
      workMode:      prev.workMode      || f.workMode,
      languages:     prev.languages     || f.languages,
      generalInfo:   prev.generalInfo   || f.currentEmployer,
    }))
    setDrafting(true)
    draftOffer(cv, lang)
      .then(r => {
        onChange(prev => ({
          ...prev,
          seniority: prev.seniority || r.seniority || '',
          relevance: prev.relevance || r.relevance || '',
          keywords:  (prev.keywords && prev.keywords.length) ? prev.keywords : (r.keywords || []),
          generated: true,
        }))
        if (r.keywords?.length) setKwText(r.keywords.join(', '))
      })
      .catch(() => { setError('AI'); onChange(prev => ({ ...prev, generated: true })) })
      .finally(() => setDrafting(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function regenerate() {
    setDrafting(true); setError('')
    draftOffer(cv, lang)
      .then(r => {
        onChange(prev => ({ ...prev, seniority: r.seniority || prev.seniority, relevance: r.relevance || '', keywords: r.keywords || [] }))
        setKwText((r.keywords || []).join(', '))
      })
      .catch(() => setError('AI'))
      .finally(() => setDrafting(false))
  }

  // Always compose from the freshest keyword text (may be unblurred).
  const exportOffer = () => ({ ...offer, keywords: splitKw(kwText) })

  function handleCopy() {
    navigator.clipboard.writeText(composeOffer(exportOffer(), cv, lang))
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
      .catch(() => {})
  }

  function handleEmail() {
    const subject = `${lb.offerFormat}: ${name}${offer.role ? ` — ${offer.role}` : ''}`
    const body = composeOffer(exportOffer(), cv, lang)
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }

  const HEADER_FIELDS = [
    ['role', lb.offerRole], ['location', lb.offerLocation],
    ['availableFrom', lb.offerAvailableFrom], ['hourlyRate', lb.offerHourlyRate],
    ['seniority', lb.offerSeniority], ['capacity', lb.offerCapacity],
    ['workMode', lb.offerWorkMode], ['languages', lb.offerLanguages],
  ]

  return (
    <div className="feedback-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="feedback-box offer-box" role="dialog" aria-modal="true">
        <div className="feedback-header">
          <div>
            <h2 className="feedback-title">{lb.offerFormat}</h2>
            <p className="feedback-subtitle">{name || '—'}</p>
          </div>
          <button className="feedback-close" onClick={onClose}>×</button>
        </div>

        <div className="offer-body">
          <div className="offer-grid">
            {HEADER_FIELDS.map(([key, label]) => (
              <label key={key} className="offer-field">
                <span className="offer-field-label">{label}</span>
                <input
                  className="offer-field-input"
                  value={offer[key] || ''}
                  onChange={e => set(key, e.target.value)}
                />
              </label>
            ))}
          </div>

          <label className="offer-field offer-field--full">
            <span className="offer-field-label">
              {lb.offerRelevance}
              {drafting && <span className="offer-drafting"> · {lb.offerDrafting}</span>}
            </span>
            <textarea
              className="offer-field-textarea"
              value={offer.relevance || ''}
              onChange={e => set('relevance', e.target.value)}
              rows={4}
            />
          </label>

          <label className="offer-field offer-field--full">
            <span className="offer-field-label">{lb.offerKeywords}</span>
            <input
              className="offer-field-input"
              value={kwText}
              onChange={e => setKwText(e.target.value)}
              onBlur={() => set('keywords', splitKw(kwText))}
              placeholder={lb.offerKeywordsPlaceholder}
            />
          </label>

          <label className="offer-field offer-field--full">
            <span className="offer-field-label">{lb.offerGeneralInfo}</span>
            <textarea
              className="offer-field-textarea"
              value={offer.generalInfo || ''}
              onChange={e => set('generalInfo', e.target.value)}
              rows={3}
              placeholder={lb.offerGeneralPlaceholder}
            />
          </label>
        </div>

        <div className="offer-actions">
          {error && <span className="offer-error">{uiLang === 'no' ? 'AI-utkast feilet' : 'AI draft failed'}</span>}
          <button className="offer-btn offer-btn--ghost" onClick={regenerate} disabled={drafting}>
            ↻ {lb.offerRegenerate}
          </button>
          <button className="offer-btn" onClick={handleCopy}>
            {copied ? lb.offerCopied : `⎘ ${lb.offerCopy}`}
          </button>
          <button className="offer-btn offer-btn--primary" onClick={handleEmail}>
            ✉ {lb.offerOpenEmail}
          </button>
        </div>
      </div>
    </div>
  )
}
