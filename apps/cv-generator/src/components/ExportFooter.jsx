import { useState } from 'react'
import React from 'react'
import { pdf } from '@react-pdf/renderer'
import { saveAs } from 'file-saver'
import CVDocument from '../renderers/pdf/CVDocument'
import { downloadDocx } from '../renderers/docx/buildDocument'
import { downloadEmail } from '../utils/generateEmail'
import { translateCv } from '../utils/parseWithClaude'

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

function scoreLabel(pct) {
  if (pct < 30)  return 'Start adding your information'
  if (pct < 60)  return 'Good start — keep going'
  if (pct < 85)  return 'Almost there'
  return 'CV complete ✓'
}

function barColor(pct) {
  if (pct === 0) return 'transparent'
  return 'linear-gradient(to right, #D9CFC7, #7DAACB 50%, #99BC85)'
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ExportFooter({ cv, filename, lang, onPreview }) {
  const [exporting,    setExporting]    = useState(false)
  const [emailMenuOpen, setEmailMenuOpen] = useState(false)
  const [exportStatus,  setExportStatus]  = useState('')
  const [shareUrl,      setShareUrl]      = useState('')
  const [sharing,       setSharing]       = useState(false)

  const pct   = Math.round(computeCvScore(cv) * 100)
  const label = scoreLabel(pct)

  async function getOutputCv() {
    return translateCv(cv, lang)
  }

  async function run(statusMsg, fn) {
    setExporting(true)
    setEmailMenuOpen(false)
    setExportStatus(statusMsg)
    try {
      const exportCv = await getOutputCv()
      await fn(exportCv)
    } catch (err) {
      console.error(err)
      setExportStatus('Error — check console')
      setTimeout(() => setExportStatus(''), 3000)
      setExporting(false)
      return
    }
    setExportStatus('')
    setExporting(false)
  }

  function handlePdf() {
    run('Preparing PDF…', async exportCv => {
      const blob = await pdf(React.createElement(CVDocument, { data: exportCv, lang })).toBlob()
      saveAs(blob, `${filename}.pdf`)
    })
  }

  function handleDocx() {
    run('Preparing Word…', exportCv => downloadDocx(exportCv, `${filename}.docx`, lang))
  }

  function handleEmail(attachFormat) {
    run('Preparing email…', exportCv => downloadEmail(exportCv, filename, attachFormat, lang))
  }

  async function handleShare() {
    setSharing(true)
    setShareUrl('')
    try {
      const exportCv = await getOutputCv()
      const res = await fetch('/api/cv/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cv: exportCv, lang, filename }),
      })
      if (!res.ok) throw new Error('Share failed')
      const { url } = await res.json()
      setShareUrl(url)
      navigator.clipboard.writeText(url).catch(() => {})
    } catch (err) {
      console.error(err)
      setExportStatus('Share failed')
      setTimeout(() => setExportStatus(''), 3000)
    } finally {
      setSharing(false)
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

      {/* ── Actions row ── */}
      <div className="export-actions-row">
        <div className="export-left">
          <span className="export-logo">CV Generator</span>
          {exportStatus && <span className="export-status">{exportStatus}</span>}
        </div>

        <div className="export-right">
          <button className="export-btn export-btn--preview" onClick={onPreview}>
            Preview
          </button>
          <button className="export-btn export-btn--pdf"  onClick={handlePdf}  disabled={exporting}>↓ PDF</button>
          <button className="export-btn export-btn--docx" onClick={handleDocx} disabled={exporting}>↓ Word</button>

          <div className="export-email-wrap">
            <button
              className="export-btn export-btn--email"
              onClick={() => setEmailMenuOpen(v => !v)}
              disabled={exporting}
            >
              ✉ Email ▾
            </button>
            {emailMenuOpen && (
              <div className="email-menu">
                <button onClick={() => handleEmail('pdf')}>Attach PDF</button>
                <button onClick={() => handleEmail('docx')}>Attach Word</button>
                <button onClick={() => handleEmail('both')}>Attach Both</button>
              </div>
            )}
          </div>

          <div className="export-share-wrap">
            <button
              className="export-btn export-btn--share"
              onClick={shareUrl ? () => { navigator.clipboard.writeText(shareUrl) } : handleShare}
              disabled={sharing || exporting}
            >
              {sharing ? '…' : shareUrl ? '⎘ Copy link' : '⤷ Share'}
            </button>
            {shareUrl && (
              <div className="share-url-toast">
                <span className="share-url-text">{shareUrl}</span>
                <a href={shareUrl} target="_blank" rel="noopener noreferrer" className="share-url-open">Open ↗</a>
              </div>
            )}
          </div>
        </div>
      </div>

    </footer>
  )
}
