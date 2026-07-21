import { useState } from 'react'
import CVField from './CVField'
import { getL } from '../../utils/labels'

export default function SkillsSection({
  items, lang = 'en', meta,
  onFieldEdit, onAccept, onDismiss, onSkillsChange,
}) {
  const lb = getL(lang)
  const [newSkillInputs, setNewSkillInputs] = useState({})

  function addSkillItem(groupIdx, value) {
    if (!value.trim()) return
    onSkillsChange(items.map((g, i) =>
      i === groupIdx ? { ...g, items: [...g.items, value.trim()] } : g
    ))
    setNewSkillInputs(prev => ({ ...prev, [groupIdx]: '' }))
  }

  function removeSkillItem(groupIdx, itemIdx) {
    onSkillsChange(items.map((g, i) =>
      i === groupIdx ? { ...g, items: g.items.filter((_, j) => j !== itemIdx) } : g
    ))
  }

  function addGroup()     { onSkillsChange([...items, { category: '', items: [] }]) }
  function removeGroup(i) { onSkillsChange(items.filter((_, idx) => idx !== i)) }

  return (
    <section className="cv-section">
      <div className="cv-section-heading"><span>{lb.skills}</span></div>

      {items.map((group, i) => (
        <div key={i} className="cv-skills-group">
          <div className="cv-skills-group-header">
            <CVField value={group.category} path={`skills.${i}.category`}
              meta={meta} onEdit={onFieldEdit} onAccept={onAccept} onDismiss={onDismiss}
              className="cv-skills-category-field" placeholder="Category" />
            <button className="cv-btn-remove-bullet" onClick={() => removeGroup(i)} title={lb.remove}>×</button>
          </div>
          <div className="cv-skills-tags">
            {group.items.map((item, j) => (
              <span key={j} className="cv-skill-tag">
                {item}
                <button onClick={() => removeSkillItem(i, j)}>×</button>
              </span>
            ))}
            <input
              className="cv-skill-add-input"
              value={newSkillInputs[i] ?? ''}
              placeholder="Add skill…"
              onChange={e => setNewSkillInputs(prev => ({ ...prev, [i]: e.target.value }))}
              onKeyDown={e => {
                if (e.key === 'Enter') { e.preventDefault(); addSkillItem(i, newSkillInputs[i] ?? '') }
              }}
              onBlur={() => { if (newSkillInputs[i]?.trim()) addSkillItem(i, newSkillInputs[i]) }}
            />
          </div>
        </div>
      ))}

      <button className="cv-btn-add-minor" onClick={addGroup}>{lb.addSkillGroup}</button>
    </section>
  )
}
