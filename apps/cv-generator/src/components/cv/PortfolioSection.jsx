import CVField from './CVField'
import { getL } from '../../utils/labels'
import { deriveFromUrl } from '../../utils/portfolioHeuristics'

const CATEGORY_VALUES = ['code', 'design', 'project', 'writing', 'other']

const emptyItem = { category: '', label: '', url: '', description: '' }

export default function PortfolioSection({ items = [], lang = 'en', meta, onFieldEdit, onChange, onAccept, onDismiss }) {
  const lb = getL(lang)
  const cats = lb.portfolioCategories || {}

  function setItem(i, patch) {
    onChange(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)))
  }

  // On leaving the URL field, guess a title + category from the link — but only
  // fill fields the user hasn't set, never overwrite their own input.
  function autofillFromUrl(i) {
    const item = items[i]
    if (!item?.url) return
    const guess = deriveFromUrl(item.url)
    const patch = {}
    if (guess.title && !item.label?.trim()) patch.label = guess.title
    if (guess.category && !item.category) patch.category = guess.category
    if (Object.keys(patch).length) setItem(i, patch)
  }

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
              value={CATEGORY_VALUES.includes(item.category) ? item.category : ''}
              onChange={e => setItem(i, { category: e.target.value })}
            >
              <option value="">{lb.portfolioCategoryTag}</option>
              {CATEGORY_VALUES.map(v => (
                <option key={v} value={v}>{cats[v] || v}</option>
              ))}
            </select>

            <CVField
              value={item.label}
              path={`portfolio.${i}.label`}
              meta={meta} onEdit={onFieldEdit} onAccept={onAccept} onDismiss={onDismiss}
              className="cv-role-field"
              placeholder={lb.portfolioTitlePlaceholder}
            />
          </div>

          <CVField
            value={item.url}
            path={`portfolio.${i}.url`}
            meta={meta} onEdit={onFieldEdit} onAccept={onAccept} onDismiss={onDismiss}
            className="cv-company-field portfolio-url-field"
            placeholder="https://github.com/yourname"
            onBlur={() => autofillFromUrl(i)}
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
