import { useContext, useRef, useLayoutEffect } from 'react'
import { getSource, getAiSuggestion } from '../../utils/fieldMeta'
import { ChatChangesContext } from './ChatChangesContext'

export default function CVField({
  value,
  path,
  meta,
  onEdit,
  onAccept,
  onDismiss,
  as: Tag = 'input',
  className = '',
  ...props
}) {
  const source = getSource(meta, path)
  const suggestion = getAiSuggestion(meta, path)

  const { changedPaths, onChangeSeen } = useContext(ChatChangesContext)
  const chatChanged = !!changedPaths?.has(path)

  const cls = ['cv-field',
    source === 'user' ? 'cv-field--user' : '',
    chatChanged ? 'cv-field--chat-updated' : '',
    className]
    .filter(Boolean).join(' ')

  // Auto-grow textareas via a STABLE ref recomputed only when this field's own
  // value changes. Using an inline ref callback re-fired on every render (the
  // old approach), so editing any sibling field reset this textarea's height —
  // thrashing layout and jumping the scroll position. Keying the resize to
  // `value` fixes both the scroll jump and the occasional clipped height.
  const areaRef = useRef(null)
  useLayoutEffect(() => {
    if (Tag !== 'textarea' || !areaRef.current) return
    const el = areaRef.current
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }, [value, Tag])

  function handleChange(e) {
    if (chatChanged) onChangeSeen(path)
    onEdit(path, e.target.value)
  }

  function handleFocus() {
    if (chatChanged) onChangeSeen(path)
  }

  return (
    <div className="cv-field-wrap">
      <Tag
        ref={Tag === 'textarea' ? areaRef : undefined}
        value={value ?? ''}
        onChange={handleChange}
        onFocus={handleFocus}
        className={cls}
        title={chatChanged ? 'Changed by chat — click to review and dismiss' : undefined}
        {...props}
      />
      {suggestion != null && (
        <div className="cv-suggestion">
          <span className="cv-suggestion-label">AI suggests:</span>
          <span className="cv-suggestion-text">"{suggestion}"</span>
          <button className="cv-suggestion-accept" onClick={() => onAccept(path, suggestion)}>
            Accept
          </button>
          <button className="cv-suggestion-dismiss" onClick={() => onDismiss(path)}>
            Keep mine
          </button>
        </div>
      )}
    </div>
  )
}
