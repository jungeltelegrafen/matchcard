import { Paragraph, TextRun } from 'docx'
import { theme } from '../../theme'
import { getL } from '../../utils/labels'
import { hex, rule, sectionHeading } from './buildUtils'

function infoRow(label, value, { size = 17 } = {}) {
  if (!value) return null
  return new Paragraph({
    children: [
      new TextRun({ text: `${label}: `, bold: true, size, color: hex(theme.colors.muted), font: 'Calibri' }),
      new TextRun({ text: value, size, color: hex(theme.colors.muted), font: 'Calibri' }),
    ],
    spacing: { before: 0, after: 52 },
  })
}

export function buildHeader(personal, lang = 'en') {
  const lb = getL(lang)
  const showContact = personal.showContactInfo !== false
  const paras = []

  // ── Name ─────────────────────────────────────────────────────────────────────
  const fullName = [personal.firstName, personal.lastName].filter(Boolean).join(' ')
  if (fullName) {
    paras.push(new Paragraph({
      children: [new TextRun({ text: fullName, bold: true, size: 52, color: hex(theme.colors.primary), font: 'Calibri' })],
      spacing: { after: 30 },
    }))
  }

  // ── Job title ─────────────────────────────────────────────────────────────────
  if (personal.title) {
    paras.push(new Paragraph({
      children: [new TextRun({ text: personal.title, size: 26, color: hex(theme.colors.accent), font: 'Calibri' })],
      spacing: { after: 80 },
    }))
  }

  // ── Info rows (label TAB value, left-aligned at tab stop) ────────────────────
  const rows = [
    infoRow(lb.address,          personal.location),
    infoRow(lb.educationSummary, personal.educationSummary),
    infoRow(lb.itSince,          personal.itExperienceSince),
    showContact ? infoRow(lb.phone,    personal.phone)    : null,
    showContact ? infoRow(lb.email,    personal.email)    : null,
    showContact ? infoRow(lb.linkedin, personal.linkedin) : null,
    infoRow(lb.availableFrom,    personal.availableFrom),
    infoRow(lb.workPreference,   personal.workPreference),
  ].filter(Boolean)

  paras.push(...rows)

  // ── Accent rule ───────────────────────────────────────────────────────────────
  paras.push(rule({ before: 80, after: 140 }))

  // ── Summary ───────────────────────────────────────────────────────────────────
  if (personal.summary) {
    paras.push(sectionHeading(lb.summary, { before: 0, after: 100 }))
    paras.push(new Paragraph({
      children: [new TextRun({ text: personal.summary, size: 20, color: hex(theme.colors.text), font: 'Calibri' })],
      spacing: { after: 80 },
    }))
  }

  return paras
}
