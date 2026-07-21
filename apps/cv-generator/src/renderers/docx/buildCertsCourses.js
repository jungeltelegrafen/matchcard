import { TextRun } from 'docx'
import { theme } from '../../theme'
import { getL } from '../../utils/labels'
import { hex, sectionHeading, twoColPara } from './buildUtils'

export function buildCertsCourses(certifications, courses, lang = 'en') {
  const hasCerts   = certifications?.length > 0
  const hasCourses = courses?.length > 0
  if (!hasCerts && !hasCourses) return []
  const lb = getL(lang)

  const allItems = [
    ...(certifications || []).map(item => ({
      name: item.name, sub: item.issuer, year: item.year,
    })),
    ...(courses || []).map(item => ({
      name: item.name, sub: item.institution, year: item.year,
    })),
  ]

  return [
    sectionHeading(lb.certsCourses),
    ...allItems.map((item, idx) => {
      const nameRuns = [
        new TextRun({ text: item.name || '', size: 20, bold: true, font: 'Calibri', color: hex(theme.colors.text) }),
        item.sub ? new TextRun({ text: `  —  ${item.sub}`, size: 18, color: hex(theme.colors.muted), font: 'Calibri' }) : null,
      ].filter(Boolean)

      return twoColPara(nameRuns, item.year || '', { spacingBefore: idx === 0 ? 0 : 80 })
    }),
  ]
}
