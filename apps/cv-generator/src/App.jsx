import { useState } from 'react'
import { emptyCvData } from './data/schema'
import { extractText } from './utils/extractText'
import { parseWithClaude } from './utils/parseWithClaude'
import {
  emptyMeta,
  markUserEdit,
  acceptSuggestion,
  dismissSuggestion,
  applyAiResult,
  setValueAtPath,
  getUserEdits,
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
  const [cv, setCv]             = useState(emptyCvData)
  const [meta, setMeta]         = useState(emptyMeta())
  const [lang, setLang]         = useState('en')
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState('')
  const [previewOpen, setPreviewOpen]   = useState(false)
  const [feedbackItems, setFeedbackItems] = useState([])
  const [hoveredSection, setHoveredSection] = useState(null)
  const [chatChangedSections, setChatChangedSections] = useState(new Set())

  function dismissChatChange(key) {
    setChatChangedSections(prev => { const n = new Set(prev); n.delete(key); return n })
  }

  async function handleGenerate(files, rawText, directCv = null) {
    // Chat sends an already-parsed CV directly — diff sections and apply
    if (directCv) {
      const changed = diffCvSections(cv, directCv)
      setChatChangedSections(changed)
      const { cv: nextCv, meta: nextMeta } = applyAiResult(meta, cv, directCv)
      setCv({ ...nextCv, competences: nextCv.competences ?? cv.competences, cvType: cv.cvType })
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
        text = `Current CV data (re-apply and refine):\n${JSON.stringify(cv, null, 2)}`
      }

      const userEdits = getUserEdits(meta, cv)
      const newCv = await parseWithClaude(text, { userEdits, lang })
      const { cv: nextCv, meta: nextMeta } = applyAiResult(meta, cv, newCv)
      setCv({ ...nextCv, competences: cv.competences, cvType: cv.cvType })
      setMeta(nextMeta)
    } catch (err) {
      setGenError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setGenerating(false)
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

  function handleStructural(sectionKey, newData) {
    setCv(prev => ({ ...prev, [sectionKey]: newData }))
  }

  function handleCvTypeChange(type) {
    setCv(prev => ({ ...prev, cvType: type }))
  }

  function handleClear() {
    setCv(emptyCvData)
    setMeta(emptyMeta())
    setFeedbackItems([])
    setChatChangedSections(new Set())
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
      />

      <InputPanel
        cv={cv}
        lang={lang}
        onGenerate={handleGenerate}
        generating={generating}
        error={genError}
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
