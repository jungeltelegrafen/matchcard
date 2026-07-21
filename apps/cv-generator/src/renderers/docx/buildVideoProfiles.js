import { Paragraph, TextRun, ExternalHyperlink } from 'docx'
import { theme } from '../../theme'
import { getL } from '../../utils/labels'
import { hex, sectionHeading } from './buildUtils'

const GENERIC_MOCK = {
  title: 'Professional Introduction',
  description: 'An overview of professional background, core skills, and approach to work.',
  videoUrl: 'https://video.cloudflare.com/intro-placeholder',
  duration: '3:12',
}

const PROJECT_MOCK = {
  projectName: 'Accenture — Cloud Migration 2025',
  title: 'Project Introduction',
  description: 'Tailored presentation of relevant experience for this specific engagement.',
  videoUrl: 'https://video.cloudflare.com/project-placeholder',
  duration: '2:48',
}

function videoEntry(profile, typeLabel, lang) {
  const lb = getL(lang)
  const paras = []

  // Type + title line
  paras.push(new Paragraph({
    children: [
      new TextRun({ text: `${typeLabel}  `, bold: true, size: 17, color: hex('#888888'), font: 'Calibri' }),
      new TextRun({ text: profile.title, bold: true, size: 18, color: hex(theme.colors.primary), font: 'Calibri' }),
      profile.duration
        ? new TextRun({ text: `  (${profile.duration})`, size: 16, color: hex(theme.colors.muted), font: 'Calibri' })
        : new TextRun({ text: '' }),
    ],
    spacing: { before: 0, after: 30 },
  }))

  // Description
  if (profile.description) {
    paras.push(new Paragraph({
      children: [new TextRun({ text: profile.description, size: 16, color: hex(theme.colors.muted), font: 'Calibri', italics: true })],
      spacing: { before: 0, after: 30 },
    }))
  }

  // Clickable link
  paras.push(new Paragraph({
    children: [
      new ExternalHyperlink({
        link: profile.videoUrl || '#',
        children: [
          new TextRun({
            text: `▶ ${lang === 'no' ? 'Se video' : 'Watch video'}: ${profile.videoUrl}`,
            size: 16,
            color: hex('#4A90D9'),
            font: 'Calibri',
            underline: {},
          }),
        ],
      }),
    ],
    spacing: { before: 0, after: 80 },
  }))

  return paras
}

export function buildVideoProfiles(videoProfile, projectVideoProfile, lang = 'en') {
  const lb = getL(lang)
  const generic = (videoProfile?.enabled ? videoProfile : null) ?? GENERIC_MOCK
  const project = (projectVideoProfile?.enabled ? projectVideoProfile : null) ?? PROJECT_MOCK

  const paras = []

  paras.push(sectionHeading(lang === 'no' ? 'Videopresentasjoner' : 'Video Profiles', { before: 0, after: 80 }))

  paras.push(...videoEntry(
    generic,
    lang === 'no' ? 'GENERELL' : 'GENERIC',
    lang,
  ))

  const projectLabel = project.projectName
    ? `${lang === 'no' ? 'FOR PROSJEKT' : 'FOR PROJECT'}  ${project.projectName}`
    : (lang === 'no' ? 'FOR PROSJEKT' : 'FOR PROJECT')

  paras.push(...videoEntry(project, projectLabel, lang))

  return paras
}
