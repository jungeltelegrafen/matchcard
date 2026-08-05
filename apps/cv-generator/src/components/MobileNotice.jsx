import { useState } from 'react'

// The CV generator isn't optimized for phones/small screens yet. This overlay is
// hidden by default and only shown under a small-screen width (see app.css); the
// user can dismiss it to continue anyway.
export default function MobileNotice({ uiLang = 'en' }) {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null
  const no = uiLang === 'no'

  return (
    <div className="mobile-notice">
      <div className="mobile-notice-card">
        <div className="mobile-notice-icon">🖥️</div>
        <h2 className="mobile-notice-title">
          {no ? 'Åpne på PC eller Mac' : 'Best on a desktop or laptop'}
        </h2>
        <p className="mobile-notice-text">
          {no
            ? 'CV-generatoren er laget for større skjermer og er ikke tilpasset mobil ennå. For en god opplevelse, åpne den på en datamaskin.'
            : 'The CV generator is built for larger screens and isn’t mobile-friendly yet. For the best experience, open it on a computer.'}
        </p>
        <button className="mobile-notice-btn" onClick={() => setDismissed(true)}>
          {no ? 'Fortsett likevel' : 'Continue anyway'}
        </button>
      </div>
    </div>
  )
}
