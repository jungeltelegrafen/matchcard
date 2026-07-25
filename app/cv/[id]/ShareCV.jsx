'use client'
import './share.css'
import { useState } from 'react'

// Read-only share view. Field names follow the canonical CV schema in
// lib/cv/schema.js — if a section or field is added there, add it here too.
export default function ShareCV({ cv, lang = 'en' }) {
  const [copied, setCopied] = useState(false)

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
  } = cv

  const no = lang === 'no'
  const fullName = [personal.firstName, personal.lastName].filter(Boolean).join(' ')
  const positionItems = positions?.enabled ? (positions.items || []) : []
  const competenceItems = competences?.enabled
    ? (competences.items || []).filter(c => c.requirement?.trim())
    : []
  const portfolioItems = (portfolio || []).filter(p => p.url || p.label)

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
            {personal.linkedin && (
              <a href={personal.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn</a>
            )}
          </div>
        </div>

        {personal.summary && (
          <section className="cv-section">
            <h2 className="cv-section-title">{no ? 'Profil' : 'Profile'}</h2>
            <p className="cv-summary-text">{personal.summary}</p>
          </section>
        )}

        {competenceItems.length > 0 && (
          <section className="cv-section">
            <h2 className="cv-section-title">
              {competences.projectLabel
                ? (no ? `Kompetanse for ${competences.projectLabel}` : `Key Competences for ${competences.projectLabel}`)
                : (no ? 'Nøkkelkompetanse' : 'Key Competences')}
            </h2>
            <table className="cv-comp-table">
              <thead>
                <tr>
                  <th>{no ? 'Kompetanse' : 'Competence'}</th>
                  <th>{no ? 'Nivå' : 'Level'}</th>
                  <th>{no ? 'Sist brukt' : 'Last used'}</th>
                  <th>{no ? 'Antall år' : 'Years'}</th>
                  <th>{no ? 'Prosjekter' : 'Projects'}</th>
                </tr>
              </thead>
              <tbody>
                {competenceItems.map((c, i) => (
                  <tr key={i}>
                    <td className="cv-comp-name">{c.requirement}</td>
                    <td>{c.level ? `${c.level}/5` : ''}</td>
                    <td>{c.lastUsed}</td>
                    <td>{c.yearsRelevant}</td>
                    <td>{c.projects}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {experience.length > 0 && (
          <section className="cv-section">
            <h2 className="cv-section-title">{no ? 'Prosjekterfaring' : 'Experience'}</h2>
            {experience.map((exp, i) => (
              <div key={i} className="cv-entry">
                <div className="cv-entry-meta">
                  <span className="cv-entry-role">{exp.role}</span>
                  {exp.company && <><span className="cv-entry-sep">·</span><span className="cv-entry-company">{exp.company}</span></>}
                  <span className="cv-entry-dates">
                    {exp.startDate} – {exp.endDate || (no ? 'Nå' : 'Present')}
                  </span>
                </div>
                {exp.description && <p className="cv-entry-desc">{exp.description}</p>}
                {exp.bullets?.filter(Boolean).length > 0 && (
                  <ul className="cv-entry-bullets">
                    {exp.bullets.filter(Boolean).map((b, j) => <li key={j}>{b}</li>)}
                  </ul>
                )}
                {exp.technologies && (
                  <p className="cv-entry-tech">
                    <span className="cv-entry-tech-label">{no ? 'Teknologier: ' : 'Technologies: '}</span>
                    {exp.technologies}
                  </p>
                )}
              </div>
            ))}
          </section>
        )}

        {positionItems.length > 0 && (
          <section className="cv-section">
            <h2 className="cv-section-title">{no ? 'Verv og stillinger' : 'Positions'}</h2>
            {positionItems.map((p, i) => (
              <div key={i} className="cv-entry cv-entry--inline">
                <span className="cv-entry-role">{p.title}</span>
                {p.company && <><span className="cv-entry-sep">·</span><span className="cv-entry-company">{p.company}</span></>}
                {(p.startDate || p.endDate) && (
                  <span className="cv-entry-dates">
                    {p.startDate}{p.endDate ? ` – ${p.endDate}` : ''}
                  </span>
                )}
              </div>
            ))}
          </section>
        )}

        {education.length > 0 && (
          <section className="cv-section">
            <h2 className="cv-section-title">{no ? 'Utdanning' : 'Education'}</h2>
            {education.map((edu, i) => (
              <div key={i} className="cv-entry cv-entry--inline">
                <span className="cv-entry-role">
                  {[edu.degree, edu.field].filter(Boolean).join(', ')}
                </span>
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
            <h2 className="cv-section-title">{no ? 'Ferdigheter' : 'Skills'}</h2>
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
            <h2 className="cv-section-title">{no ? 'Sertifiseringer' : 'Certifications'}</h2>
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
            <h2 className="cv-section-title">{no ? 'Kurs' : 'Courses'}</h2>
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
            <h2 className="cv-section-title">{no ? 'Språk' : 'Languages'}</h2>
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
            <h2 className="cv-section-title">{no ? 'Portefølje og lenker' : 'Portfolio & Links'}</h2>
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
