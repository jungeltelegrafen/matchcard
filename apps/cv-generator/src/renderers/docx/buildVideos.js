import { Paragraph, TextRun, ExternalHyperlink } from 'docx'
import { theme } from '../../theme'
import { getL, videoPlacement } from '../../utils/labels'
import { hex, sectionHeading } from './buildUtils'
import { mainBlockVideos } from '../../utils/videoAnchors'

const placementLabel = (pl, lang) => videoPlacement(pl, lang).toUpperCase()

// Only hosted (http) videos — session blob: clips can't resolve in a downloaded
// document.
export const hostedVideo = v => /^https?:\/\//.test(v?.playbackUrl || '')

// Per-video paragraphs (no section heading) — reused by the main block and
// inline inside an experience.
export function videoParagraphs(vids = [], lang = 'en') {
  const watch = (getL(lang).watchVideo || 'Watch video').replace(/^▶\s*/, '')
  const paras = []
  for (const v of vids) {
    const tag = placementLabel(v.placement, lang)
    paras.push(new Paragraph({
      children: [
        tag ? new TextRun({ text: `${tag}  `, bold: true, size: 15, color: hex('#888888'), font: 'Calibri' }) : new TextRun({ text: '' }),
        new TextRun({ text: v.title || 'Video', bold: true, size: 18, color: hex(theme.colors.primary), font: 'Calibri' }),
        v.duration ? new TextRun({ text: `  (${v.duration})`, size: 16, color: hex(theme.colors.muted), font: 'Calibri' }) : new TextRun({ text: '' }),
      ],
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

// Main "Video Presentations" block: hosted videos NOT anchored to an experience.
export function buildVideos(videos = [], experiences = [], lang = 'en') {
  const vids = mainBlockVideos(videos, experiences).map(({ v }) => v).filter(hostedVideo)
  if (!vids.length) return []
  const lb = getL(lang)
  return [sectionHeading(lb.videos, { before: 0, after: 80 }), ...videoParagraphs(vids, lang)]
}
