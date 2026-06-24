import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  BorderStyle, ShadingType,
} from 'docx'
import no from '../i18n/no'
import en from '../i18n/en'

function s(lang) { return lang === 'en' ? en : no }

function d(iso) {
  if (!iso) return ''
  const [y, m, day] = iso.split('-')
  return day ? `${day}.${m}.${y}` : iso
}

function heading1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 120 },
    children: [new TextRun({ text, bold: true, size: 28, color: '1A1A2E' })],
  })
}

function heading2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 80 },
    children: [new TextRun({ text, bold: true, size: 22, color: '7A6F65' })],
  })
}

function body(text, options = {}) {
  if (!text) return null
  return new Paragraph({
    spacing: { after: 120 },
    children: [new TextRun({ text, size: 20, ...options })],
  })
}

function bullet(text, bold = false) {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 60 },
    children: [new TextRun({ text, size: 20, bold })],
  })
}

function logisticsRow(label, value) {
  return new Paragraph({
    spacing: { after: 80, before: 60 },
    children: [
      new TextRun({ text: label + ': ', bold: true, size: 18, color: '7A6F65' }),
      new TextRun({ text: String(value), size: 20, color: '2D2D2D' }),
    ],
  })
}

export async function exportWord(brief, opts = {}) {
  const { includeClient = false, lang = 'no' } = opts
  const t = s(lang)
  const children = []

  children.push(
    new Paragraph({
      spacing: { after: 80 },
      children: [new TextRun({ text: t.docTitle, bold: true, size: 36, color: '1A1A2E' })],
    }),
    new Paragraph({
      spacing: { after: 320 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: 'E8DDD0' } },
      children: [new TextRun({ text: `${t.docRole}: ${brief.rolle || '—'}`, size: 22, color: '7A6F65' })],
    }),
  )

  if (brief.kjernenIBehovet) {
    children.push(
      heading1(t.secKjerne),
      new Paragraph({
        spacing: { after: 240 },
        shading: { type: ShadingType.SOLID, color: 'FDF3EB' },
        children: [new TextRun({ text: brief.kjernenIBehovet, bold: true, size: 24, italics: true, color: '1A1A2E' })],
      }),
    )
  }

  const logisticsRows = [
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

  logisticsRows.forEach(([label, value]) => children.push(logisticsRow(label, value)))

  if (brief.hvaUtlosteBehovet)               { children.push(heading2(t.secBakgrunn),   body(brief.hvaUtlosteBehovet)) }
  if (includeClient && brief.kundebeskrivelse){ children.push(heading2(t.secOmKunden),   body(brief.kundebeskrivelse)) }
  if (brief.prosjektbeskrivelse)             { children.push(heading2(t.secProsjekt),    body(brief.prosjektbeskrivelse)) }
  if (brief.teambeskrivelse)                 { children.push(heading2(t.secTeam),        body(brief.teambeskrivelse)) }
  if (brief.arbeidsoppgaver)                 { children.push(heading2(t.secOppgaver),    body(brief.arbeidsoppgaver)) }

  const maHa    = brief.maHa?.filter(Boolean)   || []
  const fintAHa = brief.fintAHa?.filter(Boolean) || []
  if (maHa.length || fintAHa.length) {
    children.push(heading2(t.secKompetanse))
    if (maHa.length) {
      children.push(body(t.secMaaHa, { bold: true, color: '1A1A2E' }))
      maHa.forEach(k => children.push(bullet(k, true)))
    }
    if (fintAHa.length) {
      children.push(body(t.secFintAaHa, { bold: true, color: '7A6F65' }))
      fintAHa.forEach(k => children.push(bullet(k)))
    }
  }

  if (brief.personligeEgenskaper) { children.push(heading2(t.secPersonlig), body(brief.personligeEgenskaper)) }
  if (brief.sellingPoints)        { children.push(heading2(t.secSelling),   body(brief.sellingPoints)) }

  if (brief.prosessenVidere || brief.andreLeverandorer || brief.andreKandidater) {
    children.push(heading2(t.secSamarbeid))
    if (brief.prosessenVidere)   { children.push(body(t.secProsessen, { bold: true }), body(brief.prosessenVidere)) }
    if (brief.andreLeverandorer) { children.push(body(t.secAndreLev,  { bold: true }), body(brief.andreLeverandorer)) }
    if (brief.andreKandidater)   { children.push(body(t.secAndreKand, { bold: true }), body(brief.andreKandidater)) }
  }

  if (brief.annet)            { children.push(heading2(t.secAnnet),   body(brief.annet)) }
  if (brief.generelleNotater) { children.push(heading2(t.secNotater), body(brief.generelleNotater)) }

  const doc = new Document({
    sections: [{ children: children.filter(Boolean) }],
    styles: {
      default: {
        document: { run: { font: 'Calibri', size: 20, color: '2D2D2D' } },
      },
    },
  })

  const blob = await Packer.toBlob(doc)
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${slugify(t.docTitle)}-${slug(brief.rolle || 'ny')}.docx`
  a.click()
  URL.revokeObjectURL(a.href)
}

function slug(s) {
  return s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 40)
}

function slugify(s) {
  return s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 30)
}
