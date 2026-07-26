import { useState } from 'react'

// Compact agent-feedback tray shown below the CV while a tailored variant is
// active (the left sidebar is taken by the tailoring panel there). Cards scroll
// horizontally so many findings stay tidy; the whole strip collapses away.
export default function FeedbackStrip({ items = [], lang, onChange }) {
  const [collapsed, setCollapsed] = useState(false)
  const [showResolved, setShowResolved] = useState(false)
  const no = lang === 'no'

  if (items.length === 0) return null

  const open = items.filter(i => !i.resolved)
  const resolved = items.filter(i => i.resolved)
  const shown = showResolved ? items : open

  function setResolved(id, val) {
    onChange(prev => prev.map(c => (c.id === id ? { ...c, resolved: val } : c)))
  }

  return (
    <section className="feedback-strip">
      <div className="feedback-strip-header">
        <button className="feedback-strip-toggle" onClick={() => setCollapsed(c => !c)}>
          <span className="feedback-strip-caret">{collapsed ? '▸' : '▾'}</span>
          {no ? 'AI-tilbakemelding' : 'AI feedback'}
          <span className="feedback-strip-count">{open.length}</span>
        </button>
        {resolved.length > 0 && (
          <button className="feedback-strip-resolved-toggle" onClick={() => setShowResolved(s => !s)}>
            {showResolved
              ? (no ? 'Skjul løste' : 'Hide resolved')
              : `${resolved.length} ${no ? 'løst' : 'resolved'}`}
          </button>
        )}
      </div>

      {!collapsed && (
        <div className="feedback-strip-track">
          {shown.length === 0 && (
            <p className="feedback-strip-empty">
              {no ? 'Ingen åpne tilbakemeldinger — kjør en agent.' : 'No open feedback — run an agent above.'}
            </p>
          )}
          {shown.map(item => (
            <div key={item.id} className={`feedback-card${item.resolved ? ' feedback-card--resolved' : ''}`}>
              <div className="feedback-card-top">
                <span className="feedback-card-section">{item.section}</span>
                {item.agentTitle && (
                  <span className="feedback-card-agent" style={{ color: item.agentColor }}>{item.agentTitle}</span>
                )}
              </div>
              {item.title && <p className="feedback-card-title">{item.title}</p>}
              <p className="feedback-card-text">{item.text}</p>
              <button className="feedback-card-resolve" onClick={() => setResolved(item.id, !item.resolved)}>
                {item.resolved ? (no ? '↺ Angre' : '↺ Undo') : (no ? '✓ Merk løst' : '✓ Resolve')}
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
