import { Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle } from 'docx'
import { theme } from '../../theme'
import { getL } from '../../utils/labels'
import { hex, sectionHeading } from './buildUtils'
import { unitVideoParagraphs } from './buildVideos'

const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
const NO_BORDERS = {
  top: noBorder, bottom: noBorder, left: noBorder, right: noBorder,
  insideHorizontal: noBorder, insideVertical: noBorder,
}
// A4 (11906 twips) minus the doc's 1000 left + 1000 right margins.
const CONTENT_TWIPS = 9906

export function buildSkills(items, lang = 'en', videos = []) {
  if (!items?.length) return []
  const lb = getL(lang)

  // Equal indentation: lay the categories out as a borderless 2-column table so
  // every row's items line up in one column (mirrors the share page) instead of
  // starting at a different x per label. Label column ≈ the widest category
  // (~110 twips/char at bold 10pt), clamped so the items keep room.
  const maxLen = items.reduce((m, g) => Math.max(m, (g.category || '').length), 0)
  const labelW = Math.min(Math.max(maxLen * 110 + 160, 1500), 3300)

  const cell = (runs, width, right) => new TableCell({
    width: { size: width, type: WidthType.DXA },
    borders: NO_BORDERS,
    margins: { top: 0, bottom: 40, left: 0, right },
    children: [new Paragraph({ children: runs })],
  })

  const table = new Table({
    width: { size: CONTENT_TWIPS, type: WidthType.DXA },
    columnWidths: [labelW, CONTENT_TWIPS - labelW],
    borders: NO_BORDERS,
    rows: items.map(group => new TableRow({
      children: [
        cell([new TextRun({ text: `${group.category}:`, bold: true, size: 20, font: 'Calibri', color: hex(theme.colors.text) })], labelW, 120),
        cell([new TextRun({ text: group.items.join(', '), size: 20, font: 'Calibri', color: hex(theme.colors.muted) })], CONTENT_TWIPS - labelW, 0),
      ],
    })),
  })

  return [
    sectionHeading(lb.skills),
    table,
    ...unitVideoParagraphs(videos, 'skills', lang),
  ]
}
