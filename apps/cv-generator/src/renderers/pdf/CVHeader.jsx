import { View, Text, Image, StyleSheet } from '@react-pdf/renderer'
import { theme } from '../../theme'
import { getL } from '../../utils/labels'

const LABEL_W = 72   // pt — label column width

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sectionGap,
    paddingBottom: theme.spacing.itemGap,
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.accent,
  },
  left: { flex: 1 },
  name: {
    fontSize: theme.fonts.sizes.name,
    fontFamily: theme.fonts.heading,
    color: theme.colors.primary,
  },
  jobTitle: {
    fontSize: theme.fonts.sizes.title,
    color: theme.colors.accent,
    marginTop: 4,
    marginBottom: 5,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 2,
  },
  infoLabel: {
    width: LABEL_W,
    fontSize: 7,
    fontFamily: theme.fonts.heading,
    color: theme.colors.muted,
    flexShrink: 0,
  },
  infoValue: {
    flex: 1,
    fontSize: 7,
    color: theme.colors.muted,
  },
  logo: {
    width: 80,
    height: 40,
    objectFit: 'contain',
  },
})

function InfoRow({ label, value }) {
  if (!value) return null
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  )
}

export default function CVHeader({ personal, lang = 'en' }) {
  const lb = getL(lang)
  const showContact = personal.showContactInfo !== false

  return (
    <View style={styles.header}>
      <View style={styles.left}>
        <Text style={styles.name}>
          {[personal.firstName, personal.lastName].filter(Boolean).join(' ')}
        </Text>
        {personal.title ? <Text style={styles.jobTitle}>{personal.title}</Text> : null}

        <InfoRow label={lb.address}          value={personal.location} />
        <InfoRow label={lb.educationSummary} value={personal.educationSummary} />
        <InfoRow label={lb.itSince}          value={personal.itExperienceSince} />
        {showContact && <InfoRow label={lb.phone}   value={personal.phone} />}
        {showContact && <InfoRow label={lb.email}   value={personal.email} />}
        {showContact && <InfoRow label={lb.linkedin} value={personal.linkedin} />}
        <InfoRow label={lb.availableFrom}    value={personal.availableFrom} />
        <InfoRow label={lb.workPreference}   value={personal.workPreference} />
      </View>
      <Image style={styles.logo} src={theme.logoPath} />
    </View>
  )
}
