import VideoCard from './VideoCard'
import { getL } from '../../utils/labels'
import { mainBlockVideos } from '../../utils/videoAnchors'

const emptyItem = {
  title: '', kind: 'intro', description: '', placement: 'general',
  experienceId: '', provider: 'link', assetId: '',
  playbackUrl: '', thumbnailUrl: '', duration: '', recordedAt: '',
}

// The main "Video Presentations" block in the CV body. Shows only videos NOT
// anchored to an experience — anchored ones render inline in their experience
// (see ExperienceVideos). Each card carries the "show in section" dropdown.
export default function VideosSection({
  items = [], experiences = [], lang = 'en', meta,
  onFieldEdit, onAccept, onDismiss, onChange, candidateName,
}) {
  const lb = getL(lang)
  const main = mainBlockVideos(items, experiences) // {video, index} pairs
  const setItem = (i, next) => onChange(items.map((it, idx) => (idx === i ? next : it)))
  const removeAt = i => onChange(items.filter((_, idx) => idx !== i))

  return (
    <section className="cv-section cv-videos-section">
      <div className="cv-section-heading"><span>{lb.videos}</span></div>

      <div className="cv-videocards">
        {main.map(({ v, i }) => (
          <VideoCard
            key={v._id || i} item={v} index={i} experiences={experiences}
            lang={lang} meta={meta} onFieldEdit={onFieldEdit} onAccept={onAccept} onDismiss={onDismiss}
            onChange={next => setItem(i, next)} onRemove={() => removeAt(i)} candidateName={candidateName}
          />
        ))}
      </div>

      <button className="cv-btn-add" onClick={() => onChange([...items, { ...emptyItem }])}>
        {lb.addVideo}
      </button>
    </section>
  )
}
