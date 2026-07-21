import { useState, useEffect, useCallback } from 'react'

const TIPS = [
  {
    topic: 'Opening impact',
    text: 'Your summary is read in the first 6 seconds. Lead with your seniority, core domain, and one standout achievement — not a generic statement.',
  },
  {
    topic: 'Quantify results',
    text: 'Numbers transform generic bullets into proof. Aim for at least 2–3 quantified results: "Reduced deployment time by 40%" beats "Improved pipeline".',
  },
  {
    topic: 'Active verbs',
    text: 'Start every bullet with a strong verb — Led, Designed, Built, Reduced, Launched. Avoid "Was responsible for" or "Worked with".',
  },
  {
    topic: 'Own your skills',
    text: 'Only list skills you would be comfortable being interviewed on right now. Padding with half-known technologies damages credibility.',
  },
  {
    topic: 'Tailor for context',
    text: "A great CV speaks to the reader's context. Adjust your summary and top bullets for each application or client engagement.",
  },
  {
    topic: 'Education adds weight',
    text: 'State your degree specialisation, not just the institution. A thesis topic or relevant coursework can reinforce technical credibility.',
  },
  {
    topic: 'Show progression',
    text: "Recruiters look for growth. If your titles or responsibilities have expanded over time, make that arc visible -- do not hide it in flat bullet lists.",
  },
]

const AUTO_INTERVAL = 7000

export default function TipsCarousel({ lang }) {
  const [idx, setIdx]     = useState(0)
  const [paused, setPaused] = useState(false)

  const next = useCallback(() => setIdx(i => (i + 1) % TIPS.length), [])
  const prev = useCallback(() => setIdx(i => (i - 1 + TIPS.length) % TIPS.length), [])

  useEffect(() => {
    if (paused) return
    const t = setInterval(next, AUTO_INTERVAL)
    return () => clearInterval(t)
  }, [paused, next])

  const tip = TIPS[idx]

  return (
    <div
      className="tips-carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="tips-carousel-header">
        <span className="tips-carousel-label">
          {lang === 'no' ? 'Skrivetips' : 'Writing Tips'}
        </span>
        <span className="tips-carousel-count">{idx + 1} / {TIPS.length}</span>
      </div>

      <div className="tips-carousel-body">
        <p className="tips-carousel-topic">{tip.topic}</p>
        <p className="tips-carousel-text">{tip.text}</p>
      </div>

      <div className="tips-carousel-controls">
        <button className="tips-carousel-nav" onClick={prev}>←</button>
        <div className="tips-carousel-dots">
          {TIPS.map((_, i) => (
            <button
              key={i}
              className={`tips-carousel-dot${i === idx ? ' active' : ''}`}
              onClick={() => setIdx(i)}
            />
          ))}
        </div>
        <button className="tips-carousel-nav" onClick={next}>→</button>
      </div>
    </div>
  )
}
