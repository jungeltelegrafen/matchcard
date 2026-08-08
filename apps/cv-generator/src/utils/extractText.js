import { loadPdfjs } from './videoStudioCore'

// pdfjs and mammoth are heavy and only needed when a user actually uploads a
// PDF/DOCX. They're loaded on demand (pdfjs via the shared loadPdfjs singleton,
// mammoth via dynamic import) so they code-split out of the main bundle.
export async function extractText(file) {
  const ext = file.name.split('.').pop().toLowerCase()

  if (ext === 'pdf' || file.type === 'application/pdf') {
    return extractPdfText(file)
  }
  if (ext === 'docx') {
    return extractDocxText(file)
  }
  if (ext === 'txt' || file.type === 'text/plain') {
    return file.text()
  }
  throw new Error(`Unsupported file type: .${ext}. Please upload a PDF, DOCX, or TXT file.`)
}

async function extractPdfText(file) {
  const pdfjsLib = await loadPdfjs()
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const pages = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const lines = content.items.map(item => item.str).join(' ')
    pages.push(lines)
  }
  return pages.join('\n')
}

async function extractDocxText(file) {
  const { default: mammoth } = await import('mammoth')
  const arrayBuffer = await file.arrayBuffer()
  const result = await mammoth.extractRawText({ arrayBuffer })
  return result.value
}
