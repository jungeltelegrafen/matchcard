import { useState } from 'react'
import { copyEmail, downloadEml } from '../lib/exportEmail'
import { exportWord } from '../lib/exportWord'
import { exportPdf } from '../lib/exportPdf'
import { copyWordpress } from '../lib/exportWordpress'
import { copyLinkedin } from '../lib/exportLinkedin'
import { useT } from '../i18n'

// ── Completion scoring ─────────────────────────────────────────────────────
function textGrade(v, short = 40, long = 180) {
  const len = (v || '').trim().length
  if (len === 0) return 0
  if (len < short) return 0.35
  if (len < long) return 0.7
  return 1
}

function computeScore(b) {
  const has = v => Boolean(v?.trim?.() || (Array.isArray(v) && v.filter(Boolean).length > 0))

  const leftFields = [
    b.rolle, b.antallKonsulenter, b.stillingsprosent,
    b.oppstartsdato, b.varighet, b.arbeidslokasjon,
    b.senioritet, b.spraakkrav, b.budsjett,
    b.leveransefristCver, b.soknadsfrist,
  ]
  const leftScore = leftFields.filter(has).length / leftFields.length

  const maHa = (b.maHa || []).filter(Boolean).length
  const centerScores = [
    textGrade(b.kjernenIBehovet, 20, 80),
    textGrade(b.hvaUtlosteBehovet),
    textGrade(b.kundebeskrivelse),
    textGrade(b.prosjektbeskrivelse),
    textGrade(b.teambeskrivelse),
    textGrade(b.arbeidsoppgaver),
    maHa === 0 ? 0 : maHa < 3 ? 0.5 : 1,
    (b.fintAHa || []).filter(Boolean).length > 0 ? 1 : 0,
    has(b.personligeEgenskaper) ? 1 : 0,
    textGrade(b.sellingPoints),
  ]
  const centerScore = centerScores.reduce((a, c) => a + c, 0) / centerScores.length

  const rightFields = [
    b.prosessenVidere, b.andreLeverandorer, b.andreKandidater,
    b.annet, b.generelleNotater, b.tilbudsformat,
  ]
  const rightScore = rightFields.filter(has).length / rightFields.length

  return leftScore * 0.25 + centerScore * 0.5 + rightScore * 0.25
}

// ── Component ──────────────────────────────────────────────────────────────
export default function ExportBar({ brief, lang, apiAvailable, anonymizing, onAnonymize }) {
  const t = useT()
  const [copied,    setCopied]    = useState(false)
  const [emlDone,   setEmlDone]   = useState(false)
  const [wpCopied,  setWpCopied]  = useState(false)
  const [liCopied,  setLiCopied]  = useState(false)
  const [wordBusy,  setWordBusy]  = useState(false)
  const [pdfBusy,   setPdfBusy]   = useState(false)
  const [includeClient, setInclude] = useState(false)

  const opts = { includeClient, lang }
  const score = computeScore(brief)
  const pct   = Math.round(score * 100)

  async function handleCopyEmail() {
    await copyEmail(brief, opts)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }
  async function handleDownloadEml() {
    downloadEml(brief, opts)
    setEmlDone(true); setTimeout(() => setEmlDone(false), 2000)
  }
  async function handleWord() {
    setWordBusy(true)
    try { await exportWord(brief, opts) } finally { setWordBusy(false) }
  }
  async function handlePdf() {
    setPdfBusy(true)
    try { await exportPdf(brief, opts) } finally { setPdfBusy(false) }
  }
  async function handleWordpress() {
    await copyWordpress(brief, opts)
    setWpCopied(true); setTimeout(() => setWpCopied(false), 2000)
  }
  async function handleLinkedin() {
    await copyLinkedin(brief, opts)
    setLiCopied(true); setTimeout(() => setLiCopied(false), 2000)
  }

  const progLabel = pct < 30 ? t.prog0 : pct < 60 ? t.prog1 : pct < 85 ? t.prog2 : t.prog3

  return (
    <div className="no-print flex-shrink-0 border-t border-border bg-card/90 backdrop-blur-sm">

      {/* ── Barometer ────────────────────────────────────────────────────── */}
      <div className="px-6 pt-3 pb-1 flex items-center gap-3">
        <div
          className="flex-1 h-4 rounded-full overflow-hidden"
          style={{ background: '#EDE3D8' }}
          title={`${pct}%`}
        >
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${pct}%`,
              background: pct === 0
                ? 'transparent'
                : 'linear-gradient(to right, #D9CFC7, #7DAACB 50%, #99BC85)',
            }}
          />
        </div>
        <span className="text-[11px] font-semibold tabular-nums" style={{ color: pct >= 80 ? '#99BC85' : pct >= 40 ? '#7DAACB' : '#D9CFC7', minWidth: '3ch' }}>
          {pct}%
        </span>
        <span className="text-[10px] text-tx/60 whitespace-nowrap">{progLabel}</span>
      </div>

      {/* ── Controls + export buttons ─────────────────────────────────────── */}
      <div className="px-6 pb-3 flex items-center gap-3 justify-between">

        {/* Left: toggles */}
        <div className="flex items-center gap-2">
          <label
            className="flex items-center gap-2 cursor-pointer select-none rounded-lg px-3 py-1.5
              bg-[#EDE3D8] hover:bg-[#E3D7C8] border border-border/60 transition-colors"
          >
            <input
              type="checkbox"
              checked={includeClient}
              onChange={e => setInclude(e.target.checked)}
              className="accent-accent w-3.5 h-3.5"
            />
            <span className="text-xs font-medium text-tx">{t.exportClient}</span>
          </label>

          {apiAvailable && (
            <button
              onClick={onAnonymize}
              disabled={anonymizing}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-tx-muted
                bg-[#EDE3D8] hover:bg-[#E3D7C8] border border-border/60
                disabled:opacity-40 transition-colors"
            >
              {anonymizing ? t.anonymising2 : t.anonymise}
            </button>
          )}
        </div>

        {/* Right: export buttons */}
        <div className="flex items-center gap-2">
          <button onClick={handleCopyEmail}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold
              text-tx hover:bg-bg hover:text-primary transition-colors">
            {copied ? t.copied : t.copy}
          </button>
          <button onClick={handleDownloadEml}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold
              text-tx hover:bg-bg hover:text-primary transition-colors">
            {emlDone ? t.downloaded : t.emailBtn}
          </button>

          <div className="h-5 w-px bg-border" />

          <button onClick={handleWordpress}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold
              text-tx hover:bg-bg hover:text-primary transition-colors">
            {wpCopied ? t.copied : '🌐 WordPress'}
          </button>
          <button onClick={handleLinkedin}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold
              text-tx hover:bg-bg hover:text-primary transition-colors">
            {liCopied ? t.copied : '💼 LinkedIn'}
          </button>

          <div className="h-5 w-px bg-border" />

          <button onClick={handleWord} disabled={wordBusy}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold
              text-tx-muted hover:bg-bg hover:text-tx disabled:opacity-50 transition-colors">
            {wordBusy ? t.generating : t.wordBtn}
          </button>
          <button onClick={handlePdf} disabled={pdfBusy}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold
              text-tx-muted hover:bg-bg hover:text-tx disabled:opacity-50 transition-colors">
            {pdfBusy ? t.generating : t.pdfBtn}
          </button>
          <button onClick={() => window.print()}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold
              text-white hover:bg-primary/80 transition-colors">
            {t.printBtn}
          </button>
        </div>
      </div>
    </div>
  )
}
