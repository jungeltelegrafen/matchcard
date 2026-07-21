import CVField from './CVField'
import { getL } from '../../utils/labels'

const emptyItem = { name: '', institution: '', year: '' }

export default function CoursesSection({ items, lang = 'en', meta, onFieldEdit, onChange, onAccept, onDismiss }) {
  const lb = getL(lang)
  return (
    <section className="cv-section">
      <div className="cv-section-heading"><span>{lb.courses}</span></div>

      {items.map((item, i) => (
        <div key={i} className="cv-item">
          <div className="cv-item-top-row">
            <CVField value={item.name} path={`courses.${i}.name`}
              meta={meta} onEdit={onFieldEdit} onAccept={onAccept} onDismiss={onDismiss}
              className="cv-role-field" placeholder="Course name" />
            <CVField value={item.year} path={`courses.${i}.year`}
              meta={meta} onEdit={onFieldEdit} onAccept={onAccept} onDismiss={onDismiss}
              className="cv-date-field" placeholder="Year" />
          </div>
          <CVField value={item.institution} path={`courses.${i}.institution`}
            meta={meta} onEdit={onFieldEdit} onAccept={onAccept} onDismiss={onDismiss}
            className="cv-company-field" placeholder="Institution / Provider" />
          <button className="cv-btn-remove-item" onClick={() => onChange(items.filter((_, idx) => idx !== i))}>
            {lb.remove}
          </button>
        </div>
      ))}

      <button className="cv-btn-add" onClick={() => onChange([...items, { ...emptyItem }])}>
        {lb.addCourse}
      </button>
    </section>
  )
}
