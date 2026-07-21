import { Document, Packer, Paragraph } from 'docx'
import { saveAs } from 'file-saver'
import { theme } from '../../theme'
import { hex } from './buildUtils'
import { buildHeader } from './buildHeader'
import { buildSkills } from './buildSkills'
import { buildCompetences } from './buildCompetences'
import { buildExperience } from './buildExperience'
import { buildPositions } from './buildPositions'
import { buildEducation } from './buildEducation'
import { buildCertsCourses } from './buildCertsCourses'
import { buildLanguages } from './buildLanguages'
import { buildVideoProfiles } from './buildVideoProfiles'

function section(paras) {
  if (!paras.length) return []
  return [new Paragraph({ children: [], spacing: { before: 0, after: 0 } }), ...paras]
}

function buildDoc(data, lang = 'en') {
  const cvType = data.cvType || 'technical'

  return new Document({
    styles: {
      default: {
        document: {
          run: { font: 'Calibri', size: 20, color: hex(theme.colors.text) },
        },
      },
    },
    sections: [
      {
        properties: {
          page: { margin: { top: 800, bottom: 800, left: 1000, right: 1000 } },
        },
        children: [
          ...buildHeader(data.personal, lang),
          ...section(buildVideoProfiles(data.videoProfile, data.projectVideoProfile, lang)),
          ...section(buildSkills(data.skills, lang)),
          ...section(buildCompetences(data.competences, lang)),
          ...section(buildExperience(data.experience, cvType, lang)),
          ...section(buildPositions(data.positions, lang)),
          ...section(buildEducation(data.education, lang)),
          ...section(buildCertsCourses(data.certifications, data.courses, lang)),
          ...section(buildLanguages(data.languages, lang)),
          new Paragraph({ children: [], spacing: { after: 0 } }),
        ],
      },
    ],
  })
}

export async function downloadDocx(data, filename = 'cv.docx', lang = 'en') {
  const blob = await Packer.toBlob(buildDoc(data, lang))
  saveAs(blob, filename)
}

export async function buildDocxBlob(data, lang = 'en') {
  return Packer.toBlob(buildDoc(data, lang))
}
