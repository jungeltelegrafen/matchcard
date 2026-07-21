import { View, Text, StyleSheet } from '@react-pdf/renderer'
import { theme } from '../../theme'
import SectionHeading from './SectionHeading'
import { getL } from '../../utils/labels'

const styles = StyleSheet.create({
  item: {
    marginBottom: theme.spacing.itemGap + 4,
    paddingBottom: theme.spacing.itemGap,
    borderBottomWidth: 0.5,
    borderBottomColor: theme.colors.border,
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  company: { fontFamily: theme.fonts.heading, fontSize: theme.fonts.sizes.body, color: theme.colors.primary },
  date:    { fontSize: theme.fonts.sizes.small, color: theme.colors.muted },
  roleRow: { flexDirection: 'row', marginBottom: 4 },
  fieldBlock: { marginTop: 5 },
  label:   { fontSize: 7, fontFamily: theme.fonts.heading, color: theme.colors.muted, textTransform: 'uppercase', marginBottom: 1 },
  value:   { fontSize: theme.fonts.sizes.body, color: theme.colors.text, lineHeight: 1.4 },
  bullet:  { fontSize: theme.fonts.sizes.body, marginTop: 2, marginLeft: 8, color: theme.colors.text },
})

export default function CVExperience({ items, cvType = 'technical', lang = 'en' }) {
  const lb = getL(lang)
  const isMgmt = cvType === 'management'

  return (
    <View style={{ marginBottom: theme.spacing.sectionGap }}>
      <SectionHeading>{lb.experience}</SectionHeading>
      {items.map((item, i) => (
        <View key={i} style={[styles.item, i === items.length - 1 && { borderBottomWidth: 0 }]}>

          <View style={styles.topRow}>
            <Text style={styles.company}>{item.company}{item.location ? `, ${item.location}` : ''}</Text>
            <Text style={styles.date}>{item.startDate}{item.endDate ? ` – ${item.endDate}` : ''}</Text>
          </View>

          {item.role ? (
            <View style={styles.fieldBlock}>
              <Text style={styles.label}>{lb.role}</Text>
              <Text style={styles.value}>{item.role}</Text>
            </View>
          ) : null}

          {item.description ? (
            <View style={styles.fieldBlock}>
              <Text style={styles.label}>{lb.projectDesc}</Text>
              <Text style={styles.value}>{item.description}</Text>
            </View>
          ) : null}

          {item.bullets?.filter(Boolean).length > 0 ? (
            <View style={styles.fieldBlock}>
              <Text style={styles.label}>{lb.tasks}</Text>
              {item.bullets.filter(Boolean).map((b, j) => (
                <Text key={j} style={styles.bullet}>• {b}</Text>
              ))}
            </View>
          ) : null}

          {!isMgmt && item.technologies ? (
            <View style={styles.fieldBlock}>
              <Text style={styles.label}>{lb.technologies}</Text>
              <Text style={styles.value}>{item.technologies}</Text>
            </View>
          ) : null}

          {isMgmt && item.methodologies ? (
            <View style={styles.fieldBlock}>
              <Text style={styles.label}>{lb.methodologies}</Text>
              <Text style={styles.value}>{item.methodologies}</Text>
            </View>
          ) : null}

          {isMgmt && item.result ? (
            <View style={styles.fieldBlock}>
              <Text style={styles.label}>{lb.result}</Text>
              <Text style={styles.value}>{item.result}</Text>
            </View>
          ) : null}

        </View>
      ))}
    </View>
  )
}
