import { useState, useRef } from 'react'
import { extractText } from '../utils/extractText'
import UrlFetchField from './UrlFetchField'

const ACCEPT = '.pdf,.docx,.txt'

// Modal for creating a tailored job version: name it, and describe the role by
// dropping files or pasting text. Produces the role text handed to the tailor API.
export default function TailorPanel({ lang, busy, error, onCancel, onCreate }) {
  const no = lang === 'no'
  const [name, setName]       = useState('')
  const [roleText, setRoleText] = useState('')
  const [files, setFiles]     = useState([])
  const [dragging, setDragging] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [localError, setLocalError] = useState('')
  const inputRef = useRef(null)

  function addFiles(incoming) {
    const arr = Array.from(incoming)
    setFiles(prev => {
      const seen = new Set(prev.map(f => f.name))
      return [...prev, ...arr.filter(f => !seen.has(f.name))]
    })
  }

  async function handleCreate() {
    setLocalError('')
    let text = roleText.trim()
    try {
      if (files.length > 0) {
        setExtracting(true)
        const parts = await Promise.all(files.map(extractText))
        setExtracting(false)
        const fileText = parts.join('\n\n---\n\n')
        text = text ? `${text}\n\n---\n\n${fileText}` : fileText
      }
    } catch (err) {
      setExtracting(false)
      setLocalError(err.message || (no ? 'Kunne ikke lese filen.' : 'Could not read the file.'))
      return
    }
    if (!text) {
      setLocalError(no ? 'Beskriv rollen med tekst eller en fil.' : 'Describe the role with text or a file.')
      return
    }
    const finalName = name.trim() || (no ? 'Tilpasset versjon' : 'Tailored version')
    onCreate(finalName, text)
  }

  const working = busy || extracting

  return (
    <div className="modal-overlay" onClick={working ? undefined : onCancel}>
      <div className="modal-box tailor-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{no ? 'Tilpass CV til en stilling' : 'Tailor CV to a job'}</span>
          <button className="modal-close" onClick={onCancel} disabled={working}>×</button>
        </div>

        <div className="modal-body tailor-body">
          <p className="tailor-intro">
            {no
              ? 'Last opp eller lim inn stillingsbeskrivelsen. Vi lager en tilpasset versjon som fremhever det som er relevant — uten å endre fakta. Masterversjonen forblir uendret.'
              : 'Upload or paste the role description. We build a tailored version that foregrounds what matters — without changing any facts. Your master CV stays untouched.'}
          </p>

          <label className="tailor-label">{no ? 'Navn på versjonen' : 'Version name'}</label>
          <input
            className="tailor-name-input"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={no ? 'f.eks. Skyarkitekt @ DNB' : 'e.g. Cloud Architect @ DNB'}
            disabled={working}
          />

          <label className="tailor-label">{no ? 'Stillingsbeskrivelse' : 'Role description'}</label>
          <div
            className={`tailor-drop${dragging ? ' dragging' : ''}`}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files) }}
            onClick={() => inputRef.current?.click()}
          >
            <input ref={inputRef} type="file" accept={ACCEPT} multiple style={{ display: 'none' }}
              onChange={e => { addFiles(e.target.files); e.target.value = '' }} />
            <span className="tailor-drop-label">
              {no ? 'Slipp filer eller klikk for å bla' : 'Drop files or click to browse'}
            </span>
            <span className="tailor-drop-hint">PDF, DOCX, TXT</span>
          </div>
          {files.length > 0 && (
            <ul className="tailor-file-list">
              {files.map(f => (
                <li key={f.name}>
                  <span>{f.name}</span>
                  <button onClick={() => setFiles(prev => prev.filter(x => x.name !== f.name))} disabled={working}>×</button>
                </li>
              ))}
            </ul>
          )}

          <textarea
            className="tailor-textarea"
            value={roleText}
            onChange={e => setRoleText(e.target.value)}
            placeholder={no
              ? '…eller lim inn stillingsteksten her (krav, ansvar, teknologier).'
              : '…or paste the job posting here (requirements, responsibilities, technologies).'}
            rows={5}
            disabled={working}
          />

          <UrlFetchField
            lang={lang}
            disabled={working}
            placeholder={no ? '…eller lim inn en annonse-lenke' : '…or paste a job-ad link'}
            hint={no
              ? 'Offentlige sider (uten innlogging/betalingsmur). Teksten legges til over for gjennomgang.'
              : 'Public pages only (no login/paywall). The fetched text is added above for review.'}
            onText={t => setRoleText(prev => (prev ? prev + t : t.replace(/^\n+/, '')))}
          />

          {(localError || error) && <p className="tailor-error">{localError || error}</p>}
        </div>

        <div className="modal-footer tailor-footer">
          <button className="tailor-btn tailor-btn--ghost" onClick={onCancel} disabled={working}>
            {no ? 'Avbryt' : 'Cancel'}
          </button>
          <button className="tailor-btn tailor-btn--primary" onClick={handleCreate} disabled={working}>
            {working
              ? (no ? 'Tilpasser…' : 'Tailoring…')
              : (no ? 'Lag tilpasset versjon' : 'Create tailored version')}
          </button>
        </div>
      </div>
    </div>
  )
}
