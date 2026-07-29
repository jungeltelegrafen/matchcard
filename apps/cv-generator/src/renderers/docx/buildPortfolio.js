import { ExternalHyperlink, Paragraph, TextRun } from 'docx'
import { theme } from '../../theme'
import { hex, sectionHeading } from './buildUtils'
import { getL } from '../../utils/labels'

const PLATFORM_LABELS = {
  github:        'GitHub',
  gitlab:        'GitLab',
  stackoverflow: 'Stack Overflow',
  dribbble:      'Dribbble',
  behance:       'Behance',
  website:       'Website',
  other:         '',
}

export function buildPortfolio(items, lang = 'en') {
  if (!items?.length) return []

  const heading = getL(lang).portfolio
  const result  = [sectionHeading(heading)]

  for (const item of items) {
    const platformLabel = PLATFORM_LABELS[item.platform] || ''
    const displayLabel  = item.label || item.url || platformLabel

    const lineChildren = []

    if (platformLabel) {
      lineChildren.push(
        new TextRun({
          text: `[${platformLabel}]  `,
          size: 18,
          bold: true,
          font: 'Calibri',
          color: hex(theme.colors.accent),
        })
      )
    }

    if (item.url) {
      lineChildren.push(
        new ExternalHyperlink({
          link: item.url,
          children: [
            new TextRun({
              text: displayLabel,
              size: 20,
              font: 'Calibri',
              color: hex(theme.colors.accent),
              underline: {},
              style: 'Hyperlink',
            }),
          ],
        })
      )
    } else if (displayLabel) {
      lineChildren.push(
        new TextRun({
          text: displayLabel,
          size: 20,
          bold: true,
          font: 'Calibri',
          color: hex(theme.colors.text),
        })
      )
    }

    result.push(
      new Paragraph({
        children:  lineChildren,
        spacing:   { before: 80, after: item.description ? 40 : 80 },
      })
    )

    if (item.description) {
      result.push(
        new Paragraph({
          children: [
            new TextRun({
              text: item.description,
              size: 18,
              font: 'Calibri',
              color: hex(theme.colors.muted),
            }),
          ],
          spacing: { before: 0, after: 80 },
        })
      )
    }
  }

  return result
}
