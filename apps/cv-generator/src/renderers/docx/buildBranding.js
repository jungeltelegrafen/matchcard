import { Header, Footer, Paragraph, TextRun, ImageRun, TabStopType, TabStopPosition } from 'docx'
import { hex } from './buildUtils'
import { theme } from '../../theme'
import { dataUrlToBytes, dataUrlImageType, hasCompanyFooter } from '../../utils/branding'

// Content width between the 1000-twip left/right margins (A4). Used for tab stops.
const CONTENT_W = TabStopPosition.MAX // ~9026 twips — the docx max/right edge

function image(dataUrl, width, height) {
  const data = dataUrlToBytes(dataUrl)
  if (!data) return null
  return new ImageRun({ data, type: dataUrlImageType(dataUrl), transformation: { width, height } })
}

const emptyHF = kind => (kind === 'header'
  ? new Header({ children: [new Paragraph({ children: [] })] })
  : new Footer({ children: [new Paragraph({ children: [] })] }))

// First-page header: logo left, profile photo right (either may be absent).
export function brandHeader(branding) {
  if (!branding?.logo && !branding?.profilePicture) return emptyHF('header')
  const logo = branding.logo ? image(branding.logo, 120, 40) : null
  const photo = branding.profilePicture ? image(branding.profilePicture, 60, 60) : null
  const children = []
  if (logo) children.push(logo)
  children.push(new TextRun({ text: '\t' }))
  if (photo) children.push(photo)
  return new Header({
    children: [new Paragraph({
      tabStops: [{ type: TabStopType.RIGHT, position: CONTENT_W }],
      children,
    })],
  })
}

// First-page footer: name left · address center-top · website right-top;
// email center-bottom · phone right-bottom.
export function brandFooter(branding) {
  if (!hasCompanyFooter(branding)) return emptyHF('footer')
  const stops = [
    { type: TabStopType.CENTER, position: CONTENT_W / 2 },
    { type: TabStopType.RIGHT, position: CONTENT_W },
  ]
  const muted = hex(theme.colors.muted)
  const row = (left, center, right, boldLeft) => new Paragraph({
    tabStops: stops,
    spacing: { before: 20, after: 20 },
    border: { top: { style: 'single', size: 4, color: hex(theme.colors.accent) } },
    children: [
      new TextRun({ text: left || '', bold: !!boldLeft, size: 14, color: hex(theme.colors.primary) }),
      new TextRun({ text: `\t${center || ''}`, size: 14, color: muted }),
      new TextRun({ text: `\t${right || ''}`, size: 14, color: muted }),
    ],
  })
  return new Footer({
    children: [
      row(branding.companyName, branding.companyAddress, branding.companyWebsite, true),
      new Paragraph({
        tabStops: stops,
        spacing: { before: 20, after: 0 },
        children: [
          new TextRun({ text: '', size: 14 }),
          new TextRun({ text: `\t${branding.companyEmail || ''}`, size: 14, color: muted }),
          new TextRun({ text: `\t${branding.companyPhone || ''}`, size: 14, color: muted }),
        ],
      }),
    ],
  })
}
