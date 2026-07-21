import CVField from './CVField'
import { getL } from '../../utils/labels'

const emptyCert   = { name: '', issuer: '', year: '' }
const emptyCourse = { name: '', institution: '', year: '' }

export default function CertsCourseSection({
  certifications, courses, lang = 'en', meta,
  onFieldEdit, onAccept, onDismiss,
  onCertsChange, onCoursesChange,
}) {
  const lb = getL(lang)

  return (
    <section className="cv-section">
      <div className="cv-section-heading"><span>{lb.certsCourses}</span></div>

      {/* ── Certifications ── */}
      {certifications.map((item, i) => (
        <div key={`cert-${i}`} className="cv-item">
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
          <button className="cv-btn-remove-item"
            onClick={() => onCertsChange(certifications.filter((_, idx) => idx !== i))}>
            {lb.remove}
          </button>
        </div>
      ))}
      <button className="cv-btn-add-minor" onClick={() => onCertsChange([...certifications, { ...emptyCert }])}>
        {lb.addCertification}
      </button>

      <div style={{ height: 14 }} />

      {/* ── Courses ── */}
      {courses.map((item, i) => (
        <div key={`course-${i}`} className="cv-item">
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
          <button className="cv-btn-remove-item"
            onClick={() => onCoursesChange(courses.filter((_, idx) => idx !== i))}>
            {lb.remove}
          </button>
        </div>
      ))}
      <button className="cv-btn-add-minor" onClick={() => onCoursesChange([...courses, { ...emptyCourse }])}>
        {lb.addCourse}
      </button>
    </section>
  )
}
