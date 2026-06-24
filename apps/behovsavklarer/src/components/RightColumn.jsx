import InlineField from './InlineField'
import { useT } from '../i18n'

export default function RightColumn({ brief, setField, pendingFill, onAccept, onReject }) {
  const t = useT()

  function f(key, extra = {}) {
    return {
      value: brief[key],
      onChange: v => setField(key, v),
      suggestion: pendingFill?.[key],
      onAccept: () => onAccept(key),
      onReject: () => onReject(key),
      ...extra,
    }
  }

  return (
    <aside className="w-[28%] flex-shrink-0 bg-bg/40 p-5 space-y-6 overflow-y-scroll print-col border-l border-border">
      <div className="space-y-6">

        <InlineField
          label={t.webUrl}
          placeholder={t.webUrlPlaceholder}
          {...f('webUrl')}
        />

        <section className="space-y-3">
          <h3 className="text-[10px] font-semibold uppercase tracking-widest text-tx">
            {t.samarbeidsstruktur}
          </h3>
          <InlineField
            label={t.tilbudsformat}
            type="textarea" rows={2}
            placeholder={t.tilbudsformatPlaceholder}
            {...f('tilbudsformat')}
          />
          <InlineField
            label={t.prosessenVidere}
            type="textarea" rows={3}
            placeholder={t.prosessenVidereP}
            {...f('prosessenVidere', { optional: true })}
          />
          <InlineField
            label={t.andreLeverandorer}
            type="textarea" rows={3}
            placeholder={t.andreLeverandorerP}
            {...f('andreLeverandorer', { optional: true })}
          />
          <InlineField
            label={t.andreKandidater}
            type="textarea" rows={3}
            placeholder={t.andreKandidaterP}
            {...f('andreKandidater', { optional: true })}
          />
        </section>

        <InlineField
          label={t.annet}
          type="textarea" rows={3}
          placeholder={t.annetP}
          {...f('annet', { optional: true })}
        />

        <InlineField
          label={t.generelleNotater}
          type="textarea" rows={4}
          placeholder={t.generelleNotaterP}
          {...f('generelleNotater', { optional: true })}
        />

      </div>
    </aside>
  )
}
