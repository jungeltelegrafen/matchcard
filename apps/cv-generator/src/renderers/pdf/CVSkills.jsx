import { View, Text, StyleSheet } from '@react-pdf/renderer'
import { theme } from '../../theme'
import { getL } from '../../utils/labels'
import SectionHeading from './SectionHeading'

const styles = StyleSheet.create({
  row:      { flexDirection: 'row', flexWrap: 'wrap', marginBottom: theme.spacing.itemGap },
  category: { fontFamily: theme.fonts.heading, fontSize: theme.fonts.sizes.body, marginRight: 6 },
  items:    { fontSize: theme.fonts.sizes.body, color: theme.colors.muted, flex: 1 },
})

export default function CVSkills({ items, lang = 'en' }) {
  if (!items?.length) return null
  const lb = getL(lang)
  return (
    <View style={{ marginBottom: theme.spacing.sectionGap }}>
      <SectionHeading>{lb.skills}</SectionHeading>
      {items.map((group, i) => (
        <View key={i} style={styles.row}>
          <Text style={styles.category}>{group.category}:</Text>
          <Text style={styles.items}>{group.items.join(', ')}</Text>
        </View>
      ))}
    </View>
  )
}
