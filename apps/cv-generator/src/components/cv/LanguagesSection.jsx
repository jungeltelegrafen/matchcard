import { useState } from 'react'
import { getL } from '../../utils/labels'

export default function LanguagesSection({ items, lang = 'en', onChange }) {
  const lb = getL(lang)
  const [newLang, setNewLang] = useState({ language: '', proficiency: '' })

  function addLanguage() {
    if (!newLang.language.trim()) return
    onChange([...items, { ...newLang }])
    setNewLang({ language: '', proficiency: '' })
  }

  function removeLanguage(i) { onChange(items.filter((_, idx) => idx !== i)) }

  return (
    <section className="cv-section">
      <div className="cv-section-heading"><span>{lb.languages}</span></div>

      <div className="cv-skills-tags" style={{ marginBottom: 12 }}>
        {items.map((l, i) => (
          <span key={i} className="cv-skill-tag cv-lang-tag">
            {l.language}{l.proficiency ? ` (${l.proficiency})` : ''}
            <button onClick={() => removeLanguage(i)}>×</button>
          </span>
        ))}
      </div>

      <div className="cv-lang-add-row">
        <input className="cv-lang-input" value={newLang.language}
          placeholder={lang === 'no' ? 'Språk' : 'Language'}
          onChange={e => setNewLang(l => ({ ...l, language: e.target.value }))}
          onKeyDown={e => e.key === 'Enter' && addLanguage()} />
        <input className="cv-lang-input" value={newLang.proficiency}
          placeholder={lang === 'no' ? 'Nivå (f.eks. Morsmål, C1)' : 'Proficiency (e.g. Native, C1)'}
          onChange={e => setNewLang(l => ({ ...l, proficiency: e.target.value }))}
          onKeyDown={e => e.key === 'Enter' && addLanguage()} />
        <button className="cv-btn-add-minor" onClick={addLanguage}>{lb.addLanguageBtn}</button>
      </div>
    </section>
  )
}
