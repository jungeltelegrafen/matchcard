import { useState } from 'react'

const STATIC_COMMENTS = []

export default function CommentsPanel({ lang, chatComments = [], onChatCommentsChange, onSectionHover }) {
  const [staticResolved, setStaticResolved] = useState(new Set())

  function resolveChat(id) {
    onChatCommentsChange?.(prev =>
      prev.map(c => c.id === id ? { ...c, resolved: true } : c)
    )
  }
  function unresolveChat(id) {
    onChatCommentsChange?.(prev =>
      prev.map(c => c.id === id ? { ...c, resolved: false } : c)
    )
  }
  function resolveStatic(id)   { setStaticResolved(s => new Set([...s, id])) }
  function unresolveStatic(id) { setStaticResolved(s => { const n = new Set(s); n.delete(id); return n }) }

  const allOpen = [
    ...chatComments.filter(c => !c.resolved),
    ...STATIC_COMMENTS.filter(c => !staticResolved.has(c.id)),
  ]
  const allResolved = [
    ...chatComments.filter(c => c.resolved),
    ...STATIC_COMMENTS.filter(c => staticResolved.has(c.id)),
  ]

  function resolveItem(item) {
    item.source === 'agent' || item.source === undefined
      ? resolveStatic(item.id)
      : resolveChat(item.id)
  }
  function unresolveItem(item) {
    item.source === 'agent' || item.source === undefined
      ? unresolveStatic(item.id)
      : unresolveChat(item.id)
  }

  const isEmpty = allOpen.length === 0 && allResolved.length === 0

  return (
    <div className="tab-pane">
      <div className="side-panel-header">
        <div className="feedback-header-row">
          <h2 className="side-panel-title">
            {lang === 'no' ? 'Tilbakemelding' : 'Feedback'}
          </h2>
          {allOpen.length > 0 && (
            <span className="feedback-count-badge">{allOpen.length}</span>
          )}
        </div>
        <p className="side-panel-sub">
          {lang === 'no'
            ? 'Fra agenter, chat og manuelle anmerkninger'
            : 'From agents, chat and manual notes'}
        </p>
      </div>

      {isEmpty && (
        <div className="comments-empty">
          <p>{lang === 'no' ? 'Ingen tilbakemeldinger ennå.' : 'No feedback yet.'}</p>
          <p className="comments-empty-hint">
            {lang === 'no'
              ? 'Kjør en agent eller chat med AI for å generere tilbakemeldinger.'
              : 'Run an agent or chat with the AI to generate feedback.'}
          </p>
        </div>
      )}

      {allOpen.length > 0 && (
        <div className="comments-list">
          {allOpen.map(item => (
            <CommentBubble
              key={item.id}
              item={item}
              lang={lang}
              onResolve={() => resolveItem(item)}
              onHover={key => onSectionHover?.(key)}
              onLeave={() => onSectionHover?.(null)}
            />
          ))}
        </div>
      )}

      {allResolved.length > 0 && (
        <div className="comments-resolved">
          <span className="comments-resolved-label">
            {lang === 'no' ? `${allResolved.length} løst` : `${allResolved.length} resolved`}
          </span>
          {allResolved.map(item => (
            <CommentBubble
              key={item.id}
              item={item}
              lang={lang}
              resolved
              onResolve={() => unresolveItem(item)}
              onHover={key => onSectionHover?.(key)}
              onLeave={() => onSectionHover?.(null)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function CommentBubble({ item, lang, resolved, onResolve, onHover, onLeave }) {
  return (
    <div
      className={`comment-bubble${resolved ? ' comment-bubble--resolved' : ''}`}
      onMouseEnter={() => onHover?.(item.sectionKey)}
      onMouseLeave={() => onLeave?.()}
    >
      <div className="comment-bubble-header">
        <span className="comment-section-tag">{item.section}</span>
        {item.source === 'chat' && (
          <span className="comment-source-badge">
            {lang === 'no' ? 'Fra chat' : 'From chat'}
          </span>
        )}
        <button
          className={`comment-resolve-btn${resolved ? ' comment-resolve-btn--undo' : ''}`}
          onClick={onResolve}
        >
          {resolved
            ? (lang === 'no' ? 'Gjenåpne' : 'Reopen')
            : (lang === 'no' ? 'Løst' : 'Resolve')}
        </button>
      </div>
      {item.title && <p className="comment-title">{item.title}</p>}
      <p className="comment-text">{item.text}</p>
    </div>
  )
}
