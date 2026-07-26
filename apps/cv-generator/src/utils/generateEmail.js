import { saveAs } from 'file-saver'
import { renderPdfBlob } from './renderPdf'
import { buildDocxBlob } from '../renderers/docx/buildDocument'
import { generateEmailSummary } from './parseWithClaude'

export async function downloadEmail(cv, filename, attachFormat, lang) {
  const [summary, pdfB64, docxB64] = await Promise.all([
    generateEmailSummary(cv, lang),
    (attachFormat === 'pdf' || attachFormat === 'both') ? getPdfBase64(cv, lang) : Promise.resolve(null),
    (attachFormat === 'docx' || attachFormat === 'both') ? getDocxBase64(cv, lang) : Promise.resolve(null),
  ])

  const name = [cv.personal.firstName, cv.personal.lastName].filter(Boolean).join(' ') || 'Candidate'
  const boundary = `----=_CVGen_${Date.now()}`

  const parts = [mimeTextPart(summary)]

  if (pdfB64) {
    parts.push(mimeAttachment(pdfB64, 'application/pdf', `${filename}.pdf`))
  }
  if (docxB64) {
    parts.push(mimeAttachment(
      docxB64,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      `${filename}.docx`,
    ))
  }

  const eml = [
    'From: ',
    'To: ',
    `Subject: CV – ${name}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    parts.map(p => `--${boundary}\r\n${p}`).join('\r\n'),
    `--${boundary}--`,
  ].join('\r\n')

  saveAs(new Blob([eml], { type: 'message/rfc822' }), `${filename}.eml`)
}

async function getPdfBase64(cv, lang) {
  const blob = await renderPdfBlob(cv, lang)
  return blobToBase64(blob)
}

async function getDocxBase64(cv, lang) {
  const blob = await buildDocxBlob(cv, lang)
  return blobToBase64(blob)
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

// Base64 (UTF-8) so non-ASCII summaries — e.g. Norwegian æ/ø/å — survive intact.
// (Declaring quoted-printable while emitting raw text corrupts those in strict
// clients.) Attachments below already use base64 for the same reason.
function base64Utf8(str) {
  const bytes = new TextEncoder().encode(str)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin)
}

function mimeTextPart(text) {
  return [
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: base64',
    '',
    base64Utf8(text),
  ].join('\r\n')
}

function mimeAttachment(base64, mimeType, filename) {
  return [
    `Content-Type: ${mimeType}; name="${filename}"`,
    'Content-Transfer-Encoding: base64',
    `Content-Disposition: attachment; filename="${filename}"`,
    '',
    base64,
  ].join('\r\n')
}
