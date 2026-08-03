// Turns patch paths into short human-readable labels for the chat "what
// changed" receipt, so the user sees exactly which fields were touched rather
// than trusting the model's prose.

const PERSONAL = {
  summary: 'Summary',
  title: 'Title',
  firstName: 'First name',
  lastName: 'Last name',
  educationSummary: 'Education summary',
  itExperienceSince: 'IT experience since',
  availableFrom: 'Availability',
  workPreference: 'Work preference',
  location: 'Location',
  phone: 'Phone',
  email: 'Email',
  linkedin: 'LinkedIn',
}

const SECTION = {
  experience: 'Experience',
  education: 'Education',
  certifications: 'Certification',
  courses: 'Course',
  skills: 'Skill group',
  portfolio: 'Portfolio link',
  positions: 'Position',
  competences: 'Competence',
  videos: 'Video',
}

const cap = s => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)

export function describePatch(patch) {
  const { op, path } = patch || {}
  if (!path) return 'a field'
  const parts = path.split('.')

  if (parts[0] === 'personal' && parts[1]) return PERSONAL[parts[1]] || cap(parts[1])

  const sec = SECTION[parts[0]] || cap(parts[0])

  if (op === 'append') return `New ${sec.toLowerCase()}`

  const idx = parts.findIndex(p => /^\d+$/.test(p))
  if (idx >= 0) {
    const n = Number(parts[idx]) + 1
    const tail = parts.slice(idx + 1).filter(p => !/^\d+$/.test(p) && p !== 'items')
    const field = tail.length ? ` · ${tail.join(' ')}` : ''
    return `${sec} #${n}${field}`
  }
  return sec
}

// { changed: [labels], failed: [{ label, reason }] } from applyPatchesReport output.
export function buildReceipt(applied, skipped) {
  return {
    changed: [...new Set((applied || []).map(describePatch))],
    failed: (skipped || []).map(s => ({ label: describePatch(s.patch), reason: s.reason })),
  }
}
