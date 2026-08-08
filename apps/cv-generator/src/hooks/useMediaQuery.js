import { useState, useEffect } from 'react'

// The single breakpoint that separates the desktop three-column layout from the
// mobile accordion layout. The SAME query drives both the App.jsx layout branch
// AND which video recorder mounts, so the two can never disagree (a phone always
// gets the accordion layout + the mobile recorder together).
export const MOBILE_QUERY = '(max-width: 640px)'

// SSR-safe boolean subscription to a media query. Returns false when matchMedia
// is unavailable (e.g. a server render) and stays in sync on viewport changes.
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(query).matches
  )

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const mql = window.matchMedia(query)
    const onChange = e => setMatches(e.matches)
    setMatches(mql.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])

  return matches
}
