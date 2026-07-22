function VideoCard({ profile, type, lang }) {
  const isProject  = type === 'project'
  const videoUrl   = profile.videoUrl || ''
  const watchLabel = lang === 'no' ? '▶ Se video' : '▶ Watch video'

  return (
    <div className={`cv-vidcard cv-vidcard--${isProject ? 'project' : 'generic'}`}>
      <div className="cv-vidcard-type">
        <span className={`cv-vidcard-type-dot cv-vidcard-type-dot--${isProject ? 'project' : 'generic'}`} />
        <span>{isProject
          ? (lang === 'no' ? 'For prosjekt' : 'For project')
          : (lang === 'no' ? 'Generell' : 'Generic')}
        </span>
        {isProject && profile.projectName && (
          <span className="cv-vidcard-project-name">{profile.projectName}</span>
        )}
      </div>

      <div className="cv-vidcard-info">
        <span className="cv-vidcard-title">{profile.title}</span>
        {profile.description && (
          <p className="cv-vidcard-desc">{profile.description}</p>
        )}
        {videoUrl ? (
          <a
            href={videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="cv-vidcard-link"
          >
            {watchLabel}
            <span className="cv-vidcard-link-url">{videoUrl.replace(/^https?:\/\//, '')}</span>
          </a>
        ) : (
          <span className="cv-vidcard-link cv-vidcard-link--empty">
            {lang === 'no' ? 'Ingen lenke ennå' : 'No URL set yet'}
          </span>
        )}
      </div>
    </div>
  )
}

export default function VideoProfileSection({ videoProfile, projectVideoProfile, lang }) {
  const generic = videoProfile?.enabled ? videoProfile : null
  const project = projectVideoProfile?.enabled ? projectVideoProfile : null

  if (!generic && !project) return null

  return (
    <div className="cv-vidpro-section">
      <div className="cv-vidpro-grid">
        {generic && <VideoCard profile={generic} type="generic" lang={lang} />}
        {project && <VideoCard profile={project} type="project" lang={lang} />}
      </div>
    </div>
  )
}
