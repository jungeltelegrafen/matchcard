import {
  Paragraph, TextRun, TabStopType, ShadingType, BorderStyle,
} from 'docx'
import { theme } from '../../theme'

export function hex(c) { return c.replace('#', '') }

// Right tab stop position in twips.
// A4 (11906) minus left margin (1000) minus right margin (1000) = 9906.
// Use 9200 to leave a small safe margin so dates never clip.
const TAB_RIGHT = 9200

// ── Section heading ────────────────────────────────────────────────────────────
export function sectionHeading(label, { before = 280, after = 120 } = {}) {
  return new Paragraph({
    children: [
      new TextRun({
        text: label.toUpperCase(),
        bold: true,
        size: 20,
        color: hex(theme.colors.primary),
        font: 'Calibri',
      }),
    ],
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 6, color: hex(theme.colors.accent) },
    },
    spacing: { before, after },
  })
}

// ── Accent horizontal rule ─────────────────────────────────────────────────────
export function rule({ before = 80, after = 160 } = {}) {
  return new Paragraph({
    children: [],
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 8, color: hex(theme.colors.accent) },
    },
    spacing: { before, after },
  })
}

// ── Two-column line: left runs  +  TAB  +  right text (right-aligned) ─────────
export function twoColPara(leftRuns, rightText, {
  rightSize = 18,
  rightColor = theme.colors.muted,
  spacingBefore = 0,
  spacingAfter = 0,
} = {}) {
  return new Paragraph({
    tabStops: [{ type: TabStopType.RIGHT, position: TAB_RIGHT }],
    children: [
      ...leftRuns,
      new TextRun({ text: '\t' }),
      new TextRun({ text: rightText || '', size: rightSize, color: hex(rightColor), font: 'Calibri' }),
    ],
    spacing: { before: spacingBefore, after: spacingAfter },
  })
}

// ── Bullet paragraph ──────────────────────────────────────────────────────────
export function bulletPara(text, { size = 18, after = 30 } = {}) {
  if (!text) return null
  return new Paragraph({
    children: [new TextRun({ text: `•  ${text}`, size, font: 'Calibri' })],
    indent: { left: 220 },
    spacing: { after },
  })
}

// ── Shaded paragraph (background fill) ───────────────────────────────────────
export function shadedPara(children, { fill = 'F7F4F0', before = 0, after = 60 } = {}) {
  return new Paragraph({
    children,
    shading: { type: ShadingType.SOLID, color: fill, fill },
    spacing: { before, after },
    indent: { left: 80, right: 80 },
  })
}
