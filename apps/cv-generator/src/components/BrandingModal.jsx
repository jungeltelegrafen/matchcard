import { useState, useEffect, useRef } from 'react'
import { fileToDataUrl } from '../utils/branding'

// Set the company brand once — logo + footer info — reused for every consultant.
// The profile photo is per-CV (not stored with the reusable brand), but it's
// edited here too so the header preview mirrors the page: logo left, photo right.
export default function BrandingModal({ branding, onChange, profilePicture = '', onSetProfilePicture, uiLang = 'en', onClose }) {
  const no = uiLang === 'no'
  const [err, setErr] = useState('')
  const logoRef = useRef(null)
  const photoRef = useRef(null)

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

  async function onPhotoFile(file) {
    if (!file) return
    setErr('')
    try {
      onSetProfilePicture?.(await fileToDataUrl(file, { maxDim: 512, quality: 0.85 }))
    } catch {
      setErr(no ? 'Kunne ikke lese bildet.' : 'Could not read the image.')
    }
  }

  const field = (key, label) => (
    <label className="branding-cell">
      <span className="branding-cell-label">{label}</span>
      <input
        className="offer-field-input"
        value={branding[key] || ''}
        onChange={e => set(key, e.target.value)}
        placeholder={label}
      />
    </label>
  )

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
          {/* ── Header: logo left, profile photo right — mirrors the CV page.
                Brand (logo) is reusable; the photo is per consultant. ── */}
          <div className="branding-zone">
            <div className="branding-zone-head">
              <span className="branding-zone-title">{no ? 'Topp' : 'Header'}</span>
              <span className="branding-zone-hint">
                {no ? 'Logo til venstre, profilbilde til høyre.'
                    : 'Logo on the left, profile photo on the right.'}
              </span>
            </div>
            <div className="branding-header-mock">
              {/* Logo — left */}
              <div className="bhm-slot bhm-slot--logo">
                <div className="branding-logo-preview" onClick={() => logoRef.current?.click()}>
                  {branding.logo
                    ? <img src={branding.logo} alt="logo" />
                    : <span className="branding-logo-empty">{no ? '+ Logo' : '+ Logo'}</span>}
                </div>
                <input ref={logoRef} type="file" accept="image/*" style={{ display: 'none' }}
                  onChange={e => { onLogoFile(e.target.files?.[0]); e.target.value = '' }} />
                <div className="branding-slot-actions">
                  <button className="offer-btn" onClick={() => logoRef.current?.click()}>
                    {no ? 'Velg logo' : 'Choose logo'}
                  </button>
                  {branding.logo && (
                    <button className="offer-btn offer-btn--ghost" onClick={() => set('logo', '')}>
                      {no ? 'Fjern' : 'Remove'}
                    </button>
                  )}
                </div>
              </div>

              {/* Profile photo — right */}
              <div className="bhm-slot bhm-slot--photo">
                <div className="branding-photo-preview" onClick={() => photoRef.current?.click()}>
                  {profilePicture
                    ? <img src={profilePicture} alt="photo" />
                    : <span className="branding-photo-empty">{no ? '+ Bilde' : '+ Photo'}</span>}
                </div>
                <input ref={photoRef} type="file" accept="image/*" style={{ display: 'none' }}
                  onChange={e => { onPhotoFile(e.target.files?.[0]); e.target.value = '' }} />
                <div className="branding-slot-actions">
                  <button className="offer-btn" onClick={() => photoRef.current?.click()}>
                    {no ? 'Velg bilde' : 'Choose photo'}
                  </button>
                  {profilePicture && (
                    <button className="offer-btn offer-btn--ghost" onClick={() => onSetProfilePicture?.('')}>
                      {no ? 'Fjern' : 'Remove'}
                    </button>
                  )}
                </div>
              </div>
            </div>
            {err && <span className="offer-error">{err}</span>}
          </div>

          {/* ── Footer card: fields sit where they appear on the page ── */}
          <div className="branding-zone branding-zone--footer">
            <div className="branding-zone-head">
              <span className="branding-zone-title">{no ? 'Bunntekst' : 'Footer'}</span>
              <span className="branding-zone-hint">
                {no ? 'Nederst på første side.' : 'Bottom of the first page.'}
              </span>
            </div>
            <div className="branding-footer-card">
              <div className="branding-footer-grid">
                {field('companyName',    no ? 'Firmanavn' : 'Company name')}
                {field('companyAddress', no ? 'Adresse' : 'Address')}
                {field('companyWebsite', no ? 'Nettside' : 'Website')}
                <span className="branding-cell branding-cell--blank" aria-hidden="true" />
                {field('companyEmail',   no ? 'E-post' : 'Email')}
                {field('companyPhone',   no ? 'Telefon' : 'Phone')}
              </div>
            </div>
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
