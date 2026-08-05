import { useState, useEffect, useRef } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import { renderPdfBlob } from '../utils/renderPdf'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).href

// Render the CV PDF to page images with pdf.js and show those, rather than an
// <iframe src=blob> — the iframe relies on the browser's built-in PDF viewer,
// which some browsers disable ("download PDFs instead"), leaving the user with a
// bare "Open" placeholder. Rendering to <img> works everywhere. We still keep the
// blob URL for a full-fidelity "Open in new tab".
export default function PreviewModal({ cv, lang = 'en', branding, onClose }) {
  const [pages, setPages]     = useState([])   // data-URL strings, one per page
  const [blobUrl, setBlobUrl] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const urlRef = useRef(null)

  const no = lang === 'no'

  useEffect(() => {
    let cancelled = false
    setLoading(true); setError(null); setPages([])

    ;(async () => {
      try {
        const blob = await renderPdfBlob(cv, lang, branding)
        if (cancelled) return
        if (urlRef.current) URL.revokeObjectURL(urlRef.current)
        const bu = URL.createObjectURL(blob)
        urlRef.current = bu
        setBlobUrl(bu)

        const buf = await blob.arrayBuffer()
        const pdf = await pdfjsLib.getDocument({ data: buf }).promise
        const scale = Math.min(2, (window.devicePixelRatio || 1) * 1.3)
        const imgs = []
        for (let i = 1; i <= pdf.numPages && !cancelled; i++) {
          const page = await pdf.getPage(i)
          const vp = page.getViewport({ scale })
          const c = document.createElement('canvas')
          c.width = vp.width; c.height = vp.height
          await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise
          imgs.push(c.toDataURL('image/png'))
        }
        if (cancelled) return
        setPages(imgs)
        setLoading(false)
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to generate preview')
          setLoading(false)
        }
      }
    })()

    return () => {
      cancelled = true
      if (urlRef.current) { URL.revokeObjectURL(urlRef.current); urlRef.current = null }
    }
  }, [cv, lang, branding])

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{no ? 'Forhåndsvisning' : 'PDF Preview'}</span>
          <div className="modal-header-actions">
            {blobUrl && (
              <a
                href={blobUrl} target="_blank" rel="noopener noreferrer"
                className="modal-open-tab"
              >
                {no ? 'Åpne i ny fane ↗' : 'Open in new tab ↗'}
              </a>
            )}
            <button className="modal-close" onClick={onClose}>×</button>
          </div>
        </div>
        <div className="modal-body preview-body">
          {loading && (
            <div className="preview-loading">
              <span className="spinner-preview" />
              {no ? 'Lager forhåndsvisning…' : 'Generating preview…'}
            </div>
          )}
          {error && (
            <div className="preview-error">
              {(no ? 'Forhåndsvisningsfeil: ' : 'Preview error: ') + error}
            </div>
          )}
          {!loading && !error && (
            <div className="preview-pages">
              {pages.map((src, i) => (
                <img key={i} src={src} alt={`${no ? 'Side' : 'Page'} ${i + 1}`} className="preview-page" />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
