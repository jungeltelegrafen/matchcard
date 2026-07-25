import { useState } from 'react'
import { runAgent } from '../utils/parseWithClaude'
import { FEEDBACK_SECTION_LABELS, feedbackSectionLabel } from '../utils/labels'

// Agents return structured findings via forced tool use (see /api/cv/agent) —
// no output-format instructions needed in these prompts.
const AGENTS = [
  {
    id: 'grammar',
    title: 'Grammar & Clarity',
    desc: 'Checks grammar, phrasing, passive voice and sentence clarity — without changing your content',
    color: '#4A90D9',
    prompt: `You are a professional CV editor reviewing for grammar, clarity, and writing quality only — do NOT suggest content changes or additions.
Identify specific issues: awkward phrasing, passive voice overuse, unclear sentences, grammar errors, inconsistent punctuation, or wordy constructions.
For each issue, point to the specific location and give a concrete suggestion. If the CV is well-written, report no findings.`,
  },
  {
    id: 'recruiter',
    title: 'Hiring Manager Perspective',
    desc: 'Flags gaps, red flags, and hesitation points a hiring manager would notice when evaluating',
    color: '#C97B4B',
    prompt: `You are a senior hiring manager reviewing this CV to decide whether to invite this candidate for an interview.
Identify specific concerns, gaps, red flags, or missing elements that would make you hesitate to proceed. Be direct and point to specific sections or statements — avoid generic advice.`,
  },
  {
    id: 'impact',
    title: 'Strengthen Impact',
    desc: 'Identifies task-focused bullets and suggests how to reframe them as measurable achievements',
    color: '#5BA85A',
    prompt: `You are a career coach specialising in results-driven CVs.
Find every bullet point or description that states a task or responsibility rather than an achievement or measurable outcome. For each, explain what is weak and suggest specifically how to quantify or reframe it.`,
  },
  {
    id: 'consistency',
    title: 'Consistency Check',
    desc: 'Audits date formats, tense shifts, capitalisation and tone inconsistencies across all sections',
    color: '#8B5CF6',
    prompt: `You are a CV proofreader checking for internal consistency.
Look for: mixed date formats, inconsistent tense (past vs present tense), varying capitalisation, punctuation style inconsistencies, and shifts in tone or person (first vs third).
For each inconsistency, say where it occurs and how to fix it. If the CV is fully consistent, report no findings.`,
  },
  {
    id: 'claims',
    title: 'Claim–Evidence Audit',
    desc: 'Verifies that every claim in the summary, title and skills is backed by evidence in your experience',
    color: '#D9822B',
    prompt: `You are a sceptical client evaluating whether this consultant's claims hold up — the goal is a CV that never oversells.
Compare every claim in the personal summary, professional title, skills list, and competence matrix (including the stated levels) against the evidence in the experience entries: roles, project descriptions, bullets, and technologies.
Report each claim with no supporting evidence, or with clearly weaker evidence than the claim implies (e.g. "expert" backed by a single short engagement, a competence level 5 with one project, a skill tag that never appears in any project).
For each finding, name the exact claim, explain why the evidence falls short, and suggest an honest fix: either tone the claim down or point out what evidence to add from real experience. Do not flag claims that are adequately evidenced.`,
  },
  {
    id: 'coverage',
    title: 'Hidden Competence Finder',
    desc: 'Finds skills demonstrated in your experience that are missing from your skills list or competence matrix',
    color: '#3AA6A6',
    prompt: `You are a bid manager making sure this consultant is not underselling themselves.
Scan the experience entries (descriptions, bullets, technologies, methodologies, results) and positions for competences, technologies, methods, and domain knowledge that are clearly demonstrated but missing from the skills section and the competence matrix — or present but understated (e.g. years of hands-on use not reflected in the stated level).
For each finding, say exactly where in the experience the competence is demonstrated and whether it belongs in the skills list, the competence matrix, or both.
Only report competences the text genuinely demonstrates — never invent or infer beyond what is written.`,
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
