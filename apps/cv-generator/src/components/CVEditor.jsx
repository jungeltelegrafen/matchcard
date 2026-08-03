import { useRef } from 'react'
import { ChatChangesContext } from './cv/ChatChangesContext'
import { fileToDataUrl, hasCompanyFooter } from '../utils/branding'
import PersonalSection from './cv/PersonalSection'
import SkillsSection from './cv/SkillsSection'
import CompetenceTable from './cv/CompetenceTable'
import ExperienceSection from './cv/ExperienceSection'
import PositionsSection from './cv/PositionsSection'
import EducationSection from './cv/EducationSection'
import CertsCourseSection from './cv/CertsCourseSection'
import LanguagesSection from './cv/LanguagesSection'
import PortfolioSection from './cv/PortfolioSection'
import VideosSection from './cv/VideosSection'

// Branding header shown at the top of the CV card (page-1 only in exports):
// company logo left (click to edit branding), profile photo right (per-CV upload).
function BrandingHeader({ branding, onEditBranding, onSetProfilePicture }) {
  const photoRef = useRef(null)
  async function onPhoto(file) {
    if (!file) return
    try { onSetProfilePicture(await fileToDataUrl(file, { maxDim: 512, quality: 0.85 })) } catch { /* ignore */ }
  }
  return (
    <div className="cv-branding-header">
      <div className="cv-brand-logo" onClick={onEditBranding} title="Branding">
        {branding.logo
          ? <img src={branding.logo} alt="logo" />
          : <span className="cv-brand-slot">+ Logo</span>}
      </div>
      <div className="cv-brand-photo" onClick={() => photoRef.current?.click()} title="Profile photo">
        {branding.profilePicture
          ? <img src={branding.profilePicture} alt="photo" />
          : <span className="cv-brand-slot">+ Photo</span>}
        <input ref={photoRef} type="file" accept="image/*" style={{ display: 'none' }}
          onChange={e => { onPhoto(e.target.files?.[0]); e.target.value = '' }} />
      </div>
      {branding.profilePicture && (
        <button className="cv-brand-photo-remove" onClick={() => onSetProfilePicture('')} title="Remove photo">×</button>
      )}
    </div>
  )
}

// Company footer at the bottom of the CV card (page-1 only in exports).
function BrandingFooter({ branding, onEditBranding }) {
  if (!hasCompanyFooter(branding)) return null
  return (
    <div className="cv-branding-footer" onClick={onEditBranding} title="Edit branding">
      <div className="cv-bf-row cv-bf-top">
        <span className="cv-bf-left">{branding.companyName}</span>
        <span className="cv-bf-center">{branding.companyAddress}</span>
        <span className="cv-bf-right">{branding.companyWebsite}</span>
      </div>
      <div className="cv-bf-row cv-bf-bottom">
        <span className="cv-bf-left" />
        <span className="cv-bf-center">{branding.companyEmail}</span>
        <span className="cv-bf-right">{branding.companyPhone}</span>
      </div>
    </div>
  )
}

function SectionWrap({ sectionKey, hoveredSection, commentCounts, children }) {
  const count      = commentCounts?.[sectionKey] || 0
  const active     = hoveredSection === sectionKey

  const classes = [
    'cv-section-outer',
    active ? 'cv-section--highlighted' : '',
  ].filter(Boolean).join(' ')

  return (
    <div className={classes}>
      {count > 0 && (
        <span
          className="cv-section-comment-badge"
          title={`${count} feedback item${count !== 1 ? 's' : ''}`}
        >
          {count}
        </span>
      )}
      {children}
    </div>
  )
}

export default function CVEditor({ cv, lang = 'en', meta, onFieldEdit, onAccept, onDismiss, onStructural, hoveredSection, commentCounts, changedPaths, onChangeSeen, branding, onEditBranding, onSetProfilePicture }) {
  const shared = { lang, meta, onFieldEdit, onAccept, onDismiss }
  const wrap = sectionKey => ({ sectionKey, hoveredSection, commentCounts })

  return (
    <ChatChangesContext.Provider value={{ changedPaths, onChangeSeen }}>
     <div className="cv-editor">
      {branding && (
        <BrandingHeader branding={branding} onEditBranding={onEditBranding} onSetProfilePicture={onSetProfilePicture} />
      )}
      <SectionWrap {...wrap('summary')}>
        <PersonalSection data={cv.personal} {...shared} />
      </SectionWrap>

      <SectionWrap {...wrap('videos')}>
        <VideosSection
          items={cv.videos || []}
          {...shared}
          candidateName={[cv.personal?.firstName, cv.personal?.lastName].filter(Boolean).join(' ')}
          onChange={items => onStructural('videos', items)}
        />
      </SectionWrap>

      <SectionWrap {...wrap('skills')}>
        <SkillsSection
          items={cv.skills} {...shared}
          onSkillsChange={items => onStructural('skills', items)}
        />
      </SectionWrap>

      <CompetenceTable
        data={cv.competences}
        experiences={cv.experience}
        {...shared}
        onChange={newData => onStructural('competences', newData)}
      />

      <SectionWrap {...wrap('experience')}>
        <ExperienceSection
          items={cv.experience}
          cvType={cv.cvType}
          {...shared}
          onChange={items => onStructural('experience', items)}
        />
      </SectionWrap>

      <PositionsSection
        data={cv.positions || { enabled: false, useProjectFormat: false, items: [] }}
        {...shared}
        onChange={newData => onStructural('positions', newData)}
      />

      <SectionWrap {...wrap('education')}>
        <EducationSection
          items={cv.education} {...shared}
          onChange={items => onStructural('education', items)}
        />
      </SectionWrap>

      <CertsCourseSection
        certifications={cv.certifications || []}
        courses={cv.courses || []}
        {...shared}
        onCertsChange={items => onStructural('certifications', items)}
        onCoursesChange={items => onStructural('courses', items)}
      />

      <SectionWrap {...wrap('languages')}>
        <LanguagesSection
          items={cv.languages || []}
          lang={lang}
          onChange={langs => onStructural('languages', langs)}
        />
      </SectionWrap>

      <SectionWrap {...wrap('portfolio')}>
        <PortfolioSection
          items={cv.portfolio || []}
          lang={lang}
          meta={meta}
          onFieldEdit={onFieldEdit}
          onAccept={onAccept}
          onDismiss={onDismiss}
          onChange={items => onStructural('portfolio', items)}
        />
      </SectionWrap>

      {branding && <BrandingFooter branding={branding} onEditBranding={onEditBranding} />}
     </div>
    </ChatChangesContext.Provider>
  )
}
