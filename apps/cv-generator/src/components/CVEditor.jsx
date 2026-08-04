import { useRef, useState, useLayoutEffect, Fragment } from 'react'
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
import { getL } from '../utils/labels'
import { allUnitIds, anchorOptions } from '../utils/videoAnchors'

// A4 aspect ratio (height / width) — used to estimate the page-1 boundary on the
// single continuous editor sheet, so the footer lands roughly where the printed
// (PDF/Word) footer sits. A guide, not exact.
const A4_RATIO = 297 / 210
// Combined top+bottom padding of the .cv-editor sheet (see app.css).
const SHEET_PAD_Y = 112

// Outer height of an element including its vertical margins.
function outerHeight(el) {
  if (!el) return 0
  const r = el.getBoundingClientRect()
  const s = getComputedStyle(el)
  return r.height + (parseFloat(s.marginTop) || 0) + (parseFloat(s.marginBottom) || 0)
}

// Branding header shown at the top of the CV card (page-1 only in exports):
// company logo left (click to edit branding), profile photo right (per-CV upload).
// The logo and photo are gated independently (showLogo / showPhoto).
function BrandingHeader({ branding, showLogo, showPhoto, onEditBranding, onSetProfilePicture }) {
  const photoRef = useRef(null)
  async function onPhoto(file) {
    if (!file) return
    try { onSetProfilePicture(await fileToDataUrl(file, { maxDim: 512, quality: 0.85 })) } catch { /* ignore */ }
  }
  return (
    <div className="cv-branding-header">
      {showLogo && (
        <div className="cv-brand-logo" onClick={onEditBranding} title="Branding">
          {branding.logo
            ? <img src={branding.logo} alt="logo" />
            : <span className="cv-brand-slot">+ Logo</span>}
        </div>
      )}
      {showPhoto && (
        <div className="cv-brand-photo" onClick={() => photoRef.current?.click()} title="Profile photo">
          {branding.profilePicture
            ? <img src={branding.profilePicture} alt="photo" />
            : <span className="cv-brand-slot">+ Photo</span>}
          <input ref={photoRef} type="file" accept="image/*" style={{ display: 'none' }}
            onChange={e => { onPhoto(e.target.files?.[0]); e.target.value = '' }} />
          {branding.profilePicture && (
            <button className="cv-brand-photo-remove" onClick={e => { e.stopPropagation(); onSetProfilePicture('') }} title="Remove photo">×</button>
          )}
        </div>
      )}
    </div>
  )
}

// Company footer, pinned to the bottom of page 1 (page-1 only in exports).
function BrandingFooter({ branding, onEditBranding }) {
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

export default function CVEditor({ cv, lang = 'en', uiLang = 'en', meta, onFieldEdit, onAccept, onDismiss, onStructural, onVideosChange, onRecord, hoveredSection, commentCounts, changedPaths, onChangeSeen, branding, includeBranding = true, includeImage = true, onToggleBranding, onToggleImage, onEditBranding, onSetProfilePicture }) {
  const shared = { lang, meta, onFieldEdit, onAccept, onDismiss }
  const wrap = sectionKey => ({ sectionKey, hoveredSection, commentCounts })
  const no = uiLang === 'no'

  // Videos anchor to CV units (sections + experience/position items). Compute the
  // "show in" options + the shared video-attach bundle once, pass to each section.
  const lb = getL(lang)
  const secLabel = k => ({ summary: lb.summary, skills: lb.skills, competences: lb.competences,
    education: lb.education, courses: lb.courses, portfolio: lb.portfolio }[k] || k)
  const vidAnchorOptions = anchorOptions(cv, secLabel)
  const vidUnitIds = allUnitIds(cv)
  const candidateName = [cv.personal?.firstName, cv.personal?.lastName].filter(Boolean).join(' ')
  const videoProps = {
    videos: cv.videos || [],
    // Videos live on the master (shared across variants) — route to the master
    // setter when provided, else fall back to the structural handler.
    onVideosChange: onVideosChange || (items => onStructural('videos', items)),
    candidateName, onRecord, anchorOptions: vidAnchorOptions,
  }

  // Logo + footer follow "branding"; the profile photo follows "image".
  const showLogo   = Boolean(branding) && includeBranding
  const showPhoto  = Boolean(branding) && includeImage
  const showHeader = showLogo || showPhoto
  const showFooter = Boolean(branding) && includeBranding && hasCompanyFooter(branding)

  // ── Estimated page pagination (screen guide, not the exact PDF layout) ──────
  const containerRef = useRef(null)
  const headerRef    = useRef(null)
  const footerRef    = useRef(null)
  const secRefs      = useRef([])
  // page1End: section after which the footer is inserted; spacer nudges it to
  // the A4 page-1 line; pageH is the min sheet height (one A4 page).
  const [layout, setLayout] = useState({ page1End: -1, spacer: 0, pageH: 0 })

  // The ordered content sections. Each is measured to place page gutters and to
  // pin the footer to the bottom of page 1.
  const sections = [
    { key: 'summary', node: (
      <SectionWrap {...wrap('summary')}>
        <PersonalSection data={cv.personal} {...shared} videoProps={videoProps} />
      </SectionWrap>
    ) },
    { key: 'videos', node: (
      <SectionWrap {...wrap('videos')}>
        <VideosSection
          items={cv.videos || []}
          anchorOptions={vidAnchorOptions}
          unitIds={vidUnitIds}
          {...shared}
          candidateName={candidateName}
          onChange={videoProps.onVideosChange}
        />
      </SectionWrap>
    ) },
    { key: 'skills', node: (
      <SectionWrap {...wrap('skills')}>
        <SkillsSection
          items={cv.skills} {...shared} videoProps={videoProps}
          onSkillsChange={items => onStructural('skills', items)}
        />
      </SectionWrap>
    ) },
    { key: 'competences', node: (
      <CompetenceTable
        data={cv.competences}
        experiences={cv.experience}
        {...shared}
        videoProps={videoProps}
        onChange={newData => onStructural('competences', newData)}
      />
    ) },
    { key: 'experience', node: (
      <SectionWrap {...wrap('experience')}>
        <ExperienceSection
          items={cv.experience}
          cvType={cv.cvType}
          {...shared}
          videoProps={videoProps}
          onChange={items => onStructural('experience', items)}
        />
      </SectionWrap>
    ) },
    { key: 'positions', node: (
      <PositionsSection
        data={cv.positions || { enabled: false, useProjectFormat: false, items: [] }}
        {...shared}
        videoProps={videoProps}
        onChange={newData => onStructural('positions', newData)}
      />
    ) },
    { key: 'education', node: (
      <SectionWrap {...wrap('education')}>
        <EducationSection
          items={cv.education} {...shared} videoProps={videoProps}
          onChange={items => onStructural('education', items)}
        />
      </SectionWrap>
    ) },
    { key: 'certs', node: (
      <CertsCourseSection
        certifications={cv.certifications || []}
        courses={cv.courses || []}
        {...shared}
        videoProps={videoProps}
        onCertsChange={items => onStructural('certifications', items)}
        onCoursesChange={items => onStructural('courses', items)}
      />
    ) },
    { key: 'languages', node: (
      <SectionWrap {...wrap('languages')}>
        <LanguagesSection
          items={cv.languages || []}
          lang={lang}
          onChange={langs => onStructural('languages', langs)}
        />
      </SectionWrap>
    ) },
    { key: 'portfolio', node: (
      <SectionWrap {...wrap('portfolio')}>
        <PortfolioSection
          items={cv.portfolio || []}
          lang={lang}
          meta={meta}
          onFieldEdit={onFieldEdit}
          onAccept={onAccept}
          onDismiss={onDismiss}
          videoProps={videoProps}
          onChange={items => onStructural('portfolio', items)}
        />
      </SectionWrap>
    ) },
  ]

  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return

    function measure() {
      const w = container.clientWidth || 740
      const pageFullH = Math.round(w * A4_RATIO)       // one A4 page tall
      const pageContentH = pageFullH - SHEET_PAD_Y     // usable height on page 1
      if (pageContentH <= 0) return

      const headerH = outerHeight(headerRef.current)
      const footerH = showFooter ? outerHeight(footerRef.current) : 0
      const heights = secRefs.current.slice(0, sections.length).map(outerHeight)

      // Find the section that first reaches the page-1 line, then place the
      // footer at whichever boundary (just before or just after it) sits closest
      // to that line — so it never leaves a big gap nor overshoots a tall block.
      const budget = pageContentH - headerH - footerH
      let cum = 0
      let crossIdx = -1
      for (let i = 0; i < heights.length; i++) {
        cum += heights[i]
        if (cum >= budget) { crossIdx = i; break }
      }

      let page1End, spacer
      if (crossIdx === -1) {
        // Whole CV fits on one page — nudge the footer down to the A4 line.
        page1End = sections.length - 1
        const used = heights.reduce((a, b) => a + b, 0)
        spacer = showFooter ? Math.max(0, Math.round(budget - used)) : 0
      } else {
        const usedAfter = heights.slice(0, crossIdx + 1).reduce((a, b) => a + b, 0)
        const usedBefore = usedAfter - heights[crossIdx]
        const gapBefore = budget - usedBefore   // whitespace if footer goes before
        const overAfter = usedAfter - budget     // overshoot if footer goes after
        if (crossIdx > 0 && gapBefore <= overAfter) {
          page1End = crossIdx - 1
          spacer = showFooter ? Math.round(gapBefore) : 0
        } else {
          page1End = crossIdx
          spacer = 0
        }
      }

      setLayout(prev =>
        prev.page1End === page1End && prev.spacer === spacer && prev.pageH === pageFullH
          ? prev
          : { page1End, spacer, pageH: pageFullH })
    }

    measure()
    const ro = new ResizeObserver(() => requestAnimationFrame(measure))
    ro.observe(container)
    return () => ro.disconnect()
  }, [cv, lang, showLogo, showPhoto, showFooter, branding])

  return (
    <ChatChangesContext.Provider value={{ changedPaths, onChangeSeen }}>
     <div
       className="cv-editor"
       ref={containerRef}
       style={layout.pageH ? { '--page-h': `${layout.pageH}px` } : undefined}
     >

      {branding && (
        <div className="cv-branding-toggle">
          <div className="cv-branding-toggle-group">
            <span className="cv-branding-toggle-lead">{no ? 'Ta med i eksport:' : 'Include in export:'}</span>
            <label className="cv-branding-toggle-label">
              <input
                type="checkbox"
                checked={includeBranding}
                onChange={e => onToggleBranding?.(e.target.checked)}
              />
              {no ? 'Merkevare' : 'Branding'}
            </label>
            <label className="cv-branding-toggle-label">
              <input
                type="checkbox"
                checked={includeImage}
                onChange={e => onToggleImage?.(e.target.checked)}
              />
              {no ? 'Profilbilde' : 'Photo'}
            </label>
          </div>
          <button type="button" className="cv-branding-edit-link" onClick={onEditBranding}>
            {no ? 'Rediger merkevare' : 'Edit branding'}
          </button>
        </div>
      )}

      {showHeader && (
        <div ref={headerRef} className={!showLogo && showPhoto ? 'cv-branding-photofloat' : undefined}>
          <BrandingHeader
            branding={branding}
            showLogo={showLogo}
            showPhoto={showPhoto}
            onEditBranding={onEditBranding}
            onSetProfilePicture={onSetProfilePicture}
          />
        </div>
      )}

      {sections.map((s, i) => (
        <Fragment key={s.key}>
          <div className="cv-sec" ref={el => { secRefs.current[i] = el }}>
            {s.node}
          </div>
          {showFooter && i === layout.page1End && (
            <>
              {layout.spacer > 0 && (
                <div className="cv-page1-spacer" style={{ height: layout.spacer }} aria-hidden="true" />
              )}
              <div ref={footerRef}>
                <BrandingFooter branding={branding} onEditBranding={onEditBranding} />
              </div>
            </>
          )}
        </Fragment>
      ))}
     </div>
    </ChatChangesContext.Provider>
  )
}
