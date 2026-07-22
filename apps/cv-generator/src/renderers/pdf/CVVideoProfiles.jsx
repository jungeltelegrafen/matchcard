import { View, Text, Link, StyleSheet } from '@react-pdf/renderer'
import { theme } from '../../theme'

const C = theme.colors

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: theme.spacing.sectionGap,
  },
  grid: {
    flexDirection: 'row',
    gap: 8,
  },
  card: {
    flex: 1,
    borderWidth: 0.75,
    borderColor: '#E5E0D9',
    borderStyle: 'solid',
    borderRadius: 4,
    paddingTop: 6,
    paddingBottom: 7,
    paddingLeft: 7,
    paddingRight: 7,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  dotGeneric: {
    width: 5,
    height: 5,
    borderRadius: 5,
    backgroundColor: '#4A90D9',
    marginRight: 4,
  },
  dotProject: {
    width: 5,
    height: 5,
    borderRadius: 5,
    backgroundColor: '#C97B4B',
    marginRight: 4,
  },
  typeLabel: {
    fontSize: 6,
    fontFamily: theme.fonts.heading,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  projectName: {
    fontSize: 6,
    color: '#C97B4B',
    fontFamily: theme.fonts.heading,
    marginLeft: 4,
  },
  title: {
    fontSize: 8,
    fontFamily: theme.fonts.heading,
    color: C.primary,
    marginBottom: 3,
  },
  desc: {
    fontSize: 6.5,
    color: C.muted,
    lineHeight: 1.4,
    marginBottom: 5,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playLabel: {
    fontSize: 6.5,
    color: '#4A90D9',
    marginRight: 3,
  },
  link: {
    fontSize: 6.5,
    color: '#4A90D9',
  },
})

function VideoCard({ profile, type, lang, isLeft }) {
  const isProject = type === 'project'
  const videoUrl  = profile.videoUrl || '#'
  const watchLabel = lang === 'no' ? '▶ Se video' : '▶ Watch video'

  return (
    <View style={styles.card}>
      <View style={styles.typeBadge}>
        <View style={isProject ? styles.dotProject : styles.dotGeneric} />
        <Text style={styles.typeLabel}>
          {isProject
            ? (lang === 'no' ? 'For prosjekt' : 'For project')
            : (lang === 'no' ? 'Generell' : 'Generic')}
        </Text>
        {isProject && profile.projectName ? (
          <Text style={styles.projectName}>— {profile.projectName}</Text>
        ) : null}
      </View>

      <Text style={styles.title}>{profile.title}</Text>

      {profile.description ? (
        <Text style={styles.desc}>{profile.description}</Text>
      ) : null}

      <View style={styles.linkRow}>
        <Link src={videoUrl} style={styles.link}>{watchLabel}</Link>
      </View>
    </View>
  )
}

export default function CVVideoProfiles({ videoProfile, projectVideoProfile, lang }) {
  const generic = videoProfile?.enabled ? videoProfile : null
  const project = projectVideoProfile?.enabled ? projectVideoProfile : null

  if (!generic && !project) return null

  return (
    <View style={styles.wrapper}>
      <View style={styles.grid}>
        {generic && <VideoCard profile={generic} type="generic" lang={lang} isLeft />}
        {project && <VideoCard profile={project} type="project" lang={lang} />}
      </View>
    </View>
  )
}
