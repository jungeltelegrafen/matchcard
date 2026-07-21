import CVField from './CVField'
import { getL } from '../../utils/labels'

const emptyItem = { name: '', issuer: '', year: '' }

export default function CertificationsSection({ items, lang = 'en', meta, onFieldEdit, onChange, onAccept, onDismiss }) {
  const lb = getL(lang)
  return (
    <section className="cv-section">
      <div className="cv-section-heading"><span>{lb.certifications}</span></div>

      {items.map((item, i) => (
        <div key={i} className="cv-item">
          <div className="cv-item-top-row">
            <CVField value={item.name} path={`certifications.${i}.name`}
              meta={meta} onEdit={onFieldEdit} onAccept={onAccept} onDismiss={onDismiss}
              className="cv-role-field" placeholder="Certification name" />
            <CVField value={item.year} path={`certifications.${i}.year`}
              meta={meta} onEdit={onFieldEdit} onAccept={onAccept} onDismiss={onDismiss}
              className="cv-date-field" placeholder="Year" />
          </div>
          <CVField value={item.issuer} path={`certifications.${i}.issuer`}
            meta={meta} onEdit={onFieldEdit} onAccept={onAccept} onDismiss={onDismiss}
            className="cv-company-field" placeholder="Issuing organisation" />
          <button className="cv-btn-remove-item" onClick={() => onChange(items.filter((_, idx) => idx !== i))}>
            {lb.remove}
          </button>
        </div>
      ))}

      <button className="cv-btn-add" onClick={() => onChange([...items, { ...emptyItem }])}>
        {lb.addCertification}
      </button>
    </section>
  )
}
