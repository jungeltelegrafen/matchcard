import { View, Text, Link, StyleSheet } from '@react-pdf/renderer'
import { theme } from '../../theme'
import { getL } from '../../utils/labels'
import { mainBlockVideos } from '../../utils/videoAnchors'
import SectionHeading from './SectionHeading'

const C = theme.colors

const styles = StyleSheet.create({
  wrapper: { marginBottom: theme.spacing.sectionGap },
  // A warm-tinted card with a rounded corner and an accent left rule — a bit of
  // visual lift so it reads as a video (there's no thumbnail). (react-pdf has no
  // box-shadow, so the accent rule + tint stand in for the editor's shadow.)
  card: {
    backgroundColor: '#FBF7F3',
    borderWidth: 0.75, borderColor: '#EBE3D9', borderStyle: 'solid',
    borderLeftWidth: 3, borderLeftColor: '#C97B4B', borderRadius: 8,
    paddingTop: 7, paddingBottom: 8, paddingLeft: 10, paddingRight: 10, marginBottom: 6,
  },
  title: { fontSize: 9, fontFamily: theme.fonts.heading, color: '#C97B4B', marginBottom: 2 },
  desc: { fontSize: 6.5, color: C.muted, lineHeight: 1.4, marginBottom: 4 },
  link: { fontSize: 7, color: '#4A90D9' },
})

// Only videos with a real hosted URL make sense in a downloaded PDF (session
// blob: clips are excluded — their links wouldn't resolve for anyone else).
export const hostedVideo = v => /^https?:\/\//.test(v?.playbackUrl || '')

// Reusable card renderer (no section heading) — used by the main block and
// inline inside a unit. Returns an array of <View>s. Titles lead with "Video:"
// so it's obvious it's a video without a thumbnail.
export function videoCards(vids = [], lang = 'en') {
  const watch = getL(lang).watchVideo
  return vids.map((v, i) => (
    <View key={v._id || i} style={styles.card}>
      <Text style={styles.title}>{v.title ? `Video: ${v.title}` : 'Video'}</Text>
      {v.description ? <Text style={styles.desc}>{v.description}</Text> : null}
      <Link src={v.playbackUrl} style={styles.link}>{watch} — {v.playbackUrl.replace(/^https?:\/\//, '')}</Link>
    </View>
  ))
}

// Main "Video Presentations" block: hosted videos NOT anchored to a rendered unit.
export default function CVVideos({ items = [], unitIds = [], lang = 'en' }) {
  const vids = mainBlockVideos(items, unitIds).map(({ v }) => v).filter(hostedVideo)
  if (!vids.length) return null
  const lb = getL(lang)

  return (
    <View style={styles.wrapper}>
      <SectionHeading>{lb.videos}</SectionHeading>
      {videoCards(vids, lang)}
    </View>
  )
}
