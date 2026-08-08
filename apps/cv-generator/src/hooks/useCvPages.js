import { useRef, useEffect } from 'react'
import { renderPdfBlob } from '../utils/renderPdf'
import { loadPdfjs } from '../utils/videoStudioCore'

// Rasterizes the CV's exported PDF into per-page <canvas>es for the walkthrough
// composite. `scale` trades sharpness for memory (desktop uses 2, mobile 1.5);
// `maxPages` caps the work on low-RAM phones. `enabled` defers the (heavy) render
// until a mode actually needs it. Returns a ref to the page canvases, read each
// frame by the draw loop. Clears the ref on teardown so the bitmaps can be GC'd
// (iOS caps canvas memory tightly).
export function useCvPages(cv, lang, branding, { scale = 2, maxPages = Infinity, enabled = true } = {}) {
  const pagesRef = useRef([])

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    ;(async () => {
      try {
        const blob = await renderPdfBlob(cv, lang, branding)
        if (cancelled) return
        const buf = await blob.arrayBuffer()
        const pdfjsLib = await loadPdfjs()
        if (cancelled) return
        const pdf = await pdfjsLib.getDocument({ data: buf }).promise
        const n = Math.min(pdf.numPages, maxPages)
        const pages = []
        for (let i = 1; i <= n && !cancelled; i++) {
          const page = await pdf.getPage(i)
          const vp = page.getViewport({ scale })
          const c = document.createElement('canvas')
          c.width = vp.width; c.height = vp.height
          await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise
          pages.push(c)
        }
        if (cancelled) return
        pagesRef.current = pages
      } catch { /* composite falls back to camera-only if page render fails */ }
    })()
    return () => { cancelled = true; pagesRef.current = [] }
  }, [cv, lang, branding, scale, maxPages, enabled])

  return pagesRef
}
