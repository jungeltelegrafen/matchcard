import { Document, Packer, Paragraph, Header, Footer } from 'docx'
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
import { buildVideos } from './buildVideos'
import { buildPortfolio } from './buildPortfolio'
import { brandHeader, brandFooter } from './buildBranding'
import { squareCropDataUrl, fitImageBox } from '../../utils/branding'
import { renderedUnitIds } from '../../utils/videoAnchors'

function section(paras) {
  if (!paras.length) return []
  return [new Paragraph({ children: [], spacing: { before: 0, after: 0 } }), ...paras]
}

function buildDoc(data, lang = 'en', branding = {}) {
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
          // titlePage → distinct first-page header/footer (branding on page 1 only).
          titlePage: true,
          page: { margin: { top: 800, bottom: 800, left: 1000, right: 1000 } },
        },
        headers: { first: brandHeader(branding), default: new Header({ children: [] }) },
        footers: { first: brandFooter(branding), default: new Footer({ children: [] }) },
        children: [
          ...buildHeader(data.personal, lang, data.videos),
          ...section(buildVideos(data.videos, renderedUnitIds(data), lang)),
          ...section(buildSkills(data.skills, lang, data.videos)),
          ...section(buildCompetences(data.competences, lang, data.videos)),
          ...section(buildExperience(data.experience, cvType, lang, data.videos)),
          ...section(buildPositions(data.positions, lang, data.videos)),
          ...section(buildEducation(data.education, lang, data.videos)),
          ...section(buildCertsCourses(data.certifications, data.courses, lang, data.videos)),
          ...section(buildLanguages(data.languages, lang)),
          ...section(buildPortfolio(data.portfolio, lang, data.videos)),
          new Paragraph({ children: [], spacing: { after: 0 } }),
        ],
      },
    ],
  })
}

// Word can't crop/fit images, so normalize the brand images to proportionate
// sizes up front: square-crop the photo, fit the logo to its true aspect ratio.
async function prepareBranding(branding) {
  if (!branding || (!branding.logo && !branding.profilePicture)) return branding
  const out = { ...branding }
  try {
    if (branding.profilePicture) out.profilePicture = await squareCropDataUrl(branding.profilePicture, 256)
    if (branding.logo) out.logoBox = await fitImageBox(branding.logo, 180, 56)
  } catch { /* fall back to raw images */ }
  return out
}

export async function downloadDocx(data, filename = 'cv.docx', lang = 'en', branding) {
  const blob = await Packer.toBlob(buildDoc(data, lang, await prepareBranding(branding)))
  saveAs(blob, filename)
}

export async function buildDocxBlob(data, lang = 'en', branding) {
  return Packer.toBlob(buildDoc(data, lang, await prepareBranding(branding)))
}
