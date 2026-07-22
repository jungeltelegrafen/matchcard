import { useState } from 'react'
import { runAgent } from '../utils/parseWithClaude'
import { parseFeedbackFromAI } from '../utils/parseFeedback'

const AGENTS = [
  {
    id: 'grammar',
    title: 'Grammar & Clarity',
    desc: 'Checks grammar, phrasing, passive voice and sentence clarity — without changing your content',
    color: '#4A90D9',
    prompt: `You are a professional CV editor reviewing for grammar, clarity, and writing quality only — do NOT suggest content changes or additions.
Identify specific issues: awkward phrasing, passive voice overuse, unclear sentences, grammar errors, inconsistent punctuation, or wordy constructions.
Return ONLY a numbered list. For each issue write the title on its own line as **N. Issue title**, then a 1–2 sentence explanation with the specific location and suggestion on the next line.
If the CV is well-written with no issues, say so briefly.`,
  },
  {
    id: 'recruiter',
    title: 'Hiring Manager Perspective',
    desc: 'Flags gaps, red flags, and hesitation points a hiring manager would notice when evaluating',
    color: '#C97B4B',
    prompt: `You are a senior hiring manager reviewing this CV to decide whether to invite this candidate for an interview.
Identify specific concerns, gaps, red flags, or missing elements that would make you hesitate to proceed. Be direct and point to specific sections or statements — avoid generic advice.
Return ONLY a numbered list of issues. For each: **N. Issue title** on its own line, then a 1–2 sentence explanation on the next line.`,
  },
  {
    id: 'impact',
    title: 'Strengthen Impact',
    desc: 'Identifies task-focused bullets and suggests how to reframe them as measurable achievements',
    color: '#5BA85A',
    prompt: `You are a career coach specialising in results-driven CVs.
Find every bullet point or description that states a task or responsibility rather than an achievement or measurable outcome. For each, explain what is weak and suggest specifically how to quantify or reframe it.
Return ONLY a numbered list: **N. Issue title** on its own line, then a 1–2 sentence explanation on the next line.`,
  },
  {
    id: 'consistency',
    title: 'Consistency Check',
    desc: 'Audits date formats, tense shifts, capitalisation and tone inconsistencies across all sections',
    color: '#8B5CF6',
    prompt: `You are a CV proofreader checking for internal consistency.
Look for: mixed date formats, inconsistent tense (past vs present tense), varying capitalisation, punctuation style inconsistencies, and shifts in tone or person (first vs third).
Return ONLY a numbered list of specific inconsistencies found: **N. Issue title** on its own line, then where it occurs and how to fix it on the next line.
If the CV is fully consistent, say so briefly.`,
  },
]

export default function AgentsBar({ cv, lang, onFeedback }) {
  const [states, setStates] = useState({})
  const [agentErrors, setAgentErrors] = useState({})

  async function run(agent) {
    setStates(s => ({ ...s, [agent.id]: 'running' }))
    setAgentErrors(e => ({ ...e, [agent.id]: null }))
    try {
      const text  = await runAgent(cv, agent.prompt, lang)
const items = parseFeedbackFromAI(text).map(item => ({
        ...item,
        source:     'agent',
        agentId:    agent.id,
        agentTitle: agent.title,
        agentColor: agent.color,
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
