import { saveAs } from 'file-saver'
import { renderPdfBlob } from './renderPdf'
import { composeOffer, composeOfferHtml, offerForExport, offerSubject } from './offer'

// The .eml body IS the consultant offer (Tilbudsformat) — the same content as the
// "Email Offer" modal — filled from CV facts + whatever was drafted/edited there.
// Sent as multipart/alternative (a formatted HTML part + a plain-text fallback)
// so Outlook shows the bold/sized formatting. The chosen CV file is attached.
export async function downloadEmail(cv, filename, attachFormat, lang, offer, branding) {
  const [pdfB64, docxB64] = await Promise.all([
    (attachFormat === 'pdf' || attachFormat === 'both') ? getPdfBase64(cv, lang, branding) : Promise.resolve(null),
    (attachFormat === 'docx' || attachFormat === 'both') ? getDocxBase64(cv, lang, branding) : Promise.resolve(null),
  ])

  const attachments = []
  if (pdfB64) attachments.push({ base64: pdfB64, mimeType: 'application/pdf', filename: `${filename}.pdf` })
  if (docxB64) attachments.push({
    base64: docxB64,
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    filename: `${filename}.docx`,
  })

  saveAs(offerEmlBlob(cv, lang, offer, attachments), `${filename}.eml`)
}

function offerEmlBlob(cv, lang, offer, attachments) {
  const exp = offerForExport(offer, cv)
  const eml = buildEml({
    subject: offerSubject(exp, cv, lang),
    text: composeOffer(exp, cv, lang),
    html: composeOfferHtml(exp, cv, lang),
    attachments,
  })
  return new Blob([eml], { type: 'message/rfc822' })
}

// Build an RFC-822 message with a formatted HTML body + plain-text fallback
// (multipart/alternative), optionally wrapped in multipart/mixed for attachments.
function buildEml({ subject, text, html, attachments = [] }) {
  const alt = `----=_alt_${Date.now()}`
  const altBlock = [
    `Content-Type: multipart/alternative; boundary="${alt}"`,
    '',
    `--${alt}`,
    mimeTextPart(text),
    `--${alt}`,
    mimeHtmlPart(html),
    `--${alt}--`,
  ].join('\r\n')

  const headers = [
    'From: ',
    'To: ',
    `Subject: ${subject}`,
    `Date: ${new Date().toUTCString()}`,
    // Tells Outlook/Windows Mail to open this as an unsent DRAFT (a compose window
    // ready to address & send), not a received message. Harmless to clients that
    // ignore it. Note: which app opens a .eml at all is the OS file association,
    // which a downloaded file can't override.
    'X-Unsent: 1',
    'MIME-Version: 1.0',
  ]

  if (!attachments.length) return [...headers, altBlock].join('\r\n')

  const mixed = `----=_mixed_${Date.now()}`
  const parts = [
    `--${mixed}\r\n${altBlock}`,
    ...attachments.map(a => `--${mixed}\r\n${mimeAttachment(a.base64, a.mimeType, a.filename)}`),
    `--${mixed}--`,
  ]
  return [
    ...headers,
    `Content-Type: multipart/mixed; boundary="${mixed}"`,
    '',
    parts.join('\r\n'),
  ].join('\r\n')
}

async function getPdfBase64(cv, lang, branding) {
  const blob = await renderPdfBlob(cv, lang, branding)
  return blobToBase64(blob)
}

async function getDocxBase64(cv, lang, branding) {
  // Dynamically imported so docx code-splits out of the main bundle (only
  // fetched when an email attaches a Word file).
  const { buildDocxBlob } = await import('../renderers/docx/buildDocument')
  const blob = await buildDocxBlob(cv, lang, branding)
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

function mimeHtmlPart(html) {
  return [
    'Content-Type: text/html; charset=utf-8',
    'Content-Transfer-Encoding: base64',
    '',
    base64Utf8(html),
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
