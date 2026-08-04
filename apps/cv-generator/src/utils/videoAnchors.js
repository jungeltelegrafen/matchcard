// Videos can be anchored to a specific experience via `experienceId` — an
// experience item's stable `_id`. Anchored videos render inline within that
// experience across every renderer; the rest stay in the main "Video
// Presentations" block. If an experience is deleted (its `_id` disappears), its
// videos gracefully fall back to the main block.
//
// NOTE: this relies on experience `_id`s reaching the renderers. `_id` is kept
// stable across AI regenerations (correlateIds) and languages (resyncLangIds),
// and — for exports/share — ExportFooter no longer strips it (see outputCv).

// The videos anchored to a given experience (by its `_id`), as {video, index}
// pairs so callers can address the video by its true index in cv.videos.
export function experienceVideos(videos = [], expId) {
  if (!expId) return []
  return (videos || [])
    .map((v, i) => ({ v, i }))
    .filter(({ v }) => v && v.experienceId && v.experienceId === expId)
}

// Videos NOT anchored to any current experience — the main "Video Presentations"
// block. Unset `experienceId`, or one that no longer matches any experience.
export function mainBlockVideos(videos = [], experiences = []) {
  const ids = new Set((experiences || []).map(e => e && e._id).filter(Boolean))
  return (videos || [])
    .map((v, i) => ({ v, i }))
    .filter(({ v }) => v && (!v.experienceId || !ids.has(v.experienceId)))
}

// Convenience for renderers that just want the anchored video objects (already
// URL-filtered by the caller).
export function experienceVideoItems(videos = [], expId) {
  return experienceVideos(videos, expId).map(({ v }) => v)
}
