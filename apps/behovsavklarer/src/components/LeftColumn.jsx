import InlineField from './InlineField'
import { useT } from '../i18n'

function dotStyle(f) {
  const base = { width: 6, height: 6, borderRadius: '50%', flexShrink: 0, transition: 'background 0.4s' }
  if (f === 0)  return { ...base, background: 'transparent', border: '1.5px solid #D9CFC7' }
  if (f < 0.4) return { ...base, background: '#D9CFC7' }
  if (f < 0.8) return { ...base, background: '#7DAACB' }
  return          { ...base, background: '#99BC85' }
}

export default function LeftColumn({ brief, setField, pendingFill, onAccept, onReject }) {
  const t = useT()

  function f(key) {
    return {
      value: brief[key],
      onChange: v => setField(key, v),
      suggestion: pendingFill?.[key],
      onAccept: () => onAccept(key),
      onReject: () => onReject(key),
    }
  }

  const has = v => Boolean(v?.trim?.())
  const hybridFill     = has(brief.hybridDetaljer) ? 1 : 0
  const senioritetFill = has(brief.senioritet) ? 1 : 0

  const labelClass = 'flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-tx'

  return (
    <aside className="w-[22%] flex-shrink-0 border-r border-border bg-bg/60 p-5 space-y-5 overflow-y-scroll print-col">
      <div className="space-y-4">
        <InlineField label={t.rolle} placeholder={t.rollePlaceholder} {...f('rolle')} />
        <InlineField label={t.antallKonsulenter} type="number" placeholder="1" {...f('antallKonsulenter')} />
        <InlineField label={t.stillingsprosent} placeholder={t.stillingsPct} {...f('stillingsprosent')} />
        <InlineField label={t.oppstartsdato} type="date" {...f('oppstartsdato')} />
        <InlineField label={t.varighet} placeholder={t.varighetPlaceholder} {...f('varighet')} />

        {/* Onsite / Remote */}
        <div className="space-y-1">
          <label className={labelClass}>
            <span style={dotStyle(1)} />
            {t.onsiteRemote}
          </label>
          <div className="flex gap-1">
            {['Onsite', 'Remote', 'Hybrid'].map(opt => (
              <button
                key={opt}
                onClick={() => setField('onsiteRemote', opt)}
                className={`flex-1 rounded-lg border py-1 text-[11px] font-semibold transition-colors
                  ${brief.onsiteRemote === opt
                    ? 'border-accent bg-accent text-white'
                    : 'border-border text-tx hover:border-accent/40'
                  }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {brief.onsiteRemote === 'Hybrid' && (
          <div className="space-y-1">
            <label className={labelClass}>
              <span style={dotStyle(hybridFill)} />
              {t.hybridDetaljer}
            </label>
            <input
              type="text"
              value={brief.hybridDetaljer}
              onChange={e => setField('hybridDetaljer', e.target.value)}
              placeholder={t.hybridPlaceholder}
              className="w-full rounded-lg border border-border bg-white/70 px-3 py-1.5 text-sm text-tx
                placeholder:text-tx-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/30 transition-shadow"
            />
          </div>
        )}

        <InlineField label={t.arbeidslokasjon} placeholder={t.arbeidslokasjonPlaceholder} {...f('arbeidslokasjon')} />

        {/* Senioritet */}
        <div className="space-y-1.5">
          <label className={labelClass}>
            <span style={dotStyle(senioritetFill)} />
            {t.senioritet}
          </label>
          <div className="flex flex-wrap gap-1">
            {t.senioritetOptions.map(opt => (
              <button
                key={opt}
                onClick={() => setField('senioritet', brief.senioritet === opt ? '' : opt)}
                className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors
                  ${brief.senioritet === opt
                    ? 'border-accent bg-accent text-white'
                    : 'border-border text-tx hover:border-accent/40'
                  }`}
              >
                {opt}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={brief.senioritet && !t.senioritetOptions.includes(brief.senioritet) ? brief.senioritet : ''}
            onChange={e => setField('senioritet', e.target.value)}
            placeholder={t.senioritetCustom}
            className="w-full rounded-lg border border-border bg-white/70 px-3 py-1.5 text-sm text-tx
              placeholder:text-tx-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
          <p className="text-[11px] font-medium text-tx pt-0.5">{t.senioritetHint}</p>
        </div>

        <InlineField label={t.spraakkrav} placeholder={t.spraakkravPlaceholder} {...f('spraakkrav')} />
        <InlineField label={t.budsjett} placeholder={t.budsjettPlaceholder} {...f('budsjett')} />
        <InlineField label={t.leveransefristCver} type="date" {...f('leveransefristCver')} />
        <InlineField label={t.soknadsfrist} type="date" {...f('soknadsfrist')} />
      </div>
    </aside>
  )
}
