import { saveAs } from 'file-saver'
import { renderPdfBlob } from './renderPdf'
import { buildDocxBlob } from '../renderers/docx/buildDocument'
import { composeOffer, offerForExport } from './offer'

// The .eml body IS the consultant offer (Tilbudsformat) — the same text as the
// "Email Offer" modal — filled from CV facts + whatever was drafted/edited there.
// The chosen CV file is attached (PDF/Word/both).
export async function downloadEmail(cv, filename, attachFormat, lang, offer) {
  const [pdfB64, docxB64] = await Promise.all([
    (attachFormat === 'pdf' || attachFormat === 'both') ? getPdfBase64(cv, lang) : Promise.resolve(null),
    (attachFormat === 'docx' || attachFormat === 'both') ? getDocxBase64(cv, lang) : Promise.resolve(null),
  ])

  const name = [cv.personal.firstName, cv.personal.lastName].filter(Boolean).join(' ') || 'Candidate'
  const exp = offerForExport(offer, cv)
  const body = composeOffer(exp, cv, lang)
  const subject = exp.role || name // the consultant's title/role
  const boundary = `----=_CVGen_${Date.now()}`

  const parts = [mimeTextPart(body)]

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
    `Subject: ${subject}`,
    `Date: ${new Date().toUTCString()}`,
    // Tells Outlook/Windows Mail to open this as an unsent DRAFT (a compose
    // window ready to address & send), not a received message. Harmless to
    // clients that ignore it. Note: which app opens a .eml at all is decided by
    // the OS file association, which a downloaded file can't override.
    'X-Unsent: 1',
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
