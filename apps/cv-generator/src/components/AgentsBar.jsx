import { useState } from 'react'
import { runAgent } from '../utils/parseWithClaude'
import { FEEDBACK_SECTION_LABELS, feedbackSectionLabel } from '../utils/labels'

// Agents return structured findings via forced tool use (see /api/cv/agent) —
// no output-format instructions needed in these prompts.
const AGENTS = [
  {
    id: 'grammar',
    title: 'Grammar & Clarity',
    desc: 'Checks spelling, grammar, punctuation and clarity — CV-style short fragments are fine, not errors',
    color: '#4A90D9',
    prompt: `You are a professional CV proofreader checking mechanical correctness and clarity ONLY.
Flag genuine errors: spelling, subject–verb agreement, wrong or inconsistent punctuation, broken or confusing sentences, and phrasing that is truly hard to understand.
Do NOT flag terse CV-style fragments, bullet fragments, or omitted articles/pronouns — these are normal CV convention, not errors. Do NOT suggest stronger verbs, rephrase for impact, or change content — the Strengthen Impact agent covers that, and duplicating it just floods the user with overlapping feedback.
If the writing is mechanically correct, report no findings.`,
  },
  {
    id: 'recruiter',
    title: 'Hiring Manager Perspective',
    desc: 'Flags gaps, red flags, and hesitation points a hiring manager would notice when evaluating',
    color: '#C97B4B',
    prompt: `You are a senior hiring manager doing a fast first-pass to decide whether to interview this candidate.
Surface ONLY the few concerns that would genuinely make you hesitate: an unexplained employment gap (check the actual start/end dates carefully before claiming one), a title or seniority claim the experience doesn't support, missing must-have information, or a real credibility problem.
Stay at the level of a hiring decision. Do NOT list granular grammar errors, weak-verb phrasing, or individual missing skills — other agents own those, and repeating them here overwhelms the user. Give at most your top few concerns, most serious first, each pointing to the specific section or entry. If nothing would stop you proceeding, report no findings.`,
  },
  {
    id: 'impact',
    title: 'Strengthen Impact',
    desc: 'Identifies task-focused bullets and suggests how to reframe them as measurable achievements',
    color: '#5BA85A',
    prompt: `You are a career coach specialising in results-driven CVs.
Identify bullets/descriptions that read as a task or duty rather than an outcome, and show how to reframe each as an achievement. Prioritise the weakest and most prominent — cover the most impactful few, not every single line.
CRITICAL — never invent numbers: in every suggested rewrite, use PLACEHOLDERS the user must fill with their own real figures (e.g. "reduced processing time by X%", "from A to B", "for N teams"). Do NOT state specific statistics as if they were facts, and make clear the user should insert genuine metrics. An honest reframing without a number is better than a fabricated one.
One finding per bullet. If the bullets are already outcome-focused, report no findings.`,
  },
  {
    id: 'consistency',
    title: 'Consistency Check',
    desc: 'Audits date formats, tense shifts, capitalisation and tone inconsistencies across all sections',
    color: '#8B5CF6',
    prompt: `You are a CV proofreader checking ONLY for genuine internal STYLE inconsistencies — two places that use a different CONVENTION for the same kind of thing. Report an item only when you can quote two concrete instances that truly differ in convention.

Check for:
- Date FORMAT differences, e.g. "Jan 2020" vs "2020-01" vs "03/2020". CRITICAL: different date VALUES are NOT an inconsistency — "2008" and "2026" are the SAME format (a 4-digit year); only flag when the written pattern itself differs. Never flag a date for being in the future or for its value.
- Tense: flag ONLY if some entries are written in past tense and comparable others in present tense. You must quote one past-tense example AND one present-tense example. If everything is already the same tense, report nothing here.
- Capitalisation, punctuation style, or person (first vs third) applied inconsistently to the same kind of item — again, quote the two differing instances.

An inconsistency requires at least TWO conflicting instances that you quote verbatim. Do not judge factual correctness or plausibility. If the CV is consistent, report no findings — this is common and correct.`,
  },
  {
    id: 'claims',
    title: 'Claim–Evidence Audit',
    desc: 'Verifies that every claim in the summary, title and skills is backed by evidence in your experience',
    color: '#D9822B',
    prompt: `You are a sceptical client evaluating whether this consultant's claims hold up — the goal is a CV that never oversells.
Compare every claim in the personal summary, professional title, skills list, and competence matrix (including the stated levels) against the evidence in the experience entries: roles, project descriptions, bullets, and technologies.
Report each claim with no supporting evidence, or with clearly weaker evidence than the claim implies (e.g. "expert" backed by a single short engagement, a competence level 5 with one project, a skill tag that never appears in any project).
For each finding, name the exact claim, explain why the evidence falls short, and suggest an honest fix: either tone the claim down or point out what evidence to add from real experience. Do not flag claims that are adequately evidenced.
Note: a genuine skill does not have to be repeated word-for-word in a bullet. Only flag a skill or claim when it is notably strong ("expert", "lead", a top competence level) or entirely uncorroborated anywhere in the CV — do not nag about every skill tag that simply isn't restated in the experience text.`,
  },
  {
    id: 'coverage',
    title: 'Hidden Competence Finder',
    desc: 'Finds skills demonstrated in your experience that are missing from your skills list or competence matrix',
    color: '#3AA6A6',
    prompt: `You are a bid manager making sure this consultant is not underselling themselves.
Scan the experience and positions for concrete, NAMED technologies, tools, or methods that are clearly demonstrated (e.g. a tool named in a bullet) but missing from the skills list and the competence matrix.
Rules to avoid noise:
- Only concrete, named competences actually written in the text — NOT generic domain labels inferred from vague phrases (e.g. don't turn "handled reporting duties" into "BI domain knowledge").
- Do NOT report anything already present in the skills list or competence matrix, including under a synonym.
- ONE finding per competence: in its detail, name where it's demonstrated and whether it belongs in the skills list, the competence matrix, or both. Never split one competence into two findings.
Cover the strongest few. If nothing concrete is missing, report no findings.`,
  },
]

// `lang` drives the bar's own chrome (matches the site UI language).
// `reviewLang` is the CV's content language — the findings (and the section
// labels stored on them) are written to match the CV being reviewed.
export default function AgentsBar({ cv, lang, reviewLang = lang, onFeedback }) {
  const [states, setStates] = useState({})
  const [agentErrors, setAgentErrors] = useState({})

  async function run(agent) {
    setStates(s => ({ ...s, [agent.id]: 'running' }))
    setAgentErrors(e => ({ ...e, [agent.id]: null }))
    try {
      const findings = await runAgent(cv, agent.prompt, reviewLang)
      const stamp = Date.now()
      const items = findings
        .filter(f => f?.detail)
        .map((f, i) => ({
          id:         `${agent.id}-${stamp}-${i}`,
          section:    feedbackSectionLabel(f.section, reviewLang),
          sectionKey: FEEDBACK_SECTION_LABELS[f.section] ? f.section : 'general',
          title:      f.title || null,
          text:       f.detail,
          type:       'improvement',
          source:     'agent',
          agentId:    agent.id,
          agentTitle: agent.title,
          agentColor: agent.color,
          resolved:   false,
        }))
      if (items.length > 0) onFeedback?.(items)
      setStates(s => ({ ...s, [agent.id]: 'done' }))
    } catch (err) {
      setStates(s => ({ ...s, [agent.id]: 'error' }))
      setAgentErrors(e => ({ ...e, [agent.id]: err.message || 'Failed' }))
    }
  }

  return (
    <div className="agents-bar">
      <div className="agents-bar-header">
        <span className="agents-bar-label">
          {lang === 'no' ? 'AI-agenter' : 'AI Agents'}
        </span>
      </div>
      <div className="agents-bar-inner">
        {AGENTS.map(agent => {
          const state = states[agent.id] || 'idle'
          const err   = agentErrors[agent.id]
          return (
            <div
              key={agent.id}
              className={`abar-card abar-card--${state}`}
              style={{ '--agent-color': agent.color }}
              onClick={(e) => { if (!e.target.closest('button') && state !== 'running') run(agent) }}
              role="button"
              tabIndex={state !== 'running' ? 0 : undefined}
            >
              <div className="abar-accent" />
              <div className="abar-body">
                <div className="abar-top">
                  <span className="abar-title">{agent.title}</span>
                  {state === 'idle' && (
                    <button className="abar-btn" onClick={() => run(agent)}>
                      {lang === 'no' ? 'Kjør' : 'Run'}
                    </button>
                  )}
                  {state === 'running' && (
                    <span className="abar-spinner">
                      <span className="spinner-sm abar-spinner-dot" />
                    </span>
                  )}
                  {state === 'done' && (
                    <button className="abar-btn abar-btn--done" onClick={() => run(agent)}>
                      {lang === 'no' ? 'Kjør igjen' : 'Re-run'}
                    </button>
                  )}
                  {state === 'error' && (
                    <button className="abar-btn abar-btn--error" onClick={() => run(agent)}>
                      {lang === 'no' ? 'Prøv igjen' : 'Retry'}
                    </button>
                  )}
                </div>
                <p className="abar-desc">{agent.desc}</p>
                {state === 'done' && (
                  <div className="abar-done-badge">
                    <span className="abar-done-dot" />
                    {lang === 'no' ? 'Fullført — se tilbakemelding' : 'Done — see feedback panel'}
                  </div>
                )}
                {state === 'error' && err && (
                  <p className="abar-error-text">{err}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
