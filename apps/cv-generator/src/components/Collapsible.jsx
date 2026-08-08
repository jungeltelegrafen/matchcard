import { useState } from 'react'

// A presentational collapsible section used to stack the desktop side-panels /
// agents bar / export footer below the CV editor on mobile. No feature logic —
// it just owns its open/closed state and renders whatever children it's given.
export default function Collapsible({ title, badge, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <section className={`m-accordion-item${open ? ' m-accordion-item--open' : ''}`}>
      <button
        type="button"
        className="m-accordion-head"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
      >
        <span className="m-accordion-title">{title}</span>
        {badge != null && badge !== 0 && <span className="m-accordion-badge">{badge}</span>}
        <span className="m-accordion-chevron" aria-hidden="true">{open ? '▾' : '▸'}</span>
      </button>
      {open && <div className="m-accordion-body">{children}</div>}
    </section>
  )
}
