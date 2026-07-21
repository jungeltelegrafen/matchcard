import { Paragraph, TextRun } from 'docx'
import { theme } from '../../theme'
import { getL } from '../../utils/labels'
import { hex, sectionHeading, twoColPara, bulletPara } from './buildUtils'

export function buildExperience(items, cvType = 'technical', lang = 'en') {
  if (!items?.length) return []
  const lb = getL(lang)
  const isMgmt = cvType === 'management'

  return [
    sectionHeading(lb.experience),
    ...items.flatMap((item, idx) => {
      const paras = []

      // Company + date — single paragraph with right-aligned tab stop
      const companyRuns = [
        new TextRun({ text: item.company || '', bold: true, size: 22, font: 'Calibri', color: hex(theme.colors.primary) }),
        item.location ? new TextRun({ text: `,  ${item.location}`, size: 20, color: hex(theme.colors.muted), font: 'Calibri' }) : null,
      ].filter(Boolean)

      const dateStr = [item.startDate, item.endDate].filter(Boolean).join(' – ')
      paras.push(twoColPara(companyRuns, dateStr, { spacingBefore: idx === 0 ? 0 : 160 }))

      // Role
      if (item.role) {
        paras.push(new Paragraph({
          children: [
            new TextRun({ text: `${lb.role}: `, bold: true, size: 18, color: hex(theme.colors.muted), font: 'Calibri' }),
            new TextRun({ text: item.role, size: 18, font: 'Calibri' }),
          ],
          spacing: { before: 60, after: 40 },
        }))
      }

      // Project description
      if (item.description) {
        paras.push(new Paragraph({
          children: [
            new TextRun({ text: `${lb.projectDesc}: `, bold: true, size: 18, color: hex(theme.colors.muted), font: 'Calibri' }),
            new TextRun({ text: item.description, size: 18, font: 'Calibri' }),
          ],
          spacing: { after: 40 },
        }))
      }

      // Tasks and responsibilities
      const bullets = (item.bullets || []).filter(Boolean)
      if (bullets.length) {
        paras.push(new Paragraph({
          children: [new TextRun({ text: `${lb.tasks}:`, bold: true, size: 18, color: hex(theme.colors.muted), font: 'Calibri' })],
          spacing: { after: 20 },
        }))
        bullets.forEach(b => paras.push(bulletPara(b)))
      }

      // Technical: technologies
      if (!isMgmt && item.technologies) {
        paras.push(new Paragraph({
          children: [
            new TextRun({ text: `${lb.technologies}: `, bold: true, size: 18, color: hex(theme.colors.muted), font: 'Calibri' }),
            new TextRun({ text: item.technologies, size: 18, font: 'Calibri' }),
          ],
          spacing: { after: 40 },
        }))
      }

      // Management: methodologies + result
      if (isMgmt && item.methodologies) {
        paras.push(new Paragraph({
          children: [
            new TextRun({ text: `${lb.methodologies}: `, bold: true, size: 18, color: hex(theme.colors.muted), font: 'Calibri' }),
            new TextRun({ text: item.methodologies, size: 18, font: 'Calibri' }),
          ],
          spacing: { after: 40 },
        }))
      }
      if (isMgmt && item.result) {
        paras.push(new Paragraph({
          children: [
            new TextRun({ text: `${lb.result}: `, bold: true, size: 18, color: hex(theme.colors.muted), font: 'Calibri' }),
            new TextRun({ text: item.result, size: 18, font: 'Calibri' }),
          ],
          spacing: { after: 40 },
        }))
      }

      // Spacer between items (except last)
      if (idx < items.length - 1) {
        paras.push(new Paragraph({ children: [], spacing: { before: 80, after: 0 } }))
      }

      return paras
    }),
  ]
}
