import { Paragraph, TextRun } from 'docx'
import { theme } from '../../theme'
import { getL } from '../../utils/labels'
import { hex, sectionHeading } from './buildUtils'
import { unitVideoParagraphs } from './buildVideos'

export function buildSkills(items, lang = 'en', videos = []) {
  if (!items?.length) return []
  const lb = getL(lang)

  return [
    sectionHeading(lb.skills),
    ...items.map(group =>
      new Paragraph({
        children: [
          new TextRun({ text: `${group.category}:  `, bold: true, size: 20, font: 'Calibri', color: hex(theme.colors.text) }),
          new TextRun({ text: group.items.join(', '), size: 20, font: 'Calibri', color: hex(theme.colors.muted) }),
        ],
        spacing: { after: 60 },
      })
    ),
    ...unitVideoParagraphs(videos, 'skills', lang),
  ]
}
