import React from 'react'
import { pdf } from '@react-pdf/renderer'
import CVDocument from '../renderers/pdf/CVDocument'

// All PDF generation goes through this queue. @react-pdf/layout lazily loads
// its yoga WASM engine with a check-then-await race: two concurrent first
// renders each instantiate yoga, the second overwrites the first, and layout
// fails with "Expected null or instance of Config, got an instance of Config"
// (easily triggered by React StrictMode double-running effects in dev).
// Serializing render calls guarantees a single yoga instance.
let queue = Promise.resolve()

export function renderPdfBlob(cv, lang) {
  const task = queue.then(() =>
    pdf(React.createElement(CVDocument, { data: cv, lang })).toBlob()
  )
  queue = task.catch(() => {})
  return task
}
