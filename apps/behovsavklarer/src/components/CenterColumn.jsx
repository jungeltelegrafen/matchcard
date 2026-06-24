import { useState } from 'react'
import InlineField from './InlineField'
import ListField from './ListField'
import { useT } from '../i18n'

function dotStyle(f) {
  const base = { width: 6, height: 6, borderRadius: '50%', flexShrink: 0, transition: 'background 0.4s' }
  if (f === 0)  return { ...base, background: 'transparent', border: '1.5px solid #D9CFC7' }
  if (f < 0.4) return { ...base, background: '#D9CFC7' }
  if (f < 0.8) return { ...base, background: '#7DAACB' }
  return          { ...base, background: '#99BC85' }
}

function textFill(v, short = 40, long = 180) {
  const s = (v || '').trim().length
  if (!s) return 0
  if (s < short) return 0.3
  if (s < long)  return 0.65
  return 1
}

export default function CenterColumn({
  brief, setField, pendingFill, onAccept, onReject,
  enrichAvailable, onEnrich,
}) {
  const t = useT()
  const [enrichName,  setEnrichName]  = useState('')
  const [enriching,   setEnriching]   = useState(false)
  const [enrichError, setEnrichError] = useState('')

  function f(key) {
    return {
      value: brief[key],
      onChange: v => setField(key, v),
      suggestion: pendingFill?.[key],
      onAccept: () => onAccept(key),
      onReject: () => onReject(key),
    }
  }

  async function runEnrich() {
    const name = enrichName.trim()
    if (!name) return
    setEnriching(true)
    setEnrichError('')
    try {
      await onEnrich(name)
      setEnrichName('')
    } catch (e) {
      setEnrichError(e.message)
    } finally {
      setEnriching(false)
    }
  }

  const sellingFill = textFill(brief.sellingPoints)
  const sectionHeading = 'text-[10px] font-semibold uppercase tracking-widest text-tx'

  return (
    <main className="flex-1 border-r border-border bg-card p-6 space-y-8 overflow-y-scroll print-col">

      {/* ⭐ Kjernen i behovet */}
      <section className="rounded-xl bg-accent-light/60 p-5 space-y-2" style={{ border: '1px solid rgba(201, 123, 75, 0.2)' }}>
        <label className="text-[11px] font-bold uppercase tracking-widest text-accent flex items-center gap-1.5">
          <span>⭐</span> {t.kjernen}
        </label>
        <textarea
          value={brief.kjernenIBehovet}
          onChange={e => setField('kjernenIBehovet', e.target.value)}
          rows={3}
          placeholder={t.kjernenPlaceholder}
          className="w-full rounded-lg border border-accent/20 bg-white/70 px-4 py-3 text-[15px] font-medium text-tx
            placeholder:text-tx-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/40 resize-none leading-relaxed"
        />
        {pendingFill?.kjernenIBehovet && (
          <div className="flex items-start gap-2 rounded-lg border border-accent/30 bg-white/80 p-2 text-xs">
            <span className="flex-1 text-tx">
              <span className="font-semibold text-accent">{t.aiLabel}</span> {pendingFill.kjernenIBehovet}
            </span>
            <button onClick={() => onAccept('kjernenIBehovet')} className="whitespace-nowrap font-semibold text-accent hover:text-accent/70">{t.bruk}</button>
            <button onClick={() => onReject('kjernenIBehovet')} className="whitespace-nowrap text-tx hover:text-primary">{t.avvis}</button>
          </div>
        )}
      </section>

      {/* Bakgrunn */}
      <section className="space-y-3">
        <InlineField
          label={t.hvaUtloste}
          type="textarea" rows={4}
          placeholder={t.hvaUtlostePlaceholder}
          {...f('hvaUtlosteBehovet')}
        />
      </section>

      {/* Om kunden */}
      <section className="space-y-3">
        <h3 className={sectionHeading}>{t.omKunden}</h3>
        <InlineField
          label={t.kundebeskrivelse}
          type="textarea" rows={3}
          placeholder={t.kundebeskrivelsePlaceholder}
          {...f('kundebeskrivelse')}
        />
        {enrichAvailable && (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <input
                value={enrichName}
                onChange={e => { setEnrichName(e.target.value); setEnrichError('') }}
                onKeyDown={e => e.key === 'Enter' && runEnrich()}
                placeholder={t.enrichPlaceholder}
                className="flex-1 rounded-lg border border-border bg-white/60 px-3 py-1.5 text-xs text-tx
                  placeholder:text-tx-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/30 transition-shadow"
              />
              <button
                onClick={runEnrich}
                disabled={enriching || !enrichName.trim()}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-tx
                  bg-[#EDE3D8] hover:bg-[#E3D7C8] border border-border/60
                  disabled:opacity-40 transition-colors whitespace-nowrap"
              >
                {enriching ? t.enriching : t.enrichBtn}
              </button>
            </div>
            {enrichError && <p className="text-xs text-red-500">{enrichError}</p>}
          </div>
        )}
      </section>

      {/* Prosjekt og team */}
      <section className="space-y-3">
        <h3 className={sectionHeading}>{t.prosjektOgTeam}</h3>
        <InlineField label={t.prosjektbeskrivelse} type="textarea" rows={4} placeholder={t.prosjektPlaceholder} {...f('prosjektbeskrivelse')} />
        <InlineField label={t.teambeskrivelse}     type="textarea" rows={2} placeholder={t.teamPlaceholder}     {...f('teambeskrivelse')} />
        <InlineField label={t.arbeidsoppgaver}     type="textarea" rows={3} placeholder={t.arbeidsoppgaverPlaceholder} {...f('arbeidsoppgaver')} />
      </section>

      {/* Kompetansekrav */}
      <section className="space-y-5">
        <h3 className={sectionHeading}>{t.kompetansekrav}</h3>
        <ListField
          label={t.maaHa}
          items={brief.maHa}
          onChange={v => setField('maHa', v)}
          prominent maxWarning={6}
          suggestion={pendingFill?.maHa}
          onAccept={() => onAccept('maHa')}
          onReject={() => onReject('maHa')}
        />
        <div className="border-t border-border/60 pt-4">
          <ListField
            label={t.fintAaHa}
            items={brief.fintAHa}
            onChange={v => setField('fintAHa', v)}
            suggestion={pendingFill?.fintAHa}
            onAccept={() => onAccept('fintAHa')}
            onReject={() => onReject('fintAHa')}
          />
        </div>
      </section>

      {/* Personlige egenskaper */}
      <section>
        <InlineField
          label={t.personligeEgenskaper}
          type="textarea" rows={2}
          placeholder={t.personligePlaceholder}
          {...f('personligeEgenskaper')}
        />
      </section>

      {/* Selling points */}
      <section className="space-y-2 pt-2 border-t border-border/40">
        <h3 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-tx">
          <span style={dotStyle(sellingFill)} />
          {t.sellingPoints}
        </h3>
        <textarea
          value={brief.sellingPoints}
          onChange={e => setField('sellingPoints', e.target.value)}
          rows={3}
          placeholder={t.sellingPlaceholder}
          className="w-full rounded-lg border border-border bg-white/60 px-3 py-2 text-sm text-tx
            placeholder:text-tx-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/30 resize-y transition-shadow"
        />
        {pendingFill?.sellingPoints && (
          <div className="flex items-start gap-2 rounded-lg border border-accent/20 bg-accent-light p-2 text-xs">
            <span className="flex-1 text-tx leading-relaxed">
              <span className="font-semibold text-accent">{t.aiLabel}</span> {pendingFill.sellingPoints}
            </span>
            <button onClick={() => onAccept('sellingPoints')} className="whitespace-nowrap font-semibold text-accent hover:text-accent/70">{t.bruk}</button>
            <button onClick={() => onReject('sellingPoints')} className="whitespace-nowrap text-tx hover:text-primary">{t.avvis}</button>
          </div>
        )}
      </section>

    </main>
  )
}
