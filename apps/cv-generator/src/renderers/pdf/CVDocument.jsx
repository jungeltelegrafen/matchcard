import { Document, Page, StyleSheet, View, Text } from '@react-pdf/renderer'
import { theme } from '../../theme'
import { getL } from '../../utils/labels'
import CVHeader from './CVHeader'
import CVSkills from './CVSkills'
import CVCompetences from './CVCompetences'
import CVExperience from './CVExperience'
import CVPositions from './CVPositions'
import CVEducation from './CVEducation'
import CVCertsCourses from './CVCertsCourses'
import CVLanguages from './CVLanguages'
import SectionHeading from './SectionHeading'
import CVVideoProfiles from './CVVideoProfiles'

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
})

export default function CVDocument({ data, lang = 'en' }) {
  const cvType = data.cvType || 'technical'
  const lb = getL(lang)

  return (
    <Document>
      <Page size={theme.pageSize} style={styles.page}>

        <CVHeader personal={data.personal} lang={lang} />

        <CVVideoProfiles
          videoProfile={data.videoProfile}
          projectVideoProfile={data.projectVideoProfile}
          lang={lang}
        />

        {data.personal.summary ? (
          <View style={{ marginBottom: theme.spacing.sectionGap }}>
            <SectionHeading>{lb.summary}</SectionHeading>
            <Text style={styles.summary}>{data.personal.summary}</Text>
          </View>
        ) : null}

        {data.skills?.length > 0 && (
          <CVSkills items={data.skills} lang={lang} />
        )}

        {data.competences?.enabled && data.competences.items.length > 0 && (
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

      </Page>
    </Document>
  )
}
