import no from '../i18n/no'
import en from '../i18n/en'

function s(lang) { return lang === 'en' ? en : no }

function d(iso) {
  if (!iso) return ''
  const [y, m, day] = iso.split('-')
  return day ? `${day}.${m}.${y}` : iso
}

function esc(str) {
  return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function ul(items) {
  const filtered = (items || []).filter(Boolean)
  if (!filtered.length) return ''
  return '<ul>\n' + filtered.map(i => `<li>${esc(i)}</li>`).join('\n') + '\n</ul>\n'
}

function p(text) {
  return text ? `<p>${esc(text)}</p>\n` : ''
}

export function buildWordpressHtml(brief, opts = {}) {
  const { includeClient = false, lang = 'no' } = opts
  const t = s(lang)
  const parts = []

  if (brief.rolle) {
    parts.push(`<h1>${esc(brief.rolle)}</h1>\n`)
  }

  if (brief.kjernenIBehovet) {
    parts.push(`<h2>${esc(t.wpKjerne)}</h2>\n${p(brief.kjernenIBehovet)}`)
  }

  const logistics = [
    [t.wpAntall,     brief.antallKonsulenter],
    [t.wpStilling,   brief.stillingsprosent],
    [t.wpOppstart,   d(brief.oppstartsdato)],
    [t.wpVarighet,   brief.varighet],
    [t.wpLokasjon,   [brief.onsiteRemote, brief.hybridDetaljer, brief.arbeidslokasjon].filter(Boolean).join(' – ')],
    [t.wpSenioritet, brief.senioritet],
    [t.wpSpraak,     brief.spraakkrav],
    [t.wpSoknad,     d(brief.soknadsfrist)],
  ].filter(([, v]) => v)

  if (logistics.length) {
    parts.push('<ul>\n')
    logistics.forEach(([k, v]) => {
      parts.push(`<li><strong>${esc(k)}:</strong> ${esc(String(v))}</li>\n`)
    })
    parts.push('</ul>\n')
  }

  if (brief.hvaUtlosteBehovet) {
    parts.push(`<h2>${esc(t.wpBakgrunn)}</h2>\n${p(brief.hvaUtlosteBehovet)}`)
  }
  if (includeClient && brief.kundebeskrivelse) {
    parts.push(`<h2>${esc(t.wpOmKunden)}</h2>\n${p(brief.kundebeskrivelse)}`)
  }
  if (brief.prosjektbeskrivelse) {
    parts.push(`<h2>${esc(t.wpProsjekt)}</h2>\n${p(brief.prosjektbeskrivelse)}`)
  }
  if (brief.teambeskrivelse) {
    parts.push(`<h2>${esc(t.wpTeam)}</h2>\n${p(brief.teambeskrivelse)}`)
  }
  if (brief.arbeidsoppgaver) {
    parts.push(`<h2>${esc(t.wpOppgaver)}</h2>\n${p(brief.arbeidsoppgaver)}`)
  }

  const maHa    = brief.maHa?.filter(Boolean)   || []
  const fintAHa = brief.fintAHa?.filter(Boolean) || []
  if (maHa.length || fintAHa.length) {
    parts.push(`<h2>${esc(t.wpKompetanse)}</h2>\n`)
    if (maHa.length)    parts.push(`<h3>${esc(t.wpMaaHa)}</h3>\n`    + ul(maHa))
    if (fintAHa.length) parts.push(`<h3>${esc(t.wpFintAaHa)}</h3>\n` + ul(fintAHa))
  }

  if (brief.personligeEgenskaper) {
    parts.push(`<h2>${esc(t.wpPersonlig)}</h2>\n${p(brief.personligeEgenskaper)}`)
  }
  if (brief.sellingPoints) {
    parts.push(`<h2>${esc(t.wpSelling)}</h2>\n${p(brief.sellingPoints)}`)
  }
  if (brief.webUrl) {
    parts.push(`<p><a href="${esc(brief.webUrl)}" target="_blank" rel="noopener noreferrer">${esc(t.wpLink)}</a></p>\n`)
  }

  return parts.join('')
}

export function copyWordpress(brief, opts) {
  return navigator.clipboard.writeText(buildWordpressHtml(brief, opts))
}
