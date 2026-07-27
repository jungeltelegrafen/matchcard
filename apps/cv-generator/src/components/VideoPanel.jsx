import { useState } from 'react'
import VideoProfileModal from './VideoProfileModal'
import VideoStudioModal from './VideoStudioModal'

// Right-sidebar video hub: an overview of the CV's video presentations with
// quick play/remove, and the entry point to the recording studio (which opens
// as a full modal for space). Editing card text/links happens in the main CV
// "Video Presentations" section; both edit the same cv.videos on the master.
export default function VideoPanel({ videos = [], cv = {}, uiLang = 'en', contentLang = 'en', onChange }) {
  const [studioOpen, setStudioOpen] = useState(false)
  const [openIdx, setOpenIdx]       = useState(null)
  const no = uiLang === 'no'
  const es = uiLang === 'es'
  const p = cv.personal || {}
  const candidateName = [p.firstName, p.lastName].filter(Boolean).join(' ')

  const recordLabel = no ? '🎬 Ta opp video' : es ? '🎬 Grabar vídeo' : '🎬 Record a video'
  const emptyTitle  = no ? 'Ingen videoer ennå' : es ? 'Aún no hay vídeos' : 'No videos yet'
  const emptySub    = no ? 'En kort videohilsen er vanskeligere å forfalske — og viser hvem du er.'
                    : es ? 'Un breve vídeo es más difícil de falsificar — y muestra quién eres.'
                    : 'A short video is hard to fake — and shows who you really are.'
  const sessionOnly = no ? 'Kun denne økten' : es ? 'Solo esta sesión' : 'This session only'
  const untitled    = no ? 'Uten tittel' : es ? 'Sin título' : 'Untitled'

  const placementLabel = pl => ({
    intro:      no ? 'Introduksjon' : es ? 'Introducción' : 'Introduction',
    motivation: no ? 'Motivasjon'   : es ? 'Motivación'   : 'Motivation',
    experience: no ? 'Erfaring'      : es ? 'Experiencia'  : 'Experience',
    general:    no ? 'Generell'      : es ? 'General'       : 'General',
  }[pl] || pl)

  function remove(i) { onChange?.(videos.filter((_, idx) => idx !== i)) }

  return (
    <div className="video-hub">

      {videos.length === 0 ? (
        <div className="video-hub-empty">
          <span className="video-hub-empty-icon">🎬</span>
          <span className="video-hub-empty-title">{emptyTitle}</span>
          <span className="video-hub-empty-sub">{emptySub}</span>
        </div>
      ) : (
        <ul className="video-hub-list">
          {videos.map((v, i) => (
            <li key={v._id || i} className="video-hub-item">
              <button
                className={`video-hub-thumb${v.playbackUrl ? '' : ' empty'}`}
                onClick={() => v.playbackUrl && setOpenIdx(i)}
                style={v.thumbnailUrl ? { backgroundImage: `url(${v.thumbnailUrl})` } : undefined}
                title={v.playbackUrl ? 'Play' : undefined}
              >
                <span className="video-hub-thumb-play">▶</span>
              </button>
              <div className="video-hub-meta">
                <span className="video-hub-item-title">{v.title || untitled}</span>
                <div className="video-hub-tags">
                  <span className="video-hub-tag">{placementLabel(v.placement)}</span>
                  {v.provider === 'local' && <span className="video-hub-badge">● {sessionOnly}</span>}
                </div>
              </div>
              <button className="video-hub-remove" title="Remove" onClick={() => remove(i)}>×</button>
            </li>
          ))}
        </ul>
      )}

      <button className="video-hub-record" onClick={() => setStudioOpen(true)}>
        {recordLabel}
      </button>

      {openIdx != null && videos[openIdx] && (
        <VideoProfileModal
          title={videos[openIdx].title}
          videoUrl={videos[openIdx].playbackUrl}
          candidateName={candidateName}
          lang={contentLang}
          onClose={() => setOpenIdx(null)}
        />
      )}

      {studioOpen && (
        <VideoStudioModal
          cv={cv}
          lang={contentLang}
          onClose={() => setStudioOpen(false)}
          onSave={entry => onChange?.([...videos, entry])}
        />
      )}
    </div>
  )
}
