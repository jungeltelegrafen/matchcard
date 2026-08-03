'use client'
import './share.css'
import { useState, Fragment } from 'react'
import { getL } from '@/apps/cv-generator/src/utils/labels'

// Turn a stored playback URL into an embeddable src (or null → external link).
function videoEmbed(url) {
  if (!url) return null
  if (url.includes('videodelivery.net') || url.includes('cloudflarestream.com')) return url
  const vimeo = url.match(/vimeo\.com\/(\d+)/)
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}?autoplay=1`
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/)
  if (yt) return `https://www.youtube.com/embed/${yt[1]}?autoplay=1`
  return null
}
const isDirectVideo = url => /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url || '')

function placementLabel(pl, lang) {
  const no = lang === 'no', es = lang === 'es'
  return {
    intro:      no ? 'Introduksjon' : es ? 'Introducción' : 'Introduction',
    motivation: no ? 'Motivasjon'   : es ? 'Motivación'   : 'Motivation',
    experience: no ? 'Erfaring'     : es ? 'Experiencia'  : 'Experience',
    general:    no ? 'Generell'     : es ? 'General'      : 'General',
  }[pl] || ''
}

// Read-only share view. Mirrors the PDF/DOCX exports field-for-field (see
// renderers/pdf/*), localized via getL — keep in sync with the schema in
// lib/cv/schema.js.
export default function ShareCV({ cv, lang = 'en' }) {
  const [copied, setCopied] = useState(false)
  const [playing, setPlaying] = useState(null)
  const lb = getL(lang)

  const {
    personal = {},
    experience = [],
    education = [],
    skills = [],
    languages = [],
    certifications = [],
    courses = [],
    positions = {},
    competences = {},
    portfolio = [],
    videos = [],
    cvType = 'technical',
  } = cv

  const mgmt = cvType === 'management'
  const showContact = personal.showContactInfo !== false
  const fullName = [personal.firstName, personal.lastName].filter(Boolean).join(' ')

  // Only hosted (http) videos resolve for a viewer — session blob: clips don't
  // (matches CVVideos.jsx / buildVideos.js).
  const videoItems = (videos || []).filter(v => /^https?:\/\//.test(v.playbackUrl || ''))
  const positionItems = positions?.enabled ? (positions.items || []) : []
  const positionsFull = positions?.useProjectFormat
  const competencesSimple = competences?.simpleFormat
  const competenceItems = competences?.enabled
    ? (competences.items || []).filter(c => c.requirement?.trim())
    : []
  const portfolioItems = (portfolio || []).filter(p => p.url || p.label)

  function handlePrint() { window.print() }
  function handleCopy() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  // Header meta rows (mirrors CVHeader.jsx order); phone/email/linkedin gated by
  // showContactInfo so shared links honor "hide contact info".
  const metaRows = [
    [lb.address, personal.location],
    [lb.educationSummary, personal.educationSummary],
    [lb.itSince, personal.itExperienceSince],
    ...(showContact ? [
      [lb.phone, personal.phone],
      [lb.email, personal.email],
    ] : []),
    [lb.availableFrom, personal.availableFrom],
    [lb.workPreference, personal.workPreference],
  ].filter(([, v]) => v)

  return (
    <div className="share-page">

      {/* Top bar — hidden on print */}
      <header className="share-topbar no-print">
        <span className="share-brand">matchcard</span>
        <div className="share-topbar-actions">
          <button className="share-topbar-btn share-topbar-btn--copy" onClick={handleCopy}>
            {copied ? '✓ Copied' : '⎘ Copy link'}
          </button>
          <button className="share-topbar-btn share-topbar-btn--pdf" onClick={handlePrint}>
            ↓ Download PDF
          </button>
        </div>
      </header>

      {/* CV sheet */}
      <main className="cv-sheet">

        {/* Header */}
        <div className="cv-sheet-head">
          <h1 className="cv-sheet-name">{fullName}</h1>
          {personal.title && <p className="cv-sheet-title">{personal.title}</p>}
          <div className="cv-sheet-meta">
            {metaRows.map(([label, value]) => (
              <div key={label} className="cv-sheet-meta-row">
                <span className="cv-sheet-meta-label">{label}</span>
                <span className="cv-sheet-meta-value">{value}</span>
              </div>
            ))}
            {showContact && personal.linkedin && (
              <div className="cv-sheet-meta-row">
                <span className="cv-sheet-meta-label">{lb.linkedin}</span>
                <a className="cv-sheet-meta-value" href={personal.linkedin} target="_blank" rel="noopener noreferrer">
                  {personal.linkedin.replace(/^https?:\/\//, '')}
                </a>
              </div>
            )}
          </div>
        </div>

        {personal.summary && (
          <section className="cv-section">
            <h2 className="cv-section-title">{lb.summary}</h2>
            <p className="cv-summary-text">{personal.summary}</p>
          </section>
        )}

        {videoItems.length > 0 && (
          <section className="cv-section">
            <h2 className="cv-section-title">{lb.videos}</h2>
            <div className="cv-share-videos">
              {videoItems.map((v, i) => {
                const embed = videoEmbed(v.playbackUrl)
                const active = playing === i
                const pl = placementLabel(v.placement, lang)
                return (
                  <div key={i} className="cv-share-video">
                    <div className="cv-share-video-info">
                      {pl && <span className="cv-share-video-tag">{pl}</span>}
                      <span className="cv-share-video-title">{v.title || 'Video'}</span>
                      {v.description && <p className="cv-share-video-desc">{v.description}</p>}
                    </div>
                    {active && embed ? (
                      <iframe className="cv-share-video-frame" src={embed}
                        allow="autoplay; fullscreen; picture-in-picture" allowFullScreen title={v.title || 'video'} />
                    ) : active && isDirectVideo(v.playbackUrl) ? (
                      <video className="cv-share-video-frame" src={v.playbackUrl} controls autoPlay />
                    ) : (embed || isDirectVideo(v.playbackUrl)) ? (
                      <button className="cv-share-video-play" onClick={() => setPlaying(i)}>{lb.watchVideo}</button>
                    ) : (
                      <a className="cv-share-video-play" href={v.playbackUrl} target="_blank" rel="noopener noreferrer">
                        {lb.watchVideo} ↗
                      </a>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {competenceItems.length > 0 && (
          <section className="cv-section">
            <h2 className="cv-section-title">
              {competences.projectLabel ? `${lb.competences} — ${competences.projectLabel}` : lb.competences}
            </h2>
            <div className="cv-comp-cards">
              {competenceItems.map((c, i) => {
                const n = parseInt(c.level) || 0
                return (
                  <div key={i} className="cv-comp-card">
                    <div className="cv-comp-req">{c.requirement}</div>
                    {!competencesSimple && (
                    <div className="cv-comp-meta">
                      {n > 0 && (
                        <span className="cv-comp-chip">
                          <span className="cv-comp-chip-label">{lb.levelLabel}</span>
                          <span className="cv-comp-dots">
                            {[1,2,3,4,5].map(d => (
                              <span key={d} className={`cv-comp-dot${d <= n ? ' on' : ''}`} />
                            ))}
                          </span>
                        </span>
                      )}
                      {c.lastUsed && <span className="cv-comp-chip"><span className="cv-comp-chip-label">{lb.lastUsed}</span> {c.lastUsed}</span>}
                      {c.yearsRelevant && <span className="cv-comp-chip"><span className="cv-comp-chip-label">{lb.totalYears}</span> {c.yearsRelevant}</span>}
                      {c.projects && <span className="cv-comp-chip"><span className="cv-comp-chip-label">{lb.projects}</span> {c.projects}</span>}
                    </div>
                    )}
                    {c.detail && <p className="cv-comp-detail">{c.detail}</p>}
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {experience.length > 0 && (
          <section className="cv-section">
            <h2 className="cv-section-title">{lb.experience}</h2>
            {experience.map((exp, i) => (
              <div key={i} className="cv-entry">
                <div className="cv-entry-meta">
                  <span className="cv-entry-role">{exp.role}</span>
                  {exp.company && <><span className="cv-entry-sep">·</span><span className="cv-entry-company">{exp.company}{exp.location ? `, ${exp.location}` : ''}</span></>}
                  <span className="cv-entry-dates">
                    {exp.startDate}{(exp.startDate || exp.endDate) ? ` – ${exp.endDate || lb.present}` : ''}
                  </span>
                </div>
                {exp.description && <p className="cv-entry-desc">{exp.description}</p>}
                {exp.bullets?.filter(Boolean).length > 0 && (
                  <ul className="cv-entry-bullets">
                    {exp.bullets.filter(Boolean).map((b, j) => <li key={j}>{b}</li>)}
                  </ul>
                )}
                {!mgmt && exp.technologies && (
                  <p className="cv-entry-tech"><span className="cv-entry-tech-label">{lb.technologies}: </span>{exp.technologies}</p>
                )}
                {mgmt && exp.methodologies && (
                  <p className="cv-entry-tech"><span className="cv-entry-tech-label">{lb.methodologies}: </span>{exp.methodologies}</p>
                )}
                {mgmt && exp.result && (
                  <p className="cv-entry-tech"><span className="cv-entry-tech-label">{lb.result}: </span>{exp.result}</p>
                )}
              </div>
            ))}
          </section>
        )}

        {positionItems.length > 0 && (
          <section className="cv-section">
            <h2 className="cv-section-title">{lb.positions}</h2>
            {positionItems.map((p, i) => (
              <div key={i} className="cv-entry">
                <div className="cv-entry-meta">
                  <span className="cv-entry-role">{p.title}</span>
                  {p.company && <><span className="cv-entry-sep">·</span><span className="cv-entry-company">{p.company}</span></>}
                  {(p.startDate || p.endDate) && (
                    <span className="cv-entry-dates">{[p.startDate, p.endDate].filter(Boolean).join(' – ')}</span>
                  )}
                </div>
                {p.description && <p className="cv-entry-desc">{p.description}</p>}
                {positionsFull && p.bullets?.filter(Boolean).length > 0 && (
                  <ul className="cv-entry-bullets">
                    {p.bullets.filter(Boolean).map((b, j) => <li key={j}>{b}</li>)}
                  </ul>
                )}
                {positionsFull && p.technologies && (
                  <p className="cv-entry-tech"><span className="cv-entry-tech-label">{lb.technologies}: </span>{p.technologies}</p>
                )}
                {positionsFull && p.methodologies && (
                  <p className="cv-entry-tech"><span className="cv-entry-tech-label">{lb.methodologies}: </span>{p.methodologies}</p>
                )}
              </div>
            ))}
          </section>
        )}

        {education.length > 0 && (
          <section className="cv-section">
            <h2 className="cv-section-title">{lb.education}</h2>
            {education.map((edu, i) => (
              <div key={i} className="cv-entry cv-entry--inline">
                <span className="cv-entry-role">{[edu.degree, edu.field].filter(Boolean).join(', ')}</span>
                {edu.institution && <><span className="cv-entry-sep">·</span><span className="cv-entry-company">{edu.institution}</span></>}
                {edu.startDate && (
                  <span className="cv-entry-dates">{edu.startDate}{edu.endDate ? ` – ${edu.endDate}` : ''}</span>
                )}
              </div>
            ))}
          </section>
        )}

        {skills.length > 0 && (
          <section className="cv-section">
            <h2 className="cv-section-title">{lb.skills}</h2>
            <div className="cv-skills">
              {skills.map((group, i) => (
                <div key={i} className="cv-skills-row">
                  {group.category && <span className="cv-skills-group">{group.category}</span>}
                  <span className="cv-skills-items">{group.items?.filter(Boolean).join(', ')}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {certifications.length > 0 && (
          <section className="cv-section">
            <h2 className="cv-section-title">{lb.certifications}</h2>
            {certifications.map((c, i) => (
              <div key={i} className="cv-entry cv-entry--inline">
                <span className="cv-entry-role">{c.name}</span>
                {c.issuer && <><span className="cv-entry-sep">·</span><span className="cv-entry-company">{c.issuer}</span></>}
                {c.year && <span className="cv-entry-dates">{c.year}</span>}
              </div>
            ))}
          </section>
        )}

        {courses.length > 0 && (
          <section className="cv-section">
            <h2 className="cv-section-title">{lb.courses}</h2>
            {courses.map((c, i) => (
              <div key={i} className="cv-entry cv-entry--inline">
                <span className="cv-entry-role">{c.name}</span>
                {c.institution && <><span className="cv-entry-sep">·</span><span className="cv-entry-company">{c.institution}</span></>}
                {c.year && <span className="cv-entry-dates">{c.year}</span>}
              </div>
            ))}
          </section>
        )}

        {languages.length > 0 && (
          <section className="cv-section">
            <h2 className="cv-section-title">{lb.languages}</h2>
            <div className="cv-langs">
              {languages.map((l, i) => (
                <span key={i} className="cv-lang-item">
                  {l.language}{l.proficiency ? ` — ${l.proficiency}` : ''}
                </span>
              ))}
            </div>
          </section>
        )}

        {portfolioItems.length > 0 && (
          <section className="cv-section">
            <h2 className="cv-section-title">{lb.portfolio}</h2>
            {portfolioItems.map((p, i) => (
              <div key={i} className="cv-entry cv-entry--inline">
                {p.url
                  ? <a className="cv-portfolio-link" href={p.url} target="_blank" rel="noopener noreferrer">{p.label || p.url}</a>
                  : <span className="cv-entry-role">{p.label}</span>}
                {p.description && <><span className="cv-entry-sep">·</span><span className="cv-entry-company">{p.description}</span></>}
              </div>
            ))}
          </section>
        )}

      </main>
    </div>
  )
}
