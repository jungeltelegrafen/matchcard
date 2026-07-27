import VideoPanel from './VideoPanel'

export default function RightSidebar({ lang, contentLang, videos, cv, onVideosChange }) {
  const no = lang === 'no', es = lang === 'es'
  return (
    <aside className="side-panel side-panel--right">
      <div className="side-panel-header">
        <h2 className="side-panel-title">
          {no ? 'Videopresentasjon' : es ? 'Presentación en vídeo' : 'Video Presentation'}
        </h2>
        <p className="side-panel-sub">
          {no ? 'Ta opp og knytt videoer til CVen din'
            : es ? 'Graba y adjunta vídeos a tu CV'
            : 'Record and attach videos to your CV'}
        </p>
      </div>

      <VideoPanel
        videos={videos}
        cv={cv}
        uiLang={lang}
        contentLang={contentLang}
        onChange={onVideosChange}
      />
    </aside>
  )
}
