import VideoCard from './VideoCard'
import { experienceVideos } from '../../utils/videoAnchors'

// Local strings for the attach picker (kept out of the big labels table).
const T = {
  attach:   { en: '+ Attach a video…', no: '+ Legg til en video…', es: '+ Adjuntar un vídeo…',
              sv: '+ Bifoga en video…', da: '+ Vedhæft en video…', pl: '+ Dołącz wideo…' },
  untitled: { en: 'Untitled video', no: 'Video uten tittel', es: 'Vídeo sin título',
              sv: 'Namnlös video', da: 'Video uden titel', pl: 'Wideo bez tytułu' },
}

// Inline video area shown at the bottom of a single experience entry in the
// editor: the videos anchored to this experience (full editable cards) plus a
// picker to attach another recorded video here. All edits go through the shared
// cv.videos array via onVideosChange.
export default function ExperienceVideos({
  expId, videos = [], experiences = [], lang = 'en', meta,
  onFieldEdit, onAccept, onDismiss, onVideosChange, candidateName,
}) {
  if (!expId) return null // experience has no stable id yet (shouldn't happen post-ensureIds)
  const tt = k => T[k][lang] || T[k].en
  const mine = experienceVideos(videos, expId) // {video, index} pairs anchored here
  const attachable = videos
    .map((v, i) => ({ v, i }))
    .filter(({ v }) => (v.experienceId || '') !== expId)

  const setItem = (i, next) => onVideosChange(videos.map((it, idx) => (idx === i ? next : it)))
  const removeAt = i => onVideosChange(videos.filter((_, idx) => idx !== i))
  const attach = vid =>
    onVideosChange(videos.map(it => (it._id === vid ? { ...it, experienceId: expId, placement: 'experience' } : it)))

  if (mine.length === 0 && attachable.length === 0) return null

  return (
    <div className="cv-exp-videos">
      {mine.map(({ v, i }) => (
        <VideoCard
          key={v._id || i} item={v} index={i} experiences={experiences}
          lang={lang} meta={meta} onFieldEdit={onFieldEdit} onAccept={onAccept} onDismiss={onDismiss}
          onChange={next => setItem(i, next)} onRemove={() => removeAt(i)} candidateName={candidateName}
        />
      ))}
      {attachable.length > 0 && (
        <select
          className="cv-exp-addvideo" value=""
          onChange={e => { if (e.target.value) attach(e.target.value) }}
        >
          <option value="">{tt('attach')}</option>
          {attachable.map(({ v }) => (
            <option key={v._id} value={v._id}>{v.title || tt('untitled')}</option>
          ))}
        </select>
      )}
    </div>
  )
}
