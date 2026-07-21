import { useState } from 'react'
import VideoProfileModal from '../VideoProfileModal'

const GENERIC_MOCK = {
  enabled: true,
  title: 'Professional Introduction',
  description: 'An overview of professional background, core skills, and approach to work.',
  videoUrl: 'https://iframe.videodelivery.net/mock-generic',
  thumbnailUrl: '',
  duration: '3:12',
}

const PROJECT_MOCK = {
  enabled: true,
  projectName: 'Accenture — Cloud Migration 2025',
  title: 'Project Introduction',
  description: 'Tailored presentation of relevant experience for this specific engagement.',
  videoUrl: 'https://iframe.videodelivery.net/mock-project',
  thumbnailUrl: '',
  duration: '2:48',
}

function VideoCard({ profile, type, candidateName, lang }) {
  const [open, setOpen] = useState(false)
  const isProject = type === 'project'
  const displayUrl = profile.videoUrl || (isProject
    ? 'https://video.cloudflare.com/project-placeholder'
    : 'https://video.cloudflare.com/intro-placeholder')
  const shortUrl = displayUrl.replace(/^https?:\/\//, '').replace(/\/mock-.*/, '/...')

  return (
    <>
      <div className={`cv-vidcard${isProject ? ' cv-vidcard--project' : ' cv-vidcard--generic'}`}>
        {/* Type label strip */}
        <div className="cv-vidcard-type">
          {isProject ? (
            <>
              <span className="cv-vidcard-type-dot cv-vidcard-type-dot--project" />
              <span>{lang === 'no' ? 'For prosjekt' : 'For project'}</span>
              {profile.projectName && (
                <span className="cv-vidcard-project-name">{profile.projectName}</span>
              )}
            </>
          ) : (
            <>
              <span className="cv-vidcard-type-dot cv-vidcard-type-dot--generic" />
              <span>{lang === 'no' ? 'Generell' : 'Generic'}</span>
            </>
          )}
        </div>

        {/* Thumbnail */}
        <button className="cv-vidcard-thumb" onClick={() => setOpen(true)}>
          {profile.thumbnailUrl
            ? <img src={profile.thumbnailUrl} alt="" className="cv-vidcard-thumb-img" />
            : (
              <div className="cv-vidcard-thumb-bg">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="rgba(255,255,255,0.6)" stroke="none">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              </div>
            )
          }
          {profile.duration && <span className="cv-vidcard-duration">{profile.duration}</span>}
        </button>

        {/* Info */}
        <div className="cv-vidcard-info">
          <span className="cv-vidcard-title">{profile.title}</span>
          {profile.description && (
            <p className="cv-vidcard-desc">{profile.description}</p>
          )}
          <a
            href={displayUrl}
            className="cv-vidcard-link"
            onClick={e => { e.preventDefault(); setOpen(true) }}
          >
            <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor" stroke="none">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            {lang === 'no' ? 'Se video' : 'Watch video'}
            <span className="cv-vidcard-link-url">{shortUrl}</span>
          </a>
        </div>
      </div>

      {open && (
        <VideoProfileModal
          title={`${profile.title}${isProject && profile.projectName ? ` — ${profile.projectName}` : ''}`}
          videoUrl={displayUrl}
          candidateName={candidateName}
          lang={lang}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}

export default function VideoProfileSection({ videoProfile, projectVideoProfile, candidateName, lang }) {
  const generic = (videoProfile?.enabled ? videoProfile : null) ?? GENERIC_MOCK
  const project = (projectVideoProfile?.enabled ? projectVideoProfile : null) ?? PROJECT_MOCK

  return (
    <div className="cv-vidpro-section">
      <div className="cv-vidpro-grid">
        <VideoCard
          profile={generic}
          type="generic"
          candidateName={candidateName}
          lang={lang}
        />
        <VideoCard
          profile={project}
          type="project"
          candidateName={candidateName}
          lang={lang}
        />
      </div>
    </div>
  )
}
