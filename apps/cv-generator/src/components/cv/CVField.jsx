import { getSource, getAiSuggestion } from '../../utils/fieldMeta'

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

  const cls = ['cv-field', source === 'user' ? 'cv-field--user' : '', className]
    .filter(Boolean).join(' ')

  function handleChange(e) {
    onEdit(path, e.target.value)
    if (Tag === 'textarea') {
      e.target.style.height = 'auto'
      e.target.style.height = e.target.scrollHeight + 'px'
    }
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
        className={cls}
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
