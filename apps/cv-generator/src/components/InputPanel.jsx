import { useState, useRef, useEffect } from 'react'
import { chatWithClaude } from '../utils/parseWithClaude'
import { applyPatches } from '../utils/applyPatches'

const ACCEPT = '.pdf,.docx,.txt'

export default function InputPanel({ cv, lang, onGenerate, generating, error }) {
  const [files, setFiles]         = useState([])
  const [rawText, setRawText]     = useState('')
  const [dragging, setDragging]   = useState(false)
  const [messages, setMessages]   = useState([])
  const [chatInput, setChatInput] = useState('')
  const [chatBusy, setChatBusy]   = useState(false)
  const [chatError, setChatError] = useState('')
  const inputRef   = useRef(null)
  const chatEndRef = useRef(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, chatBusy])

  function addFiles(incoming) {
    const arr = Array.from(incoming)
    setFiles(prev => {
      const existing = new Set(prev.map(f => f.name))
      return [...prev, ...arr.filter(f => !existing.has(f.name))]
    })
  }

  async function handleSend() {
    const msg = chatInput.trim()
    if (!msg || chatBusy) return
    setChatInput('')
    setChatError('')
    const next = [...messages, { role: 'user', content: msg }]
    setMessages(next)
    setChatBusy(true)
    try {
      const { reply, patches } = await chatWithClaude(cv, msg, messages, { lang })
      setMessages([...next, { role: 'assistant', content: reply }])
      if (patches?.length > 0) {
        const patchedCv = applyPatches(cv, patches)
        onGenerate([], '', patchedCv)
      }
    } catch (err) {
      const errMsg = err.message || 'Something went wrong. Please try again.'
      setChatError(errMsg)
      setMessages([...next, { role: 'assistant', content: `⚠️ ${errMsg}` }])
    } finally {
      setChatBusy(false)
    }
  }

  const cvIsEmpty = !cv?.personal?.firstName && !cv?.personal?.summary && !cv?.experience?.length

  return (
    <div className="input-panel">
      <div className="input-panel-inner">

        {/* ── Top row: drop zone + raw text ── */}
        <div className="input-top-row">

          {/* Left: file drop zone */}
          <div className="input-drop-col">
            <div
              className={`input-drop-zone${dragging ? ' dragging' : ''}`}
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={e => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files) }}
              onClick={() => inputRef.current?.click()}
            >
              <input ref={inputRef} type="file" accept={ACCEPT} multiple style={{ display: 'none' }}
                onChange={e => { addFiles(e.target.files); e.target.value = '' }} />
              <span className="input-drop-icon">⊕</span>
              <span className="input-drop-label">Drop files or click to browse</span>
              <span className="input-drop-hint">PDF, DOCX or TXT — CV, LinkedIn export, project notes…</span>
            </div>
            {files.length > 0 && (
              <ul className="input-file-list">
                {files.map(f => (
                  <li key={f.name} className="input-file-item">
                    <span className="input-file-name">{f.name}</span>
                    <button className="input-file-remove"
                      onClick={() => setFiles(prev => prev.filter(x => x.name !== f.name))}>×</button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Right: raw text paste */}
          <div className="input-raw-col">
            <div className="input-raw-box">
              <div className="input-raw-box-header">
                <span className="input-raw-box-title">Paste raw text</span>
                <span className="input-raw-box-hint">email, job posting, notes…</span>
              </div>
              <textarea
                className="input-raw-textarea"
                value={rawText}
                onChange={e => setRawText(e.target.value)}
                placeholder={'Paste email threads, job descriptions, project summaries, LinkedIn bios… Combined with your files when generating.'}
              />
            </div>
          </div>
        </div>

        {/* ── Generate button ── */}
        <div className="input-generate-row">
          {error && <p className="input-error">{error}</p>}
          <button
            className="input-generate-btn"
            onClick={() => onGenerate(files, rawText, null)}
            disabled={generating}
          >
            {generating
              ? <><span className="spinner-sm" /> Generating…</>
              : (files.length > 0 || rawText.trim()) ? 'Generate CV →' : 'Re-apply →'}
          </button>
        </div>

        {/* ── Chat section ── */}
        <div className="input-chat">
          <div className="input-chat-title">Refine with AI</div>
          <div className="input-chat-subtitle">
            Ask me to improve, rewrite, or tailor any part of your CV. All changes are based on your actual data — nothing will be invented.
          </div>

          {messages.length > 0 && (
            <div className="input-chat-messages">
              {messages.map((m, i) => (
                <div key={i} className={`input-chat-bubble input-chat-bubble--${m.role}`}>
                  {m.content}
                </div>
              ))}
              {chatBusy && (
                <div className="input-chat-bubble input-chat-bubble--assistant input-chat-bubble--thinking">
                  <span className="spinner-sm" /> Thinking…
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          )}

          {messages.length === 0 && (
            <div className="input-chat-examples">
              <span>Try:</span>
              {[
                'Make the summary more concise and impactful',
                'Emphasize leadership and stakeholder management',
                'Tailor this CV for a senior cloud architect role',
                'Rewrite the latest experience entry to highlight results',
              ].map(s => (
                <button key={s} className="input-chat-example-pill"
                  onClick={() => { setChatInput(s) }}>{s}</button>
              ))}
            </div>
          )}

          <div className="input-chat-input-row">
            <textarea
              className="input-chat-field"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
              }}
              placeholder={cvIsEmpty
                ? 'Generate your CV first, then ask me to refine it here…'
                : 'Ask me to improve any section… (Enter to send, Shift+Enter for new line)'}
              rows={2}
              disabled={chatBusy || cvIsEmpty}
            />
            <button
              className="input-chat-send"
              onClick={handleSend}
              disabled={chatBusy || !chatInput.trim() || cvIsEmpty}
            >
              {chatBusy ? <span className="spinner-sm" /> : 'Send →'}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
