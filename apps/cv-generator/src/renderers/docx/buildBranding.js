import {
  Header, Footer, Paragraph, TextRun, ImageRun,
  Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle, VerticalAlign,
} from 'docx'
import { hex } from './buildUtils'
import { theme } from '../../theme'
import { dataUrlToBytes, dataUrlImageType, hasCompanyFooter } from '../../utils/branding'

// Printable width = A4 width (11906 twips) − left/right margins (1000 each), per
// buildDocument's page.margin. Table/column widths are measured against this.
const CONTENT_W = 11906 - 1000 - 1000  // 9906 twips

const NONE = { style: BorderStyle.NONE, size: 0, color: 'auto' }
const NO_BORDERS = { top: NONE, bottom: NONE, left: NONE, right: NONE }

function image(dataUrl, width, height) {
  const data = dataUrlToBytes(dataUrl)
  if (!data) return null
  return new ImageRun({ data, type: dataUrlImageType(dataUrl), transformation: { width, height } })
}

const emptyHF = kind => (kind === 'header'
  ? new Header({ children: [new Paragraph({ children: [] })] })
  : new Footer({ children: [new Paragraph({ children: [] })] }))

// First-page header, as a borderless 2-column table: logo left, photo right
// (either may be absent). A table pins the alignment reliably in Word.
export function brandHeader(branding) {
  if (!branding?.logo && !branding?.profilePicture) return emptyHF('header')
  // logoBox carries the aspect-preserving dimensions computed in prepareBranding;
  // the photo has been square-cropped, so a square box no longer distorts it.
  const lb = branding.logoBox || { width: 150, height: 50 }
  const logo = branding.logo ? image(branding.logo, lb.width, lb.height) : null
  const photo = branding.profilePicture ? image(branding.profilePicture, 60, 60) : null
  const col = Math.round(CONTENT_W / 2)

  const imgCell = (img, align) => new TableCell({
    width: { size: col, type: WidthType.DXA },
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
    borders: NO_BORDERS,
    verticalAlign: VerticalAlign.CENTER,
    children: [new Paragraph({ alignment: align, children: img ? [img] : [] })],
  })

  const table = new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [col, col],
    borders: { ...NO_BORDERS, insideHorizontal: NONE, insideVertical: NONE },
    rows: [new TableRow({ children: [imgCell(logo, AlignmentType.LEFT), imgCell(photo, AlignmentType.RIGHT)] })],
  })

  return new Header({ children: [table, new Paragraph({ children: [] })] })
}

// First-page footer, laid out as a borderless 3-column table (name left ·
// address center · website right / — · email center · phone right). A table is
// used instead of tab stops because Word renders multi-tab footer paragraphs
// unreliably (mis-aligned / wrapping onto extra lines).
export function brandFooter(branding) {
  if (!hasCompanyFooter(branding)) return emptyHF('footer')
  const muted = hex(theme.colors.muted)
  const primary = hex(theme.colors.primary)
  const col = Math.round(CONTENT_W / 3)

  const cell = (text, align, { bold = false, color = muted } = {}) => new TableCell({
    width: { size: col, type: WidthType.DXA },
    margins: { top: 20, bottom: 20, left: 0, right: 0 },
    borders: NO_BORDERS,
    verticalAlign: VerticalAlign.CENTER,
    children: [new Paragraph({
      alignment: align,
      spacing: { before: 0, after: 0, line: 240 },
      children: [new TextRun({ text: text || '', bold, size: 14, color })],
    })],
  })

  const table = new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [col, col, col],
    // Only a top rule (accent), matching the PDF/editor footer.
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: hex(theme.colors.accent) },
      bottom: NONE, left: NONE, right: NONE, insideHorizontal: NONE, insideVertical: NONE,
    },
    rows: [
      new TableRow({ children: [
        cell(branding.companyName, AlignmentType.LEFT, { bold: true, color: primary }),
        cell(branding.companyAddress, AlignmentType.CENTER),
        cell(branding.companyWebsite, AlignmentType.RIGHT),
      ] }),
      new TableRow({ children: [
        cell('', AlignmentType.LEFT),
        cell(branding.companyEmail, AlignmentType.CENTER),
        cell(branding.companyPhone, AlignmentType.RIGHT),
      ] }),
    ],
  })

  // A trailing empty paragraph keeps Word happy when a footer ends in a table.
  return new Footer({ children: [table, new Paragraph({ children: [] })] })
}
