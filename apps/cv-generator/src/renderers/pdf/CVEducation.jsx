import { View, Text, StyleSheet } from '@react-pdf/renderer'
import { theme } from '../../theme'
import { getL } from '../../utils/labels'
import SectionHeading from './SectionHeading'

const styles = StyleSheet.create({
  item: { marginBottom: theme.spacing.itemGap },
  row:  { flexDirection: 'row', justifyContent: 'space-between' },
  degree:      { fontFamily: theme.fonts.heading, fontSize: theme.fonts.sizes.body },
  institution: { fontSize: theme.fonts.sizes.body, color: theme.colors.muted },
  date:        { fontSize: theme.fonts.sizes.small, color: theme.colors.muted },
})

export default function CVEducation({ items, lang = 'en' }) {
  const lb = getL(lang)
  return (
    <View style={{ marginBottom: theme.spacing.sectionGap }}>
      <SectionHeading>{lb.education}</SectionHeading>
      {items.map((item, i) => (
        <View key={i} style={styles.item}>
          <View style={styles.row}>
            <Text style={styles.degree}>{item.degree}{item.field ? ` — ${item.field}` : ''}</Text>
            <Text style={styles.date}>{[item.startDate, item.endDate].filter(Boolean).join(' – ')}</Text>
          </View>
          {item.institution ? <Text style={styles.institution}>{item.institution}</Text> : null}
        </View>
      ))}
    </View>
  )
}
