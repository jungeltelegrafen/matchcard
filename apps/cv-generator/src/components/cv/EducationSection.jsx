import CVField from './CVField'
import { getL } from '../../utils/labels'

const emptyItem = { institution: '', degree: '', field: '', startDate: '', endDate: '' }

export default function EducationSection({ items, lang = 'en', meta, onFieldEdit, onChange, onAccept, onDismiss }) {
  const lb = getL(lang)
  return (
    <section className="cv-section">
      <div className="cv-section-heading"><span>{lb.education}</span></div>

      {items.map((item, i) => (
        <div key={i} className="cv-item">
          <div className="cv-item-top-row">
            <div className="cv-degree-pair">
              <CVField value={item.degree} path={`education.${i}.degree`}
                meta={meta} onEdit={onFieldEdit} onAccept={onAccept} onDismiss={onDismiss}
                className="cv-role-field" placeholder="Degree" />
              <span className="cv-degree-sep"> — </span>
              <CVField value={item.field} path={`education.${i}.field`}
                meta={meta} onEdit={onFieldEdit} onAccept={onAccept} onDismiss={onDismiss}
                className="cv-field-name-field" placeholder="Field of study" />
            </div>
            <div className="cv-date-pair">
              <CVField value={item.startDate} path={`education.${i}.startDate`}
                meta={meta} onEdit={onFieldEdit} onAccept={onAccept} onDismiss={onDismiss}
                className="cv-date-field" placeholder="Start" />
              <span className="cv-date-sep">–</span>
              <CVField value={item.endDate} path={`education.${i}.endDate`}
                meta={meta} onEdit={onFieldEdit} onAccept={onAccept} onDismiss={onDismiss}
                className="cv-date-field" placeholder="End" />
            </div>
          </div>
          <CVField value={item.institution} path={`education.${i}.institution`}
            meta={meta} onEdit={onFieldEdit} onAccept={onAccept} onDismiss={onDismiss}
            className="cv-company-field" placeholder="Institution / University" />
          <button className="cv-btn-remove-item" onClick={() => onChange(items.filter((_, idx) => idx !== i))}>
            {lb.remove}
          </button>
        </div>
      ))}

      <button className="cv-btn-add" onClick={() => onChange([...items, { ...emptyItem }])}>
        {lb.addEducation}
      </button>
    </section>
  )
}
