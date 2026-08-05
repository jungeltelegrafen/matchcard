import { useState, useRef, useEffect } from 'react'
import { saveAs } from 'file-saver'
import { renderPdfBlob } from '../utils/renderPdf'
import { downloadDocx } from '../renderers/docx/buildDocument'
import { downloadEmail } from '../utils/generateEmail'
import { cvHasContent } from '@lib/cv/schema'
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

export default function ExportFooter({ cvByLang, contentLang, uiLang, filename, offer, branding, onPreview, onContentLangChange, onOpenOffer, recordShares = [], onRecordShareCreated, onSyncVideos }) {
  const [exporting,     setExporting]     = useState(false)
  const [emailOpen,     setEmailOpen]     = useState(false)
  const [exportStatus,  setExportStatus]  = useState('')
  const [shareUrl,      setShareUrl]      = useState('')
  const [recordUrl,     setRecordUrl]     = useState('')
  const [sharing,       setSharing]       = useState(false)
  const [syncing,       setSyncing]       = useState(false)
  const [syncMsg,       setSyncMsg]       = useState('')
  const [copied,        setCopied]        = useState(false)
  const emailRef = useRef(null)

  const no = uiLang === 'no'
  const cv = cvByLang[contentLang]
  const pct   = Math.round(computeCvScore(cv) * 100)
  const label = scoreLabel(pct, no)

  // Export is WYSIWYG: everything exports the language currently being viewed
  // (`contentLang`). The footer language toggle switches which language that is,
  // offering every language that has content plus the current one.
  const toggleLangs = LANGS.filter(l => l === contentLang || cvHasContent(cvByLang[l]))

  const fileFor = lang => `${filename}_${lang.toUpperCase()}`
  // Keep item `_id`s in the export/share output: videos anchored to an experience
  // reference it (`video.experienceId === experience._id`), and the anchor must
  // resolve in the PDF/DOCX/share renderers. `_id` is a harmless 8-char field the
  // renderers ignore. (AI/API paths still strip via their own stripIds calls.)
  const outputCv = lang => cvByLang[lang]

  // Close the email attach-format menu on outside click.
  useEffect(() => {
    if (!emailOpen) return
    function away(e) { if (emailRef.current && !emailRef.current.contains(e.target)) setEmailOpen(false) }
    document.addEventListener('mousedown', away)
    return () => document.removeEventListener('mousedown', away)
  }, [emailOpen])

  async function run(statusMsg, fn) {
    setExporting(true)
    setEmailOpen(false)
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

  function handlePdf() {
    run(no ? 'Klargjør PDF…' : 'Preparing PDF…', async () => {
      const blob = await renderPdfBlob(outputCv(contentLang), contentLang, branding)
      saveAs(blob, `${fileFor(contentLang)}.pdf`)
    })
  }

  function handleDocx() {
    run(no ? 'Klargjør Word…' : 'Preparing Word…', () =>
      downloadDocx(outputCv(contentLang), `${fileFor(contentLang)}.docx`, contentLang, branding))
  }

  function handleEmail(attachFormat) {
    run(no ? 'Klargjør e-post…' : 'Preparing email…', () =>
      downloadEmail(outputCv(contentLang), fileFor(contentLang), attachFormat, contentLang, offer, branding))
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
        body: JSON.stringify({ cv: { ...outputCv(contentLang), branding }, lang: contentLang, filename: fileFor(contentLang) }),
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

  // Mint a record-invite link: a snapshot the consultant can record videos onto.
  async function handleRecordInvite() {
    setSharing(true)
    try {
      const res = await fetch('/api/cv/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cv: { ...outputCv(contentLang), branding }, lang: contentLang, filename: fileFor(contentLang), recordable: true }),
      })
      if (!res.ok) throw new Error('invite failed')
      const { id, recordUrl } = await res.json()
      setRecordUrl(recordUrl)
      // Remember the link so its recorded videos can be pulled back later.
      if (id) onRecordShareCreated?.({ id, lang: contentLang, filename: fileFor(contentLang), createdAt: Date.now() })
      navigator.clipboard.writeText(recordUrl).catch(() => {})
    } catch (err) {
      console.error(err)
      setExportStatus(no ? 'Kunne ikke lage opptakslenke' : 'Couldn’t create record link')
      setTimeout(() => setExportStatus(''), 3000)
    } finally {
      setSharing(false)
    }
  }

  // Pull videos consultants recorded on our invite links back into the editable
  // draft. Each invite link is a separate snapshot row; we read each one's videos
  // and merge the new ones (deduped by _id) into the working CV.
  async function handleSyncVideos() {
    if (!recordShares.length) return
    setSyncing(true)
    setSyncMsg('')
    try {
      const lists = await Promise.all(recordShares.map(async s => {
        try {
          const r = await fetch(`/api/cv/share?id=${encodeURIComponent(s.id)}`)
          if (!r.ok) return []
          const { cv } = await r.json()
          return Array.isArray(cv?.videos) ? cv.videos : []
        } catch { return [] }
      }))
      const byId = new Map()
      for (const v of lists.flat()) if (v && v._id) byId.set(v._id, v)
      const added = onSyncVideos?.(Array.from(byId.values())) || 0
      setSyncMsg(added > 0
        ? (no ? `✓ Hentet ${added} ny${added > 1 ? 'e' : ''} video${added > 1 ? 'er' : ''}` : `✓ Pulled ${added} new video${added > 1 ? 's' : ''}`)
        : (no ? 'Ingen nye videoer ennå' : 'No new videos yet'))
    } catch (err) {
      console.error(err)
      setSyncMsg(no ? 'Synk feilet' : 'Sync failed')
    } finally {
      setSyncing(false)
      setTimeout(() => setSyncMsg(''), 5000)
    }
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
        <div className="export-share-bar-wrap">
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
          <p className="export-share-bar-note">
            {no
              ? '📌 Lenken er et øyeblikksbilde av CV-en akkurat nå. Har du tatt opp en ny video eller endret noe? Klikk «↻ Ny lenke» for å dele oppdateringen — den gamle lenken beholder forrige versjon.'
              : '📌 This link is a snapshot of your CV as it is right now. Recorded a new video or made edits? Click “↻ New link” to share the update — the old link keeps the previous version.'}
          </p>
        </div>
      )}

      {/* ── Record-invite URL bar ── */}
      {recordUrl && (
        <div className="export-share-bar-wrap">
          <div className="export-share-bar">
            <span className="export-share-bar-label">{no ? 'Opptakslenke' : 'Record link'}</span>
            <span className="export-share-bar-url">{recordUrl}</span>
            <button className="export-share-bar-copy" onClick={() => navigator.clipboard.writeText(recordUrl).catch(() => {})}>
              {no ? '⎘ Kopier' : '⎘ Copy'}
            </button>
            <a href={recordUrl} target="_blank" rel="noopener noreferrer" className="export-share-bar-open">
              {no ? 'Åpne ↗' : 'Open ↗'}
            </a>
            <button className="export-share-bar-close" onClick={() => setRecordUrl('')}>×</button>
          </div>
          <p className="export-share-bar-note">
            {no
              ? '🎥 Send denne til konsulenten. De kan ta opp videoer som lagres på denne CV-en — du ser dem på den vanlige delingslenken.'
              : '🎥 Send this to the consultant — they can record videos that save onto this CV. You’ll see them on the normal share link.'}
          </p>
        </div>
      )}

      {/* ── Actions row ── */}
      <div className="export-actions-row">
        <div className="export-left">
          <span className="export-logo">CV Generator</span>
          {exportStatus && <span className="export-status">{exportStatus}</span>}
        </div>

        <div className="export-right">
          {/* Export language — WYSIWYG: everything below exports this language. */}
          {toggleLangs.length > 1 && (
            <div className="export-lang-toggle" title={no ? 'Språk for eksport' : 'Export language'}>
              {toggleLangs.map(l => (
                <button
                  key={l}
                  className={`export-lang-btn${l === contentLang ? ' active' : ''}`}
                  onClick={() => onContentLangChange?.(l)}
                  disabled={exporting}
                >
                  {LANG_ENDONYM[l]}
                </button>
              ))}
            </div>
          )}

          <button className="export-btn export-btn--preview" onClick={onPreview}>
            {no ? 'Forhåndsvis' : 'Preview'}
          </button>

          <button className="export-btn export-btn--pdf" onClick={handlePdf} disabled={exporting}>
            ↓ PDF
          </button>
          <button className="export-btn export-btn--docx" onClick={handleDocx} disabled={exporting}>
            ↓ Word
          </button>

          <button className="export-btn export-btn--offer" onClick={onOpenOffer}>
            ✉ {no ? 'E-posttilbud' : 'Email Offer'}
          </button>

          <div className="export-menu-wrap" ref={emailRef}>
            <button
              className="export-btn export-btn--email"
              onClick={() => setEmailOpen(o => !o)}
              disabled={exporting}
            >
              ✉ {no ? 'E-posteksport' : 'Email Export'} ▾
            </button>
            {emailOpen && (
              <div className="export-menu">
                <button onClick={() => handleEmail('pdf')}>{no ? 'Legg ved PDF' : 'Attach PDF'}</button>
                <button onClick={() => handleEmail('docx')}>{no ? 'Legg ved Word' : 'Attach Word'}</button>
                <button onClick={() => handleEmail('both')}>{no ? 'Legg ved begge' : 'Attach Both'}</button>
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

          <button
            className="export-btn export-btn--share"
            onClick={handleRecordInvite}
            disabled={sharing || exporting}
            title={no
              ? 'Lag en lenke der konsulenten kan ta opp video som lagres på CV-en'
              : 'Create a link where the consultant can record a video that saves onto the CV'}
          >
            {no ? '🎥 Invitér til opptak' : '🎥 Invite to record'}
          </button>

          {recordShares.length > 0 && (
            <button
              className="export-btn export-btn--share"
              onClick={handleSyncVideos}
              disabled={syncing || exporting}
              title={no
                ? 'Hent videoer konsulenten har tatt opp via opptakslenken(e) inn i denne CV-en'
                : 'Pull videos the consultant recorded via your invite link(s) into this CV'}
            >
              {syncing ? '…' : (no ? '↻ Hent videoer' : '↻ Sync videos')}
            </button>
          )}
          {syncMsg && <span className="export-status">{syncMsg}</span>}
        </div>
      </div>

    </footer>
  )
}
