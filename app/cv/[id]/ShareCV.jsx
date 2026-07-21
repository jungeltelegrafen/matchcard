'use client'
import './share.css'
import { useState } from 'react'

export default function ShareCV({ cv, filename }) {
  const [copied, setCopied] = useState(false)

  const { personal = {}, experience = [], education = [], skills = [], languages = [], certifications = [], positions = [] } = cv
  const fullName = [personal.firstName, personal.lastName].filter(Boolean).join(' ')

  function handlePrint() {
    window.print()
  }

  function handleCopy() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

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
          <div className="cv-sheet-contacts">
            {personal.email    && <span>{personal.email}</span>}
            {personal.phone    && <span>{personal.phone}</span>}
            {personal.location && <span>{personal.location}</span>}
            {personal.linkedIn && (
              <a href={personal.linkedIn} target="_blank" rel="noopener noreferrer">LinkedIn</a>
            )}
          </div>
        </div>

        {personal.summary && (
          <section className="cv-section">
            <h2 className="cv-section-title">Profile</h2>
            <p className="cv-summary-text">{personal.summary}</p>
          </section>
        )}

        {experience.length > 0 && (
          <section className="cv-section">
            <h2 className="cv-section-title">Experience</h2>
            {experience.map((exp, i) => (
              <div key={i} className="cv-entry">
                <div className="cv-entry-meta">
                  <span className="cv-entry-role">{exp.role}</span>
                  <span className="cv-entry-sep">·</span>
                  <span className="cv-entry-company">{exp.company}</span>
                  <span className="cv-entry-dates">
                    {exp.startDate} – {exp.endDate || 'Present'}
                  </span>
                </div>
                {exp.bullets?.filter(Boolean).length > 0 && (
                  <ul className="cv-entry-bullets">
                    {exp.bullets.filter(Boolean).map((b, j) => <li key={j}>{b}</li>)}
                  </ul>
                )}
              </div>
            ))}
          </section>
        )}

        {positions.length > 0 && (
          <section className="cv-section">
            <h2 className="cv-section-title">Positions</h2>
            {positions.map((p, i) => (
              <div key={i} className="cv-entry cv-entry--inline">
                <span className="cv-entry-role">{p.role}</span>
                {p.org && <><span className="cv-entry-sep">·</span><span className="cv-entry-company">{p.org}</span></>}
                {p.year && <span className="cv-entry-dates">{p.year}</span>}
              </div>
            ))}
          </section>
        )}

        {education.length > 0 && (
          <section className="cv-section">
            <h2 className="cv-section-title">Education</h2>
            {education.map((edu, i) => (
              <div key={i} className="cv-entry cv-entry--inline">
                <span className="cv-entry-role">{edu.degree}</span>
                {edu.institution && <><span className="cv-entry-sep">·</span><span className="cv-entry-company">{edu.institution}</span></>}
                {edu.startDate && (
                  <span className="cv-entry-dates">
                    {edu.startDate}{edu.endDate ? ` – ${edu.endDate}` : ''}
                  </span>
                )}
              </div>
            ))}
          </section>
        )}

        {skills.length > 0 && (
          <section className="cv-section">
            <h2 className="cv-section-title">Skills</h2>
            <div className="cv-skills">
              {skills.map((group, i) => (
                <div key={i} className="cv-skills-row">
                  {group.group && <span className="cv-skills-group">{group.group}</span>}
                  <span className="cv-skills-items">{group.items?.filter(Boolean).join(', ')}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {languages.length > 0 && (
          <section className="cv-section">
            <h2 className="cv-section-title">Languages</h2>
            <div className="cv-langs">
              {languages.map((l, i) => (
                <span key={i} className="cv-lang-item">
                  {l.language}{l.level ? ` — ${l.level}` : ''}
                </span>
              ))}
            </div>
          </section>
        )}

        {certifications.length > 0 && (
          <section className="cv-section">
            <h2 className="cv-section-title">Certifications</h2>
            {certifications.map((c, i) => (
              <div key={i} className="cv-entry cv-entry--inline">
                <span className="cv-entry-role">{c.name}</span>
                {c.issuer && <><span className="cv-entry-sep">·</span><span className="cv-entry-company">{c.issuer}</span></>}
                {c.date && <span className="cv-entry-dates">{c.date}</span>}
              </div>
            ))}
          </section>
        )}

      </main>
    </div>
  )
}
