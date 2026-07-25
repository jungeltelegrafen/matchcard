import { useState, useEffect } from 'react'
import { emptyCv, ensureIds, stripIds, PARSE_CHAR_LIMIT } from '@lib/cv/schema'
import { extractText } from './utils/extractText'
import { parseWithClaude, translateCv } from './utils/parseWithClaude'
import { loadDraft, saveDraft, clearDraft, draftHasContent } from './utils/draftStorage'
import {
  emptyMeta,
  markUserEdit,
  acceptSuggestion,
  dismissSuggestion,
  applyAiResult,
  setValueAtPath,
  getUserEdits,
  remapMeta,
} from './utils/fieldMeta'
import AppHeader from './components/AppHeader'
import InputPanel from './components/InputPanel'
import CVEditor from './components/CVEditor'
import AgentsBar from './components/AgentsBar'
import LeftSidebar from './components/LeftSidebar'
import RightSidebar from './components/RightSidebar'
import PreviewModal from './components/PreviewModal'
import ExportFooter from './components/ExportFooter'
import './styles/app.css'

// CV key → SectionWrap key mapping for chat diff
const CV_SECTION_MAP = {
  personal:       'summary',
  skills:         'skills',
  experience:     'experience',
  education:      'education',
  languages:      'languages',
  certifications: 'certifications',
  courses:        'certifications',
  positions:      'experience',
  portfolio:      'portfolio',
}

function diffCvSections(oldCv, newCv) {
  const changed = new Set()
  for (const [cvKey, sectionKey] of Object.entries(CV_SECTION_MAP)) {
    if (JSON.stringify(oldCv[cvKey]) !== JSON.stringify(newCv[cvKey])) {
      changed.add(sectionKey)
    }
  }
  return changed
}

export default function App() {
  // Restore the previous session's draft once, before first render
  const [draft] = useState(loadDraft)

  const [cv, setCv]             = useState(() => draft?.cv ?? emptyCv())
  const [meta, setMeta]         = useState(() => draft?.meta ?? emptyMeta())
  const [lang, setLang]         = useState(() => draft?.lang ?? 'en')
  const [generating, setGenerating] = useState(false)
  const [translating, setTranslating] = useState(false)
  const [genError, setGenError] = useState('')
  const [genWarning, setGenWarning] = useState('')
  const [previewOpen, setPreviewOpen]   = useState(false)
  const [feedbackItems, setFeedbackItems] = useState(() => draft?.feedbackItems ?? [])
  const [hoveredSection, setHoveredSection] = useState(null)
  const [chatChangedSections, setChatChangedSections] = useState(new Set())
  const [showRestored, setShowRestored] = useState(() => draftHasContent(draft))

  // Debounced autosave — everything the user could lose on a refresh
  useEffect(() => {
    const t = setTimeout(() => saveDraft({ cv, meta, lang, feedbackItems }), 600)
    return () => clearTimeout(t)
  }, [cv, meta, lang, feedbackItems])

  function dismissChatChange(key) {
    setChatChangedSections(prev => { const n = new Set(prev); n.delete(key); return n })
  }

  async function handleGenerate(files, rawText, directCv = null) {
    // Chat sends an already-patched CV directly — diff sections and merge.
    // applyAiResult normalizes, correlates item ids, and preserves user edits;
    // client-only sections (cvType, video profiles) are never overwritten.
    if (directCv) {
      setChatChangedSections(diffCvSections(cv, directCv))
      const { cv: nextCv, meta: nextMeta } = applyAiResult(meta, cv, directCv)
      setCv(nextCv)
      setMeta(nextMeta)
      return
    }

    setGenerating(true)
    setGenError('')
    try {
      let text = ''
      if (files.length > 0) {
        const texts = await Promise.all(files.map(extractText))
        text = texts.join('\n\n---\n\n')
      }
      if (rawText?.trim()) {
        text = text ? `${text}\n\n---\n\n${rawText.trim()}` : rawText.trim()
      }
      if (!text) {
        text = `Current CV data (re-apply and refine):\n${JSON.stringify(stripIds(cv), null, 2)}`
      }

      // Never truncate silently — warn when source text exceeds the parse limit
      setGenWarning(text.length > PARSE_CHAR_LIMIT
        ? (lang === 'no'
            ? `Kildeteksten er på ${text.length.toLocaleString()} tegn — bare de første ${PARSE_CHAR_LIMIT.toLocaleString()} ble brukt. Last opp de mest relevante dokumentene for å unngå at innhold går tapt.`
            : `Source text is ${text.length.toLocaleString()} characters — only the first ${PARSE_CHAR_LIMIT.toLocaleString()} were used. Upload the most relevant documents to avoid losing content.`)
        : '')

      const userEdits = getUserEdits(meta, cv)
      const newCv = await parseWithClaude(text, { userEdits, lang })
      // The competence matrix is hand-curated per bid — parsing never overwrites it
      const { cv: nextCv, meta: nextMeta } = applyAiResult(meta, cv, newCv, { keepSections: ['competences'] })
      setCv(nextCv)
      setMeta(nextMeta)
    } catch (err) {
      setGenError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  // Explicit translation — the only place CV content is ever run through the
  // model without the user typing a request. User-edited fields are protected:
  // their translations surface as accept/dismiss suggestions instead of
  // silently replacing hand-written text.
  async function handleTranslate() {
    setTranslating(true)
    setGenError('')
    try {
      const translated = await translateCv(cv, lang)
      const { cv: nextCv, meta: nextMeta } = applyAiResult(meta, cv, translated)
      setCv(nextCv)
      setMeta(nextMeta)
    } catch (err) {
      setGenError(err.message || 'Translation failed. Please try again.')
    } finally {
      setTranslating(false)
    }
  }

  function handleFieldEdit(path, value) {
    setCv(prev => setValueAtPath(prev, path, value))
    setMeta(prev => markUserEdit(prev, path))
  }

  function handleAccept(path, suggestion) {
    setCv(prev => setValueAtPath(prev, path, suggestion))
    setMeta(prev => acceptSuggestion(prev, path))
  }

  function handleDismiss(path) {
    setMeta(prev => dismissSuggestion(prev, path))
  }

  // Structural changes (add/remove/reorder items) shift array indexes, so meta
  // keys are remapped by item id to stay attached to the right items.
  function handleStructural(sectionKey, newData) {
    const next = ensureIds({ ...cv, [sectionKey]: newData })
    setMeta(remapMeta(meta, cv, next))
    setCv(next)
  }

  function handleCvTypeChange(type) {
    setCv(prev => ({ ...prev, cvType: type }))
  }

  function handleClear() {
    clearDraft()
    setCv(emptyCv())
    setMeta(emptyMeta())
    setFeedbackItems([])
    setChatChangedSections(new Set())
    setGenWarning('')
    setShowRestored(false)
  }

  const commentCounts = feedbackItems
    .filter(f => !f.resolved)
    .reduce((acc, f) => {
      if (f.sectionKey) acc[f.sectionKey] = (acc[f.sectionKey] || 0) + 1
      return acc
    }, {})

  const filename = [cv.personal.firstName, cv.personal.lastName]
    .filter(Boolean).join('_').replace(/\s+/g, '_') || 'CV'

  return (
    <div className="app-layout">
      <AppHeader
        cv={cv}
        lang={lang}
        onLangChange={setLang}
        onClear={handleClear}
        onCvTypeChange={handleCvTypeChange}
        onTranslate={handleTranslate}
        translating={translating}
      />

      {showRestored && (
        <div className="draft-notice">
          <span>
            {lang === 'no'
              ? 'Utkastet fra forrige økt er gjenopprettet.'
              : 'Your draft from the previous session was restored.'}
          </span>
          <button className="draft-notice-dismiss" onClick={() => setShowRestored(false)}>×</button>
        </div>
      )}

      <InputPanel
        cv={cv}
        lang={lang}
        onGenerate={handleGenerate}
        generating={generating}
        error={genError}
        warning={genWarning}
      />

      <main className="cv-main">
        <AgentsBar cv={cv} lang={lang} onFeedback={items => setFeedbackItems(prev => [...items, ...prev])} />

        <div className="cv-columns">
          <LeftSidebar
            lang={lang}
            feedbackItems={feedbackItems}
            onFeedbackChange={setFeedbackItems}
            onSectionHover={setHoveredSection}
          />

          <div className="cv-page">
            <CVEditor
              cv={cv}
              lang={lang}
              meta={meta}
              onFieldEdit={handleFieldEdit}
              onAccept={handleAccept}
              onDismiss={handleDismiss}
              onStructural={handleStructural}
              hoveredSection={hoveredSection}
              commentCounts={commentCounts}
              chatChangedSections={chatChangedSections}
              onDismissChatChange={dismissChatChange}
            />
          </div>

          <RightSidebar lang={lang} />
        </div>
      </main>

      {previewOpen && (
        <PreviewModal cv={cv} lang={lang} onClose={() => setPreviewOpen(false)} />
      )}

      <ExportFooter
        cv={cv}
        filename={filename}
        lang={lang}
        onPreview={() => setPreviewOpen(true)}
      />
    </div>
  )
}
