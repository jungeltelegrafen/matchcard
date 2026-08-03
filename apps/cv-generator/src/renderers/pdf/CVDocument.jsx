import { Document, Page, StyleSheet, View, Text } from '@react-pdf/renderer'
import { theme } from '../../theme'
import { getL } from '../../utils/labels'
import { hasCompanyFooter } from '../../utils/branding'
import CVHeader from './CVHeader'
import CVSkills from './CVSkills'
import CVCompetences from './CVCompetences'
import CVExperience from './CVExperience'
import CVPositions from './CVPositions'
import CVEducation from './CVEducation'
import CVCertsCourses from './CVCertsCourses'
import CVLanguages from './CVLanguages'
import SectionHeading from './SectionHeading'
import CVVideos from './CVVideos'
import CVPortfolio from './CVPortfolio'

const styles = StyleSheet.create({
  page: {
    fontFamily: theme.fonts.body,
    fontSize: theme.fonts.sizes.body,
    color: theme.colors.text,
    paddingTop: theme.spacing.pagePaddingY,
    paddingBottom: theme.spacing.pagePaddingY,
    paddingLeft: theme.spacing.pagePaddingX,
    paddingRight: theme.spacing.pagePaddingX,
    backgroundColor: theme.colors.background,
  },
  summary: {
    fontSize: theme.fonts.sizes.body,
    color: theme.colors.text,
    lineHeight: 1.5,
    marginBottom: theme.spacing.sectionGap,
  },
  footer: {
    position: 'absolute',
    left: theme.spacing.pagePaddingX,
    right: theme.spacing.pagePaddingX,
    bottom: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.accent,
    paddingTop: 5,
  },
  footerRow: { flexDirection: 'row', marginTop: 2 },
  footerLeft:   { flex: 1, fontSize: 7, textAlign: 'left', color: theme.colors.primary, fontFamily: theme.fonts.heading },
  footerCenter: { flex: 1, fontSize: 7, textAlign: 'center', color: theme.colors.muted },
  footerRight:  { flex: 1, fontSize: 7, textAlign: 'right', color: theme.colors.muted },
})

export default function CVDocument({ data, lang = 'en', branding = {} }) {
  const cvType = data.cvType || 'technical'
  const lb = getL(lang)
  const showFooter = hasCompanyFooter(branding)

  return (
    <Document>
      <Page size={theme.pageSize} style={[styles.page, showFooter && { paddingBottom: 68 }]}>

        <CVHeader personal={data.personal} lang={lang} branding={branding} />

        {data.personal.summary ? (
          <View style={{ marginBottom: theme.spacing.sectionGap }}>
            <SectionHeading>{lb.summary}</SectionHeading>
            <Text style={styles.summary}>{data.personal.summary}</Text>
          </View>
        ) : null}

        <CVVideos items={data.videos} lang={lang} />

        {data.skills?.length > 0 && (
          <CVSkills items={data.skills} lang={lang} />
        )}

        {data.competences?.enabled !== false && data.competences?.items?.some(c => c.requirement?.trim()) && (
          <CVCompetences competences={data.competences} lang={lang} />
        )}

        {data.experience?.length > 0 && (
          <CVExperience items={data.experience} cvType={cvType} lang={lang} />
        )}

        <CVPositions positions={data.positions} lang={lang} />

        {data.education?.length > 0 && (
          <CVEducation items={data.education} lang={lang} />
        )}

        <CVCertsCourses certifications={data.certifications} courses={data.courses} lang={lang} />

        <CVLanguages items={data.languages} lang={lang} />

        <CVPortfolio items={data.portfolio} lang={lang} />

        {showFooter && (
          <View
            fixed
            style={styles.footer}
            render={({ pageNumber }) => (pageNumber === 1 ? (
              <View>
                <View style={styles.footerRow}>
                  <Text style={styles.footerLeft}>{branding.companyName || ''}</Text>
                  <Text style={styles.footerCenter}>{branding.companyAddress || ''}</Text>
                  <Text style={styles.footerRight}>{branding.companyWebsite || ''}</Text>
                </View>
                <View style={styles.footerRow}>
                  <Text style={styles.footerLeft} />
                  <Text style={styles.footerCenter}>{branding.companyEmail || ''}</Text>
                  <Text style={styles.footerRight}>{branding.companyPhone || ''}</Text>
                </View>
              </View>
            ) : null)}
          />
        )}

      </Page>
    </Document>
  )
}
