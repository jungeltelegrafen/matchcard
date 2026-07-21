import { View, Text, StyleSheet } from '@react-pdf/renderer'
import { theme } from '../../theme'
import { getL } from '../../utils/labels'
import SectionHeading from './SectionHeading'

const styles = StyleSheet.create({
  row:   { flexDirection: 'row', flexWrap: 'wrap', marginBottom: theme.spacing.itemGap },
  label: { fontFamily: theme.fonts.heading, fontSize: theme.fonts.sizes.body, marginRight: 6 },
  items: { fontSize: theme.fonts.sizes.body, color: theme.colors.muted, flex: 1 },
})

export default function CVLanguages({ items, lang = 'en' }) {
  if (!items?.length) return null
  const lb = getL(lang)
  return (
    <View style={{ marginBottom: theme.spacing.sectionGap }}>
      <SectionHeading>{lb.languages}</SectionHeading>
      <View style={styles.row}>
        <Text style={styles.items}>
          {items.map(l => l.proficiency ? `${l.language} (${l.proficiency})` : l.language).join('   ·   ')}
        </Text>
      </View>
    </View>
  )
}
