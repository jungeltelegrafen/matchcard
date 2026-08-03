import { useState } from 'react'
import { fetchUrlText } from '../utils/parseWithClaude'

// Small URL-intake row: paste a public page / job-ad link, fetch its readable
// text server-side (SSRF-guarded), and hand it to the parent to append into the
// editable textarea. The parent stays the source of truth for the text.
export default function UrlFetchField({ lang = 'en', disabled = false, placeholder, hint, onText }) {
  const no = lang === 'no'
  const [url, setUrl]     = useState('')
  const [busy, setBusy]   = useState(false)
  const [error, setError] = useState('')

  async function handleFetch() {
    const u = url.trim()
    if (!u || busy) return
    setError('')
    setBusy(true)
    try {
      const { text, title, url: finalUrl, truncated } = await fetchUrlText(u)
      const label = title || finalUrl || u
      // Provenance marker: makes fetched (untrusted) content easy to spot and
      // trim during review, and visually separates it from the user's own text.
      const marker = `\n\n--- ${no ? 'hentet fra' : 'fetched from'}: ${label} ---\n`
      onText(marker + text + '\n')
      setUrl('')
      if (truncated) {
        setError(no ? 'Siden var lang — teksten ble forkortet.' : 'Long page — the text was truncated.')
      }
    } catch (e) {
      setError(e.message || (no ? 'Kunne ikke hente siden.' : 'Could not fetch the page.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="url-fetch">
      <div className="url-fetch-row">
        <span className="url-fetch-icon" aria-hidden="true">🔗</span>
        <input
          type="url"
          className="url-fetch-input"
          value={url}
          onChange={e => setUrl(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleFetch() } }}
          placeholder={placeholder || (no ? 'Lim inn en offentlig lenke…' : 'Paste a public link…')}
          disabled={disabled || busy}
        />
        <button
          type="button"
          className="url-fetch-btn"
          onClick={handleFetch}
          disabled={disabled || busy || !url.trim()}
        >
          {busy ? <span className="spinner-sm" /> : (no ? 'Hent' : 'Fetch')}
        </button>
      </div>
      {hint && !error && <p className="url-fetch-hint">{hint}</p>}
      {error && <p className="url-fetch-error">{error}</p>}
    </div>
  )
}
