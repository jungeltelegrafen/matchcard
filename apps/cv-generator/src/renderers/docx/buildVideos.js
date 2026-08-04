import { Paragraph, TextRun, ExternalHyperlink } from 'docx'
import { theme } from '../../theme'
import { getL } from '../../utils/labels'
import { hex, sectionHeading } from './buildUtils'
import { mainBlockVideos, videoItemsForUnit } from '../../utils/videoAnchors'

// Only hosted (http) videos — session blob: clips can't resolve in a downloaded
// document.
export const hostedVideo = v => /^https?:\/\//.test(v?.playbackUrl || '')

// Per-video paragraphs (no section heading) — reused by the main block and
// inline inside an experience.
export function videoParagraphs(vids = [], lang = 'en') {
  const watch = (getL(lang).watchVideo || 'Watch video').replace(/^▶\s*/, '')
  const accent = hex('#C97B4B')
  const paras = []
  for (const v of vids) {
    // Title leads with "Video:" (no thumbnail in docx) + accent colour and an
    // accent left rule for a bit of lift.
    paras.push(new Paragraph({
      children: [
        new TextRun({ text: v.title ? `Video: ${v.title}` : 'Video', bold: true, size: 18, color: accent, font: 'Calibri' }),
        v.duration ? new TextRun({ text: `  (${v.duration})`, size: 16, color: hex(theme.colors.muted), font: 'Calibri' }) : new TextRun({ text: '' }),
      ],
      border: { left: { style: 'single', size: 18, color: '#C97B4B', space: 8 } },
      spacing: { before: 0, after: 30 },
    }))
    if (v.description) {
      paras.push(new Paragraph({
        children: [new TextRun({ text: v.description, size: 16, color: hex(theme.colors.muted), font: 'Calibri', italics: true })],
        spacing: { before: 0, after: 30 },
      }))
    }
    paras.push(new Paragraph({
      children: [new ExternalHyperlink({
        link: v.playbackUrl,
        children: [new TextRun({ text: `▶ ${watch}: ${v.playbackUrl}`, size: 16, color: hex('#4A90D9'), font: 'Calibri', underline: {} })],
      })],
      spacing: { before: 0, after: 80 },
    }))
  }
  return paras
}

// Main "Video Presentations" block: hosted videos NOT anchored to a rendered unit.
export function buildVideos(videos = [], unitIds = [], lang = 'en') {
  const vids = mainBlockVideos(videos, unitIds).map(({ v }) => v).filter(hostedVideo)
  if (!vids.length) return []
  const lb = getL(lang)
  return [sectionHeading(lb.videos, { before: 0, after: 80 }), ...videoParagraphs(vids, lang)]
}

// Inline video paragraphs for one unit (hosted only) — for use inside a section
// or item builder.
export function unitVideoParagraphs(videos = [], unitId, lang = 'en') {
  const vids = videoItemsForUnit(videos, unitId).filter(hostedVideo)
  return vids.length ? videoParagraphs(vids, lang) : []
}
