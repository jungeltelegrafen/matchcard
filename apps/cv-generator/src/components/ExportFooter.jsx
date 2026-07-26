import { useState } from 'react'
import { saveAs } from 'file-saver'
import { renderPdfBlob } from '../utils/renderPdf'
import { downloadDocx } from '../renderers/docx/buildDocument'
import { downloadEmail } from '../utils/generateEmail'
import { stripIds, cvHasContent } from '@lib/cv/schema'
import { LANGS, LANG_ENDONYM } from '@lib/cv/lang'

// ── Completeness scoring ──────────────────────────────────────────────────────

function textGrade(v, short = 40, long = 180) {
  const len = (v || '').trim().length
  if (len === 0)    return 0
  if (len < short)  return 0.35
  if (len < long)   return 0.7
  return 1
}

function computeCvScore(cv) {
  const { personal, experience, education, skills, languages } = cv
  const has = v => Boolean(v?.trim?.() || (Array.isArray(v) && v.filter(Boolean).length > 0))

  // Personal (30 %)
  const pFields = [personal.firstName, personal.lastName, personal.title, personal.email, personal.phone, personal.location]
  const pFieldScore  = pFields.filter(has).length / pFields.length
  const summaryScore = textGrade(personal.summary, 40, 150)
  const personalScore = pFieldScore * 0.65 + summaryScore * 0.35

  // Experience (35 %)
  let expScore = 0
  if (experience.length > 0) {
    const avg = experience.reduce((acc, exp) => {
      const fieldQ  = [exp.role, exp.company, exp.startDate].filter(has).length / 3
      const bulletQ = (exp.bullets || []).filter(Boolean).length >= 2 ? 1
                    : (exp.bullets || []).filter(Boolean).length === 1 ? 0.5 : 0
      return acc + fieldQ * 0.6 + bulletQ * 0.4
    }, 0) / experience.length
    expScore = experience.length === 1 ? avg * 0.75 : avg
  }

  // Education (15 %)
  const eduScore = education.length === 0 ? 0 : has(education[0].institution) ? 1 : 0.5

  // Skills (15 %)
  const allItems = skills.flatMap(g => g.items).filter(Boolean)
  const skillScore = allItems.length === 0 ? 0 : allItems.length < 3 ? 0.5 : 1

  // Languages (5 %)
  const langScore = languages.length > 0 ? 1 : 0

  return personalScore * 0.30 + expScore * 0.35 + eduScore * 0.15 + skillScore * 0.15 + langScore * 0.05
}

function scoreLabel(pct, no) {
  if (pct < 30)  return no ? 'Begynn å legge inn informasjon' : 'Start adding your information'
  if (pct < 60)  return no ? 'God start — fortsett' : 'Good start — keep going'
  if (pct < 85)  return no ? 'Nesten der' : 'Almost there'
  return no ? 'CV komplett ✓' : 'CV complete ✓'
}

function barColor(pct) {
  if (pct === 0) return 'transparent'
  return 'linear-gradient(to right, #D9CFC7, #7DAACB 50%, #99BC85)'
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ExportFooter({ cvByLang, contentLang, uiLang, filename, onPreview }) {
  const [exporting,     setExporting]     = useState(false)
  const [openMenu,      setOpenMenu]      = useState(null) // 'pdf' | 'docx' | 'email' | null
  const [exportStatus,  setExportStatus]  = useState('')
  const [shareUrl,      setShareUrl]      = useState('')
  const [sharing,       setSharing]       = useState(false)
  const [copied,        setCopied]        = useState(false)

  const no = uiLang === 'no'
  const cv = cvByLang[contentLang]
  const pct   = Math.round(computeCvScore(cv) * 100)
  const label = scoreLabel(pct, no)

  // Languages worth offering: those with real content. Fall back to the
  // currently-viewed language so a brand-new CV can still be exported.
  const filled = LANGS.filter(l => cvHasContent(cvByLang[l]))
  const exportLangs = filled.length ? filled : [contentLang]
  const multi = exportLangs.length > 1

  const fileFor = lang => `${filename}_${lang.toUpperCase()}`
  const outputCv = lang => stripIds(cvByLang[lang])

  function toggleMenu(name) {
    setOpenMenu(prev => (prev === name ? null : name))
  }

  async function run(statusMsg, fn) {
    setExporting(true)
    setOpenMenu(null)
    setExportStatus(statusMsg)
    try {
      await fn()
    } catch (err) {
      console.error(err)
      setExportStatus(no ? 'Feil — se konsollen' : 'Error — check console')
      setTimeout(() => setExportStatus(''), 3000)
      setExporting(false)
      return
    }
    setExportStatus('')
    setExporting(false)
  }

  function handlePdf(lang) {
    run(no ? 'Klargjør PDF…' : 'Preparing PDF…', async () => {
      const blob = await renderPdfBlob(outputCv(lang), lang)
      saveAs(blob, `${fileFor(lang)}.pdf`)
    })
  }

  function handleDocx(lang) {
    run(no ? 'Klargjør Word…' : 'Preparing Word…', () =>
      downloadDocx(outputCv(lang), `${fileFor(lang)}.docx`, lang))
  }

  function handleEmail(lang, attachFormat) {
    run(no ? 'Klargjør e-post…' : 'Preparing email…', () =>
      downloadEmail(outputCv(lang), fileFor(lang), attachFormat, lang))
  }

  function handleCopyLink() {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {})
  }

  // Share publishes a snapshot of the currently-viewed language.
  async function handleShare() {
    setSharing(true)
    try {
      const res = await fetch('/api/cv/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cv: outputCv(contentLang), lang: contentLang, filename: fileFor(contentLang) }),
      })
      if (!res.ok) throw new Error('Share failed')
      const { url } = await res.json()
      setShareUrl(url)
      navigator.clipboard.writeText(url).catch(() => {})
    } catch (err) {
      console.error(err)
      setExportStatus(no ? 'Deling feilet' : 'Share failed')
      setTimeout(() => setExportStatus(''), 3000)
    } finally {
      setSharing(false)
    }
  }

  // A format button: direct download when only one language exists, a language
  // dropdown when both do.
  function FormatControl({ name, label, onPick }) {
    if (!multi) {
      return (
        <button
          className={`export-btn export-btn--${name}`}
          onClick={() => onPick(exportLangs[0])}
          disabled={exporting}
        >
          ↓ {label}
        </button>
      )
    }
    return (
      <div className="export-menu-wrap">
        <button
          className={`export-btn export-btn--${name}`}
          onClick={() => toggleMenu(name)}
          disabled={exporting}
        >
          ↓ {label} ▾
        </button>
        {openMenu === name && (
          <div className="export-menu">
            {exportLangs.map(l => (
              <button key={l} onClick={() => onPick(l)}>{LANG_ENDONYM[l]}</button>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <footer className="export-footer">

      {/* ── Completeness bar ── */}
      <div className="export-progress-row">
        <div className="export-progress-track" title={`${pct}%`}>
          <div
            className="export-progress-fill"
            style={{ width: `${pct}%`, background: barColor(pct) }}
          />
        </div>
        <span
          className="export-progress-pct"
          style={{ color: pct >= 80 ? '#99BC85' : pct >= 40 ? '#7DAACB' : '#bbb' }}
        >
          {pct}%
        </span>
        <span className="export-progress-label">{label}</span>
      </div>

      {/* ── Share URL bar (appears after generating link) ── */}
      {shareUrl && (
        <div className="export-share-bar">
          <span className="export-share-bar-label">{no ? 'Delingslenke' : 'Share link'}</span>
          <span className="export-share-bar-url">{shareUrl}</span>
          <button className="export-share-bar-copy" onClick={handleCopyLink}>
            {copied ? (no ? '✓ Kopiert' : '✓ Copied') : (no ? '⎘ Kopier' : '⎘ Copy')}
          </button>
          <a href={shareUrl} target="_blank" rel="noopener noreferrer" className="export-share-bar-open">
            {no ? 'Åpne ↗' : 'Open ↗'}
          </a>
          <button className="export-share-bar-close" onClick={() => setShareUrl('')}>×</button>
        </div>
      )}

      {/* ── Actions row ── */}
      <div className="export-actions-row">
        <div className="export-left">
          <span className="export-logo">CV Generator</span>
          {exportStatus && <span className="export-status">{exportStatus}</span>}
        </div>

        <div className="export-right">
          <button className="export-btn export-btn--preview" onClick={onPreview}>
            {no ? 'Forhåndsvis' : 'Preview'}
          </button>

          <FormatControl name="pdf"  label="PDF"  onPick={handlePdf} />
          <FormatControl name="docx" label="Word" onPick={handleDocx} />

          <div className="export-menu-wrap">
            <button
              className="export-btn export-btn--email"
              onClick={() => toggleMenu('email')}
              disabled={exporting}
            >
              ✉ {no ? 'E-post' : 'Email'} ▾
            </button>
            {openMenu === 'email' && (
              <div className="export-menu">
                {exportLangs.map(l => (
                  <div key={l} className="export-menu-group">
                    {multi && <span className="export-menu-heading">{LANG_ENDONYM[l]}</span>}
                    <button onClick={() => handleEmail(l, 'pdf')}>{no ? 'Legg ved PDF' : 'Attach PDF'}</button>
                    <button onClick={() => handleEmail(l, 'docx')}>{no ? 'Legg ved Word' : 'Attach Word'}</button>
                    <button onClick={() => handleEmail(l, 'both')}>{no ? 'Legg ved begge' : 'Attach Both'}</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            className="export-btn export-btn--share"
            onClick={handleShare}
            disabled={sharing || exporting}
            title={no
              ? `Deler ${LANG_ENDONYM[contentLang]}-versjonen`
              : `Shares the ${LANG_ENDONYM[contentLang]} version`}
          >
            {sharing ? '…' : shareUrl ? (no ? '↻ Ny lenke' : '↻ New link') : (no ? '⤷ Del' : '⤷ Share')}
          </button>
        </div>
      </div>

    </footer>
  )
}
