import no from '../i18n/no'
import en from '../i18n/en'

function s(lang) { return lang === 'en' ? en : no }

function d(iso) {
  if (!iso) return ''
  const [y, m, day] = iso.split('-')
  return day ? `${day}.${m}.${y}` : iso
}

function buildText(brief, opts = {}) {
  const { includeClient = false, lang = 'no' } = opts
  const t = s(lang)
  const lines = []

  if (brief.kjernenIBehovet) {
    lines.push(`${t.emailKjerne}\n${brief.kjernenIBehovet}`)
  }

  const logistics = [
    [t.docRole,       brief.rolle],
    [t.secAntall,     brief.antallKonsulenter],
    [t.secStilling,   brief.stillingsprosent],
    [t.secOppstart,   d(brief.oppstartsdato)],
    [t.secVarighet,   brief.varighet],
    [t.secLokasjon,   [brief.onsiteRemote, brief.hybridDetaljer, brief.arbeidslokasjon].filter(Boolean).join(' — ')],
    [t.secSenioritet, brief.senioritet],
    [t.secSpraak,     brief.spraakkrav],
    [t.secBudsjett,   brief.budsjett],
    [t.secLeveranse,  d(brief.leveransefristCver)],
    [t.secSoknad,     d(brief.soknadsfrist)],
  ].filter(([, v]) => v)

  if (logistics.length) {
    lines.push(logistics.map(([k, v]) => `${k}: ${v}`).join('\n'))
  }

  if (brief.hvaUtlosteBehovet)                    lines.push(`${t.emailBakgrunn}\n${brief.hvaUtlosteBehovet}`)
  if (includeClient && brief.kundebeskrivelse)     lines.push(`${t.emailOmKunden}\n${brief.kundebeskrivelse}`)
  if (brief.prosjektbeskrivelse)                   lines.push(`${t.emailProsjekt}\n${brief.prosjektbeskrivelse}`)
  if (brief.teambeskrivelse)                       lines.push(`${t.emailTeam}\n${brief.teambeskrivelse}`)
  if (brief.arbeidsoppgaver)                       lines.push(`${t.emailOppgaver}\n${brief.arbeidsoppgaver}`)

  if (brief.maHa?.length) {
    lines.push(`${t.emailMaaHa}\n` + brief.maHa.filter(Boolean).map((k, i) => `${i + 1}. ${k}`).join('\n'))
  }
  if (brief.fintAHa?.length) {
    lines.push(`${t.emailFintAaHa}\n` + brief.fintAHa.filter(Boolean).map(k => `• ${k}`).join('\n'))
  }

  if (brief.personligeEgenskaper) lines.push(`${t.emailPersonlig}\n${brief.personligeEgenskaper}`)
  if (brief.sellingPoints)        lines.push(`${t.emailSelling}\n${brief.sellingPoints}`)
  if (brief.prosessenVidere)      lines.push(`${t.emailProsessen}\n${brief.prosessenVidere}`)
  if (brief.andreLeverandorer)    lines.push(`${t.emailAndreLev}\n${brief.andreLeverandorer}`)
  if (brief.andreKandidater)      lines.push(`${t.emailAndreKand}\n${brief.andreKandidater}`)
  if (brief.tilbudsformat)        lines.push(`${t.emailTilbud}\n${brief.tilbudsformat}`)
  if (brief.annet)                lines.push(`${t.emailAnnet}\n${brief.annet}`)
  if (brief.generelleNotater)     lines.push(`${t.emailNotater}\n${brief.generelleNotater}`)

  return lines.join('\n\n')
}

export function copyEmail(brief, opts) {
  return navigator.clipboard.writeText(buildText(brief, opts))
}

export function downloadEml(brief, opts = {}) {
  const { lang = 'no' } = opts
  const t = s(lang)
  const subject = t.emailSubject(brief.rolle)
  const body = buildText(brief, opts)
  const content = `Subject: ${subject}\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n${body}`
  const blob = new Blob([content], { type: 'message/rfc822' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${slug(brief.rolle || 'behov')}.eml`
  a.click()
  URL.revokeObjectURL(a.href)
}

function slug(s) {
  return s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 40)
}
