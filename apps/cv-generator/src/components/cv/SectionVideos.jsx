import VideoCard from './VideoCard'
import { videosForUnit, videoAnchorId } from '../../utils/videoAnchors'

const T = {
  record:   { en: '🎥 Record a video', no: '🎥 Ta opp en video', es: '🎥 Grabar un vídeo',
              sv: '🎥 Spela in en video', da: '🎥 Optag en video', pl: '🎥 Nagraj wideo' },
  choose:   { en: 'Attach an existing video…', no: 'Legg til en eksisterende video…', es: 'Adjuntar un vídeo…',
              sv: 'Bifoga en befintlig video…', da: 'Vedhæft en eksisterende video…', pl: 'Dołącz istniejące wideo…' },
  untitled: { en: 'Untitled video', no: 'Video uten tittel', es: 'Vídeo sin título',
              sv: 'Namnlös video', da: 'Video uden titel', pl: 'Wideo bez tytułu' },
}

// The inline video area for one CV unit (a section key or an item _id): the
// videos anchored here (editable cards) plus an attach row — record a new video
// (opens the studio pre-anchored to this unit) or pick an already-recorded one.
export default function SectionVideos({
  unitId, videos = [], anchorOptions = [], lang = 'en', meta,
  onFieldEdit, onAccept, onDismiss, onVideosChange, candidateName, onRecord,
}) {
  if (!unitId || !onVideosChange) return null
  const tt = k => T[k][lang] || T[k].en
  const mine = videosForUnit(videos, unitId)
  const attachable = videos.map((v, i) => ({ v, i })).filter(({ v }) => videoAnchorId(v) !== unitId)

  const setItem = (i, next) => onVideosChange(videos.map((it, idx) => (idx === i ? next : it)))
  const removeAt = i => onVideosChange(videos.filter((_, idx) => idx !== i))
  const attach = vid =>
    onVideosChange(videos.map(it => (it._id === vid ? { ...it, anchor: unitId, experienceId: '' } : it)))

  return (
    <div className="cv-unit-videos">
      {mine.map(({ v, i }) => (
        <VideoCard
          key={v._id || i} item={v} index={i} anchorOptions={anchorOptions}
          lang={lang} meta={meta} onFieldEdit={onFieldEdit} onAccept={onAccept} onDismiss={onDismiss}
          onChange={next => setItem(i, next)} onRemove={() => removeAt(i)} candidateName={candidateName}
        />
      ))}
      <div className="cv-attach-video">
        {onRecord && (
          <button type="button" className="cv-attach-video-btn" onClick={() => onRecord(unitId)}>
            {tt('record')}
          </button>
        )}
        {attachable.length > 0 && (
          <select
            className="cv-attach-video-pick" value=""
            onChange={e => { if (e.target.value) attach(e.target.value) }}
          >
            <option value="">{tt('choose')}</option>
            {attachable.map(({ v }) => (
              <option key={v._id} value={v._id}>{v.title || tt('untitled')}</option>
            ))}
          </select>
        )}
      </div>
    </div>
  )
}
