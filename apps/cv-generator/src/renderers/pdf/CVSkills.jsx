import { View, Text, StyleSheet } from '@react-pdf/renderer'
import { theme } from '../../theme'
import { getL } from '../../utils/labels'
import SectionHeading from './SectionHeading'
import { videoCards, hostedVideo } from './CVVideos'
import { videoItemsForUnit } from '../../utils/videoAnchors'

const styles = StyleSheet.create({
  row:      { flexDirection: 'row', marginBottom: theme.spacing.itemGap },
  category: { fontFamily: theme.fonts.heading, fontSize: theme.fonts.sizes.body, marginRight: 8 },
  items:    { fontSize: theme.fonts.sizes.body, color: theme.colors.muted, flex: 1 },
})

export default function CVSkills({ items, videos = [], lang = 'en' }) {
  if (!items?.length) return null
  const lb = getL(lang)
  // Equal indentation: a fixed label column sized to the widest category (bold,
  // ~0.55em/char), clamped so the items keep room — mirrors the share page so
  // every row's items line up in one column instead of indenting per label.
  const bodySize = theme.fonts.sizes.body
  const maxLen = items.reduce((m, g) => Math.max(m, (g.category || '').length), 0)
  const labelWidth = Math.min(Math.max(maxLen * bodySize * 0.55 + 6, 78), 165)
  return (
    <View style={{ marginBottom: theme.spacing.sectionGap }}>
      <SectionHeading>{lb.skills}</SectionHeading>
      {items.map((group, i) => (
        <View key={i} style={styles.row}>
          <Text style={[styles.category, { width: labelWidth }]}>{group.category}:</Text>
          <Text style={styles.items}>{group.items.join(', ')}</Text>
        </View>
      ))}
      {videoCards(videoItemsForUnit(videos, 'skills').filter(hostedVideo), lang)}
    </View>
  )
}
