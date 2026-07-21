import CVField from './CVField'
import VideoProfileSection from './VideoProfileSection'
import { getL } from '../../utils/labels'

export default function PersonalSection({ data, videoProfile, projectVideoProfile, meta, onFieldEdit, onAccept, onDismiss, lang = 'en' }) {
  const lb = getL(lang)
  const p = 'personal'
  const fp = key => `${p}.${key}`
  const field = (key, extraClass = '', extraProps = {}) => (
    <CVField
      value={data[key] ?? ''}
      path={fp(key)}
      meta={meta}
      onEdit={onFieldEdit}
      onAccept={onAccept}
      onDismiss={onDismiss}
      className={`cv-info-value${extraClass ? ` ${extraClass}` : ''}`}
      {...extraProps}
    />
  )

  const showContact = data.showContactInfo !== false

  return (
    <section className="cv-section cv-header-section">
      <div className="cv-name-row">
        <CVField value={data.firstName ?? ''} path={fp('firstName')} meta={meta}
          onEdit={onFieldEdit} onAccept={onAccept} onDismiss={onDismiss}
          className="cv-name-field" placeholder="First name" />
        <span className="cv-name-space"> </span>
        <CVField value={data.lastName ?? ''} path={fp('lastName')} meta={meta}
          onEdit={onFieldEdit} onAccept={onAccept} onDismiss={onDismiss}
          className="cv-name-field" placeholder="Last name" />
      </div>

      <CVField value={data.title ?? ''} path={fp('title')} meta={meta}
        onEdit={onFieldEdit} onAccept={onAccept} onDismiss={onDismiss}
        className="cv-title-field" placeholder="Professional title" />

      <div className="cv-info-grid">

        <span className="cv-info-label">{lb.address}</span>
        {field('location', '', { placeholder: 'e.g. Oslo, Norway' })}

        <span className="cv-info-label">{lb.educationSummary}</span>
        {field('educationSummary', '', { placeholder: 'e.g. M.Sc. Computer Science, NTNU' })}

        <span className="cv-info-label">{lb.itSince}</span>
        {field('itExperienceSince', '', { placeholder: 'e.g. 2010' })}

        {/* Contact info toggle — spans full width */}
        <label className="cv-info-grid-full cv-contact-toggle">
          <input
            type="checkbox"
            checked={showContact}
            onChange={e => onFieldEdit(fp('showContactInfo'), e.target.checked)}
          />
          <span>{lb.hideContact}</span>
        </label>

        {/* Contact block — subgrid with dimming when excluded */}
        <div className={`cv-info-grid-full cv-info-contact-block${showContact ? '' : ' dim'}`}>
          <div className="cv-info-subgrid">
            <span className="cv-info-label">{lb.phone}</span>
            {field('phone', '', { placeholder: 'e.g. +47 123 45 678' })}

            <span className="cv-info-label">{lb.email}</span>
            {field('email', '', { placeholder: 'e.g. name@email.com', type: 'email' })}

            <span className="cv-info-label">{lb.linkedin}</span>
            {field('linkedin', '', { placeholder: 'linkedin.com/in/...' })}
          </div>
        </div>

        <span className="cv-info-label">{lb.availableFrom}</span>
        {field('availableFrom', '', { placeholder: 'e.g. June 2025' })}

        <span className="cv-info-label">{lb.workPreference}</span>
        {field('workPreference', '', { placeholder: 'Remote / Hybrid / On-site (optional)' })}

      </div>

      <div className="cv-header-rule" />

      <VideoProfileSection
        videoProfile={videoProfile}
        projectVideoProfile={projectVideoProfile}
        candidateName={[data.firstName, data.lastName].filter(Boolean).join(' ')}
        lang={lang}
      />

      <div className="cv-section-heading" style={{ marginBottom: 6 }}>
        <span>{lb.summary}</span>
      </div>

      <CVField value={data.summary ?? ''} path={fp('summary')} meta={meta}
        onEdit={onFieldEdit} onAccept={onAccept} onDismiss={onDismiss}
        as="textarea"
        className="cv-summary-field"
        placeholder="Professional summary — describe your background, key strengths, and what you bring to the table..."
        rows={3}
      />
    </section>
  )
}
