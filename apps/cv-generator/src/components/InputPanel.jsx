import { useState, useRef, useEffect } from 'react'
import { chatWithClaude } from '../utils/parseWithClaude'
import { applyPatchesReport } from '../utils/applyPatches'
import { buildReceipt } from '../utils/patchLabels'
import { getL } from '../utils/labels'
import UrlFetchField from './UrlFetchField'

const ACCEPT = '.pdf,.docx,.txt'

export default function InputPanel({ cv, lang, onGenerate, generating, error, warning }) {
  const lb = getL(lang)
  const [files, setFiles]         = useState([])
  const [rawText, setRawText]     = useState('')
  const [rawExpanded, setRawExpanded] = useState(false)
  const [dragging, setDragging]   = useState(false)
  const [messages, setMessages]   = useState([])
  const [chatInput, setChatInput] = useState('')
  const [chatBusy, setChatBusy]   = useState(false)
  const [chatError, setChatError] = useState('')
  const inputRef   = useRef(null)
  const chatMessagesRef = useRef(null)

  // Keep the chat pinned to the newest message by scrolling the messages box
  // itself — never the page (scrollIntoView would nudge the whole viewport on
  // every streaming delta). Only auto-stick when the user is already near the
  // bottom, so scrolling up to re-read isn't yanked back down.
  useEffect(() => {
    const el = chatMessagesRef.current
    if (!el) return
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80
    if (nearBottom) el.scrollTop = el.scrollHeight
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
    // Placeholder assistant bubble — filled in live as the reply streams
    setMessages([...next, { role: 'assistant', content: '' }])
    setChatBusy(true)
    try {
      const { reply, patches } = await chatWithClaude(cv, msg, messages, {
        lang,
        onDelta: partial => setMessages([...next, { role: 'assistant', content: partial }]),
      })
      // Ground-truth reconciliation: apply against the CV the model saw and see
      // what actually landed. The receipt (shown under the reply) reflects the
      // real result, so the prose can't silently claim a change that failed.
      const { cv: patchedCv, applied, skipped } = applyPatchesReport(cv, patches)
      const receipt = (applied.length || skipped.length) ? buildReceipt(applied, skipped) : null
      setMessages([...next, { role: 'assistant', content: reply || 'Done.', receipt }])
      if (applied.length > 0) {
        // Pass the applied CV (used when editing the master directly) and the
        // applied patches (so a tailored view can route summary/description
        // edits to its overrides). Only the patches that really landed.
        onGenerate([], '', patchedCv, applied)
      }
    } catch (err) {
      const errMsg = err.message || 'Something went wrong. Please try again.'
      setChatError(errMsg)
      setMessages([...next, { role: 'assistant', content: `⚠️ ${errMsg}` }])
    } finally {
      setChatBusy(false)
    }
  }

  // Close the expanded raw-text modal on Escape.
  useEffect(() => {
    if (!rawExpanded) return
    function onKey(e) { if (e.key === 'Escape') setRawExpanded(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [rawExpanded])

  const cvIsEmpty = !cv?.personal?.firstName && !cv?.personal?.summary && !cv?.experience?.length
  const rawChars = rawText.trim().length

  return (
    <div className="input-panel">
      <div className="input-panel-inner">

        {/* ── Step ① — feed everything ── */}
        <section className="input-step">
          <div className="input-step-header">
            <span className="input-step-num">1</span>
            <div className="input-step-heading">
              <h2 className="input-step-title">Add everything about your career</h2>
              <p className="input-step-sub">
                The more raw material you give it, the better the CV. Drop files or paste anything relevant:
              </p>
              <ul className="input-step-checklist">
                <li>Old CVs</li>
                <li>LinkedIn export</li>
                <li>Certificates</li>
                <li>References &amp; attestations</li>
                <li>Project notes</li>
              </ul>
            </div>
          </div>

          {/* One intake surface: drop files (left) and/or paste text (right) */}
          <div className={`input-intake-card${dragging ? ' dragging' : ''}`}>
            <div className="input-top-row">

              {/* Left: file drop zone */}
              <div className="input-drop-col">
                <div
                  className="input-drop-zone"
                  onDragOver={e => { e.preventDefault(); setDragging(true) }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={e => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files) }}
                  onClick={() => inputRef.current?.click()}
                >
                  <input ref={inputRef} type="file" accept={ACCEPT} multiple style={{ display: 'none' }}
                    onChange={e => { addFiles(e.target.files); e.target.value = '' }} />
                  <span className="input-drop-icon">⊕</span>
                  <span className="input-drop-label">Drop files or click to browse</span>
                  <span className="input-drop-hint">PDF, DOCX or TXT</span>
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
                    <span className="input-raw-box-title">…or paste raw text</span>
                    <span className="input-raw-box-hint">email, job posting, notes…</span>
                    <button
                      type="button"
                      className="input-raw-expand"
                      title="Expand to view / edit all text"
                      aria-label="Expand raw text"
                      onClick={() => setRawExpanded(true)}
                    >
                      ⤢
                    </button>
                  </div>
                  <textarea
                    className="input-raw-textarea"
                    value={rawText}
                    onChange={e => setRawText(e.target.value)}
                    placeholder={'Paste email threads, job descriptions, project summaries, LinkedIn bios… Combined with your files when generating.'}
                  />
                  <UrlFetchField
                    lang="en"
                    disabled={generating}
                    placeholder="…or paste a public link to fetch"
                    hint="Your public profile, portfolio or page (no login/paywall). Fetched text is added above to review."
                    onText={t => setRawText(prev => (prev ? prev + t : t.replace(/^\n+/, '')))}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── Generate button ── */}
          <div className="input-generate-row">
            {error && <p className="input-error">{error}</p>}
            {warning && <p className="input-warning">{warning}</p>}
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
        </section>

        {/* ── Step ② — refine by chatting ── */}
        <section className={`input-step input-chat${cvIsEmpty ? ' input-chat--waiting' : ''}`}>
          <div className="input-step-header">
            <span className="input-step-num">2</span>
            <div className="input-step-heading">
              <h2 className="input-step-title">Then refine by chatting</h2>
              <p className="input-step-sub">
                Edit any field just by asking — summary, experience, skills, competences.
                {cvIsEmpty
                  ? ' Generate your CV above first, then chat here.'
                  : ' Changes apply across the whole CV, based only on your real data.'}
              </p>
            </div>
          </div>

          {messages.length > 0 && (
            <div className="input-chat-messages" ref={chatMessagesRef}>
              {messages.map((m, i) => {
                const isThinking = chatBusy && i === messages.length - 1
                  && m.role === 'assistant' && !m.content
                const r = m.receipt
                return (
                  <div key={i} className="input-chat-row">
                    <div
                      className={`input-chat-bubble input-chat-bubble--${m.role}${isThinking ? ' input-chat-bubble--thinking' : ''}`}
                    >
                      {isThinking ? <><span className="spinner-sm" /> Thinking…</> : m.content}
                    </div>
                    {r && (r.changed.length > 0 || r.failed.length > 0) && (
                      <div className="chat-receipt">
                        {r.changed.length > 0 && (
                          <div className="chat-receipt-line chat-receipt-line--ok">
                            <span className="chat-receipt-mark">✓</span>
                            Updated: {r.changed.join(', ')}
                          </div>
                        )}
                        {r.failed.length > 0 && (
                          <div className="chat-receipt-line chat-receipt-line--warn">
                            <span className="chat-receipt-mark">⚠</span>
                            {r.changed.length === 0 ? 'No changes applied' : 'Couldn’t apply'}: {r.failed.map(f => `${f.label} (${f.reason})`).join(', ')}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {messages.length === 0 && (
            <div className="input-chat-examples">
              <span>{lb.chatExamplesLabel}:</span>
              {(lb.chatExamples || []).map(s => (
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
        </section>

      </div>

      {/* Expanded view of everything pasted / fetched — scrollable + editable */}
      {rawExpanded && (
        <div className="modal-overlay" onClick={() => setRawExpanded(false)}>
          <div className="modal-box raw-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">
                Pasted text{rawChars > 0 ? ` · ${rawChars.toLocaleString()} chars` : ''}
              </span>
              <button className="modal-close" onClick={() => setRawExpanded(false)}>×</button>
            </div>
            <div className="modal-body">
              <textarea
                className="raw-modal-textarea"
                value={rawText}
                onChange={e => setRawText(e.target.value)}
                placeholder="Nothing pasted or fetched yet. Paste text or fetch a link to see it here."
                autoFocus
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
