import { useEffect } from 'react'

function getEmbedUrl(url) {
  if (!url) return null
  // Cloudflare Stream
  if (url.includes('videodelivery.net') || url.includes('cloudflarestream.com')) return url
  // Vimeo
  const vimeo = url.match(/vimeo\.com\/(\d+)/)
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}?autoplay=1`
  // YouTube
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/)
  if (yt) return `https://www.youtube.com/embed/${yt[1]}?autoplay=1`
  return null
}

export default function VideoProfileModal({ title, videoUrl, candidateName, lang, onClose }) {
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const embedUrl = getEmbedUrl(videoUrl)
  const isMock   = videoUrl?.includes('mock-video-id-placeholder')

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="vidpro-modal" onClick={e => e.stopPropagation()}>

        <div className="vidpro-modal-header">
          <div className="vidpro-modal-meta">
            <span className="vidpro-modal-label">
              {lang === 'no' ? 'Videopresentasjon' : 'Video Profile'}
            </span>
            <h2 className="vidpro-modal-title">
              {candidateName ? `${candidateName} — ` : ''}{title}
            </h2>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="vidpro-modal-body">
          {isMock ? (
            <div className="vidpro-modal-mock">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 3 19 12 5 21 5 3" fill="rgba(255,255,255,0.2)" stroke="none"/>
              </svg>
              <p className="vidpro-modal-mock-label">
                {lang === 'no'
                  ? 'Video vises her etter opplasting til Cloudflare / Vimeo'
                  : 'Video will appear here once uploaded to Cloudflare or Vimeo'}
              </p>
              {videoUrl && (
                <a href={videoUrl} target="_blank" rel="noopener noreferrer" className="vidpro-modal-ext-link">
                  {lang === 'no' ? 'Åpne på plattform' : 'Open on platform'} ↗
                </a>
              )}
            </div>
          ) : embedUrl ? (
            <iframe
              src={embedUrl}
              className="vidpro-modal-iframe"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              title={title}
            />
          ) : (
            <div className="vidpro-modal-mock">
              <p className="vidpro-modal-mock-label">
                <a href={videoUrl} target="_blank" rel="noopener noreferrer" className="vidpro-modal-ext-link">
                  {lang === 'no' ? 'Åpne video ↗' : 'Open video ↗'}
                </a>
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
