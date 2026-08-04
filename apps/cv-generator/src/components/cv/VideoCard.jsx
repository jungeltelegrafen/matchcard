import { useState } from 'react'
import CVField from './CVField'
import VideoProfileModal from '../VideoProfileModal'
import { getL } from '../../utils/labels'
import { videoPoster } from '../../utils/videoPoster'
import { videoAnchorId } from '../../utils/videoAnchors'

const T = { inMain: { en: 'Main video block', no: 'Hovedvideo-blokk', es: 'Bloque principal',
                      sv: 'Huvudvideoblock', da: 'Hovedvideoblok', pl: 'Główny blok wideo' } }

// One editable video card. Used in the main "Video Presentations" block and
// inline within any anchored unit (experience, position, section). `index` is
// the video's TRUE index in cv.videos so field paths / edits target it. The
// "show in" dropdown re-anchors the video to any unit (or the main block).
export default function VideoCard({
  item, index, anchorOptions = [], lang = 'en', meta,
  onFieldEdit, onAccept, onDismiss, onChange, onRemove, candidateName,
}) {
  const lb = getL(lang)
  const no = lang === 'no', es = lang === 'es'
  const sessionOnly = no ? 'Kun denne økten' : es ? 'Solo esta sesión' : 'This session only'
  const [open, setOpen] = useState(false)
  const inMain = T.inMain[lang] || T.inMain.en

  return (
    <div className="cv-videocard">
      <button
        className={`cv-videocard-poster${item.playbackUrl ? '' : ' empty'}`}
        style={videoPoster(item) ? { backgroundImage: `url(${videoPoster(item)})` } : undefined}
        onClick={() => item.playbackUrl && setOpen(true)}
        title={item.playbackUrl ? lb.watchVideo : undefined}
      >
        <span className="cv-videocard-play">▶</span>
        {item.duration && <span className="cv-videocard-dur">{item.duration}</span>}
      </button>

      <div className="cv-videocard-body">
        {item.provider === 'local' && (
          <div className="cv-videocard-tagrow">
            <span className="cv-video-badge">● {sessionOnly}</span>
          </div>
        )}
        <CVField
          value={item.title} path={`videos.${index}.title`}
          meta={meta} onEdit={onFieldEdit} onAccept={onAccept} onDismiss={onDismiss}
          className="cv-videocard-title" placeholder={lb.videoTitlePlaceholder}
        />
        <CVField
          value={item.description} path={`videos.${index}.description`}
          meta={meta} onEdit={onFieldEdit} onAccept={onAccept} onDismiss={onDismiss}
          as="textarea" rows={2}
          className="cv-videocard-desc" placeholder={lb.videoDescPlaceholder}
        />

        <div className="cv-videocard-manage">
          <select
            className="cv-videocard-attach"
            value={videoAnchorId(item)}
            onChange={e => onChange({ ...item, anchor: e.target.value, experienceId: '' })}
          >
            <option value="">{inMain}</option>
            {anchorOptions.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
          {item.provider !== 'local' && (
            <CVField
              value={item.playbackUrl} path={`videos.${index}.playbackUrl`}
              meta={meta} onEdit={onFieldEdit} onAccept={onAccept} onDismiss={onDismiss}
              className="cv-videocard-url" placeholder={lb.videoUrlPlaceholder}
            />
          )}
          <button className="cv-videocard-remove" onClick={onRemove}>{lb.remove}</button>
        </div>
      </div>

      {open && (
        <VideoProfileModal
          title={item.title} videoUrl={item.playbackUrl}
          candidateName={candidateName} lang={lang} onClose={() => setOpen(false)}
        />
      )}
    </div>
  )
}
