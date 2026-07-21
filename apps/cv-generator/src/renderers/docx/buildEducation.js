import { Paragraph, TextRun } from 'docx'
import { theme } from '../../theme'
import { getL } from '../../utils/labels'
import { hex, sectionHeading, twoColPara } from './buildUtils'

export function buildEducation(items, lang = 'en') {
  if (!items?.length) return []
  const lb = getL(lang)

  return [
    sectionHeading(lb.education),
    ...items.flatMap((item, idx) => {
      const degreeRuns = [
        item.degree ? new TextRun({ text: item.degree, bold: true, size: 20, font: 'Calibri', color: hex(theme.colors.text) }) : null,
        item.field  ? new TextRun({ text: ` — ${item.field}`, size: 20, font: 'Calibri', color: hex(theme.colors.muted) }) : null,
      ].filter(Boolean)

      const dateStr = [item.startDate, item.endDate].filter(Boolean).join(' – ')

      return [
        twoColPara(
          degreeRuns.length ? degreeRuns : [new TextRun({ text: '' })],
          dateStr,
          { spacingBefore: idx === 0 ? 0 : 120 },
        ),
        item.institution ? new Paragraph({
          children: [new TextRun({ text: item.institution, size: 18, color: hex(theme.colors.muted), font: 'Calibri' })],
          spacing: { after: 60 },
        }) : null,
      ].filter(Boolean)
    }),
  ]
}
