import { Header, Footer, Paragraph, TextRun, ImageRun, Tab, TabStopType, LineRuleType } from 'docx'
import { hex } from './buildUtils'
import { theme } from '../../theme'
import { dataUrlToBytes, dataUrlImageType, hasCompanyFooter } from '../../utils/branding'

// Printable width = A4 width (11906 twips) − left/right margins (1000 each), per
// buildDocument's page.margin. Tab stops are measured from the left margin.
const CONTENT_W = 11906 - 1000 - 1000  // 9906 twips
// A single RIGHT tab per line pushes the right-hand field to the margin. Pages
// only reliably honours one right tab per footer line, so the footer is 3 lines
// with at most one tab each (see brandFooter).
const RIGHT_TAB = CONTENT_W - 120             // a hair inside the edge to avoid wrap

// A real tab-advance run. A literal "\t" in text does NOT honour custom tab
// stops (Word/Pages fall back to default stops), so every tab is a <w:tab/>.
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
// A single right tab stop pushes the photo to the right margin.
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
      tabStops: [{ type: TabStopType.RIGHT, position: RIGHT_TAB }],
      children,
    })],
  })
}

// First-page footer as 3 tight lines, each with one right-hand field pushed to
// the margin by a single right tab (reliable in Word and Apple Pages):
//   name (left)
//   address (left)  ·  website (right)
//   email   (left)  ·  phone   (right)
export function brandFooter(branding) {
  if (!hasCompanyFooter(branding)) return emptyHF('footer')
  const muted = hex(theme.colors.muted)
  const primary = hex(theme.colors.primary)
  const stops = [{ type: TabStopType.RIGHT, position: RIGHT_TAB }]
  // Tight, exact line height (7pt text) so the three lines sit close together.
  const line = { before: 0, after: 0, line: 220, lineRule: LineRuleType.EXACT }
  const run = (text, { bold = false, color = muted } = {}) =>
    new TextRun({ text: text || '', bold, size: 14, color })

  const twoCol = (leftText, rightText) => new Paragraph({
    tabStops: stops,
    spacing: line,
    children: [run(leftText), tab(), run(rightText)],
  })

  return new Footer({
    children: [
      new Paragraph({
        spacing: { ...line, before: 40 },
        border: { top: { style: 'single', size: 4, color: hex(theme.colors.accent) } },
        children: [run(branding.companyName, { bold: true, color: primary })],
      }),
      twoCol(branding.companyAddress, branding.companyWebsite),
      twoCol(branding.companyEmail, branding.companyPhone),
    ],
  })
}
