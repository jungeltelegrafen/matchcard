import no from '../i18n/no'
import en from '../i18n/en'

function s(lang) { return lang === 'en' ? en : no }

function d(iso) {
  if (!iso) return ''
  const [y, m, day] = iso.split('-')
  return day ? `${day}.${m}.${y}` : iso
}

export function buildLinkedinPost(brief, opts = {}) {
  const { lang = 'no' } = opts
  const t = s(lang)
  const lines = []

  lines.push(t.linkedinIntro(brief.rolle))
  lines.push('')

  if (brief.kjernenIBehovet) {
    lines.push(brief.kjernenIBehovet)
    lines.push('')
  }

  const bullets = []
  if (brief.arbeidslokasjon || brief.onsiteRemote) {
    const loc = [brief.onsiteRemote, brief.hybridDetaljer, brief.arbeidslokasjon].filter(Boolean).join(' · ')
    if (loc) bullets.push(`📍 ${loc}`)
  }
  if (brief.oppstartsdato)    bullets.push(`🗓️ ${t.linkedinOppstart}: ${d(brief.oppstartsdato)}`)
  if (brief.varighet)         bullets.push(`⏱️ ${t.linkedinVarighet}: ${brief.varighet}`)
  if (brief.stillingsprosent) bullets.push(`💼 ${t.linkedinStilling}: ${brief.stillingsprosent}`)
  if (brief.soknadsfrist)     bullets.push(`⏰ ${t.linkedinSoknad}: ${d(brief.soknadsfrist)}`)

  if (bullets.length) {
    lines.push(...bullets)
    lines.push('')
  }

  const maHa = brief.maHa?.filter(Boolean) || []
  if (maHa.length) {
    lines.push(t.linkedinSerEtter)
    maHa.slice(0, 4).forEach(k => lines.push(`✅ ${k}`))
    lines.push('')
  }

  if (brief.sellingPoints) {
    lines.push(brief.sellingPoints)
    lines.push('')
  }

  lines.push(t.linkedinTaKontakt)

  if (brief.webUrl) {
    lines.push('')
    lines.push(brief.webUrl)
  }

  lines.push('')
  lines.push(t.linkedinTags)

  return lines.join('\n')
}

export function copyLinkedin(brief, opts) {
  return navigator.clipboard.writeText(buildLinkedinPost(brief, opts))
}
