import jsPDF from 'jspdf'
import no from '../i18n/no'
import en from '../i18n/en'

function s(lang) { return lang === 'en' ? en : no }

function d(iso) {
  if (!iso) return ''
  const [y, m, day] = iso.split('-')
  return day ? `${day}.${m}.${y}` : iso
}

export function exportPdf(brief, opts = {}) {
  const { includeClient = false, lang = 'no' } = opts
  const t = s(lang)

  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const ml = 18
  const pw = 174
  let y = 22

  function newPage() { doc.addPage(); y = 22 }
  function gap(mm = 4) { y += mm }
  function ensure(mm) { if (y + mm > 282) newPage() }

  function setStyle(size, style, r, g, b) {
    doc.setFontSize(size)
    doc.setFont('helvetica', style)
    doc.setTextColor(r, g, b)
  }

  function section(label) {
    ensure(10)
    setStyle(7.5, 'bold', 180, 160, 140)
    doc.text(label.toUpperCase(), ml, y)
    y += 4.5
  }

  function para(text, size = 10, style = 'normal', r = 45, g = 45, b = 45) {
    if (!text) return
    ensure(7)
    setStyle(size, style, r, g, b)
    const lines = doc.splitTextToSize(text, pw)
    lines.forEach(line => { ensure(5); doc.text(line, ml, y); y += 5 })
  }

  function kv(label, value) {
    if (!value) return
    ensure(6)
    setStyle(8.5, 'bold', 122, 111, 101)
    doc.text(label + ':', ml, y)
    setStyle(9, 'normal', 45, 45, 45)
    const lines = doc.splitTextToSize(String(value), pw - 56)
    doc.text(lines, ml + 56, y)
    y += Math.max(lines.length * 4.5, 5) + 1.5
  }

  function divider() {
    ensure(5)
    doc.setDrawColor(232, 221, 208)
    doc.line(ml, y, ml + pw, y)
    y += 5
  }

  // ── Title ─────────────────────────────────────────────────────────────────
  setStyle(18, 'bold', 26, 26, 46)
  doc.text(t.docTitle, ml, y); y += 7
  if (brief.rolle) {
    setStyle(10, 'normal', 122, 111, 101)
    doc.text(`${t.docRole}: ${brief.rolle}`, ml, y); y += 5
  }
  divider()

  // ── Kjernen ────────────────────────────────────────────────────────────────
  if (brief.kjernenIBehovet) {
    section(t.secKjerne)
    para(brief.kjernenIBehovet, 11, 'bolditalic', 201, 123, 75)
    gap(); divider()
  }

  // ── Logistikk ──────────────────────────────────────────────────────────────
  const logRows = [
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

  if (logRows.length) {
    logRows.forEach(([l, v]) => kv(l, v))
    gap(); divider()
  }

  // ── Tekstseksjoner ─────────────────────────────────────────────────────────
  ;[
    [t.secBakgrunn,  brief.hvaUtlosteBehovet],
    [t.secOmKunden,  includeClient ? brief.kundebeskrivelse : null],
    [t.secProsjekt,  brief.prosjektbeskrivelse],
    [t.secTeam,      brief.teambeskrivelse],
    [t.secOppgaver,  brief.arbeidsoppgaver],
  ].forEach(([label, val]) => {
    if (!val) return
    section(label); para(val); gap()
  })

  // ── Kompetansekrav ─────────────────────────────────────────────────────────
  const maHa    = brief.maHa?.filter(Boolean)   || []
  const fintAHa = brief.fintAHa?.filter(Boolean) || []
  if (maHa.length || fintAHa.length) {
    section(t.secKompetanse)
    if (maHa.length) {
      para(t.secMaaHa, 9, 'bold', 45, 45, 45)
      maHa.forEach(k => para('• ' + k))
    }
    if (fintAHa.length) {
      gap(2)
      para(t.secFintAaHa, 9, 'bold', 45, 45, 45)
      fintAHa.forEach(k => para('• ' + k))
    }
    gap()
  }

  if (brief.personligeEgenskaper) { section(t.secPersonlig); para(brief.personligeEgenskaper); gap() }
  if (brief.sellingPoints)        { section(t.secSelling);   para(brief.sellingPoints); gap() }

  if (brief.prosessenVidere || brief.andreLeverandorer || brief.andreKandidater) {
    section(t.secSamarbeid)
    if (brief.prosessenVidere)   { para(t.secProsessen, 9, 'bold'); para(brief.prosessenVidere) }
    if (brief.andreLeverandorer) { para(t.secAndreLev,  9, 'bold'); para(brief.andreLeverandorer) }
    if (brief.andreKandidater)   { para(t.secAndreKand, 9, 'bold'); para(brief.andreKandidater) }
    gap()
  }

  if (brief.annet)            { section(t.secAnnet);   para(brief.annet);   gap() }
  if (brief.generelleNotater) { section(t.secNotater); para(brief.generelleNotater) }

  doc.save(`${slug(t.docTitle)}-${slug(brief.rolle || 'ny')}.pdf`)
}

function slug(s) {
  return s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 30)
}
