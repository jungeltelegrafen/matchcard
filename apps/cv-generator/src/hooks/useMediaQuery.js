import { useState, useEffect } from 'react'

// The "compact" breakpoint: below it the desktop chrome (the absolute-centered
// header and the 252 + 740 + 252 three-column body) no longer fits without
// overlapping/clipping — measured minimum ≈ 1300px. Below it we switch to the
// single-column accordion body, the Options-collapsed header, AND the mobile
// recorder, all off this one query so they can never disagree.
export const MOBILE_QUERY = '(max-width: 1300px)'

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
