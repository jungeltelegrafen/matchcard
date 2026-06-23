import { Pool } from 'pg'
import { NextResponse } from 'next/server'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

const REPO = 'jungeltelegrafen/matchcard'

const TYPE_META = {
  bug:     { emoji: '🐛', label: 'Noe funker ikke', ghLabels: ['bug', 'feedback'] },
  feature: { emoji: '💡', label: 'Ønsker meg',      ghLabels: ['enhancement', 'feedback'] },
  general: { emoji: '💬', label: 'Generelt',         ghLabels: ['feedback'] },
}

export async function GET() {
  return NextResponse.json({ ok: true })
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}))
  const { type, message, name, briefRole, page } = body

  if (!type || !message?.trim()) {
    return NextResponse.json({ error: 'Missing type or message' }, { status: 400 })
  }

  const meta = TYPE_META[type] || TYPE_META.general
  let github_issue_number = null
  let github_issue_url = null

  // ── GitHub Issue ────────────────────────────────────────────────────────────
  const token = process.env.GITHUB_FEEDBACK_TOKEN
  if (token) {
    const title = `${meta.emoji} ${message.trim().slice(0, 72)}${message.trim().length > 72 ? '…' : ''}`
    const issueBody = buildIssueBody({ type, meta, message, name, briefRole, page })

    // Try with labels first; fall back without if they don't exist in the repo
    const attemptCreate = async (labels) => {
      const res = await fetch(`https://api.github.com/repos/${REPO}/issues`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title, body: issueBody, labels }),
      })
      return res
    }

    let ghRes = await attemptCreate(meta.ghLabels)
    if (ghRes.status === 422) ghRes = await attemptCreate([]) // labels don't exist yet

    if (ghRes.ok) {
      const issue = await ghRes.json()
      github_issue_number = issue.number
      github_issue_url = issue.html_url
    } else {
      console.error('GitHub issue creation failed:', ghRes.status, await ghRes.text())
    }
  }

  // ── Supabase ────────────────────────────────────────────────────────────────
  try {
    await pool.query(
      `INSERT INTO feedback (type, message, name, github_issue_number, github_issue_url, page, brief_role)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        type,
        message.trim(),
        name?.trim() || null,
        github_issue_number,
        github_issue_url,
        page || '/behovsavklarer',
        briefRole || null,
      ]
    )
  } catch (err) {
    // DB failure doesn't block the response — GitHub issue was already created
    console.error('Supabase feedback write failed:', err.message)
  }

  return NextResponse.json({ ok: true, github_issue_number, github_issue_url })
}

function buildIssueBody({ type, meta, message, name, briefRole, page }) {
  const from = name?.trim() || 'Anonym'
  const context = briefRole ? `Rolle i skjemaet: **${briefRole}**` : 'Skjemaet var tomt'
  const ts = new Date().toLocaleString('no-NO', { timeZone: 'Europe/Oslo' })

  return `## ${meta.emoji} ${meta.label}

**Fra:** ${from}
**Side:** ${page || '/behovsavklarer'}
**Kontekst:** ${context}
**Tidspunkt:** ${ts}

---

### Melding

${message.trim()}

---

*Sendt via matchcard.no*`
}
