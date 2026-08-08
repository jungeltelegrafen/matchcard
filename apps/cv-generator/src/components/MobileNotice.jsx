import { useState } from 'react'

const KEY = 'cvgen_mobile_notice_dismissed'

// A slim, dismissible hint shown once on small screens. The CV generator is now
// responsive (see app.css / MobileVideoStudio), so this is no longer a blocker —
// just a gentle "a desktop is comfier for heavy editing" nudge, remembered after
// the first dismiss. Only displayed under the phone breakpoint (see app.css).
export default function MobileNotice({ uiLang = 'en' }) {
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(KEY) === '1' } catch { return false }
  })
  if (dismissed) return null
  const no = uiLang === 'no'

  function dismiss() {
    try { localStorage.setItem(KEY, '1') } catch { /* private mode */ }
    setDismissed(true)
  }

  return (
    <div className="mobile-notice">
      <span className="mobile-notice-text">
        {no
          ? 'Mobil er nytt her — for tung redigering er en PC eller Mac romsligere.'
          : 'Mobile is new here — for heavy editing a desktop or laptop is comfier.'}
      </span>
      <button className="mobile-notice-dismiss" onClick={dismiss} aria-label={no ? 'Lukk' : 'Dismiss'}>×</button>
    </div>
  )
}
