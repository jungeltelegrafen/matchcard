import { useState } from 'react'

const TIPS = [
  {
    id: 'opening',
    section: 'Summary',
    title: 'Open with impact',
    text: 'Your summary is read in the first 6 seconds. Lead with your seniority, core domain, and one standout achievement — not a generic "I am a passionate developer".',
  },
  {
    id: 'quantify',
    section: 'Experience',
    title: 'Quantify everything',
    text: 'Numbers transform generic bullets into proof. Aim for at least 2–3 quantified results: "Reduced deployment time by 40%" beats "Improved deployment pipeline".',
  },
  {
    id: 'verbs',
    section: 'Experience',
    title: 'Use active verbs',
    text: 'Start every bullet with a strong verb — Led, Designed, Built, Reduced, Launched. Avoid "Was responsible for" or "Worked with" — these are weak and passive.',
  },
  {
    id: 'skills',
    section: 'Skills',
    title: 'Only list what you own',
    text: 'List skills you would be comfortable being interviewed on right now. Padding with technologies you barely know damages credibility when it comes up in interviews.',
  },
  {
    id: 'tailoring',
    section: 'General',
    title: 'Tailor for the reader',
    text: 'A great CV speaks directly to the context. Adjust your summary and top bullets for each application — what matters most to this specific role or client?',
  },
]

export default function TipsPanel({ lang }) {
  const [dismissed, setDismissed] = useState(new Set())

  const visible = TIPS.filter(t => !dismissed.has(t.id))

  return (
    <div className="tab-pane">
      <div className="side-panel-header">
        <h2 className="side-panel-title">
          {lang === 'no' ? 'Skrivetips' : 'Writing Tips'}
        </h2>
        <p className="side-panel-sub">
          {lang === 'no'
            ? 'Råd for å presentere deg best mulig'
            : 'How to present yourself at your very best'}
        </p>
      </div>

      <div className="tips-list">
        {visible.length === 0 && (
          <p className="tips-empty">
            {lang === 'no' ? 'Alle tips er skjult.' : 'All tips dismissed.'}
            <button className="tips-restore" onClick={() => setDismissed(new Set())}>
              {lang === 'no' ? 'Vis igjen' : 'Restore'}
            </button>
          </p>
        )}
        {visible.map(tip => (
          <div key={tip.id} className="tip-bubble">
            <div className="tip-bubble-header">
              <span className="tip-section-tag">{tip.section}</span>
              <span className="tip-title">{tip.title}</span>
              <button
                className="tip-dismiss"
                onClick={() => setDismissed(d => new Set([...d, tip.id]))}
                title="Dismiss"
              >
                ×
              </button>
            </div>
            <p className="tip-text">{tip.text}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
