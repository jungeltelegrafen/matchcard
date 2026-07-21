import { View, Text, StyleSheet } from '@react-pdf/renderer'
import { theme } from '../../theme'
import { getL } from '../../utils/labels'
import SectionHeading from './SectionHeading'

const styles = StyleSheet.create({
  item:     { marginBottom: theme.spacing.itemGap + 4 },
  topRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  company:  { fontFamily: theme.fonts.heading, fontSize: theme.fonts.sizes.body, color: theme.colors.primary },
  dates:    { fontSize: theme.fonts.sizes.small, color: theme.colors.muted },
  title:    { fontSize: theme.fonts.sizes.body, color: theme.colors.accent, marginTop: 1, marginBottom: 3 },
  label:    { fontFamily: theme.fonts.heading, fontSize: theme.fonts.sizes.small, color: theme.colors.muted },
  bodyText: { fontSize: theme.fonts.sizes.body, color: theme.colors.muted, lineHeight: 1.4 },
  bullet:   { fontSize: theme.fonts.sizes.body, color: theme.colors.muted, marginLeft: 8 },
})

export default function CVPositions({ positions, lang = 'en' }) {
  if (!positions?.enabled || !positions?.items?.length) return null
  const lb = getL(lang)
  const full = positions.useProjectFormat

  return (
    <View style={{ marginBottom: theme.spacing.sectionGap }}>
      <SectionHeading>{lb.positions}</SectionHeading>
      {positions.items.map((item, i) => (
        <View key={i} style={styles.item}>
          <View style={styles.topRow}>
            <Text style={styles.company}>{item.company}</Text>
            <Text style={styles.dates}>
              {[item.startDate, item.endDate].filter(Boolean).join(' – ')}
            </Text>
          </View>
          {item.title ? <Text style={styles.title}>{item.title}</Text> : null}
          {item.description ? <Text style={styles.bodyText}>{item.description}</Text> : null}

          {full && (item.bullets || []).filter(Boolean).length > 0 && (
            <View style={{ marginTop: 3 }}>
              <Text style={styles.label}>{lb.tasks}</Text>
              {item.bullets.filter(Boolean).map((b, j) => (
                <Text key={j} style={styles.bullet}>• {b}</Text>
              ))}
            </View>
          )}
          {full && item.technologies ? (
            <Text style={{ ...styles.bodyText, marginTop: 3 }}>
              <Text style={styles.label}>{lb.technologies}: </Text>{item.technologies}
            </Text>
          ) : null}
          {full && item.methodologies ? (
            <Text style={{ ...styles.bodyText, marginTop: 3 }}>
              <Text style={styles.label}>{lb.methodologies}: </Text>{item.methodologies}
            </Text>
          ) : null}
        </View>
      ))}
    </View>
  )
}
