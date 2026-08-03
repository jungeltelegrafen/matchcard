import { View, Text, Image, StyleSheet } from '@react-pdf/renderer'
import { theme } from '../../theme'
import { getL } from '../../utils/labels'

const LABEL_W = 72   // pt — label column width

const styles = StyleSheet.create({
  header: {
    flexDirection: 'column',
    marginBottom: theme.spacing.sectionGap,
    paddingBottom: theme.spacing.itemGap,
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.accent,
  },
  // No-logo layout: info on the left, photo to its right (beside the name).
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  left: {},
  leftFlex: { flex: 1, paddingRight: 14 },
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
  // Brand band above the name — logo left, profile photo right, similar heights.
  brandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  logo: {
    maxWidth: 200,
    height: 58,
    objectFit: 'contain',
  },
  photo: {
    width: 60,
    height: 60,
    borderRadius: 30,
    objectFit: 'cover',
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

// Name + job title + practical-info rows. `style` lets the no-logo layout make
// it flex so the photo sits to its right.
function HeaderInfo({ personal, lb, showContact, style }) {
  return (
    <View style={style}>
      <Text style={styles.name}>
        {[personal.firstName, personal.lastName].filter(Boolean).join(' ')}
      </Text>
      {personal.title ? <Text style={styles.jobTitle}>{personal.title}</Text> : null}

      <InfoRow label={lb.address}          value={personal.location} />
      <InfoRow label={lb.educationSummary} value={personal.educationSummary} />
      <InfoRow label={lb.itSince}          value={personal.itExperienceSince} />
      {showContact && <InfoRow label={lb.phone}    value={personal.phone} />}
      {showContact && <InfoRow label={lb.email}    value={personal.email} />}
      {showContact && <InfoRow label={lb.linkedin} value={personal.linkedin} />}
      <InfoRow label={lb.availableFrom}    value={personal.availableFrom} />
      <InfoRow label={lb.workPreference}   value={personal.workPreference} />
    </View>
  )
}

export default function CVHeader({ personal, lang = 'en', branding = {} }) {
  const lb = getL(lang)
  const showContact = personal.showContactInfo !== false
  const hasLogo = Boolean(branding.logo)
  const hasPhoto = Boolean(branding.profilePicture)

  // With a logo: brand band on top (logo left, photo right), info below.
  if (hasLogo) {
    return (
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <Image style={styles.logo} src={branding.logo} />
          {hasPhoto ? <Image style={styles.photo} src={branding.profilePicture} /> : <View />}
        </View>
        <HeaderInfo personal={personal} lb={lb} showContact={showContact} style={styles.left} />
      </View>
    )
  }

  // No logo: info on the left, photo (if any) to its right — keeps the header
  // balanced when branding is excluded.
  return (
    <View style={[styles.header, styles.headerRow]}>
      <HeaderInfo personal={personal} lb={lb} showContact={showContact} style={styles.leftFlex} />
      {hasPhoto ? <Image style={styles.photo} src={branding.profilePicture} /> : null}
    </View>
  )
}
