import PersonalSection from './cv/PersonalSection'
import SkillsSection from './cv/SkillsSection'
import CompetenceTable from './cv/CompetenceTable'
import ExperienceSection from './cv/ExperienceSection'
import PositionsSection from './cv/PositionsSection'
import EducationSection from './cv/EducationSection'
import CertsCourseSection from './cv/CertsCourseSection'
import LanguagesSection from './cv/LanguagesSection'

function SectionWrap({ sectionKey, hoveredSection, commentCounts, chatChangedSections, onDismissChatChange, children }) {
  const count      = commentCounts?.[sectionKey] || 0
  const active     = hoveredSection === sectionKey
  const chatChanged = chatChangedSections?.has(sectionKey)

  const classes = [
    'cv-section-outer',
    active      ? 'cv-section--highlighted'  : '',
    chatChanged ? 'cv-section--chat-updated' : '',
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
      {chatChanged && (
        <div className="cv-section-chat-badge">
          <span>✎ Updated by chat</span>
          <button
            className="cv-section-chat-dismiss"
            onClick={() => onDismissChatChange?.(sectionKey)}
            title="Dismiss"
          >×</button>
        </div>
      )}
      {children}
    </div>
  )
}

export default function CVEditor({ cv, lang = 'en', meta, onFieldEdit, onAccept, onDismiss, onStructural, hoveredSection, commentCounts, chatChangedSections, onDismissChatChange }) {
  const shared = { lang, meta, onFieldEdit, onAccept, onDismiss }
  const wrap = sectionKey => ({ sectionKey, hoveredSection, commentCounts, chatChangedSections, onDismissChatChange })

  return (
    <div className="cv-editor">
      <SectionWrap {...wrap('summary')}>
        <PersonalSection data={cv.personal} videoProfile={cv.videoProfile} projectVideoProfile={cv.projectVideoProfile} {...shared} />
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
    </div>
  )
}
