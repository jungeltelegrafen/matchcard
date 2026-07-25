import { useState, useEffect } from 'react'
import { emptyCv, ensureIds, stripIds, cvHasContent, PARSE_CHAR_LIMIT } from '@lib/cv/schema'
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

const LANG_ENDONYM = { en: 'English', no: 'Norsk' }
const otherOf = l => (l === 'en' ? 'no' : 'en')

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

  // The CV is stored per language ('en' | 'no'). The two toggles are
  // independent: uiLang drives the chrome/labels, contentLang drives which
  // CV language is viewed, edited, and exported. Translating writes into the
  // other language slot and never mutates the source language.
  const [cvByLang, setCvByLang]           = useState(() => draft?.cvByLang       ?? { en: emptyCv(), no: emptyCv() })
  const [metaByLang, setMetaByLang]       = useState(() => draft?.metaByLang     ?? { en: emptyMeta(), no: emptyMeta() })
  const [feedbackByLang, setFeedbackByLang] = useState(() => draft?.feedbackByLang ?? { en: [], no: [] })
  const [uiLang, setUiLang]               = useState(() => draft?.uiLang      ?? 'en')
  const [contentLang, setContentLang]     = useState(() => draft?.contentLang ?? 'en')

  const [generating, setGenerating]   = useState(false)
  const [translating, setTranslating] = useState(false)
  const [genError, setGenError]       = useState('')
  const [genWarning, setGenWarning]   = useState('')
  const [previewOpen, setPreviewOpen] = useState(false)
  const [hoveredSection, setHoveredSection] = useState(null)
  const [chatChangedSections, setChatChangedSections] = useState(new Set())
  const [showRestored, setShowRestored] = useState(() => draftHasContent(draft))

  // Active slice for the currently-viewed content language. Everything
  // downstream (editor, renderers, export) consumes these exactly as before.
  const cv   = cvByLang[contentLang]
  const meta = metaByLang[contentLang]
  const feedbackItems = feedbackByLang[contentLang]

  const otherLang        = otherOf(contentLang)
  const activeHasContent = cvHasContent(cv)
  const otherHasContent  = cvHasContent(cvByLang[otherLang])

  // Debounced autosave — both languages + both toggles
  useEffect(() => {
    const t = setTimeout(
      () => saveDraft({ cvByLang, metaByLang, feedbackByLang, uiLang, contentLang }),
      600
    )
    return () => clearTimeout(t)
  }, [cvByLang, metaByLang, feedbackByLang, uiLang, contentLang])

  // ── active-slot setters ─────────────────────────────────────────────────
  const setActiveCv   = next => setCvByLang(prev => ({ ...prev, [contentLang]: typeof next === 'function' ? next(prev[contentLang]) : next }))
  const setActiveMeta = next => setMetaByLang(prev => ({ ...prev, [contentLang]: typeof next === 'function' ? next(prev[contentLang]) : next }))
  const setActiveFeedback = next => setFeedbackByLang(prev => ({ ...prev, [contentLang]: typeof next === 'function' ? next(prev[contentLang]) : next }))

  function dismissChatChange(key) {
    setChatChangedSections(prev => { const n = new Set(prev); n.delete(key); return n })
  }

  async function handleGenerate(files, rawText, directCv = null) {
    // Chat sends an already-patched CV directly — diff sections and merge into
    // the active language. applyAiResult normalizes, correlates item ids, and
    // preserves user edits; client-only sections are never overwritten.
    if (directCv) {
      setChatChangedSections(diffCvSections(cv, directCv))
      const { cv: nextCv, meta: nextMeta } = applyAiResult(meta, cv, directCv)
      setActiveCv(nextCv)
      setActiveMeta(nextMeta)
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
        ? (uiLang === 'no'
            ? `Kildeteksten er på ${text.length.toLocaleString()} tegn — bare de første ${PARSE_CHAR_LIMIT.toLocaleString()} ble brukt. Last opp de mest relevante dokumentene for å unngå at innhold går tapt.`
            : `Source text is ${text.length.toLocaleString()} characters — only the first ${PARSE_CHAR_LIMIT.toLocaleString()} were used. Upload the most relevant documents to avoid losing content.`)
        : '')

      const userEdits = getUserEdits(meta, cv)
      // Generate in the currently-viewed content language
      const newCv = await parseWithClaude(text, { userEdits, lang: contentLang })
      // The competence matrix is hand-curated per bid — parsing never overwrites it
      const { cv: nextCv, meta: nextMeta } = applyAiResult(meta, cv, newCv, { keepSections: ['competences'] })
      setActiveCv(nextCv)
      setActiveMeta(nextMeta)
    } catch (err) {
      setGenError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  // Directional translation: produce `targetLang` from `sourceLang` and merge
  // into the target slot, leaving the source untouched. The target's own
  // user-edits are preserved (conflicts surface as accept/dismiss suggestions),
  // and cvType is carried across since it isn't language-specific. The view
  // switches to the target so the result is visible.
  async function runTranslate(sourceLang, targetLang) {
    setTranslating(true)
    setGenError('')
    try {
      const translated = await translateCv(cvByLang[sourceLang], targetLang)
      const { cv: nextCv, meta: nextMeta } = applyAiResult(
        metaByLang[targetLang], cvByLang[targetLang], translated
      )
      nextCv.cvType = cvByLang[sourceLang].cvType
      setCvByLang(prev => ({ ...prev, [targetLang]: nextCv }))
      setMetaByLang(prev => ({ ...prev, [targetLang]: nextMeta }))
      setContentLang(targetLang)
    } catch (err) {
      setGenError(err.message || 'Translation failed. Please try again.')
    } finally {
      setTranslating(false)
    }
  }

  function handleFieldEdit(path, value) {
    setActiveCv(prev => setValueAtPath(prev, path, value))
    setActiveMeta(prev => markUserEdit(prev, path))
  }

  function handleAccept(path, suggestion) {
    setActiveCv(prev => setValueAtPath(prev, path, suggestion))
    setActiveMeta(prev => acceptSuggestion(prev, path))
  }

  function handleDismiss(path) {
    setActiveMeta(prev => dismissSuggestion(prev, path))
  }

  // Structural changes (add/remove/reorder items) shift array indexes, so meta
  // keys are remapped by item id to stay attached to the right items.
  function handleStructural(sectionKey, newData) {
    const next = ensureIds({ ...cv, [sectionKey]: newData })
    setMetaByLang(prev => ({ ...prev, [contentLang]: remapMeta(prev[contentLang], cv, next) }))
    setCvByLang(prev => ({ ...prev, [contentLang]: next }))
  }

  // cvType (technical / management) is not language-specific — keep both
  // language versions in sync.
  function handleCvTypeChange(type) {
    setCvByLang(prev => ({
      en: { ...prev.en, cvType: type },
      no: { ...prev.no, cvType: type },
    }))
  }

  function handleClear() {
    clearDraft()
    setCvByLang({ en: emptyCv(), no: emptyCv() })
    setMetaByLang({ en: emptyMeta(), no: emptyMeta() })
    setFeedbackByLang({ en: [], no: [] })
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
        uiLang={uiLang}
        contentLang={contentLang}
        activeHasContent={activeHasContent}
        translating={translating}
        onUiLangChange={setUiLang}
        onContentLangChange={setContentLang}
        onTranslate={() => runTranslate(contentLang, otherLang)}
        onClear={handleClear}
        onCvTypeChange={handleCvTypeChange}
      />

      {showRestored && (
        <div className="draft-notice">
          <span>
            {uiLang === 'no'
              ? 'Utkastet fra forrige økt er gjenopprettet.'
              : 'Your draft from the previous session was restored.'}
          </span>
          <button className="draft-notice-dismiss" onClick={() => setShowRestored(false)}>×</button>
        </div>
      )}

      {/* Empty-language banner: this language has no content yet but the other
          does — offer a one-click translation to fill it in. */}
      {!activeHasContent && otherHasContent && (
        <div className="translate-banner">
          <span>
            {uiLang === 'no'
              ? `Denne CV-en finnes ikke på ${LANG_ENDONYM[contentLang]} ennå.`
              : `This CV has no ${LANG_ENDONYM[contentLang]} version yet.`}
          </span>
          <button
            className="translate-banner-btn"
            onClick={() => runTranslate(otherLang, contentLang)}
            disabled={translating}
          >
            {translating
              ? (uiLang === 'no' ? 'Oversetter…' : 'Translating…')
              : (uiLang === 'no'
                  ? `⇄ Oversett fra ${LANG_ENDONYM[otherLang]}`
                  : `⇄ Translate from ${LANG_ENDONYM[otherLang]}`)}
          </button>
        </div>
      )}

      <InputPanel
        cv={cv}
        lang={contentLang}
        onGenerate={handleGenerate}
        generating={generating}
        error={genError}
        warning={genWarning}
      />

      <main className="cv-main">
        <AgentsBar
          cv={cv}
          lang={uiLang}
          reviewLang={contentLang}
          onFeedback={items => setActiveFeedback(prev => [...items, ...prev])}
        />

        <div className="cv-columns">
          <LeftSidebar
            lang={uiLang}
            feedbackItems={feedbackItems}
            onFeedbackChange={setActiveFeedback}
            onSectionHover={setHoveredSection}
          />

          <div className="cv-page">
            <CVEditor
              cv={cv}
              lang={contentLang}
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

          <RightSidebar lang={uiLang} />
        </div>
      </main>

      {previewOpen && (
        <PreviewModal cv={cv} lang={contentLang} onClose={() => setPreviewOpen(false)} />
      )}

      <ExportFooter
        cvByLang={cvByLang}
        contentLang={contentLang}
        uiLang={uiLang}
        filename={filename}
        onPreview={() => setPreviewOpen(true)}
      />
    </div>
  )
}
