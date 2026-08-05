// The "Tilbudsformat" — a short, standardized consultant offer a recruiter can
// paste into an email fast. Stored per content language (offerByLang). Factual
// header fields pre-fill from the CV; the Relevance teaser + keywords + a
// suggested seniority are AI-drafted; hourlyRate/capacity/generalInfo are manual.

import { getL } from './labels'

const OFFER_FIELDS = [
  'role', 'location', 'availableFrom', 'hourlyRate', 'seniority',
  'capacity', 'workMode', 'languages', 'relevance', 'keywords', 'generalInfo',
]

export function emptyOffer() {
  return {
    role: '', location: '', availableFrom: '', hourlyRate: '', seniority: '',
    capacity: '', workMode: '', languages: '', relevance: '', keywords: [],
    generalInfo: '', generated: false,
  }
}

// Coerce a persisted/unknown value into a full-shape offer.
export function normalizeOffer(raw) {
  const o = emptyOffer()
  if (!raw || typeof raw !== 'object') return o
  for (const k of OFFER_FIELDS) {
    if (k === 'keywords') {
      o.keywords = Array.isArray(raw.keywords)
        ? raw.keywords.filter(x => typeof x === 'string' && x.trim())
        : (typeof raw.keywords === 'string' ? raw.keywords.split(',').map(s => s.trim()).filter(Boolean) : [])
    } else if (typeof raw[k] === 'string') {
      o[k] = raw[k]
    }
  }
  o.generated = !!raw.generated
  return o
}

// Pull the factual header fields straight from the CV (no AI). Returns a partial
// offer patch. Languages join "Language (Proficiency)".
export function factsFromCv(cv) {
  const p = cv?.personal || {}
  const langs = (cv?.languages || [])
    .filter(l => l?.language?.trim())
    .map(l => (l.proficiency?.trim() ? `${l.language} (${l.proficiency})` : l.language))
    .join(', ')
  const currentEmployer = cv?.experience?.find(e => e?.company?.trim())?.company || ''
  return {
    role: p.title || '',
    location: p.location || '',
    availableFrom: p.availableFrom || '',
    workMode: p.workPreference || '',
    languages: langs,
    currentEmployer, // used only to pre-seed generalInfo, not a stored field
  }
}

// Merge live CV facts into any blank factual fields, so an export composes a
// complete header even if the offer modal was never opened. Narrative fields
// (relevance/keywords/seniority) stay as-is (blank until AI-drafted in the modal).
export function offerForExport(offer, cv) {
  const o = offer || emptyOffer()
  const f = factsFromCv(cv)
  return {
    ...o,
    role:          o.role          || f.role,
    location:      o.location      || f.location,
    availableFrom: o.availableFrom || f.availableFrom,
    workMode:      o.workMode      || f.workMode,
    languages:     o.languages     || f.languages,
    generalInfo:   o.generalInfo   || f.currentEmployer,
  }
}

const candidateName = cv =>
  [cv?.personal?.firstName, cv?.personal?.lastName].filter(Boolean).join(' ').trim()

// Standardized email subject used by BOTH the offer modal and the email export:
// "Consultant proposal: Name - Title".
const PROPOSAL_WORD = {
  en: 'Consultant proposal', no: 'Konsulentforslag', sv: 'Konsultförslag',
  da: 'Konsulentforslag', es: 'Propuesta de consultor', pl: 'Propozycja konsultanta',
}
export function offerSubject(offer, cv, lang = 'en') {
  const name = candidateName(cv)
  const title = String(offer?.role || cv?.personal?.title || '').trim()
  const word = PROPOSAL_WORD[lang] || PROPOSAL_WORD.en
  const tail = [name, title].filter(Boolean).join(' - ')
  return tail ? `${word}: ${tail}` : word
}

const escHtml = s => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// HTML version of the offer for rich email (Outlook draft / rich clipboard):
// the name is bold and 2pt larger; each data label is bold with a NON-bold value
// after it. Every labelled line ends outside the <strong>, so when the user
// clicks after a label to type, the cursor is already in normal (unbolded) text —
// no need to switch bold off first.
export function composeOfferHtml(offer, cv, lang = 'en') {
  const lb = getL(lang)
  const name = candidateName(cv) || (lb.offerFormat || 'Offer')
  const kw = Array.isArray(offer.keywords) ? offer.keywords.filter(Boolean).join(', ') : ''

  const row = (label, val) =>
    `<div style="margin:0 0 2px;"><strong>${escHtml(label)}:</strong> ${escHtml(val || '')}</div>`

  const header = [
    [lb.offerRole,          offer.role],
    [lb.offerLocation,      offer.location],
    [lb.offerAvailableFrom, offer.availableFrom],
    [lb.offerHourlyRate,    offer.hourlyRate],
    [lb.offerSeniority,     offer.seniority],
    [lb.offerCapacity,      offer.capacity],
    [lb.offerWorkMode,      offer.workMode],
    [lb.offerLanguages,     offer.languages],
  ].map(([l, v]) => row(l, v)).join('')

  const relevance = [escHtml(offer.relevance || ''), escHtml(kw)].filter(Boolean).join('<br>')

  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:11pt;line-height:1.5;color:#111;">
<div style="font-weight:bold;font-size:13pt;margin:0 0 10px;">${escHtml(name)}</div>
${header}
<div style="margin:12px 0 2px;"><strong>${escHtml(lb.offerRelevance)}:</strong></div>
<div style="margin:0;">${relevance || '&nbsp;'}</div>
<div style="margin:12px 0 2px;"><strong>${escHtml(lb.offerGeneralInfo)}:</strong></div>
<div style="margin:0;">${escHtml(offer.generalInfo || '') || '&nbsp;'}</div>
</div>`
}

// Compose the localized plain-text offer for copy / email export. Empty fields
// still render their label (a blank the recruiter can fill after pasting).
export function composeOffer(offer, cv, lang = 'en') {
  const lb = getL(lang)
  const name = candidateName(cv) || (lb.offerFormat || 'Offer')
  const kw = Array.isArray(offer.keywords) ? offer.keywords.filter(Boolean).join(', ') : ''

  const header = [
    [lb.offerRole,          offer.role],
    [lb.offerLocation,      offer.location],
    [lb.offerAvailableFrom, offer.availableFrom],
    [lb.offerHourlyRate,    offer.hourlyRate],
    [lb.offerSeniority,     offer.seniority],
    [lb.offerCapacity,      offer.capacity],
    [lb.offerWorkMode,      offer.workMode],
    [lb.offerLanguages,     offer.languages],
  ].map(([label, val]) => `${label}: ${val || ''}`).join('\n')

  const relevance = [offer.relevance, kw].filter(Boolean).join('\n')

  return [
    name,
    header,
    '',
    `${lb.offerRelevance}:`,
    relevance,
    '',
    `${lb.offerGeneralInfo}:`,
    offer.generalInfo || '',
  ].join('\n')
}
