import { TextRun } from 'docx'
import { theme } from '../../theme'
import { getL } from '../../utils/labels'
import { hex, sectionHeading, twoColPara } from './buildUtils'

export function buildCertifications(items, lang = 'en') {
  if (!items?.length) return []
  const lb = getL(lang)

  return [
    sectionHeading(lb.certifications),
    ...items.map((item, idx) => {
      const nameRuns = [
        new TextRun({ text: item.name || '', size: 20, bold: true, font: 'Calibri', color: hex(theme.colors.text) }),
        item.issuer ? new TextRun({ text: `  —  ${item.issuer}`, size: 18, color: hex(theme.colors.muted), font: 'Calibri' }) : null,
      ].filter(Boolean)

      return twoColPara(nameRuns, item.year || '', { spacingBefore: idx === 0 ? 0 : 80 })
    }),
  ]
}
