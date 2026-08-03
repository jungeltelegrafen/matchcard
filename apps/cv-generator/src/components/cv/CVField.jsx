import { useContext } from 'react'
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

  function handleChange(e) {
    if (chatChanged) onChangeSeen(path)
    onEdit(path, e.target.value)
    if (Tag === 'textarea') {
      e.target.style.height = 'auto'
      e.target.style.height = e.target.scrollHeight + 'px'
    }
  }

  function handleFocus() {
    if (chatChanged) onChangeSeen(path)
  }

  function handleRef(el) {
    if (el && Tag === 'textarea') {
      el.style.height = 'auto'
      el.style.height = el.scrollHeight + 'px'
    }
  }

  return (
    <div className="cv-field-wrap">
      <Tag
        ref={Tag === 'textarea' ? handleRef : undefined}
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
