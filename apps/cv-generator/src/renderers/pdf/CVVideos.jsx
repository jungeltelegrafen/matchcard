import { View, Text, Link, StyleSheet } from '@react-pdf/renderer'
import { theme } from '../../theme'
import { getL } from '../../utils/labels'
import SectionHeading from './SectionHeading'

const C = theme.colors

const styles = StyleSheet.create({
  wrapper: { marginBottom: theme.spacing.sectionGap },
  card: {
    borderWidth: 0.75, borderColor: '#E5E0D9', borderStyle: 'solid', borderRadius: 4,
    paddingTop: 6, paddingBottom: 7, paddingLeft: 8, paddingRight: 8, marginBottom: 5,
  },
  tag: {
    fontSize: 6, fontFamily: theme.fonts.heading, color: '#C97B4B',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3,
  },
  title: { fontSize: 8.5, fontFamily: theme.fonts.heading, color: C.primary, marginBottom: 2 },
  desc: { fontSize: 6.5, color: C.muted, lineHeight: 1.4, marginBottom: 4 },
  link: { fontSize: 7, color: '#4A90D9' },
})

function placementLabel(pl, lang) {
  const no = lang === 'no', es = lang === 'es'
  return {
    intro: no ? 'Introduksjon' : es ? 'Introducción' : 'Introduction',
    motivation: no ? 'Motivasjon' : es ? 'Motivación' : 'Motivation',
    experience: no ? 'Erfaring' : es ? 'Experiencia' : 'Experience',
    general: no ? 'Generell' : es ? 'General' : 'General',
  }[pl] || ''
}

// Only videos with a real hosted URL make sense in a downloaded PDF (session
// blob: clips are excluded — their links wouldn't resolve for anyone else).
export default function CVVideos({ items = [], lang = 'en' }) {
  const vids = (items || []).filter(v => /^https?:\/\//.test(v.playbackUrl || ''))
  if (!vids.length) return null
  const lb = getL(lang)
  const watch = lang === 'no' ? '▶ Se video' : lang === 'es' ? '▶ Ver vídeo' : '▶ Watch video'

  return (
    <View style={styles.wrapper}>
      <SectionHeading>{lb.videos}</SectionHeading>
      {vids.map((v, i) => (
        <View key={i} style={styles.card}>
          {placementLabel(v.placement, lang) ? (
            <Text style={styles.tag}>{placementLabel(v.placement, lang)}</Text>
          ) : null}
          <Text style={styles.title}>{v.title || 'Video'}</Text>
          {v.description ? <Text style={styles.desc}>{v.description}</Text> : null}
          <Link src={v.playbackUrl} style={styles.link}>{watch} — {v.playbackUrl.replace(/^https?:\/\//, '')}</Link>
        </View>
      ))}
    </View>
  )
}
