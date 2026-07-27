import { getL } from '../utils/labels'

// Shown in the left column while a job variant is active. Everything here is
// non-destructive: it curates how the master is presented (include/exclude,
// order, re-emphasized text). Facts live in the master and are edited there.

function ordered(items, orderIds) {
  if (!Array.isArray(orderIds) || !orderIds.length) return items
  const byId = new Map(items.map(it => [it._id, it]))
  const head = orderIds.map(id => byId.get(id)).filter(Boolean)
  const rest = items.filter(it => !orderIds.includes(it._id))
  return [...head, ...rest]
}

export default function TailoringReview({
  master, variant, lang, uiLang,
  onToggleExclude, onToggleSkillTag, onSummaryChange, onExpDescChange, onReorder,
}) {
  const no = uiLang === 'no'
  const lb = getL(lang)
  const excluded = new Set(variant.excludedIds || [])
  const isIn = id => !excluded.has(id)
  const reason = id => variant.rationale?.reasons?.[id]
  const ov = variant.overrides?.[lang] || { summary: '', expDesc: {} }
  const differentLang = variant.tailoredInLang !== lang

  const experience  = ordered(master.experience || [], variant.order?.experience)
  const competences = master.competences?.enabled ? ordered(master.competences.items || [], variant.order?.competences) : []

  function CheckRow({ id, label, children, canReorder, section }) {
    return (
      <div className={`tr-row${isIn(id) ? '' : ' tr-row--out'}`}>
        <label className="tr-check">
          <input type="checkbox" checked={isIn(id)} onChange={() => onToggleExclude(id)} />
          <span className="tr-label">{label}</span>
        </label>
        {canReorder && isIn(id) && (
          <span className="tr-reorder">
            <button title={no ? 'Opp' : 'Up'} onClick={() => onReorder(section, id, 'up')}>↑</button>
            <button title={no ? 'Ned' : 'Down'} onClick={() => onReorder(section, id, 'down')}>↓</button>
          </span>
        )}
        {!isIn(id) && reason(id) && <span className="tr-reason">{reason(id)}</span>}
        {children}
      </div>
    )
  }

  function SimpleSection({ title, items, labelFn }) {
    if (!items.length) return null
    return (
      <div className="tr-section">
        <h3 className="tr-section-title">{title}</h3>
        {items.map(it => <CheckRow key={it._id} id={it._id} label={labelFn(it)} />)}
      </div>
    )
  }

  return (
    <aside className="side-panel side-panel--left tailoring-review">
      <div className="side-panel-header">
        <h2 className="side-panel-title">{no ? 'Tilpasning' : 'Tailoring'}</h2>
        <p className="side-panel-sub">{variant.name}</p>
      </div>

      {variant.rationale?.fitNote && (
        <div className="tr-fitnote">
          <span className="tr-fitnote-label">{no ? 'Ærlig vurdering' : 'Honest fit'}</span>
          <p>{variant.rationale.fitNote}</p>
        </div>
      )}

      {differentLang && (
        <p className="tr-lang-note">
          {no
            ? `Tilpasset på ${variant.tailoredInLang === 'no' ? 'norsk' : 'engelsk'}. Sammendrag/beskrivelser vises fra master til du oversetter denne versjonen.`
            : `Tailored in ${variant.tailoredInLang === 'no' ? 'Norwegian' : 'English'}. Summary/descriptions show master text here until you translate this version.`}
        </p>
      )}

      {/* Summary override */}
      <div className="tr-section">
        <h3 className="tr-section-title">{no ? 'Tilpasset sammendrag' : 'Tailored summary'}</h3>
        <textarea
          className="tr-textarea"
          value={ov.summary}
          onChange={e => onSummaryChange(e.target.value)}
          placeholder={master.personal?.summary || (no ? 'Sammendrag…' : 'Summary…')}
          rows={4}
        />
      </div>

      {/* Videos — same position as the CV body (just under the summary) */}
      <SimpleSection
        title={lb.videos || 'Videos'}
        items={master.videos || []}
        labelFn={v => v.title || (no ? 'Uten tittel' : 'Untitled')}
      />

      {/* Experience: include/exclude + reorder + re-angled description */}
      {experience.length > 0 && (
        <div className="tr-section">
          <h3 className="tr-section-title">{lb.experience || 'Experience'}</h3>
          {experience.map(exp => (
            <CheckRow
              key={exp._id}
              id={exp._id}
              section="experience"
              canReorder
              label={[exp.company, exp.role].filter(Boolean).join(' — ') || (no ? 'Uten navn' : 'Untitled')}
            >
              {isIn(exp._id) && (
                <textarea
                  className="tr-textarea tr-textarea--sm"
                  value={ov.expDesc?.[exp._id] ?? ''}
                  onChange={e => onExpDescChange(exp._id, e.target.value)}
                  placeholder={exp.description || (no ? 'Re-vinklet beskrivelse…' : 'Re-angled description…')}
                  rows={2}
                />
              )}
            </CheckRow>
          ))}
        </div>
      )}

      {/* Competences — level shown as dots to match the CV's star rating */}
      {competences.length > 0 && (
        <div className="tr-section">
          <h3 className="tr-section-title">{lb.competences || 'Competences'}</h3>
          {competences.map(c => {
            const lvl = parseInt(c.level) || 0
            return (
              <CheckRow
                key={c._id}
                id={c._id}
                section="competences"
                canReorder
                label={
                  <>
                    {c.requirement || '—'}
                    {lvl > 0 && (
                      <span className="tr-level" title={`${lb.levelLabel || 'Level'} ${lvl}`}>
                        {[1, 2, 3, 4, 5].map(n => (
                          <span key={n} className={`tr-level-dot${n <= lvl ? ' on' : ''}`} />
                        ))}
                      </span>
                    )}
                  </>
                }
              />
            )
          })}
        </div>
      )}

      {/* Skills: per-tag toggles */}
      {(master.skills || []).length > 0 && (
        <div className="tr-section">
          <h3 className="tr-section-title">{lb.skills || 'Skills'}</h3>
          {master.skills.map(g => {
            const outTags = new Set(variant.excludedSkillTags?.[g._id] || [])
            return (
              <div key={g._id} className="tr-skillgroup">
                <span className="tr-skillgroup-label">{g.category || (no ? 'Ferdigheter' : 'Skills')}</span>
                <div className="tr-tags">
                  {(g.items || []).map(tag => (
                    <button
                      key={tag}
                      className={`tr-tag${outTags.has(tag) ? ' tr-tag--out' : ''}`}
                      onClick={() => onToggleSkillTag(g._id, tag)}
                      title={no ? 'Vis/skjul' : 'Show/hide'}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <SimpleSection
        title={lb.education || 'Education'}
        items={master.education || []}
        labelFn={e => [[e.degree, e.field].filter(Boolean).join(', '), e.institution].filter(Boolean).join(' — ') || '—'}
      />
      <SimpleSection
        title={lb.certifications || 'Certifications'}
        items={master.certifications || []}
        labelFn={c => [c.name, c.issuer].filter(Boolean).join(' · ') || '—'}
      />
      <SimpleSection
        title={no ? 'Kurs' : 'Courses'}
        items={master.courses || []}
        labelFn={c => [c.name, c.institution].filter(Boolean).join(' · ') || '—'}
      />
      <SimpleSection
        title={no ? 'Verv' : 'Positions'}
        items={master.positions?.items || []}
        labelFn={p => [p.title, p.company].filter(Boolean).join(' · ') || '—'}
      />
      <SimpleSection
        title={no ? 'Portefølje' : 'Portfolio'}
        items={master.portfolio || []}
        labelFn={p => p.label || p.url || '—'}
      />
    </aside>
  )
}
