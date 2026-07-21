import { Paragraph, TextRun } from 'docx'
import { theme } from '../../theme'
import { getL } from '../../utils/labels'
import { hex, sectionHeading, twoColPara, bulletPara } from './buildUtils'

export function buildPositions(positions, lang = 'en') {
  if (!positions?.enabled || !positions?.items?.length) return []
  const lb = getL(lang)
  const full = positions.useProjectFormat

  return [
    sectionHeading(lb.positions),
    ...positions.items.flatMap((item, idx) => {
      const paras = []

      // Company + date range
      const companyRuns = [
        new TextRun({ text: item.company || '', bold: true, size: 22, font: 'Calibri', color: hex(theme.colors.primary) }),
      ]
      const dateStr = [item.startDate, item.endDate].filter(Boolean).join(' – ')
      paras.push(twoColPara(companyRuns, dateStr, { spacingBefore: idx === 0 ? 0 : 160 }))

      // Job title
      if (item.title) {
        paras.push(new Paragraph({
          children: [new TextRun({ text: item.title, size: 20, color: hex(theme.colors.accent), font: 'Calibri' })],
          spacing: { before: 30, after: 40 },
        }))
      }

      // Description
      if (item.description) {
        paras.push(new Paragraph({
          children: [new TextRun({ text: item.description, size: 18, color: hex(theme.colors.muted), font: 'Calibri' })],
          spacing: { after: 40 },
        }))
      }

      // Full project format extras
      if (full) {
        const bullets = (item.bullets || []).filter(Boolean)
        if (bullets.length) {
          paras.push(new Paragraph({
            children: [new TextRun({ text: `${lb.tasks}:`, bold: true, size: 18, color: hex(theme.colors.muted), font: 'Calibri' })],
            spacing: { after: 20 },
          }))
          bullets.forEach(b => paras.push(bulletPara(b)))
        }
        if (item.technologies) {
          paras.push(new Paragraph({
            children: [
              new TextRun({ text: `${lb.technologies}: `, bold: true, size: 18, color: hex(theme.colors.muted), font: 'Calibri' }),
              new TextRun({ text: item.technologies, size: 18, font: 'Calibri' }),
            ],
            spacing: { after: 40 },
          }))
        }
        if (item.methodologies) {
          paras.push(new Paragraph({
            children: [
              new TextRun({ text: `${lb.methodologies}: `, bold: true, size: 18, color: hex(theme.colors.muted), font: 'Calibri' }),
              new TextRun({ text: item.methodologies, size: 18, font: 'Calibri' }),
            ],
            spacing: { after: 40 },
          }))
        }
      }

      if (idx < positions.items.length - 1) {
        paras.push(new Paragraph({ children: [], spacing: { before: 80, after: 0 } }))
      }

      return paras
    }),
  ]
}
