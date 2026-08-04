// A video can anchor to a CV "unit": either a whole section (summary, skills,
// key competences, education, courses, portfolio) or a specific item (an
// experience or position entry, by its stable `_id`). Anchored videos render
// inline within that unit across every renderer; the rest form the main "Video
// Presentations" block. Section keys are words and item `_id`s are 8-char hex,
// so a single `anchor` string unambiguously holds either.
//
// The anchor rides the existing `_id` machinery (stable across AI regenerations
// and languages; ExportFooter keeps `_id`s in the export/share output).

export const SECTION_UNITS = ['summary', 'skills', 'competences', 'education', 'courses', 'portfolio']

// A video's anchor. `anchor` is the current field; `experienceId` is the legacy
// experience-only anchor, read as a fallback so old data still resolves.
export function videoAnchorId(v) {
  return (v && (v.anchor || v.experienceId)) || ''
}

// {video, index} pairs anchored to a unit — callers need the true index in
// cv.videos to address the item for edits/field paths.
export function videosForUnit(videos = [], unitId) {
  if (!unitId) return []
  return (videos || []).map((v, i) => ({ v, i })).filter(({ v }) => videoAnchorId(v) === unitId)
}

// Just the anchored video objects for a unit (renderers).
export function videoItemsForUnit(videos = [], unitId) {
  return videosForUnit(videos, unitId).map(({ v }) => v)
}
// Legacy alias (experience hooks) — same behaviour, unit id is the experience _id.
export const experienceVideoItems = videoItemsForUnit

// Every anchorable unit id — sections always available in the editor + item ids.
export function allUnitIds(cv = {}) {
  const ids = [...SECTION_UNITS]
  ;(cv.experience || []).forEach(e => e && e._id && ids.push(e._id))
  ;(cv.positions?.items || []).forEach(p => p && p._id && ids.push(p._id))
  return ids
}

// Unit ids that ACTUALLY render (content-based) — used by exporters so a video
// anchored to an empty/absent unit falls back to the main block instead of
// vanishing (an empty section isn't rendered in the PDF/DOCX/share output).
export function renderedUnitIds(cv = {}) {
  const ids = []
  if (cv.personal?.summary) ids.push('summary')
  if ((cv.skills || []).length) ids.push('skills')
  if (cv.competences?.enabled !== false && (cv.competences?.items || []).some(c => c.requirement?.trim())) ids.push('competences')
  if ((cv.education || []).length) ids.push('education')
  if ((cv.courses || []).length) ids.push('courses')
  if ((cv.portfolio || []).some(p => p && (p.url || p.label))) ids.push('portfolio')
  ;(cv.experience || []).forEach(e => e && e._id && ids.push(e._id))
  if (cv.positions?.enabled) (cv.positions.items || []).forEach(p => p && p._id && ids.push(p._id))
  return ids
}

// The main "Video Presentations" block: videos not anchored to a valid unit
// (unanchored, or anchored to a unit not in `validUnitIds`). Returns {video,index}.
export function mainBlockVideos(videos = [], validUnitIds = []) {
  const set = new Set(validUnitIds)
  return (videos || []).map((v, i) => ({ v, i })).filter(({ v }) => {
    const a = videoAnchorId(v)
    return !a || !set.has(a)
  })
}

// Label options for the "show in section" dropdown. `secLabel(key)` localizes a
// section name; experiences/positions are labelled by role · company.
export function anchorOptions(cv = {}, secLabel = k => k) {
  const label = e => [e.role, e.company].filter(Boolean).join(' · ').trim() || (e.company || e.role || '')
  const opts = SECTION_UNITS.map(k => ({ id: k, label: secLabel(k) }))
  ;(cv.experience || []).forEach(e => { if (e && e._id && label(e)) opts.push({ id: e._id, label: label(e) }) })
  ;(cv.positions?.items || []).forEach(p => { if (p && p._id && label(p)) opts.push({ id: p._id, label: label(p) }) })
  return opts
}
