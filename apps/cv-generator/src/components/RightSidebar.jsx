import VideoPanel from './VideoPanel'

export default function RightSidebar({ lang }) {
  return (
    <aside className="side-panel side-panel--right">
      <div className="side-panel-header">
        <h2 className="side-panel-title">
          {lang === 'no' ? 'Videopresentasjon' : 'Video Presentation'}
        </h2>
        <p className="side-panel-sub">
          {lang === 'no'
            ? 'Ta opp og knytt videoer til CVen din'
            : 'Record and attach videos to your CV'}
        </p>
      </div>

      <VideoPanel lang={lang} />
    </aside>
  )
}
