import { useState, useEffect } from 'react'
import { LANGS, LANG_ENDONYM } from '@lib/cv/lang'
import { useMediaQuery, MOBILE_QUERY } from '../hooks/useMediaQuery'
import FeedbackModal from './FeedbackModal'

export default function AppHeader({
  cv,
  uiLang,
  contentLang,
  activeHasContent,
  translating,
  variants = [],
  activeVariantId = null,
  onSelectVariant,
  onOpenTailor,
  onCreateAnonymous,
  onDeleteVariant,
  onUiLangChange,
  onContentLangChange,
  translateTargets = [],
  onTranslate,
  onClear,
  onCvTypeChange,
}) {
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [versionMenuOpen, setVersionMenuOpen] = useState(false)
  const [translateMenuOpen, setTranslateMenuOpen] = useState(false)
  const [langMenuOpen, setLangMenuOpen] = useState(false)
  const [optionsOpen, setOptionsOpen] = useState(false)
  const no = uiLang === 'no'

  // Below the compact breakpoint the header collapses its control clusters behind
  // an "Options" dropdown, so the title never collides with the clusters (the old
  // absolute 3-zone header only fit on wide screens).
  const compact = useMediaQuery(MOBILE_QUERY)

  const anyMenuOpen = versionMenuOpen || translateMenuOpen || langMenuOpen
  const closeMenus = () => { setVersionMenuOpen(false); setTranslateMenuOpen(false); setLangMenuOpen(false) }

  // Close any open header dropdown when clicking outside it or pressing Escape,
  // and close the compact Options panel when clicking outside it.
  useEffect(() => {
    if (!anyMenuOpen && !optionsOpen) return
    function onDown(e) {
      if (!e.target.closest('.header-version-wrap')) closeMenus()
      if (!e.target.closest('.header-options-wrap')) setOptionsOpen(false)
    }
    function onKey(e) { if (e.key === 'Escape') { closeMenus(); setOptionsOpen(false) } }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [anyMenuOpen, optionsOpen])

  const candidateName = [cv.personal.firstName, cv.personal.lastName].filter(Boolean).join(' ')
  const candidateTitle = cv.personal.title

  const activeVariant = variants.find(v => v.id === activeVariantId) || null
  const versionLabel = activeVariant ? activeVariant.name : 'Master'
  const variantIcon = v => (v.kind === 'anonymous' ? '🎭' : '✦')

  function selectVersion(id) {
    onSelectVariant?.(id)
    setVersionMenuOpen(false)
  }

  function handleClear() {
    if (!window.confirm(no ? 'Nullstille begge språkversjoner av CV-en?' : 'Reset both language versions of the CV?')) return
    onClear()
  }

  // ── Control clusters, built once and arranged for either layout ────────────
  const versionGroup = (
    <div className="header-toggle-group">
      <span className="header-toggle-label">{no ? 'Versjon' : 'Version'}</span>
      <div className="header-version-wrap">
        <button
          className={`header-version-btn${activeVariant ? ' header-version-btn--tailored' : ''}`}
          onClick={() => { setTranslateMenuOpen(false); setLangMenuOpen(false); setVersionMenuOpen(v => !v) }}
        >
          {activeVariant ? `${variantIcon(activeVariant)} ` : ''}{versionLabel} ▾
        </button>
        {versionMenuOpen && (
          <div className="header-version-menu">
            <button
              className={`header-version-item${!activeVariantId ? ' active' : ''}`}
              onClick={() => selectVersion(null)}
            >
              {no ? 'Master (full CV)' : 'Master (full CV)'}
            </button>
            {variants.map(v => (
              <div key={v.id} className={`header-version-item-row${v.id === activeVariantId ? ' active' : ''}`}>
                <button className="header-version-item" onClick={() => selectVersion(v.id)}>
                  {variantIcon(v)} {v.name}
                </button>
                <button
                  className="header-version-del"
                  title={no ? 'Slett versjon' : 'Delete version'}
                  onClick={() => onDeleteVariant?.(v.id)}
                >×</button>
              </div>
            ))}
            <button
              className="header-version-item header-version-add"
              onClick={() => { setVersionMenuOpen(false); onOpenTailor?.() }}
            >
              {no ? '+ Tilpass til en stilling…' : '+ Tailor to a job…'}
            </button>
            <button
              className="header-version-item header-version-add"
              onClick={() => { setVersionMenuOpen(false); onCreateAnonymous?.() }}
            >
              {no ? '🎭 Lag anonym versjon' : '🎭 Create anonymous version'}
            </button>
          </div>
        )}
      </div>
    </div>
  )

  const formatGroup = (
    <div className="header-toggle-group">
      <span className="header-toggle-label">Format</span>
      <div className="header-pill">
        <button
          className={`header-pill-btn${cv.cvType !== 'management' ? ' active' : ''}`}
          onClick={() => onCvTypeChange('technical')}
        >
          {no ? 'Teknisk' : 'Technical'}
        </button>
        <button
          className={`header-pill-btn${cv.cvType === 'management' ? ' active' : ''}`}
          onClick={() => onCvTypeChange('management')}
        >
          {no ? 'Leder' : 'Management'}
        </button>
      </div>
    </div>
  )

  const siteLangGroup = (
    <div className="header-toggle-group">
      <span className="header-toggle-label">{no ? 'Nettsted' : 'Site'}</span>
      <div className="header-pill">
        <button className={`header-pill-btn${uiLang === 'no' ? ' active' : ''}`} onClick={() => onUiLangChange('no')}>Norsk</button>
        <button className={`header-pill-btn${uiLang === 'en' ? ' active' : ''}`} onClick={() => onUiLangChange('en')}>English</button>
      </div>
    </div>
  )

  const cvLangGroup = (
    <div className="header-toggle-group">
      <span className="header-toggle-label">{no ? 'CV-språk' : 'CV Language'}</span>
      <div className="header-version-wrap">
        <button
          className="header-version-btn"
          onClick={() => { setVersionMenuOpen(false); setTranslateMenuOpen(false); setLangMenuOpen(o => !o) }}
        >
          {LANG_ENDONYM[contentLang]} ▾
        </button>
        {langMenuOpen && (
          <div className="header-version-menu">
            {LANGS.map(l => (
              <button
                key={l}
                className={`header-version-item${contentLang === l ? ' active' : ''}`}
                onClick={() => { setLangMenuOpen(false); onContentLangChange(l) }}
              >
                {LANG_ENDONYM[l]}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  const translateGroup = (activeHasContent && translateTargets.length > 0) ? (
    <div className="header-version-wrap">
      <button
        className="header-action-btn"
        onClick={() => { setVersionMenuOpen(false); setLangMenuOpen(false); setTranslateMenuOpen(o => !o) }}
        disabled={translating}
      >
        {translating ? (no ? 'Oversetter…' : 'Translating…') : `⇄ ${no ? 'Oversett' : 'Translate'} ▾`}
      </button>
      {translateMenuOpen && !translating && (
        <div className="header-version-menu">
          {translateTargets.map(t => (
            <button
              key={t}
              className="header-version-item"
              onClick={() => { setTranslateMenuOpen(false); onTranslate(t) }}
            >
              {no ? 'Til' : 'To'} {LANG_ENDONYM[t]}
            </button>
          ))}
        </div>
      )}
    </div>
  ) : null

  const feedbackBtn = (
    <button className="header-action-btn" onClick={() => setFeedbackOpen(true)}>
      {no ? '💬 Tilbakemelding' : '💬 Feedback'}
    </button>
  )

  const resetBtn = (
    <button className="header-action-btn header-action-btn--muted" onClick={handleClear}>
      {no ? 'Nullstill' : 'Reset'}
    </button>
  )

  const backBtn = (
    <a href="https://matchcard.no" className="header-back-btn" title="Back to matchcard">
      <span className="header-back-arrow">←</span>
      <span className="header-back-label">matchcard</span>
    </a>
  )

  const titleBlock = (
    <>
      <h1 className="header-title">CV Generator</h1>
      <div className="header-accent-rule" />
      {candidateName ? (
        <div className="header-candidate">
          <span className="header-candidate-name">{candidateName}</span>
          {candidateTitle && <span className="header-candidate-title">{candidateTitle}</span>}
        </div>
      ) : (
        <span className="header-candidate-empty">
          {no ? 'Skriv inn navn for å komme i gang' : 'Enter a name to get started'}
        </span>
      )}
    </>
  )

  return (
    <>
      {compact ? (
        <header className="app-header app-header--compact">
          {backBtn}
          <div className="header-center">{titleBlock}</div>
          <div className="header-options-wrap">
            <button
              className="header-options-btn"
              aria-expanded={optionsOpen}
              onClick={() => { closeMenus(); setOptionsOpen(o => !o) }}
            >
              ⚙ {no ? 'Valg' : 'Options'} ▾
            </button>
            {optionsOpen && (
              <div className="header-options-panel">
                {versionGroup}
                {formatGroup}
                {siteLangGroup}
                {cvLangGroup}
                {translateGroup}
                <div className="header-options-sep" />
                {feedbackBtn}
                {resetBtn}
              </div>
            )}
          </div>
        </header>
      ) : (
        <header className="app-header">
          <div className="header-left">
            {backBtn}
            <div className="header-divider" />
            {versionGroup}
            {formatGroup}
          </div>

          <div className="header-center">{titleBlock}</div>

          <div className="header-actions">
            {siteLangGroup}
            {cvLangGroup}
            {translateGroup}
            <div className="header-divider" />
            {feedbackBtn}
            {resetBtn}
          </div>
        </header>
      )}

      {feedbackOpen && (
        <FeedbackModal onClose={() => setFeedbackOpen(false)} candidateName={candidateName} />
      )}
    </>
  )
}
