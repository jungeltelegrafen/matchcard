import CVField from './CVField'
import { getL } from '../../utils/labels'

const PLATFORMS = [
  { value: 'github',        label: 'GitHub' },
  { value: 'gitlab',        label: 'GitLab' },
  { value: 'stackoverflow', label: 'Stack Overflow' },
  { value: 'dribbble',      label: 'Dribbble' },
  { value: 'behance',       label: 'Behance' },
  { value: 'website',       label: 'Personal Website / Portfolio' },
  { value: 'other',         label: 'Other' },
]

const emptyItem = { platform: 'github', label: '', url: '', description: '' }

export default function PortfolioSection({ items = [], lang = 'en', meta, onFieldEdit, onChange, onAccept, onDismiss }) {
  const lb = getL(lang)
  return (
    <section className="cv-section">
      <div className="cv-section-heading">
        <span>{lb.portfolio}</span>
      </div>

      {items.map((item, i) => (
        <div key={i} className="cv-item portfolio-item">
          <div className="portfolio-item-row">
            <select
              className="portfolio-platform-select"
              value={item.platform || 'other'}
              onChange={e => {
                const updated = items.map((it, idx) => idx === i ? { ...it, platform: e.target.value } : it)
                onChange(updated)
              }}
            >
              {PLATFORMS.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>

            <CVField
              value={item.label}
              path={`portfolio.${i}.label`}
              meta={meta} onEdit={onFieldEdit} onAccept={onAccept} onDismiss={onDismiss}
              className="cv-role-field"
              placeholder={lang === 'no' ? 'Visningsnavn (valgfritt)' : 'Display name (optional)'}
            />
          </div>

          <CVField
            value={item.url}
            path={`portfolio.${i}.url`}
            meta={meta} onEdit={onFieldEdit} onAccept={onAccept} onDismiss={onDismiss}
            className="cv-company-field portfolio-url-field"
            placeholder="https://github.com/yourname"
          />

          <CVField
            value={item.description}
            path={`portfolio.${i}.description`}
            meta={meta} onEdit={onFieldEdit} onAccept={onAccept} onDismiss={onDismiss}
            as="textarea"
            className="cv-desc-field"
            placeholder={lang === 'no'
              ? 'Beskriv hva du viser frem her — eksempler på arbeid, teknologier, prosjekter…'
              : 'Describe what this showcases — work examples, technologies, specific projects…'}
          />

          <button
            className="cv-btn-remove-item"
            onClick={() => onChange(items.filter((_, idx) => idx !== i))}
          >
            {lb.remove}
          </button>
        </div>
      ))}

      <button
        className="cv-btn-add"
        onClick={() => onChange([...items, { ...emptyItem }])}
      >
        {lb.addLink}
      </button>
    </section>
  )
}
