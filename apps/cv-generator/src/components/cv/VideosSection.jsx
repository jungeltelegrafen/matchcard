import { useState } from 'react'
import CVField from './CVField'
import VideoProfileModal from '../VideoProfileModal'
import { getL, videoPlacement } from '../../utils/labels'
import { videoPoster } from '../../utils/videoPoster'

const emptyItem = {
  title: '', kind: 'intro', description: '', placement: 'general',
  experienceId: '', provider: 'link', assetId: '',
  playbackUrl: '', thumbnailUrl: '', duration: '', recordedAt: '',
}

const PLACEMENTS = ['intro', 'motivation', 'experience', 'general']

// Video presentations shown in the CV body as polished, clickable media cards —
// the representation a hiring manager clicks to watch. Editable inline (title,
// why-watch, link); recording happens in the right-hand video panel.
export default function VideosSection({
  items = [], lang = 'en', meta, onFieldEdit, onAccept, onDismiss, onChange, candidateName,
}) {
  const lb = getL(lang)
  const [openIdx, setOpenIdx] = useState(null)
  const no = lang === 'no', es = lang === 'es'
  const sessionOnly = no ? 'Kun denne økten' : es ? 'Solo esta sesión' : 'This session only'
  const durationTxt = d => d || ''

  const placementLabel = pl => videoPlacement(pl, lang) || pl

  const setField = (i, key, val) =>
    onChange(items.map((it, idx) => (idx === i ? { ...it, [key]: val } : it)))

  return (
    <section className="cv-section cv-videos-section">
      <div className="cv-section-heading"><span>{lb.videos}</span></div>

      <div className="cv-videocards">
        {items.map((item, i) => (
          <div key={item._id || i} className="cv-videocard">
            <button
              className={`cv-videocard-poster${item.playbackUrl ? '' : ' empty'}`}
              style={videoPoster(item) ? { backgroundImage: `url(${videoPoster(item)})` } : undefined}
              onClick={() => item.playbackUrl && setOpenIdx(i)}
              title={item.playbackUrl ? lb.watchVideo : undefined}
            >
              <span className="cv-videocard-play">▶</span>
              {item.duration && <span className="cv-videocard-dur">{durationTxt(item.duration)}</span>}
            </button>

            <div className="cv-videocard-body">
              <div className="cv-videocard-tagrow">
                <span className="cv-videocard-tag">{placementLabel(item.placement)}</span>
                {item.provider === 'local' && <span className="cv-video-badge">● {sessionOnly}</span>}
              </div>
              <CVField
                value={item.title} path={`videos.${i}.title`}
                meta={meta} onEdit={onFieldEdit} onAccept={onAccept} onDismiss={onDismiss}
                className="cv-videocard-title" placeholder={lb.videoTitlePlaceholder}
              />
              <CVField
                value={item.description} path={`videos.${i}.description`}
                meta={meta} onEdit={onFieldEdit} onAccept={onAccept} onDismiss={onDismiss}
                as="textarea" rows={2}
                className="cv-videocard-desc" placeholder={lb.videoDescPlaceholder}
              />

              <div className="cv-videocard-manage">
                <select
                  className="cv-videocard-place"
                  value={item.placement || 'general'}
                  onChange={e => setField(i, 'placement', e.target.value)}
                >
                  {PLACEMENTS.map(pl => <option key={pl} value={pl}>{placementLabel(pl)}</option>)}
                </select>
                {item.provider !== 'local' && (
                  <CVField
                    value={item.playbackUrl} path={`videos.${i}.playbackUrl`}
                    meta={meta} onEdit={onFieldEdit} onAccept={onAccept} onDismiss={onDismiss}
                    className="cv-videocard-url" placeholder={lb.videoUrlPlaceholder}
                  />
                )}
                <button className="cv-videocard-remove" onClick={() => onChange(items.filter((_, idx) => idx !== i))}>
                  {lb.remove}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button className="cv-btn-add" onClick={() => onChange([...items, { ...emptyItem }])}>
        {lb.addVideo}
      </button>

      {openIdx != null && items[openIdx] && (
        <VideoProfileModal
          title={items[openIdx].title}
          videoUrl={items[openIdx].playbackUrl}
          candidateName={candidateName}
          lang={lang}
          onClose={() => setOpenIdx(null)}
        />
      )}
    </section>
  )
}
