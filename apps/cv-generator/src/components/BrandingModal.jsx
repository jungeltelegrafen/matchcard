import { useState, useEffect, useRef } from 'react'
import { fileToDataUrl } from '../utils/branding'

// Set the company brand once — logo + footer info — reused for every consultant.
export default function BrandingModal({ branding, onChange, uiLang = 'en', onClose }) {
  const no = uiLang === 'no'
  const [err, setErr] = useState('')
  const logoRef = useRef(null)

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const set = (field, value) => onChange(prev => ({ ...prev, [field]: value }))

  async function onLogoFile(file) {
    if (!file) return
    setErr('')
    try {
      set('logo', await fileToDataUrl(file, { maxDim: 400, quality: 0.9 }))
    } catch {
      setErr(no ? 'Kunne ikke lese bildet.' : 'Could not read the image.')
    }
  }

  const FIELDS = [
    ['companyName',    no ? 'Firmanavn' : 'Company name'],
    ['companyAddress', no ? 'Adresse' : 'Address'],
    ['companyWebsite', no ? 'Nettside' : 'Website'],
    ['companyEmail',   no ? 'E-post' : 'Email'],
    ['companyPhone',   no ? 'Telefon' : 'Phone'],
  ]

  return (
    <div className="feedback-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="feedback-box offer-box" role="dialog" aria-modal="true">
        <div className="feedback-header">
          <div>
            <h2 className="feedback-title">{no ? 'Merkevare' : 'Branding'}</h2>
            <p className="feedback-subtitle">
              {no ? 'Settes én gang og gjenbrukes for alle CV-er.' : 'Set once, reused for every CV.'}
            </p>
          </div>
          <button className="feedback-close" onClick={onClose}>×</button>
        </div>

        <div className="offer-body">
          {/* Logo */}
          <div className="offer-field offer-field--full">
            <span className="offer-field-label">{no ? 'Logo' : 'Logo'}</span>
            <div className="branding-logo-row">
              <div className="branding-logo-preview" onClick={() => logoRef.current?.click()}>
                {branding.logo
                  ? <img src={branding.logo} alt="logo" />
                  : <span className="branding-logo-empty">{no ? '+ Last opp logo' : '+ Upload logo'}</span>}
              </div>
              <input ref={logoRef} type="file" accept="image/*" style={{ display: 'none' }}
                onChange={e => { onLogoFile(e.target.files?.[0]); e.target.value = '' }} />
              <div className="branding-logo-actions">
                <button className="offer-btn" onClick={() => logoRef.current?.click()}>
                  {no ? 'Velg bilde' : 'Choose image'}
                </button>
                {branding.logo && (
                  <button className="offer-btn offer-btn--ghost" onClick={() => set('logo', '')}>
                    {no ? 'Fjern' : 'Remove'}
                  </button>
                )}
              </div>
            </div>
            {err && <span className="offer-error">{err}</span>}
          </div>

          {/* Company fields */}
          <div className="offer-grid">
            {FIELDS.map(([key, label]) => (
              <label key={key} className={`offer-field${key === 'companyAddress' ? ' offer-field--full' : ''}`}>
                <span className="offer-field-label">{label}</span>
                <input
                  className="offer-field-input"
                  value={branding[key] || ''}
                  onChange={e => set(key, e.target.value)}
                />
              </label>
            ))}
          </div>
        </div>

        <div className="offer-actions">
          <button className="offer-btn offer-btn--primary" onClick={onClose}>
            {no ? 'Ferdig' : 'Done'}
          </button>
        </div>
      </div>
    </div>
  )
}
