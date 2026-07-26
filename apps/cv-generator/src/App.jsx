import { useState, useEffect } from 'react'
import { emptyCv, ensureIds, stripIds, cvHasContent, PARSE_CHAR_LIMIT } from '@lib/cv/schema'
import { deriveTailoredCv, variantFromPlan } from '@lib/cv/tailor'
import { extractText } from './utils/extractText'
import { parseWithClaude, translateCv, tailorCv } from './utils/parseWithClaude'
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
import TailorPanel from './components/TailorPanel'
import TailoringReview from './components/TailoringReview'
import FeedbackStrip from './components/FeedbackStrip'
import './styles/app.css'

const LANG_ENDONYM = { en: 'English', no: 'Norsk' }
const otherOf = l => (l === 'en' ? 'no' : 'en')
const slug = s => (s || '').replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '') || 'version'

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

  // Master CV, stored per language. Two independent toggles: uiLang (chrome),
  // contentLang (which CV language is viewed/edited/exported).
  const [cvByLang, setCvByLang]           = useState(() => draft?.cvByLang       ?? { en: emptyCv(), no: emptyCv() })
  const [metaByLang, setMetaByLang]       = useState(() => draft?.metaByLang     ?? { en: emptyMeta(), no: emptyMeta() })
  const [feedbackByLang, setFeedbackByLang] = useState(() => draft?.feedbackByLang ?? { en: [], no: [] })
  const [uiLang, setUiLang]               = useState(() => draft?.uiLang      ?? 'en')
  const [contentLang, setContentLang]     = useState(() => draft?.contentLang ?? 'en')

  // Job-tailoring variants over the master (null active = Master view).
  const [variants, setVariants]           = useState(() => draft?.variants ?? [])
  const [activeVariantId, setActiveVariantId] = useState(() => draft?.activeVariantId ?? null)
  const [tailorOpen, setTailorOpen]       = useState(false)
  const [tailoring, setTailoring]         = useState(false)
  const [tailorError, setTailorError]     = useState('')

  const [generating, setGenerating]   = useState(false)
  const [translating, setTranslating] = useState(false)
  const [genError, setGenError]       = useState('')
  const [genWarning, setGenWarning]   = useState('')
  const [previewOpen, setPreviewOpen] = useState(false)
  const [hoveredSection, setHoveredSection] = useState(null)
  const [chatChangedSections, setChatChangedSections] = useState(new Set())
  const [showRestored, setShowRestored] = useState(() => draftHasContent(draft))

  // Master slice for the active content language, plus edit metadata & feedback.
  const masterCv = cvByLang[contentLang]
  const meta = metaByLang[contentLang]
  const feedbackItems = feedbackByLang[contentLang]

  // Active job variant and the presented (tailored) CV derived from the master.
  const activeVariant = variants.find(v => v.id === activeVariantId) || null
  const viewCv = deriveTailoredCv(masterCv, activeVariant, contentLang)
  const viewByLang = activeVariant
    ? { en: deriveTailoredCv(cvByLang.en, activeVariant, 'en'), no: deriveTailoredCv(cvByLang.no, activeVariant, 'no') }
    : cvByLang

  const otherLang        = otherOf(contentLang)
  const activeHasContent = cvHasContent(masterCv)
  const otherHasContent  = cvHasContent(cvByLang[otherLang])

  // Debounced autosave — master (both languages), toggles, and variants
  useEffect(() => {
    const t = setTimeout(
      () => saveDraft({ cvByLang, metaByLang, feedbackByLang, uiLang, contentLang, variants, activeVariantId }),
      600
    )
    return () => clearTimeout(t)
  }, [cvByLang, metaByLang, feedbackByLang, uiLang, contentLang, variants, activeVariantId])

  // ── active master-slot setters ──────────────────────────────────────────
  const setActiveCv   = next => setCvByLang(prev => ({ ...prev, [contentLang]: typeof next === 'function' ? next(prev[contentLang]) : next }))
  const setActiveMeta = next => setMetaByLang(prev => ({ ...prev, [contentLang]: typeof next === 'function' ? next(prev[contentLang]) : next }))
  const setActiveFeedback = next => setFeedbackByLang(prev => ({ ...prev, [contentLang]: typeof next === 'function' ? next(prev[contentLang]) : next }))
  const updateActiveVariant = updater => setVariants(prev => prev.map(v => v.id === activeVariantId ? updater(v) : v))

  function dismissChatChange(key) {
    setChatChangedSections(prev => { const n = new Set(prev); n.delete(key); return n })
  }

  async function handleGenerate(files, rawText, directCv = null) {
    // Generation and chat always build the MASTER (facts). applyAiResult
    // normalizes, correlates item ids, and preserves user edits.
    if (directCv) {
      setChatChangedSections(diffCvSections(masterCv, directCv))
      const { cv: nextCv, meta: nextMeta } = applyAiResult(meta, masterCv, directCv)
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
        text = `Current CV data (re-apply and refine):\n${JSON.stringify(stripIds(masterCv), null, 2)}`
      }

      setGenWarning(text.length > PARSE_CHAR_LIMIT
        ? (uiLang === 'no'
            ? `Kildeteksten er på ${text.length.toLocaleString()} tegn — bare de første ${PARSE_CHAR_LIMIT.toLocaleString()} ble brukt. Last opp de mest relevante dokumentene for å unngå at innhold går tapt.`
            : `Source text is ${text.length.toLocaleString()} characters — only the first ${PARSE_CHAR_LIMIT.toLocaleString()} were used. Upload the most relevant documents to avoid losing content.`)
        : '')

      const userEdits = getUserEdits(meta, masterCv)
      const newCv = await parseWithClaude(text, { userEdits, lang: contentLang })
      const { cv: nextCv, meta: nextMeta } = applyAiResult(meta, masterCv, newCv, { keepSections: ['competences'] })
      setActiveCv(nextCv)
      setActiveMeta(nextMeta)
    } catch (err) {
      setGenError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  // Directional, lossless translation of the master (see bilingual design).
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

  // ── master field/structural editing (only reachable in Master view) ─────
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
  function handleStructural(sectionKey, newData) {
    const next = ensureIds({ ...masterCv, [sectionKey]: newData })
    setMetaByLang(prev => ({ ...prev, [contentLang]: remapMeta(prev[contentLang], masterCv, next) }))
    setCvByLang(prev => ({ ...prev, [contentLang]: next }))
  }
  function handleCvTypeChange(type) {
    setCvByLang(prev => ({ en: { ...prev.en, cvType: type }, no: { ...prev.no, cvType: type } }))
  }

  // ── job variants ────────────────────────────────────────────────────────
  async function handleCreateVariant(name, roleText) {
    setTailoring(true)
    setTailorError('')
    try {
      const plan = await tailorCv(masterCv, roleText, contentLang)
      const v = variantFromPlan(masterCv, plan, { name, role: { title: name, text: roleText }, lang: contentLang })
      setVariants(prev => [...prev, v])
      setActiveVariantId(v.id)
      setTailorOpen(false)
    } catch (err) {
      setTailorError(err.message || 'Failed to tailor. Please try again.')
    } finally {
      setTailoring(false)
    }
  }
  function handleDeleteVariant(id) {
    setVariants(prev => prev.filter(v => v.id !== id))
    setActiveVariantId(cur => (cur === id ? null : cur))
  }
  function handleReorder(section, id, dir) {
    const arr = section === 'experience' ? masterCv.experience : (masterCv.competences.items || [])
    updateActiveVariant(v => {
      const base = v.order[section]?.length ? v.order[section] : arr.map(x => x._id)
      const i = base.indexOf(id)
      if (i < 0) return v
      const j = dir === 'up' ? i - 1 : i + 1
      if (j < 0 || j >= base.length) return v
      const next = [...base]; [next[i], next[j]] = [next[j], next[i]]
      return { ...v, order: { ...v.order, [section]: next } }
    })
  }
  function handleToggleExclude(id) {
    updateActiveVariant(v => ({
      ...v,
      excludedIds: v.excludedIds.includes(id) ? v.excludedIds.filter(x => x !== id) : [...v.excludedIds, id],
    }))
  }
  function handleToggleSkillTag(groupId, tag) {
    updateActiveVariant(v => {
      const cur = v.excludedSkillTags[groupId] || []
      const nextTags = cur.includes(tag) ? cur.filter(t => t !== tag) : [...cur, tag]
      const map = { ...v.excludedSkillTags }
      if (nextTags.length) map[groupId] = nextTags; else delete map[groupId]
      return { ...v, excludedSkillTags: map }
    })
  }
  function handleVariantSummary(text) {
    updateActiveVariant(v => ({
      ...v, overrides: { ...v.overrides, [contentLang]: { ...v.overrides[contentLang], summary: text } },
    }))
  }
  function handleVariantExpDesc(id, text) {
    updateActiveVariant(v => {
      const cur = v.overrides[contentLang]
      const expDesc = { ...cur.expDesc }
      if (text) expDesc[id] = text; else delete expDesc[id]
      return { ...v, overrides: { ...v.overrides, [contentLang]: { ...cur, expDesc } } }
    })
  }

  function handleClear() {
    clearDraft()
    setCvByLang({ en: emptyCv(), no: emptyCv() })
    setMetaByLang({ en: emptyMeta(), no: emptyMeta() })
    setFeedbackByLang({ en: [], no: [] })
    setVariants([])
    setActiveVariantId(null)
    setTailorOpen(false)
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

  const baseName = [masterCv.personal.firstName, masterCv.personal.lastName]
    .filter(Boolean).join('_').replace(/\s+/g, '_') || 'CV'
  const filename = activeVariant ? `${baseName}_${slug(activeVariant.name)}` : baseName

  return (
    <div className="app-layout">
      <AppHeader
        cv={masterCv}
        uiLang={uiLang}
        contentLang={contentLang}
        activeHasContent={activeHasContent}
        translating={translating}
        variants={variants}
        activeVariantId={activeVariantId}
        onSelectVariant={setActiveVariantId}
        onOpenTailor={() => { setTailorError(''); setTailorOpen(true) }}
        onDeleteVariant={handleDeleteVariant}
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

      {activeVariant && (
        <div className="variant-notice">
          <span>
            {uiLang === 'no'
              ? `Viser tilpasset versjon «${activeVariant.name}». Rediger fakta i Master.`
              : `Viewing tailored version “${activeVariant.name}”. Edit facts in Master.`}
          </span>
          <button className="variant-notice-btn" onClick={() => setActiveVariantId(null)}>
            {uiLang === 'no' ? 'Til Master' : 'Back to Master'}
          </button>
        </div>
      )}

      <InputPanel
        cv={masterCv}
        lang={contentLang}
        onGenerate={handleGenerate}
        generating={generating}
        error={genError}
        warning={genWarning}
      />

      <main className="cv-main">
        <AgentsBar
          cv={viewCv}
          lang={uiLang}
          reviewLang={contentLang}
          onFeedback={items => setActiveFeedback(prev => [...items, ...prev])}
        />

        <div className="cv-columns">
          {activeVariant ? (
            <TailoringReview
              master={masterCv}
              variant={activeVariant}
              lang={contentLang}
              uiLang={uiLang}
              onToggleExclude={handleToggleExclude}
              onToggleSkillTag={handleToggleSkillTag}
              onSummaryChange={handleVariantSummary}
              onExpDescChange={handleVariantExpDesc}
              onReorder={handleReorder}
            />
          ) : (
            <LeftSidebar
              lang={uiLang}
              feedbackItems={feedbackItems}
              onFeedbackChange={setActiveFeedback}
              onSectionHover={setHoveredSection}
            />
          )}

          <div className={`cv-page${activeVariant ? ' cv-page--locked' : ''}`}>
            <CVEditor
              cv={viewCv}
              lang={contentLang}
              meta={activeVariant ? {} : meta}
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

        {/* In a tailored view the left sidebar is the tailoring panel, so agent
            feedback surfaces here, below the CV. */}
        {activeVariant && (
          <FeedbackStrip items={feedbackItems} lang={uiLang} onChange={setActiveFeedback} />
        )}
      </main>

      {previewOpen && (
        <PreviewModal cv={viewCv} lang={contentLang} onClose={() => setPreviewOpen(false)} />
      )}

      {tailorOpen && (
        <TailorPanel
          lang={uiLang}
          busy={tailoring}
          error={tailorError}
          onCancel={() => { setTailorOpen(false); setTailorError('') }}
          onCreate={handleCreateVariant}
        />
      )}

      <ExportFooter
        cvByLang={viewByLang}
        contentLang={contentLang}
        uiLang={uiLang}
        filename={filename}
        onPreview={() => setPreviewOpen(true)}
      />
    </div>
  )
}
