import { useState, useEffect, useRef } from 'react'
import React from 'react'
import { pdf } from '@react-pdf/renderer'
import CVDocument from '../renderers/pdf/CVDocument'

export default function PreviewModal({ cv, lang = 'en', onClose }) {
  const [url, setUrl]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState(null)
  const urlRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    pdf(React.createElement(CVDocument, { data: cv, lang }))
      .toBlob()
      .then(blob => {
        if (cancelled) return
        if (urlRef.current) URL.revokeObjectURL(urlRef.current)
        const newUrl = URL.createObjectURL(blob)
        urlRef.current = newUrl
        setUrl(newUrl)
        setLoading(false)
      })
      .catch(err => {
        if (!cancelled) {
          setError(err.message || 'Failed to generate preview')
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current)
        urlRef.current = null
      }
    }
  }, [cv, lang])

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">PDF Preview</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {loading && (
            <div className="preview-loading">
              <span className="spinner-preview" />
              Generating preview…
            </div>
          )}
          {error && (
            <div className="preview-error">Preview error: {error}</div>
          )}
          {url && !loading && (
            <iframe
              src={url}
              width="100%"
              height="100%"
              title="CV Preview"
              style={{ border: 'none', display: 'block' }}
            />
          )}
        </div>
      </div>
    </div>
  )
}
