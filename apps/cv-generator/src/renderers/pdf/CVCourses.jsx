import { View, Text, StyleSheet } from '@react-pdf/renderer'
import { theme } from '../../theme'
import { getL } from '../../utils/labels'
import SectionHeading from './SectionHeading'

const styles = StyleSheet.create({
  item: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  name:        { fontFamily: theme.fonts.heading, fontSize: theme.fonts.sizes.body, color: theme.colors.text },
  institution: { fontSize: theme.fonts.sizes.small, color: theme.colors.muted },
  year:        { fontSize: theme.fonts.sizes.small, color: theme.colors.muted },
})

export default function CVCourses({ items, lang = 'en' }) {
  if (!items?.length) return null
  const lb = getL(lang)
  return (
    <View style={{ marginBottom: theme.spacing.sectionGap }}>
      <SectionHeading>{lb.courses}</SectionHeading>
      {items.map((item, i) => (
        <View key={i} style={styles.item}>
          <View>
            <Text style={styles.name}>{item.name}</Text>
            {item.institution ? <Text style={styles.institution}>{item.institution}</Text> : null}
          </View>
          {item.year ? <Text style={styles.year}>{item.year}</Text> : null}
        </View>
      ))}
    </View>
  )
}
