import { Paragraph, TextRun, ShadingType } from 'docx'
import { theme } from '../../theme'
import { getL } from '../../utils/labels'
import { hex, sectionHeading } from './buildUtils'

function levelDots(n) {
  const filled = '●'
  const empty  = '○'
  return `${filled.repeat(n)}${empty.repeat(5 - n)}`
}

function blankLine() {
  return new Paragraph({ children: [], spacing: { before: 0, after: 0 } })
}

export function buildCompetences(competences, lang = 'en') {
  if (!competences?.enabled || !competences?.items?.length) return []
  const lb = getL(lang)

  const title = competences.projectLabel
    ? `${lb.competencesFor} ${competences.projectLabel}`
    : lb.competences

  return [
    sectionHeading(title),
    ...competences.items.flatMap((item, i) => {
      const paras = []

      // Blank line between competence items (not before the first)
      if (i > 0) paras.push(blankLine())

      // Requirement name
      if (item.requirement) {
        paras.push(new Paragraph({
          children: [new TextRun({ text: item.requirement, bold: true, size: 20, font: 'Calibri', color: hex(theme.colors.primary) })],
          spacing: { before: 60, after: 60 },
        }))
      }

      // Meta block (shaded): level, last used, years, projects
      const metaRuns = []
      if (item.level) {
        const n = parseInt(item.level) || 0
        metaRuns.push(new TextRun({ text: `${lb.levelLabel}: `, bold: true, size: 16, color: hex(theme.colors.muted), font: 'Calibri' }))
        metaRuns.push(new TextRun({ text: `${levelDots(n)}  `, size: 16, color: hex(theme.colors.accent), font: 'Calibri' }))
      }
      if (item.lastUsed) {
        metaRuns.push(new TextRun({ text: `${lb.lastUsed}: `, bold: true, size: 16, color: hex(theme.colors.muted), font: 'Calibri' }))
        metaRuns.push(new TextRun({ text: `${item.lastUsed}  `, size: 16, font: 'Calibri' }))
      }
      if (item.yearsRelevant) {
        metaRuns.push(new TextRun({ text: `${lb.totalYears}: `, bold: true, size: 16, color: hex(theme.colors.muted), font: 'Calibri' }))
        metaRuns.push(new TextRun({ text: `${item.yearsRelevant}  `, size: 16, font: 'Calibri' }))
      }
      if (item.projects) {
        metaRuns.push(new TextRun({ text: `${lb.projects}: `, bold: true, size: 16, color: hex(theme.colors.muted), font: 'Calibri' }))
        metaRuns.push(new TextRun({ text: item.projects, size: 16, font: 'Calibri' }))
      }

      if (metaRuns.length) {
        paras.push(new Paragraph({
          children: metaRuns,
          shading: { type: ShadingType.SOLID, color: 'F7F4F0', fill: 'F7F4F0' },
          spacing: { after: 60 },
          indent: { left: 80, right: 80 },
        }))
      }

      // Evidence text
      if (item.detail) {
        paras.push(new Paragraph({
          children: [new TextRun({ text: item.detail, size: 18, color: hex(theme.colors.muted), font: 'Calibri' })],
          spacing: { after: 60 },
        }))
      }

      return paras
    }),
  ]
}
