import { View, Text, Link, StyleSheet } from '@react-pdf/renderer'
import { theme } from '../../theme'
import { getL } from '../../utils/labels'

const GENERIC_MOCK = {
  enabled: true,
  title: 'Professional Introduction',
  description: 'An overview of professional background, core skills, and approach to work.',
  videoUrl: 'https://video.cloudflare.com/intro-placeholder',
  duration: '3:12',
}

const PROJECT_MOCK = {
  enabled: true,
  projectName: 'Accenture — Cloud Migration 2025',
  title: 'Project Introduction',
  description: 'Tailored presentation of relevant experience for this specific engagement.',
  videoUrl: 'https://video.cloudflare.com/project-placeholder',
  duration: '2:48',
}

const C = theme.colors
const styles = StyleSheet.create({
  wrapper: {
    marginBottom: theme.spacing.sectionGap,
  },
  grid: {
    flexDirection: 'row',
  },
  cardLeft: {
    flex: 1,
    marginRight: 7,
    borderWidth: 0.75,
    borderColor: '#E5E0D9',
    borderStyle: 'solid',
    borderRadius: 4,
  },
  cardRight: {
    flex: 1,
    borderWidth: 0.75,
    borderColor: '#E5E0D9',
    borderStyle: 'solid',
    borderRadius: 4,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F4F0',
    paddingTop: 3,
    paddingBottom: 3,
    paddingLeft: 6,
    paddingRight: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E0D9',
    borderBottomStyle: 'solid',
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
  },
  projectName: {
    fontSize: 6,
    color: '#C97B4B',
    fontFamily: theme.fonts.heading,
    marginLeft: 4,
  },
  thumb: {
    height: 44,
    backgroundColor: '#1A1A2E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbText: {
    fontSize: 7,
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 1,
  },
  body: {
    paddingTop: 5,
    paddingBottom: 6,
    paddingLeft: 6,
    paddingRight: 6,
  },
  title: {
    fontSize: 8,
    fontFamily: theme.fonts.heading,
    color: C.primary,
    marginBottom: 2,
  },
  desc: {
    fontSize: 6.5,
    color: C.muted,
    lineHeight: 1.4,
    marginBottom: 4,
  },
  link: {
    fontSize: 6.5,
    color: '#4A90D9',
  },
})

function VideoCard({ profile, type, lang, isLeft }) {
  const isProject = type === 'project'
  const videoUrl  = profile.videoUrl || '#'

  return (
    <View style={isLeft ? styles.cardLeft : styles.cardRight}>
      <View style={styles.typeBadge}>
        <View style={isProject ? styles.dotProject : styles.dotGeneric} />
        <Text style={styles.typeLabel}>
          {isProject
            ? (lang === 'no' ? 'FOR PROSJEKT' : 'FOR PROJECT')
            : (lang === 'no' ? 'GENERELL' : 'GENERIC')}
        </Text>
        {isProject && profile.projectName && (
          <Text style={styles.projectName}>{profile.projectName}</Text>
        )}
      </View>

      <View style={styles.thumb}>
        <Text style={styles.thumbText}>
          {profile.duration ? `▶  ${profile.duration}` : '▶  VIDEO'}
        </Text>
      </View>

      <View style={styles.body}>
        <Text style={styles.title}>{profile.title}</Text>
        {profile.description ? (
          <Text style={styles.desc}>{profile.description}</Text>
        ) : null}
        <Link src={videoUrl} style={styles.link}>
          {lang === 'no' ? '▶ Se video' : '▶ Watch video'}
        </Link>
      </View>
    </View>
  )
}

export default function CVVideoProfiles({ videoProfile, projectVideoProfile, lang }) {
  const generic = (videoProfile?.enabled ? videoProfile : null) ?? GENERIC_MOCK
  const project = (projectVideoProfile?.enabled ? projectVideoProfile : null) ?? PROJECT_MOCK

  return (
    <View style={styles.wrapper}>
      <View style={styles.grid}>
        <VideoCard profile={generic} type="generic" lang={lang} isLeft />
        <VideoCard profile={project} type="project" lang={lang} />
      </View>
    </View>
  )
}
