import { useState } from 'react'
import FeedbackModal from './FeedbackModal'

export default function AppHeader({ cv, lang, onLangChange, onClear, onCvTypeChange }) {
  const [feedbackOpen, setFeedbackOpen] = useState(false)

  const candidateName = [cv.personal.firstName, cv.personal.lastName].filter(Boolean).join(' ')
  const candidateTitle = cv.personal.title

  function handleClear() {
    if (!window.confirm(lang === 'no' ? 'Nullstille hele CVen?' : 'Reset the entire CV?')) return
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
              {lang === 'no' ? 'Skriv inn navn for å komme i gang' : 'Enter a name to get started'}
            </span>
          )}
        </div>

        <div className="header-actions">

          {/* CV Type toggle */}
          <div className="header-toggle-group">
            <span className="header-toggle-label">
              {lang === 'no' ? 'Format' : 'Format'}
            </span>
            <div className="header-pill">
              <button
                className={`header-pill-btn${cv.cvType !== 'management' ? ' active' : ''}`}
                onClick={() => onCvTypeChange('technical')}
              >
                {lang === 'no' ? 'Teknisk' : 'Technical'}
              </button>
              <button
                className={`header-pill-btn${cv.cvType === 'management' ? ' active' : ''}`}
                onClick={() => onCvTypeChange('management')}
              >
                {lang === 'no' ? 'Leder' : 'Management'}
              </button>
            </div>
          </div>

          <div className="header-divider" />

          {/* Language toggle */}
          <div className="header-toggle-group">
            <span className="header-toggle-label">
              {lang === 'no' ? 'Språk' : 'Language'}
            </span>
            <div className="header-pill">
              <button
                className={`header-pill-btn${lang === 'no' ? ' active' : ''}`}
                onClick={() => onLangChange('no')}
              >
                Norsk
              </button>
              <button
                className={`header-pill-btn${lang === 'en' ? ' active' : ''}`}
                onClick={() => onLangChange('en')}
              >
                English
              </button>
            </div>
          </div>

          <div className="header-divider" />

          <button className="header-action-btn" onClick={() => setFeedbackOpen(true)}>
            {lang === 'no' ? '💬 Tilbakemelding' : '💬 Feedback'}
          </button>

          <button className="header-action-btn header-action-btn--muted" onClick={handleClear}>
            {lang === 'no' ? 'Nullstill' : 'Reset'}
          </button>

        </div>
      </header>

      {feedbackOpen && (
        <FeedbackModal onClose={() => setFeedbackOpen(false)} candidateName={candidateName} />
      )}
    </>
  )
}
