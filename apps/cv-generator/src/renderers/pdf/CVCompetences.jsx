import { View, Text, StyleSheet } from '@react-pdf/renderer'
import { theme } from '../../theme'
import SectionHeading from './SectionHeading'
import { getL } from '../../utils/labels'

const styles = StyleSheet.create({
  item: {
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: theme.colors.border,
  },
  requirement: {
    fontFamily: theme.fonts.heading,
    fontSize: 9,
    color: theme.colors.primary,
    marginBottom: 5,
    lineHeight: 1.35,
  },
  metaBlock: {
    backgroundColor: '#F7F4F0',
    borderRadius: 2,
    padding: 5,
    marginBottom: 5,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metaGroup: {
    flexDirection: 'column',
    minWidth: 60,
  },
  metaLabel: {
    fontSize: 6.5,
    fontFamily: theme.fonts.heading,
    color: theme.colors.muted,
    textTransform: 'uppercase',
    marginBottom: 1,
  },
  metaValue: {
    fontSize: 8,
    color: theme.colors.text,
  },
  projectsBlock: {
    flexDirection: 'row',
    marginTop: 2,
  },
  projectsLabel: {
    fontSize: 7,
    fontFamily: theme.fonts.heading,
    color: theme.colors.muted,
    marginRight: 4,
    width: 50,
  },
  projectsValue: {
    fontSize: 7,
    color: theme.colors.text,
    flex: 1,
  },
  detail: {
    fontSize: 8,
    color: theme.colors.muted,
    lineHeight: 1.45,
  },
  levelDots: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 1,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
})

function LevelDots({ level }) {
  const n = parseInt(level) || 0
  if (!n) return null
  return (
    <View style={styles.levelDots}>
      {[1,2,3,4,5].map(i => (
        <View key={i} style={[styles.dot, { backgroundColor: i <= n ? theme.colors.accent : '#DDD8D0' }]} />
      ))}
    </View>
  )
}

export default function CVCompetences({ competences, lang = 'en' }) {
  const lb = getL(lang)
  const { projectLabel, items } = competences
  if (!items?.length) return null

  const title = projectLabel ? `${lb.competences} — ${projectLabel}` : lb.competences

  return (
    <View style={{ marginBottom: theme.spacing.sectionGap }}>
      <SectionHeading>{title}</SectionHeading>

      {items.map((item, i) => (
        <View key={i} style={[styles.item, i === items.length - 1 && { borderBottomWidth: 0, paddingBottom: 0, marginBottom: 0 }]}>

          {item.requirement ? <Text style={styles.requirement}>{item.requirement}</Text> : null}

          <View style={styles.metaBlock}>
            {item.level ? (
              <View style={styles.metaGroup}>
                <Text style={styles.metaLabel}>Level</Text>
                <LevelDots level={item.level} />
              </View>
            ) : null}
            {item.lastUsed ? (
              <View style={styles.metaGroup}>
                <Text style={styles.metaLabel}>Last used</Text>
                <Text style={styles.metaValue}>{item.lastUsed}</Text>
              </View>
            ) : null}
            {item.yearsRelevant ? (
              <View style={styles.metaGroup}>
                <Text style={styles.metaLabel}>Total years</Text>
                <Text style={styles.metaValue}>{item.yearsRelevant}</Text>
              </View>
            ) : null}
            {item.projects ? (
              <View style={[styles.metaGroup, { flex: 1 }]}>
                <Text style={styles.metaLabel}>Projects</Text>
                <Text style={styles.metaValue}>{item.projects}</Text>
              </View>
            ) : null}
          </View>

          {item.detail ? <Text style={styles.detail}>{item.detail}</Text> : null}

        </View>
      ))}
    </View>
  )
}
