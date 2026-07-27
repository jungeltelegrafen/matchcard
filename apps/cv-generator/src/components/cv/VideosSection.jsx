import { useState } from 'react'
import CVField from './CVField'
import VideoProfileModal from '../VideoProfileModal'
import { getL } from '../../utils/labels'

const emptyItem = {
  title: '', kind: 'intro', description: '', placement: 'general',
  experienceId: '', provider: 'link', assetId: '',
  playbackUrl: '', thumbnailUrl: '', duration: '', recordedAt: '',
}

const PLACEMENTS = ['intro', 'motivation', 'experience', 'general']

// Editable "video presentations" section. Each item is a text card describing a
// recorded clip (title + why-watch + link) that plays inline. Videos live on the
// master CV; the tailoring panel decides which ones a given variant shows.
export default function VideosSection({
  items = [], lang = 'en', meta, onFieldEdit, onAccept, onDismiss, onChange, candidateName,
}) {
  const lb = getL(lang)
  const [openIdx, setOpenIdx] = useState(null)

  const setField = (i, key, val) =>
    onChange(items.map((it, idx) => (idx === i ? { ...it, [key]: val } : it)))

  const placementLabel = p => ({
    intro:      lang === 'no' ? 'Introduksjon' : lang === 'es' ? 'Introducción' : 'Introduction',
    motivation: lang === 'no' ? 'Motivasjon'   : lang === 'es' ? 'Motivación'   : 'Motivation',
    experience: lang === 'no' ? 'Erfaring'      : lang === 'es' ? 'Experiencia'  : 'Experience',
    general:    lang === 'no' ? 'Generell'      : lang === 'es' ? 'General'       : 'General',
  }[p] || p)

  return (
    <section className="cv-section cv-videos-section">
      <div className="cv-section-heading"><span>{lb.videos}</span></div>

      {items.map((item, i) => (
        <div key={i} className="cv-video-card">
          <div className="cv-video-card-head">
            <select
              className="cv-video-placement"
              value={item.placement || 'general'}
              onChange={e => setField(i, 'placement', e.target.value)}
            >
              {PLACEMENTS.map(p => <option key={p} value={p}>{placementLabel(p)}</option>)}
            </select>
            {item.playbackUrl
              ? <button className="cv-video-watch" onClick={() => setOpenIdx(i)}>{lb.watchVideo}</button>
              : <span className="cv-video-nourl">{lb.videoNoUrl}</span>}
          </div>

          <CVField
            value={item.title} path={`videos.${i}.title`}
            meta={meta} onEdit={onFieldEdit} onAccept={onAccept} onDismiss={onDismiss}
            className="cv-video-title-field" placeholder={lb.videoTitlePlaceholder}
          />
          <CVField
            value={item.description} path={`videos.${i}.description`}
            meta={meta} onEdit={onFieldEdit} onAccept={onAccept} onDismiss={onDismiss}
            as="textarea" rows={2}
            className="cv-video-desc-field" placeholder={lb.videoDescPlaceholder}
          />
          <CVField
            value={item.playbackUrl} path={`videos.${i}.playbackUrl`}
            meta={meta} onEdit={onFieldEdit} onAccept={onAccept} onDismiss={onDismiss}
            className="cv-video-url-field" placeholder={lb.videoUrlPlaceholder}
          />

          <button className="cv-btn-remove-item" onClick={() => onChange(items.filter((_, idx) => idx !== i))}>
            {lb.remove}
          </button>
        </div>
      ))}

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
