import React from 'react'

// All PDF generation goes through this queue. @react-pdf/layout lazily loads
// its yoga WASM engine with a check-then-await race: two concurrent first
// renders each instantiate yoga, the second overwrites the first, and layout
// fails with "Expected null or instance of Config, got an instance of Config"
// (easily triggered by React StrictMode double-running effects in dev).
// Serializing render calls guarantees a single yoga instance.
//
// @react-pdf/renderer (~heavy) and the CV document tree are DYNAMICALLY imported
// here so they code-split into their own chunk — the main bundle stays small and
// only pays for the PDF engine when someone previews/exports/records a
// walkthrough. This module itself is light, so every caller can import it eagerly.
let queue = Promise.resolve()

export function renderPdfBlob(cv, lang, branding) {
  const task = queue.then(async () => {
    const [{ pdf }, { default: CVDocument }] = await Promise.all([
      import('@react-pdf/renderer'),
      import('../renderers/pdf/CVDocument'),
    ])
    return pdf(React.createElement(CVDocument, { data: cv, lang, branding })).toBlob()
  })
  queue = task.catch(() => {})
  return task
}
