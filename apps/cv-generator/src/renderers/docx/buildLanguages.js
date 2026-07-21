import { Paragraph, TextRun } from 'docx'
import { theme } from '../../theme'
import { getL } from '../../utils/labels'
import { hex, sectionHeading } from './buildUtils'

export function buildLanguages(items, lang = 'en') {
  if (!items?.length) return []
  const lb = getL(lang)

  const text = items
    .map(l => l.proficiency ? `${l.language} (${l.proficiency})` : l.language)
    .join('   ·   ')

  return [
    sectionHeading(lb.languages),
    new Paragraph({
      children: [new TextRun({ text, size: 20, font: 'Calibri', color: hex(theme.colors.muted) })],
      spacing: { after: 60 },
    }),
  ]
}
