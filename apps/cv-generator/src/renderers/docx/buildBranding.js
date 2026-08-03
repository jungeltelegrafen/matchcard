import { Header, Footer, Paragraph, TextRun, ImageRun, Tab, TabStopType } from 'docx'
import { hex } from './buildUtils'
import { theme } from '../../theme'
import { dataUrlToBytes, dataUrlImageType, hasCompanyFooter } from '../../utils/branding'

// Printable width = A4 width (11906 twips) − left/right margins (1000 each), per
// buildDocument's page.margin. Tab stops must land inside this or text wraps.
const CONTENT_W = 11906 - 1000 - 1000  // 9906 twips

// A real tab-advance run. Literal "\t" in text does NOT honour custom tab stops
// (Word renders it at default stops and wraps), so every tab must be a <w:tab/>.
const tab = () => new TextRun({ children: [new Tab()] })

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
  // logoBox carries the aspect-preserving dimensions computed in prepareBranding;
  // the photo has been square-cropped, so a square box no longer distorts it.
  const lb = branding.logoBox || { width: 150, height: 50 }
  const logo = branding.logo ? image(branding.logo, lb.width, lb.height) : null
  const photo = branding.profilePicture ? image(branding.profilePicture, 60, 60) : null
  const children = []
  if (logo) children.push(logo)
  children.push(tab())            // advance to the right tab stop
  if (photo) children.push(photo) // right-aligned at the right margin
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
    { type: TabStopType.CENTER, position: Math.round(CONTENT_W / 2) },
    { type: TabStopType.RIGHT, position: CONTENT_W },
  ]
  const muted = hex(theme.colors.muted)
  const primary = hex(theme.colors.primary)
  return new Footer({
    children: [
      new Paragraph({
        tabStops: stops,
        spacing: { before: 20, after: 20 },
        border: { top: { style: 'single', size: 4, color: hex(theme.colors.accent) } },
        children: [
          new TextRun({ text: branding.companyName || '', bold: true, size: 14, color: primary }),
          tab(),
          new TextRun({ text: branding.companyAddress || '', size: 14, color: muted }),
          tab(),
          new TextRun({ text: branding.companyWebsite || '', size: 14, color: muted }),
        ],
      }),
      new Paragraph({
        tabStops: stops,
        spacing: { before: 20, after: 0 },
        children: [
          tab(),
          new TextRun({ text: branding.companyEmail || '', size: 14, color: muted }),
          tab(),
          new TextRun({ text: branding.companyPhone || '', size: 14, color: muted }),
        ],
      }),
    ],
  })
}
