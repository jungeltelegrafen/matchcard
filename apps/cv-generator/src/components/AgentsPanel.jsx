import { useState } from 'react'

const AGENTS = [
  {
    id: 'grammar',
    title: 'Grammar & Clarity',
    desc: 'Review for grammatical improvements without changing your content',
    color: '#4A90D9',
  },
  {
    id: 'recruiter',
    title: 'Recruiter Perspective',
    desc: 'Evaluate from a recruiter\'s view and surface potential red flags',
    color: '#C97B4B',
  },
  {
    id: 'impact',
    title: 'Strengthen Impact',
    desc: 'Find vague bullet points and suggest how to quantify achievements',
    color: '#5BA85A',
  },
  {
    id: 'keywords',
    title: 'Keyword Audit',
    desc: 'Audit for ATS compatibility and current job market relevance',
    color: '#8B5CF6',
  },
  {
    id: 'consistency',
    title: 'Consistency Check',
    desc: 'Check dates, formatting, and tone consistency throughout all sections',
    color: '#E97B7B',
  },
]

export default function AgentsPanel({ lang }) {
  const [states, setStates] = useState({})
  const [results, setResults] = useState({})

  function runAgent(id) {
    setStates(s => ({ ...s, [id]: 'running' }))
    setResults(r => ({ ...r, [id]: null }))
    // Stub — real agent calls will be wired here
    setTimeout(() => {
      setStates(s => ({ ...s, [id]: 'done' }))
      setResults(r => ({ ...r, [id]: 'Agent feedback will appear here once connected.' }))
    }, 1800)
  }

  return (
    <div className="tab-pane">
      <div className="side-panel-header">
        <h2 className="side-panel-title">
          {lang === 'no' ? 'CV-agenter' : 'CV Agents'}
        </h2>
        <p className="side-panel-sub">
          {lang === 'no'
            ? 'Kjør en agent for å forbedre CVen'
            : 'Run an agent to improve your CV'}
        </p>
      </div>

      <div className="agents-list">
        {AGENTS.map(agent => {
          const state = states[agent.id] || 'idle'
          return (
            <div key={agent.id} className={`agent-card agent-card--${state}`}>
              <div className="agent-card-accent" style={{ background: agent.color }} />
              <div className="agent-card-body">
                <div className="agent-card-top">
                  <span className="agent-card-title">{agent.title}</span>
                  {state === 'idle' && (
                    <button className="agent-run-btn" onClick={() => runAgent(agent.id)}>
                      {lang === 'no' ? 'Kjør' : 'Run'}
                    </button>
                  )}
                  {state === 'running' && (
                    <span className="agent-running-badge">
                      <span className="spinner-sm" />
                    </span>
                  )}
                  {state === 'done' && (
                    <button className="agent-run-btn agent-run-btn--rerun" onClick={() => runAgent(agent.id)}>
                      {lang === 'no' ? 'Kjør igjen' : 'Re-run'}
                    </button>
                  )}
                </div>
                <p className="agent-card-desc">{agent.desc}</p>
                {state === 'done' && results[agent.id] && (
                  <div className="agent-result">{results[agent.id]}</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
