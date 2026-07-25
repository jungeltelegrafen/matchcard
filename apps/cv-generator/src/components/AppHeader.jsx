import { useState } from 'react'
import FeedbackModal from './FeedbackModal'

const LANG_ENDONYM = { en: 'English', no: 'Norsk' }

export default function AppHeader({
  cv,
  uiLang,
  contentLang,
  activeHasContent,
  translating,
  onUiLangChange,
  onContentLangChange,
  onTranslate,
  onClear,
  onCvTypeChange,
}) {
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const no = uiLang === 'no'

  const candidateName = [cv.personal.firstName, cv.personal.lastName].filter(Boolean).join(' ')
  const candidateTitle = cv.personal.title
  const otherLang = contentLang === 'en' ? 'no' : 'en'

  function handleClear() {
    if (!window.confirm(no ? 'Nullstille begge språkversjoner av CV-en?' : 'Reset both language versions of the CV?')) return
    onClear()
  }

  return (
    <>
      <header className="app-header">

        <a href="https://matchcard.no" className="header-back-btn" title="Back to matchcard">
          <span className="header-back-arrow">←</span>
          <span className="header-back-label">matchcard</span>
        </a>

        <div className="header-center">
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
        </div>

        <div className="header-actions">

          {/* CV Type toggle */}
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

          <div className="header-divider" />

          {/* Site language toggle — UI chrome only */}
          <div className="header-toggle-group">
            <span className="header-toggle-label">{no ? 'Nettsted' : 'Site'}</span>
            <div className="header-pill">
              <button
                className={`header-pill-btn${uiLang === 'no' ? ' active' : ''}`}
                onClick={() => onUiLangChange('no')}
              >
                Norsk
              </button>
              <button
                className={`header-pill-btn${uiLang === 'en' ? ' active' : ''}`}
                onClick={() => onUiLangChange('en')}
              >
                English
              </button>
            </div>
          </div>

          {/* CV content language toggle — which language is viewed/edited/exported.
              Switching is instant and lossless; the other version is kept. */}
          <div className="header-toggle-group">
            <span className="header-toggle-label">CV</span>
            <div className="header-pill">
              <button
                className={`header-pill-btn${contentLang === 'no' ? ' active' : ''}`}
                onClick={() => onContentLangChange('no')}
              >
                Norsk
              </button>
              <button
                className={`header-pill-btn${contentLang === 'en' ? ' active' : ''}`}
                onClick={() => onContentLangChange('en')}
              >
                English
              </button>
            </div>
          </div>

          {/* Translate the CV currently shown into the other language. Merges
              into that language's slot, preserving any hand-edits there. */}
          {activeHasContent && (
            <button
              className="header-action-btn"
              onClick={onTranslate}
              disabled={translating}
              title={no
                ? `Oversett CV-en til ${LANG_ENDONYM[otherLang]} (beholder ${LANG_ENDONYM[contentLang]}-versjonen)`
                : `Translate this CV into ${LANG_ENDONYM[otherLang]} (keeps the ${LANG_ENDONYM[contentLang]} version)`}
            >
              {translating
                ? (no ? 'Oversetter…' : 'Translating…')
                : `⇄ ${no ? 'Oversett til' : 'Translate to'} ${LANG_ENDONYM[otherLang]}`}
            </button>
          )}

          <div className="header-divider" />

          <button className="header-action-btn" onClick={() => setFeedbackOpen(true)}>
            {no ? '💬 Tilbakemelding' : '💬 Feedback'}
          </button>

          <button className="header-action-btn header-action-btn--muted" onClick={handleClear}>
            {no ? 'Nullstill' : 'Reset'}
          </button>

        </div>
      </header>

      {feedbackOpen && (
        <FeedbackModal onClose={() => setFeedbackOpen(false)} candidateName={candidateName} />
      )}
    </>
  )
}
