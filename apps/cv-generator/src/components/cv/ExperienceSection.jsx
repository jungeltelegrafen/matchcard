import CVField from './CVField'
import { getL } from '../../utils/labels'

const emptyItem = {
  company: '', role: '', startDate: '', endDate: '', location: '',
  description: '', bullets: [''],
  technologies: '', methodologies: '', result: '',
}

export default function ExperienceSection({ items, cvType = 'technical', lang = 'en', meta, onFieldEdit, onChange, onAccept, onDismiss }) {
  const lb = getL(lang)
  const isMgmt = cvType === 'management'

  function addItem()    { onChange([...items, { ...emptyItem, bullets: [''] }]) }
  function removeItem(i){ onChange(items.filter((_, idx) => idx !== i)) }
  function addBullet(i) { onChange(items.map((it, idx) => idx === i ? { ...it, bullets: [...it.bullets, ''] } : it)) }
  function removeBullet(i, j) {
    onChange(items.map((it, idx) =>
      idx === i ? { ...it, bullets: it.bullets.filter((_, k) => k !== j) } : it
    ))
  }

  return (
    <section className="cv-section">
      <div className="cv-section-heading">
        <span>{lb.experience}</span>
        {isMgmt && <span className="cv-section-badge">{lb.managementBadge}</span>}
      </div>

      {items.map((item, i) => (
        <div key={i} id={`experience-${i}`} className="cv-item cv-exp-item">

          <div className="cv-item-top-row">
            <CVField value={item.company} path={`experience.${i}.company`}
              meta={meta} onEdit={onFieldEdit} onAccept={onAccept} onDismiss={onDismiss}
              className="cv-company-field" placeholder="Company / Client" />
            <div className="cv-date-pair">
              <CVField value={item.startDate} path={`experience.${i}.startDate`}
                meta={meta} onEdit={onFieldEdit} onAccept={onAccept} onDismiss={onDismiss}
                className="cv-date-field" placeholder="Start" />
              <span className="cv-date-sep">–</span>
              <CVField value={item.endDate} path={`experience.${i}.endDate`}
                meta={meta} onEdit={onFieldEdit} onAccept={onAccept} onDismiss={onDismiss}
                className="cv-date-field" placeholder="End" />
            </div>
          </div>

          <div className="cv-item-sub-row">
            <CVField value={item.role} path={`experience.${i}.role`}
              meta={meta} onEdit={onFieldEdit} onAccept={onAccept} onDismiss={onDismiss}
              className="cv-role-field" placeholder={lb.role} />
            <CVField value={item.location} path={`experience.${i}.location`}
              meta={meta} onEdit={onFieldEdit} onAccept={onAccept} onDismiss={onDismiss}
              className="cv-location-field" placeholder="Location" />
          </div>

          <div className="cv-exp-labeled-field">
            <span className="cv-exp-label">{lb.projectDesc}</span>
            <CVField value={item.description} path={`experience.${i}.description`}
              meta={meta} onEdit={onFieldEdit} onAccept={onAccept} onDismiss={onDismiss}
              as="textarea" className="cv-exp-desc-field" rows={2} placeholder="…" />
          </div>

          <div className="cv-exp-labeled-field">
            <span className="cv-exp-label">{lb.tasks}</span>
            <div className="cv-bullets">
              {item.bullets.map((bullet, j) => (
                <div key={j} className="cv-bullet-row">
                  <span className="cv-bullet-dot">·</span>
                  <CVField value={bullet} path={`experience.${i}.bullets.${j}`}
                    meta={meta} onEdit={onFieldEdit} onAccept={onAccept} onDismiss={onDismiss}
                    className="cv-bullet-field" placeholder="…" />
                  {item.bullets.length > 1 && (
                    <button className="cv-btn-remove-bullet" onClick={() => removeBullet(i, j)}>×</button>
                  )}
                </div>
              ))}
              <button className="cv-btn-add-minor" onClick={() => addBullet(i)}>+ bullet</button>
            </div>
          </div>

          {!isMgmt && (
            <div className="cv-exp-labeled-field">
              <span className="cv-exp-label">{lb.technologies}</span>
              <CVField value={item.technologies} path={`experience.${i}.technologies`}
                meta={meta} onEdit={onFieldEdit} onAccept={onAccept} onDismiss={onDismiss}
                className="cv-exp-tech-field" placeholder="e.g. React, Azure, TypeScript…" />
            </div>
          )}

          {isMgmt && (
            <>
              <div className="cv-exp-labeled-field">
                <span className="cv-exp-label">{lb.methodologies}</span>
                <CVField value={item.methodologies} path={`experience.${i}.methodologies`}
                  meta={meta} onEdit={onFieldEdit} onAccept={onAccept} onDismiss={onDismiss}
                  className="cv-exp-tech-field" placeholder="e.g. Agile, PRINCE2, stakeholder management…" />
              </div>
              <div className="cv-exp-labeled-field">
                <span className="cv-exp-label">{lb.result}</span>
                <CVField value={item.result} path={`experience.${i}.result`}
                  meta={meta} onEdit={onFieldEdit} onAccept={onAccept} onDismiss={onDismiss}
                  as="textarea" className="cv-exp-desc-field" rows={2} placeholder="…" />
              </div>
            </>
          )}

          <button className="cv-btn-remove-item" onClick={() => removeItem(i)}>{lb.remove}</button>
        </div>
      ))}

      <button className="cv-btn-add" onClick={addItem}>{lb.addProject}</button>
    </section>
  )
}
