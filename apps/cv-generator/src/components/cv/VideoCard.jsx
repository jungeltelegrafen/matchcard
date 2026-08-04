import { useState } from 'react'
import CVField from './CVField'
import VideoProfileModal from '../VideoProfileModal'
import { getL, videoPlacement } from '../../utils/labels'
import { videoPoster } from '../../utils/videoPoster'

const PLACEMENTS = ['intro', 'motivation', 'experience', 'general']

// Local strings for the two anchor controls (kept out of the big labels table).
const T = {
  inMain: { en: 'Main video block', no: 'Hovedvideo-blokk', es: 'Bloque principal',
            sv: 'Huvudvideoblock', da: 'Hovedvideoblok', pl: 'Główny blok wideo' },
  showIn: { en: 'Shows in', no: 'Vises i', es: 'Aparece en', sv: 'Visas i', da: 'Vises i', pl: 'Widoczne w' },
}
const expLabel = e => [e.role, e.company].filter(Boolean).join(' · ').trim()

// One editable video card. Used both in the main "Video Presentations" block and
// inline within an experience (when the video is anchored to it). `index` is the
// video's TRUE index in cv.videos so field paths / edits target the right item.
export default function VideoCard({
  item, index, experiences = [], lang = 'en', meta,
  onFieldEdit, onAccept, onDismiss, onChange, onRemove, candidateName,
}) {
  const lb = getL(lang)
  const no = lang === 'no', es = lang === 'es'
  const sessionOnly = no ? 'Kun denne økten' : es ? 'Solo esta sesión' : 'This session only'
  const [open, setOpen] = useState(false)
  const tt = k => T[k][lang] || T[k].en
  const placementLabel = pl => videoPlacement(pl, lang) || pl
  const anchorable = experiences.filter(e => e && e._id && expLabel(e))

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
        <div className="cv-videocard-tagrow">
          <span className="cv-videocard-tag">{placementLabel(item.placement)}</span>
          {item.provider === 'local' && <span className="cv-video-badge">● {sessionOnly}</span>}
        </div>
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
            className="cv-videocard-place"
            value={item.placement || 'general'}
            onChange={e => onChange({ ...item, placement: e.target.value })}
          >
            {PLACEMENTS.map(pl => <option key={pl} value={pl}>{placementLabel(pl)}</option>)}
          </select>
          {/* Anchor: which section this video renders inside. */}
          <select
            className="cv-videocard-attach"
            title={tt('showIn')}
            value={item.experienceId || ''}
            onChange={e => onChange({ ...item, experienceId: e.target.value })}
          >
            <option value="">{tt('inMain')}</option>
            {anchorable.map(e => <option key={e._id} value={e._id}>{expLabel(e)}</option>)}
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
