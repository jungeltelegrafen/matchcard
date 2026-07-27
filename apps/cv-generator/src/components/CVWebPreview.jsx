import { getL } from '../utils/labels'

// Read-only, web-preview rendering of the CV — the same clean, legible layout a
// hiring manager sees on the shared CV page. Used as the reference pane in the
// recording studio so the person can read their CV while presenting.
export default function CVWebPreview({ cv = {}, lang = 'en' }) {
  const lb = getL(lang)
  const no = lang === 'no', es = lang === 'es'
  const p = cv.personal || {}
  const fullName = [p.firstName, p.lastName].filter(Boolean).join(' ')

  const experience = cv.experience || []
  const education  = cv.education || []
  const skills     = cv.skills || []
  const languages  = cv.languages || []
  const certs      = cv.certifications || []
  const courses    = cv.courses || []
  const portfolio  = (cv.portfolio || []).filter(x => x.url || x.label)
  const comp       = cv.competences || {}
  const compItems  = comp.enabled ? (comp.items || []).filter(c => c.requirement?.trim()) : []
  const positions  = cv.positions?.enabled ? (cv.positions.items || []) : []

  const tr = (n, s, e) => ({ no: n, es: s, en: e }[lang] || e)
  const present = tr('Nå', 'Actualidad', 'Present')

  const Section = ({ title, children }) => (
    <section className="cvweb-section">
      <h2 className="cvweb-h2">{title}</h2>
      {children}
    </section>
  )

  return (
    <div className="cvweb">
      <header className="cvweb-head">
        <h1 className="cvweb-name">{fullName || (no ? 'Navn' : es ? 'Nombre' : 'Your name')}</h1>
        {p.title && <p className="cvweb-title">{p.title}</p>}
        <div className="cvweb-contacts">
          {p.location && <span>{p.location}</span>}
          {p.email    && <span>{p.email}</span>}
          {p.phone    && <span>{p.phone}</span>}
          {p.linkedin && <span>LinkedIn</span>}
        </div>
      </header>

      {p.summary && (
        <Section title={no ? 'Profil' : es ? 'Perfil' : 'Profile'}>
          <p className="cvweb-summary">{p.summary}</p>
        </Section>
      )}

      {compItems.length > 0 && (
        <Section title={lb.competences}>
          <div className="cvweb-comps">
            {compItems.map((c, i) => (
              <div key={i} className="cvweb-comp">
                <span className="cvweb-comp-name">{c.requirement}</span>
                {c.level && <span className="cvweb-comp-level">{c.level}/5</span>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {experience.length > 0 && (
        <Section title={lb.experience}>
          {experience.map((e, i) => (
            <div key={i} className="cvweb-entry">
              <div className="cvweb-entry-top">
                <span className="cvweb-role">{e.role}</span>
                {e.company && <span className="cvweb-company">· {e.company}</span>}
                <span className="cvweb-dates">{e.startDate}{(e.startDate || e.endDate) ? ' – ' : ''}{e.endDate || (e.startDate ? present : '')}</span>
              </div>
              {e.description && <p className="cvweb-desc">{e.description}</p>}
              {(e.bullets || []).filter(Boolean).length > 0 && (
                <ul className="cvweb-bullets">
                  {e.bullets.filter(Boolean).map((b, j) => <li key={j}>{b}</li>)}
                </ul>
              )}
              {e.technologies && <p className="cvweb-tech">{e.technologies}</p>}
            </div>
          ))}
        </Section>
      )}

      {positions.length > 0 && (
        <Section title={no ? 'Verv' : es ? 'Cargos' : 'Positions'}>
          {positions.map((v, i) => (
            <div key={i} className="cvweb-entry cvweb-entry--inline">
              <span className="cvweb-role">{v.title}</span>
              {v.company && <span className="cvweb-company">· {v.company}</span>}
            </div>
          ))}
        </Section>
      )}

      {education.length > 0 && (
        <Section title={lb.education}>
          {education.map((e, i) => (
            <div key={i} className="cvweb-entry cvweb-entry--inline">
              <span className="cvweb-role">{[e.degree, e.field].filter(Boolean).join(', ')}</span>
              {e.institution && <span className="cvweb-company">· {e.institution}</span>}
              {(e.startDate || e.endDate) && <span className="cvweb-dates">{e.startDate}{e.endDate ? ` – ${e.endDate}` : ''}</span>}
            </div>
          ))}
        </Section>
      )}

      {skills.length > 0 && (
        <Section title={lb.skills}>
          <div className="cvweb-skills">
            {skills.map((g, i) => (
              <div key={i} className="cvweb-skillrow">
                {g.category && <span className="cvweb-skillcat">{g.category}</span>}
                <span>{(g.items || []).filter(Boolean).join(', ')}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {languages.length > 0 && (
        <Section title={lb.languages}>
          <p className="cvweb-langs">
            {languages.map((l, i) => `${l.language}${l.proficiency ? ` — ${l.proficiency}` : ''}`).join(' · ')}
          </p>
        </Section>
      )}

      {certs.length > 0 && (
        <Section title={lb.certifications}>
          {certs.map((c, i) => (
            <div key={i} className="cvweb-entry cvweb-entry--inline">
              <span className="cvweb-role">{c.name}</span>
              {c.issuer && <span className="cvweb-company">· {c.issuer}</span>}
              {c.year && <span className="cvweb-dates">{c.year}</span>}
            </div>
          ))}
        </Section>
      )}

      {courses.length > 0 && (
        <Section title={no ? 'Kurs' : es ? 'Cursos' : 'Courses'}>
          {courses.map((c, i) => (
            <div key={i} className="cvweb-entry cvweb-entry--inline">
              <span className="cvweb-role">{c.name}</span>
              {c.institution && <span className="cvweb-company">· {c.institution}</span>}
            </div>
          ))}
        </Section>
      )}

      {portfolio.length > 0 && (
        <Section title={no ? 'Portefølje' : es ? 'Portafolio' : 'Portfolio'}>
          {portfolio.map((x, i) => (
            <div key={i} className="cvweb-entry cvweb-entry--inline">
              <span className="cvweb-role">{x.label || x.url}</span>
            </div>
          ))}
        </Section>
      )}
    </div>
  )
}
