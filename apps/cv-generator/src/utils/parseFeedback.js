const SECTION_RULES = [
  { pattern: /summary|profile|introduction|overview|opening|about you|portfolio|github/i,          section: 'Summary',        key: 'summary' },
  { pattern: /education|degree|university|ntnu|msc|bsc|academic|study|date/i,                      section: 'Education',      key: 'education' },
  { pattern: /languages? section|norwegian|multilingual/i,                                          section: 'Languages',      key: 'languages' },
  { pattern: /skill|technology|tech stack|tool|framework|language|stack/i,                          section: 'Skills',         key: 'skills' },
  { pattern: /certif|certificate|award|recognition/i,                                               section: 'Certifications', key: 'certifications' },
  { pattern: /hackathon|project|client|freelance|metric|result|role|experience|work|company|employ|recruit|bullet|concrete|number|quantif/i, section: 'Experience', key: 'experience' },
]

function detectSection(text) {
  for (const rule of SECTION_RULES) {
    if (rule.pattern.test(text)) return { section: rule.section, key: rule.key }
  }
  return { section: 'General', key: 'general' }
}

export function parseFeedbackFromAI(text) {
  const items = []
  const lines = text.split('\n')
  let mode = 'neutral' // 'neutral' | 'positive' | 'improvement'

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    // Section-mode detection — must check before processing content
    if (/working.?well|strengths?|what.s.good|what.s.working|✅/i.test(line)) {
      mode = 'positive'
      continue
    }
    if (/areas? to improve|areas? for improve|gaps?|⚠️|issues?|concerns?|suggestions?/i.test(line)) {
      mode = 'improvement'
      continue
    }
    // Horizontal rule resets mode
    if (/^---+$/.test(line)) {
      mode = 'neutral'
      continue
    }

    if (!line) continue

    // Skip positive sections entirely
    if (mode === 'positive') continue

    // --- Pattern 1: "1. **Title** — description" on one line
    const inlineMatch = line.match(/^\d+\.\s+\*\*([^*\n]+)\*\*\s*[—–-]\s*(.+)/)
    if (inlineMatch) {
      const title = inlineMatch[1].trim()
      let desc = inlineMatch[2].trim()
      while (i + 1 < lines.length && lines[i + 1].trim() && !/^\d+\./.test(lines[i + 1].trim())) {
        i++
        desc += ' ' + lines[i].trim()
      }
      desc = clean(desc)
      const { section, key } = detectSection(`${title} ${desc}`)
      items.push(makeItem(items.length, section, key, title, desc))
      continue
    }

    // --- Pattern 2: "1. **Title**" — number outside bold, description on next lines (most common Haiku format)
    const numBoldMatch = line.match(/^\d+\.\s+\*\*(.+?)\*\*\s*$/)
    if (numBoldMatch) {
      const title = numBoldMatch[1].trim()
      const descLines = []
      let j = i + 1
      while (j < lines.length) {
        const next = lines[j].trim()
        if (/^\d+\.\s+\*\*/.test(next) || /^\*\*\d+\./.test(next) || /^---/.test(next) || /^#/.test(next)) break
        if (!next) { j++; if (descLines.length > 0) break; else continue }
        descLines.push(next)
        j++
      }
      i = j - 1
      const desc = clean(descLines.join(' '))
      if (title && desc) {
        const { section, key } = detectSection(`${title} ${desc}`)
        items.push(makeItem(items.length, section, key, title, desc))
      }
      continue
    }

    // --- Pattern 3: "**1. Title**" on its own line, description follows on next lines
    const boldNumMatch = line.match(/^\*\*\d+\.\s+(.+?)\*\*\s*$/)
    if (boldNumMatch) {
      const title = boldNumMatch[1].trim()
      const descLines = []
      let j = i + 1
      while (j < lines.length) {
        const next = lines[j].trim()
        if (/^\*\*\d+\./.test(next) || /^---/.test(next)) break
        if (!next) { j++; if (descLines.length > 0) break; else continue }
        descLines.push(next)
        j++
      }
      i = j - 1
      const desc = clean(descLines.join(' '))
      if (title && desc) {
        const { section, key } = detectSection(`${title} ${desc}`)
        items.push(makeItem(items.length, section, key, title, desc))
      }
      continue
    }

    // --- Patterns 3 & 4 only inside improvement blocks
    if (mode !== 'improvement') continue

    // Pattern 3: "**Title** — description" (no number)
    const boldMatch = line.match(/^\*\*([^*\n]+)\*\*\s*[—–-]\s*(.+)/)
    if (boldMatch) {
      const title = boldMatch[1].trim()
      const desc  = clean(boldMatch[2])
      const { section, key } = detectSection(`${title} ${desc}`)
      items.push(makeItem(items.length, section, key, title, desc))
      continue
    }

    // Pattern 4: plain bullet
    const bulletMatch = line.match(/^[-•]\s+(.+)/)
    if (bulletMatch) {
      const desc = clean(bulletMatch[1])
      const { section, key } = detectSection(desc)
      items.push(makeItem(items.length, section, key, '', desc))
    }
  }

  return items
}

function clean(s) {
  return s.replace(/\*\*/g, '').replace(/\*/g, '').replace(/\s+/g, ' ').trim()
}

function makeItem(idx, section, key, title, text) {
  return {
    id:         `chat-${Date.now()}-${idx}`,
    section,
    sectionKey: key,
    title:      title || null,
    text:       text.replace(/^["']|["']$/g, ''),
    type:       'improvement',
    source:     'chat',
    resolved:   false,
  }
}
