import { View, Text, Link, StyleSheet } from '@react-pdf/renderer'
import { theme } from '../../theme'
import SectionHeading from './SectionHeading'
import { getL } from '../../utils/labels'

const styles = StyleSheet.create({
  item: {
    marginBottom: 8,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  badge: {
    fontSize: 8,
    fontFamily: theme.fonts.heading,
    color: '#ffffff',
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  link: {
    fontFamily: theme.fonts.heading,
    fontSize: theme.fonts.sizes.body,
    color: theme.colors.accent,
    textDecoration: 'underline',
  },
  label: {
    fontFamily: theme.fonts.heading,
    fontSize: theme.fonts.sizes.body,
    color: theme.colors.accent,
  },
  desc: {
    fontSize: theme.fonts.sizes.small,
    color: theme.colors.muted,
    lineHeight: 1.4,
  },
})

export default function CVPortfolio({ items, lang = 'en' }) {
  if (!items?.length) return null

  const lb = getL(lang)
  const heading = lb.portfolio

  return (
    <View style={{ marginBottom: theme.spacing.sectionGap }}>
      <SectionHeading>{heading}</SectionHeading>
      {items.map((item, i) => {
        const platformLabel = lb.portfolioCategories?.[item.category] || ''
        const displayLabel  = item.label || item.url || platformLabel

        return (
          <View key={i} style={styles.item}>
            <View style={styles.topRow}>
              {platformLabel ? <Text style={styles.badge}>{platformLabel}</Text> : null}
              {item.url
                ? <Link src={item.url} style={styles.link}>{displayLabel}</Link>
                : <Text style={styles.label}>{displayLabel}</Text>
              }
            </View>
            {item.description ? (
              <Text style={styles.desc}>{item.description}</Text>
            ) : null}
          </View>
        )
      })}
    </View>
  )
}
