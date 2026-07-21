import CVField from './CVField'
import { getL } from '../../utils/labels'

const emptyItem = {
  company: '', startDate: '', endDate: '', title: '',
  description: '', bullets: [''], technologies: '', methodologies: '',
}

export default function PositionsSection({ data, lang = 'en', meta, onFieldEdit, onAccept, onDismiss, onChange }) {
  const lb = getL(lang)
  const items = data.items || []
  const full = data.useProjectFormat

  function update(patch) { onChange({ ...data, ...patch }) }
  function updateItems(newItems) { update({ items: newItems }) }
  function addItem()    { updateItems([...items, { ...emptyItem, bullets: [''] }]) }
  function removeItem(i){ updateItems(items.filter((_, idx) => idx !== i)) }
  function addBullet(i) {
    updateItems(items.map((it, idx) => idx === i ? { ...it, bullets: [...(it.bullets || []), ''] } : it))
  }
  function removeBullet(i, j) {
    updateItems(items.map((it, idx) =>
      idx === i ? { ...it, bullets: it.bullets.filter((_, k) => k !== j) } : it
    ))
  }

  return (
    <section className="cv-section">
      <div className="cv-section-heading">
        <span>{lb.positions}</span>
        <label className="cv-toggle-inline">
          <input type="checkbox" checked={!!data.enabled}
            onChange={e => update({ enabled: e.target.checked })} />
          <span>{lb.enablePositions}</span>
        </label>
      </div>

      {data.enabled && (
        <>
          <label className="cv-toggle-inline cv-toggle-sub">
            <input type="checkbox" checked={!!full}
              onChange={e => update({ useProjectFormat: e.target.checked })} />
            <span>{lb.useProjectFormat}</span>
          </label>

          {items.map((item, i) => (
            <div key={i} className="cv-item cv-exp-item">

              <div className="cv-item-top-row">
                <CVField value={item.company} path={`positions.items.${i}.company`}
                  meta={meta} onEdit={onFieldEdit} onAccept={onAccept} onDismiss={onDismiss}
                  className="cv-company-field" placeholder="Company" />
                <div className="cv-date-pair">
                  <CVField value={item.startDate} path={`positions.items.${i}.startDate`}
                    meta={meta} onEdit={onFieldEdit} onAccept={onAccept} onDismiss={onDismiss}
                    className="cv-date-field" placeholder="Start" />
                  <span className="cv-date-sep">–</span>
                  <CVField value={item.endDate} path={`positions.items.${i}.endDate`}
                    meta={meta} onEdit={onFieldEdit} onAccept={onAccept} onDismiss={onDismiss}
                    className="cv-date-field" placeholder="End" />
                </div>
              </div>

              <CVField value={item.title} path={`positions.items.${i}.title`}
                meta={meta} onEdit={onFieldEdit} onAccept={onAccept} onDismiss={onDismiss}
                className="cv-role-field" placeholder={lb.positionTitle} />

              <div className="cv-exp-labeled-field">
                <span className="cv-exp-label">{lb.positionDesc}</span>
                <CVField value={item.description} path={`positions.items.${i}.description`}
                  meta={meta} onEdit={onFieldEdit} onAccept={onAccept} onDismiss={onDismiss}
                  as="textarea" className="cv-exp-desc-field" rows={2} placeholder="Brief description of role, tasks and responsibilities…" />
              </div>

              {full && (
                <>
                  <div className="cv-exp-labeled-field">
                    <span className="cv-exp-label">{lb.tasks}</span>
                    <div className="cv-bullets">
                      {(item.bullets || []).map((bullet, j) => (
                        <div key={j} className="cv-bullet-row">
                          <span className="cv-bullet-dot">·</span>
                          <CVField value={bullet} path={`positions.items.${i}.bullets.${j}`}
                            meta={meta} onEdit={onFieldEdit} onAccept={onAccept} onDismiss={onDismiss}
                            className="cv-bullet-field" placeholder="…" />
                          {(item.bullets || []).length > 1 && (
                            <button className="cv-btn-remove-bullet" onClick={() => removeBullet(i, j)}>×</button>
                          )}
                        </div>
                      ))}
                      <button className="cv-btn-add-minor" onClick={() => addBullet(i)}>+ bullet</button>
                    </div>
                  </div>
                  <div className="cv-exp-labeled-field">
                    <span className="cv-exp-label">{lb.technologies}</span>
                    <CVField value={item.technologies} path={`positions.items.${i}.technologies`}
                      meta={meta} onEdit={onFieldEdit} onAccept={onAccept} onDismiss={onDismiss}
                      className="cv-exp-tech-field" placeholder="e.g. SAP, PowerBI, Excel…" />
                  </div>
                  <div className="cv-exp-labeled-field">
                    <span className="cv-exp-label">{lb.methodologies}</span>
                    <CVField value={item.methodologies ?? ''} path={`positions.items.${i}.methodologies`}
                      meta={meta} onEdit={onFieldEdit} onAccept={onAccept} onDismiss={onDismiss}
                      className="cv-exp-tech-field" placeholder="e.g. Scrum, PRINCE2, change management…" />
                  </div>
                </>
              )}

              <button className="cv-btn-remove-item" onClick={() => removeItem(i)}>{lb.remove}</button>
            </div>
          ))}

          <button className="cv-btn-add" onClick={addItem}>{lb.addPosition}</button>
        </>
      )}
    </section>
  )
}
