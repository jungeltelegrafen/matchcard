import { useState, useRef, useEffect } from 'react'
import CVField from './CVField'
import { getL } from '../../utils/labels'

const emptyItem = { requirement: '', level: '', lastUsed: '', yearsRelevant: '', projects: '', detail: '' }

function LevelPicker({ value, onChange, lang }) {
  const lb = getL(lang)
  const current = parseInt(value) || 0
  return (
    <div className="cv-comp-level-picker">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          className={`cv-comp-level-dot${n <= current ? ' filled' : ''}`}
          onClick={() => onChange(n === current ? '' : String(n))}
          title={n === 5 ? lb.levelExpert : `${lb.levelLabel} ${n}`}
        />
      ))}
      {current > 0 && (
        <span className="cv-comp-level-label">
          {current === 5 ? lb.levelExpert : `${lb.levelLabel} ${current}`}
        </span>
      )}
    </div>
  )
}

function ProjectChips({ projects, path, experiences, onEdit }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const chips = projects ? projects.split(',').map(s => s.trim()).filter(Boolean) : []
  const used = new Set(chips)
  const suggestions = (experiences || []).map(e => e.company).filter(c => c && !used.has(c))

  function addChip(c) { onEdit(path, [...chips, c].join(', ')); setOpen(false) }
  function removeChip(c) { onEdit(path, chips.filter(x => x !== c).join(', ')) }
  function expIndex(name) { return (experiences || []).findIndex(e => e.company === name) }

  useEffect(() => {
    if (!open) return
    function away(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', away)
    return () => document.removeEventListener('mousedown', away)
  }, [open])

  return (
    <div className="cv-comp-chips-wrap">
      {chips.map(chip => {
        const idx = expIndex(chip)
        return (
          <span key={chip} className="cv-comp-chip">
            {idx >= 0
              ? <a href={`#experience-${idx}`} className="cv-comp-chip-link" title="Jump to experience">{chip}</a>
              : <span>{chip}</span>
            }
            <button className="cv-comp-chip-x" onClick={() => removeChip(chip)}>×</button>
          </span>
        )
      })}
      <div className="cv-comp-add-wrap" ref={ref}>
        <button className="cv-comp-chip-add" onClick={() => setOpen(o => !o)}>+ project</button>
        {open && (
          <div className="cv-comp-dropdown">
            {suggestions.length > 0
              ? suggestions.map(c => (
                  <button key={c} className="cv-comp-dropdown-item" onMouseDown={() => addChip(c)}>{c}</button>
                ))
              : <span className="cv-comp-dropdown-empty">All CV projects already added</span>
            }
          </div>
        )}
      </div>
    </div>
  )
}

function hasFilledItem(items) {
  return (items || []).some(it => it.requirement?.trim())
}

export default function CompetenceTable({ data, lang = 'en', meta, onFieldEdit, onChange, onAccept, onDismiss, experiences }) {
  const lb = getL(lang)
  const { enabled, projectLabel = '', items } = data

  // Auto-enable when AI imports competences with filled items
  const prevItemCount = useRef(items.length)
  useEffect(() => {
    if (!enabled && hasFilledItem(items) && items.length !== prevItemCount.current) {
      onChange({ ...data, enabled: true })
    }
    prevItemCount.current = items.length
  }, [items])

  function toggle()  { onChange({ ...data, enabled: !enabled }) }

  function addItem() {
    const newItems = [...items, { ...emptyItem }]
    onChange({ ...data, items: newItems })
  }

  function removeItem(i) {
    const newItems = items.filter((_, idx) => idx !== i)
    onChange({ ...data, items: newItems, enabled: enabled && hasFilledItem(newItems) })
  }

  function setItemField(i, key, val) {
    const newItems = items.map((it, idx) => idx === i ? { ...it, [key]: val } : it)
    const nowHasFilled = hasFilledItem(newItems)
    onChange({
      ...data,
      items: newItems,
      enabled: enabled || (key === 'requirement' && !!val.trim() && nowHasFilled),
    })
  }

  const prefix = (i, key) => `competences.items.${i}.${key}`

  return (
    <section className={`cv-section cv-competence-section${enabled ? '' : ' cv-competence-section--off'}`}>

      <div className="cv-section-heading cv-competence-heading">
        <span>{lb.competences}</span>
        <button
          className={`cv-competence-toggle${enabled ? ' cv-competence-toggle--on' : ''}`}
          onClick={toggle}
        >
          {enabled ? lb.includedInExports : lb.addToExports}
        </button>
      </div>

      <div className="cv-competence-project-row">
        <span className="cv-competence-project-prefix">{lb.forProject}</span>
        <CVField
          value={projectLabel}
          path="competences.projectLabel"
          meta={meta} onEdit={onFieldEdit} onAccept={onAccept} onDismiss={onDismiss}
          className="cv-competence-project-field"
          placeholder="project / client name"
        />
      </div>

      {items.length === 0 && (
        <p className="cv-competence-empty">{lb.competenceEmpty}</p>
      )}

      <div className="cv-competence-list">
        {items.map((item, i) => (
          <div key={i} className="cv-comp-card">

            <div className="cv-comp-card-name">
              <CVField
                value={item.requirement}
                path={prefix(i, 'requirement')}
                meta={meta} onEdit={onFieldEdit} onAccept={onAccept} onDismiss={onDismiss}
                as="textarea"
                className="cv-comp-name-field"
                placeholder="Competence or requirement name…"
                rows={2}
              />
            </div>

            <div className="cv-comp-card-meta">
              <div className="cv-comp-meta-top">
                <div className="cv-comp-meta-group">
                  <span className="cv-comp-meta-label">{lb.levelLabel}</span>
                  <LevelPicker
                    value={item.level}
                    onChange={val => setItemField(i, 'level', val)}
                    lang={lang}
                  />
                </div>
                <div className="cv-comp-meta-group">
                  <span className="cv-comp-meta-label">{lb.lastUsed}</span>
                  <CVField
                    value={item.lastUsed}
                    path={prefix(i, 'lastUsed')}
                    meta={meta} onEdit={onFieldEdit} onAccept={onAccept} onDismiss={onDismiss}
                    className="cv-comp-small-field"
                    placeholder="year"
                  />
                </div>
                <div className="cv-comp-meta-group">
                  <span className="cv-comp-meta-label">{lb.totalYears}</span>
                  <CVField
                    value={item.yearsRelevant}
                    path={prefix(i, 'yearsRelevant')}
                    meta={meta} onEdit={onFieldEdit} onAccept={onAccept} onDismiss={onDismiss}
                    className="cv-comp-small-field"
                    placeholder="yrs"
                  />
                </div>
              </div>

              <div className="cv-comp-meta-projects">
                <span className="cv-comp-meta-label">{lb.projects}</span>
                <ProjectChips
                  projects={item.projects}
                  path={prefix(i, 'projects')}
                  experiences={experiences}
                  onEdit={onFieldEdit}
                />
              </div>
            </div>

            <div className="cv-comp-card-evidence">
              <CVField
                value={item.detail}
                path={prefix(i, 'detail')}
                meta={meta} onEdit={onFieldEdit} onAccept={onAccept} onDismiss={onDismiss}
                as="textarea"
                className="cv-comp-evidence-field"
                placeholder="Evidence — describe what you did, where, and with what outcome…"
                rows={3}
              />
              <button className="cv-btn-remove-item" onClick={() => removeItem(i)}>{lb.remove}</button>
            </div>

          </div>
        ))}
      </div>

      <button className="cv-btn-add" onClick={addItem}>{lb.addCompetence}</button>
    </section>
  )
}
