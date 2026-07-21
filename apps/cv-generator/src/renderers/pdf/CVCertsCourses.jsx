import { View, Text, StyleSheet } from '@react-pdf/renderer'
import { theme } from '../../theme'
import { getL } from '../../utils/labels'
import SectionHeading from './SectionHeading'

const styles = StyleSheet.create({
  item:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  name:   { fontFamily: theme.fonts.heading, fontSize: theme.fonts.sizes.body, color: theme.colors.text },
  sub:    { fontSize: theme.fonts.sizes.small, color: theme.colors.muted },
  year:   { fontSize: theme.fonts.sizes.small, color: theme.colors.muted },
})

function Item({ name, sub, year }) {
  return (
    <View style={styles.item}>
      <View>
        <Text style={styles.name}>{name}</Text>
        {sub ? <Text style={styles.sub}>{sub}</Text> : null}
      </View>
      {year ? <Text style={styles.year}>{year}</Text> : null}
    </View>
  )
}

export default function CVCertsCourses({ certifications, courses, lang = 'en' }) {
  const hasCerts   = certifications?.length > 0
  const hasCourses = courses?.length > 0
  if (!hasCerts && !hasCourses) return null
  const lb = getL(lang)

  return (
    <View style={{ marginBottom: theme.spacing.sectionGap }}>
      <SectionHeading>{lb.certsCourses}</SectionHeading>
      {(certifications || []).map((item, i) => (
        <Item key={`c-${i}`} name={item.name} sub={item.issuer} year={item.year} />
      ))}
      {(courses || []).map((item, i) => (
        <Item key={`k-${i}`} name={item.name} sub={item.institution} year={item.year} />
      ))}
    </View>
  )
}
