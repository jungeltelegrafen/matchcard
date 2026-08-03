// Client-side, zero-cost guess of a portfolio link's title + category from its
// URL. Used to auto-fill the fields when a user pastes a link (never overwrites
// what they typed). No network call — a hostname lookup with a sensible
// fallback. Categories: 'code' | 'design' | 'project' | 'writing' | 'other'.

// Known hosts → { title, category }. Matched by substring against the hostname.
const KNOWN = [
  [['github.'],        { title: 'GitHub',         category: 'code' }],
  [['gitlab.'],        { title: 'GitLab',         category: 'code' }],
  [['bitbucket.'],     { title: 'Bitbucket',      category: 'code' }],
  [['stackoverflow.'], { title: 'Stack Overflow', category: 'code' }],
  [['npmjs.'],         { title: 'npm',            category: 'code' }],
  [['codepen.'],       { title: 'CodePen',        category: 'code' }],
  [['dribbble.'],      { title: 'Dribbble',       category: 'design' }],
  [['behance.'],       { title: 'Behance',        category: 'design' }],
  [['figma.'],         { title: 'Figma',          category: 'design' }],
  [['artstation.'],    { title: 'ArtStation',     category: 'design' }],
  [['medium.'],        { title: 'Medium',         category: 'writing' }],
  [['substack.'],      { title: 'Substack',       category: 'writing' }],
  [['dev.to'],         { title: 'DEV',            category: 'writing' }],
  [['hashnode.'],      { title: 'Hashnode',       category: 'writing' }],
  [['linkedin.'],      { title: 'LinkedIn',       category: 'other' }],
]

function hostname(url) {
  const raw = String(url || '').trim()
  if (!raw) return ''
  try {
    return new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`).hostname.toLowerCase()
  } catch {
    return ''
  }
}

// Title-case the second-level domain of an unknown host: read.cv → "Read.cv",
// janedoe.com → "Janedoe", my-site.io → "My-site".
function titleFromHost(host) {
  const h = host.replace(/^www\./, '')
  if (!h) return ''
  const parts = h.split('.')
  const sld = parts.length > 2 ? parts[parts.length - 2] : parts[0]
  const tld = parts.length >= 2 ? parts[parts.length - 1] : ''
  const cap = s => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)
  // Keep short vanity TLDs (.cv, .io, .me, .dev) as part of the name; drop
  // common generic ones (.com, .net, .org).
  const keepTld = tld && tld.length <= 2 || ['io', 'me', 'dev', 'app', 'ai', 'co'].includes(tld)
  return keepTld ? `${cap(sld)}.${tld}` : cap(sld)
}

// Returns { title, category } — either field may be '' when it can't tell.
export function deriveFromUrl(url) {
  const host = hostname(url)
  if (!host) return { title: '', category: '' }
  for (const [needles, out] of KNOWN) {
    if (needles.some(n => host.includes(n))) return { ...out }
  }
  return { title: titleFromHost(host), category: '' }
}
