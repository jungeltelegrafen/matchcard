import { useState, useEffect, useMemo } from 'react'
import { EMPTY_BRIEF, makeEmptyBrief } from './data'
import { parseFile } from './lib/parseFile'
import { LanguageProvider, useT, useLang } from './i18n'
import SourcePanel from './components/SourcePanel'
import LeftColumn from './components/LeftColumn'
import CenterColumn from './components/CenterColumn'
import RightColumn from './components/RightColumn'
import ExportBar from './components/ExportBar'
import FeedbackModal from './components/FeedbackModal'

const STORAGE_KEY = 'behovsavklarer-v1'
const isLocalhost = window.location.hostname === 'localhost' ||
                    window.location.hostname.startsWith('127.')
const API_BASE = isLocalhost ? '' : 'https://matchcard.no'

function AppInner() {
  const t = useT()
  const { lang, toggle } = useLang()

  // ── State ───────────────────────────────────────────────────────────────
  const [brief, setBrief] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        const base = makeEmptyBrief()
        const merged = { ...base, ...parsed }
        // Back-fill tilbudsformat for existing sessions that have it empty
        if (!merged.tilbudsformat) merged.tilbudsformat = base.tilbudsformat
        return merged
      }
      return makeEmptyBrief()
    } catch { return makeEmptyBrief() }
  })

  const [touched, setTouched]             = useState(new Set())
  const [feedbackOpen, setFeedbackOpen]   = useState(false)
  const [sourceFiles, setSourceFiles]     = useState([])
  const [pastedText, setPastedText]       = useState('')
  const [parsing, setParsing]             = useState(false)
  const [extracting, setExtracting]       = useState(false)
  const [anonymizing, setAnonymizing]     = useState(false)
  const [apiAvailable, setApiAvail]       = useState(false)
  const [enrichAvailable, setEnrichAvail] = useState(false)
  const [pendingFill, setPending]         = useState(null)

  const combinedSource = useMemo(() => [
    ...sourceFiles.map((f, i) => `[Dokument ${i + 1}: ${f.name}]\n${f.text}`),
    pastedText,
  ].filter(Boolean).join('\n\n---\n\n'), [sourceFiles, pastedText])

  // ── Auto-save ────────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(brief)), 400)
    return () => clearTimeout(t)
  }, [brief])

  // ── API availability check ────────────────────────────────────────────────
  useEffect(() => {
    function check() {
      fetch(`${API_BASE}/api/req/extract`).then(r => r.json())
        .then(d => { if (d.ok && d.configured) setApiAvail(true) }).catch(() => {})
      fetch(`${API_BASE}/api/req/enrich`).then(r => r.json())
        .then(d => { if (d.ok && d.configured) setEnrichAvail(true) }).catch(() => {})
    }
    check()
    const timer = setInterval(check, 5000)
    return () => clearInterval(timer)
  }, [])

  // ── Field setters ─────────────────────────────────────────────────────────
  function setField(key, value) {
    setBrief(b => ({ ...b, [key]: value }))
    setTouched(s => new Set([...s, key]))
  }

  // ── File handlers ─────────────────────────────────────────────────────────
  async function handleFileAdd(file) {
    setParsing(true)
    try {
      const text = await parseFile(file)
      setSourceFiles(prev => [...prev, { name: file.name, text }])
    } finally {
      setParsing(false)
    }
  }

  function handleFileRemove(index) {
    setSourceFiles(prev => prev.filter((_, i) => i !== index))
  }

  // ── AI handlers ───────────────────────────────────────────────────────────
  async function handleExtract() {
    if (!combinedSource.trim() || !apiAvailable) return
    setExtracting(true)
    try {
      const res = await fetch(`${API_BASE}/api/req/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: combinedSource, mode: 'fill' }),
      })
      applyExtraction(await res.json())
    } catch (e) { console.error('Extract error:', e) }
    finally { setExtracting(false) }
  }

  async function handleDistill() {
    if (!apiAvailable) return
    setExtracting(true)
    try {
      const res = await fetch(`${API_BASE}/api/req/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: buildSummaryText(brief), mode: 'distill' }),
      })
      applyExtraction(await res.json())
    } catch (e) { console.error('Distill error:', e) }
    finally { setExtracting(false) }
  }

  async function handleAnonymize() {
    if (!apiAvailable) return
    setAnonymizing(true)
    try {
      const res = await fetch(`${API_BASE}/api/req/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief, mode: 'anonymize' }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setBrief(b => ({ ...b, ...data }))
    } catch (e) { console.error('Anonymize error:', e) }
    finally { setAnonymizing(false) }
  }

  async function handleEnrich(query) {
    const res = await fetch(`${API_BASE}/api/req/enrich`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    })
    if (!res.ok) throw new Error('Berikning feilet')
    const { summary } = await res.json()
    if (!summary) throw new Error('Ingen data returnert')
    if (touched.has('kundebeskrivelse') && brief.kundebeskrivelse) {
      setPending(s => ({ ...(s || {}), kundebeskrivelse: summary }))
    } else {
      setBrief(b => ({ ...b, kundebeskrivelse: summary }))
    }
  }

  function applyExtraction(data) {
    const updates = {}
    const suggestions = {}
    for (const [key, value] of Object.entries(data)) {
      if (value === null || value === undefined || value === '') continue
      if (Array.isArray(value) && value.filter(Boolean).length === 0) continue
      const alreadyFilled = Array.isArray(brief[key])
        ? brief[key].filter(Boolean).length > 0
        : Boolean(brief[key])
      if (touched.has(key) && alreadyFilled) suggestions[key] = value
      else updates[key] = value
    }
    if (Object.keys(updates).length)     setBrief(b => ({ ...b, ...updates }))
    if (Object.keys(suggestions).length) setPending(s => ({ ...(s || {}), ...suggestions }))
  }

  function acceptSuggestion(key) {
    setBrief(b => ({ ...b, [key]: pendingFill[key] }))
    setPending(s => {
      const next = { ...s }; delete next[key]
      return Object.keys(next).length ? next : null
    })
  }

  function rejectSuggestion(key) {
    setPending(s => {
      const next = { ...s }; delete next[key]
      return Object.keys(next).length ? next : null
    })
  }

  function handleClear() {
    if (!confirm(t.confirmReset)) return
    setBrief(makeEmptyBrief())
    setTouched(new Set())
    setPending(null)
    setSourceFiles([])
    setPastedText('')
  }

  // ── Render ────────────────────────────────────────────────────────────────
  const colProps = {
    brief, setField, pendingFill,
    onAccept: acceptSuggestion, onReject: rejectSuggestion,
    enrichAvailable, onEnrich: handleEnrich,
  }

  return (
    <div
      className="bg-bg"
      style={{ display: 'grid', gridTemplateRows: 'auto auto 1fr auto', height: '100%', overflow: 'hidden' }}
    >
      {/* Header */}
      <div className="no-print relative flex items-center justify-center px-6 py-4 border-b border-border bg-card">

        {/* Back to marketplace */}
        <a
          href="/"
          className="absolute left-5 flex items-center gap-1.5 rounded-lg border border-border
            bg-white hover:bg-bg px-3 py-1.5 transition-colors group"
          title="Tilbake til matchcard"
        >
          <span className="text-sm text-tx-muted group-hover:-translate-x-0.5 transition-transform inline-block">←</span>
          <span className="text-xs font-bold text-accent tracking-tight">matchcard</span>
        </a>

        {/* Centered title */}
        <div className="flex flex-col items-center gap-1">
          <h1 className="text-[22px] font-bold text-primary tracking-tight">{t.appTitle}</h1>
          <div className="h-0.5 w-10 rounded-full bg-accent/60" />
        </div>

        {/* Right: status + actions */}
        <div className="absolute right-5 flex items-center gap-2">
          {(extracting || anonymizing) && (
            <span className="text-xs text-accent animate-pulse">
              {anonymizing ? t.anonymising : t.analysing}
            </span>
          )}

          {/* Language toggle */}
          <div className="flex rounded-lg border border-border overflow-hidden text-[11px] font-bold">
            <button
              onClick={() => lang !== 'no' && toggle()}
              className={`px-2.5 py-1.5 transition-colors ${lang === 'no' ? 'bg-primary text-white' : 'text-tx-muted hover:text-tx bg-white'}`}
            >
              NO
            </button>
            <button
              onClick={() => lang !== 'en' && toggle()}
              className={`px-2.5 py-1.5 transition-colors ${lang === 'en' ? 'bg-primary text-white' : 'text-tx-muted hover:text-tx bg-white'}`}
            >
              EN
            </button>
          </div>

          <button
            onClick={() => setFeedbackOpen(true)}
            className="rounded-lg border border-border bg-white hover:bg-bg
              px-3 py-1.5 text-xs font-semibold text-tx-muted hover:text-tx transition-colors"
          >
            💬 {t.feedbackBtn}
          </button>
          <button
            onClick={handleClear}
            className="rounded-lg border border-border bg-white hover:bg-bg
              px-3 py-1.5 text-xs font-semibold text-tx transition-colors"
          >
            {t.reset}
          </button>
        </div>
      </div>

      {/* Source panel */}
      <div className="no-print">
        <SourcePanel
          sourceFiles={sourceFiles}
          pastedText={pastedText}
          parsing={parsing}
          extracting={extracting}
          apiAvailable={apiAvailable}
          isLocalhost={isLocalhost}
          onFileAdd={handleFileAdd}
          onFileRemove={handleFileRemove}
          onPasteChange={setPastedText}
          onExtract={handleExtract}
          onDistill={handleDistill}
        />
      </div>

      {/* Three columns */}
      <div className="cols-wrap flex overflow-hidden">
        <LeftColumn   {...colProps} />
        <CenterColumn {...colProps} />
        <RightColumn  {...colProps} />
      </div>

      {/* Export bar */}
      <ExportBar
        brief={brief}
        lang={lang}
        apiAvailable={apiAvailable}
        anonymizing={anonymizing}
        onAnonymize={handleAnonymize}
      />

      {/* Feedback modal */}
      {feedbackOpen && (
        <FeedbackModal
          onClose={() => setFeedbackOpen(false)}
          apiBase={API_BASE}
          briefRole={brief.rolle || ''}
        />
      )}
    </div>
  )
}

export default function App() {
  return (
    <LanguageProvider>
      <AppInner />
    </LanguageProvider>
  )
}

function buildSummaryText(b) {
  return [
    b.rolle               && `Rolle: ${b.rolle}`,
    b.kundebeskrivelse    && `Kunde: ${b.kundebeskrivelse}`,
    b.prosjektbeskrivelse && `Prosjekt: ${b.prosjektbeskrivelse}`,
    b.arbeidsoppgaver     && `Arbeidsoppgaver: ${b.arbeidsoppgaver}`,
    b.maHa?.filter(Boolean).length && `Må ha: ${b.maHa.filter(Boolean).join(', ')}`,
    b.fintAHa?.filter(Boolean).length && `Fint å ha: ${b.fintAHa.filter(Boolean).join(', ')}`,
    b.hvaUtlosteBehovet   && `Bakgrunn: ${b.hvaUtlosteBehovet}`,
    b.personligeEgenskaper && `Personlig: ${b.personligeEgenskaper}`,
  ].filter(Boolean).join('\n\n')
}
