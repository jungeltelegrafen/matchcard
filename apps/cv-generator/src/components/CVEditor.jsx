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

// A4 aspect ratio (height / width) — used to estimate where printed pages break
// so the on-screen CV can show page gutters and pin the footer to page 1.
const A4_RATIO = 297 / 210
// Combined top+bottom padding of the .cv-page sheet (see app.css .cv-page).
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

// Visual gutter marking where a printed page ends and the next begins.
function PageBreak({ page, no }) {
  return (
    <div className="cv-page-break" aria-hidden="true">
      <span className="cv-page-break-label">{no ? `Side ${page}` : `Page ${page}`}</span>
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

export default function CVEditor({ cv, lang = 'en', uiLang = 'en', meta, onFieldEdit, onAccept, onDismiss, onStructural, hoveredSection, commentCounts, changedPaths, onChangeSeen, branding, includeBranding = true, includeImage = true, onToggleBranding, onToggleImage, onEditBranding, onSetProfilePicture }) {
  const shared = { lang, meta, onFieldEdit, onAccept, onDismiss }
  const wrap = sectionKey => ({ sectionKey, hoveredSection, commentCounts })
  const no = uiLang === 'no'

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
  // { breaks: [{index, page}], page1End: number, spacer: number }
  const [layout, setLayout] = useState({ breaks: [], page1End: -1 })

  // The ordered content sections. Each is measured to place page gutters and to
  // pin the footer to the bottom of page 1.
  const sections = [
    { key: 'summary', node: (
      <SectionWrap {...wrap('summary')}>
        <PersonalSection data={cv.personal} {...shared} />
      </SectionWrap>
    ) },
    { key: 'videos', node: (
      <SectionWrap {...wrap('videos')}>
        <VideosSection
          items={cv.videos || []}
          {...shared}
          candidateName={[cv.personal?.firstName, cv.personal?.lastName].filter(Boolean).join(' ')}
          onChange={items => onStructural('videos', items)}
        />
      </SectionWrap>
    ) },
    { key: 'skills', node: (
      <SectionWrap {...wrap('skills')}>
        <SkillsSection
          items={cv.skills} {...shared}
          onSkillsChange={items => onStructural('skills', items)}
        />
      </SectionWrap>
    ) },
    { key: 'competences', node: (
      <CompetenceTable
        data={cv.competences}
        experiences={cv.experience}
        {...shared}
        onChange={newData => onStructural('competences', newData)}
      />
    ) },
    { key: 'experience', node: (
      <SectionWrap {...wrap('experience')}>
        <ExperienceSection
          items={cv.experience}
          cvType={cv.cvType}
          {...shared}
          onChange={items => onStructural('experience', items)}
        />
      </SectionWrap>
    ) },
    { key: 'positions', node: (
      <PositionsSection
        data={cv.positions || { enabled: false, useProjectFormat: false, items: [] }}
        {...shared}
        onChange={newData => onStructural('positions', newData)}
      />
    ) },
    { key: 'education', node: (
      <SectionWrap {...wrap('education')}>
        <EducationSection
          items={cv.education} {...shared}
          onChange={items => onStructural('education', items)}
        />
      </SectionWrap>
    ) },
    { key: 'certs', node: (
      <CertsCourseSection
        certifications={cv.certifications || []}
        courses={cv.courses || []}
        {...shared}
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
          onChange={items => onStructural('portfolio', items)}
        />
      </SectionWrap>
    ) },
  ]

  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return

    function measure() {
      const sheet = container.closest('.cv-page')
      const sheetW = sheet ? sheet.clientWidth : 740
      const pageContentH = sheetW * A4_RATIO - SHEET_PAD_Y
      if (pageContentH <= 0) return

      const headerH = outerHeight(headerRef.current)
      const footerH = showFooter ? outerHeight(footerRef.current) : 0
      const heights = secRefs.current.slice(0, sections.length).map(outerHeight)

      // Page 1 has less room (header on top, footer pinned to the bottom).
      let budget = pageContentH - headerH - footerH
      let fill = 0
      let page = 1
      const breaks = []
      heights.forEach((h, i) => {
        if (fill > 0 && fill + h > budget) {
          page += 1
          breaks.push({ index: i, page })
          fill = 0
          budget = pageContentH // pages 2+ have no header/footer band
        }
        fill += h
      })

      const page1End = breaks.length ? breaks[0].index - 1 : sections.length - 1

      setLayout(prev =>
        prev.page1End === page1End
        && prev.breaks.length === breaks.length
        && prev.breaks.every((b, i) => b.index === breaks[i].index && b.page === breaks[i].page)
          ? prev
          : { breaks, page1End })
    }

    measure()
    const ro = new ResizeObserver(() => requestAnimationFrame(measure))
    ro.observe(container)
    const sheet = container.closest('.cv-page')
    if (sheet) ro.observe(sheet)
    return () => ro.disconnect()
  }, [cv, lang, showLogo, showPhoto, showFooter, branding])

  const breakAt = i => layout.breaks.find(b => b.index === i)

  return (
    <ChatChangesContext.Provider value={{ changedPaths, onChangeSeen }}>
     <div className="cv-editor" ref={containerRef}>

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

      {sections.map((s, i) => {
        const brk = breakAt(i)
        const isPage1End = i === layout.page1End
        return (
          <Fragment key={s.key}>
            {brk && <PageBreak page={brk.page} no={no} />}
            <div className="cv-sec" ref={el => { secRefs.current[i] = el }}>
              {s.node}
            </div>
            {showFooter && isPage1End && (
              <div ref={footerRef}>
                <BrandingFooter branding={branding} onEditBranding={onEditBranding} />
              </div>
            )}
          </Fragment>
        )
      })}
     </div>
    </ChatChangesContext.Provider>
  )
}
