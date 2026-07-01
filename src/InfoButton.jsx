import { useState } from 'react'

export default function InfoButton({ title, lead, points }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        className="info-btn"
        onClick={() => setOpen(true)}
        aria-label={`About ${title}`}
      >
        i
      </button>
      {open && (
        <div className="info-pop-scrim" onClick={() => setOpen(false)}>
          <div className="info-pop" onClick={(e) => e.stopPropagation()}>
            <div className="info-pop__head">
              <span className="info-pop__title">{title}</span>
              <button
                type="button"
                className="info-pop__x"
                onClick={() => setOpen(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="info-pop__body">
              {lead && <p className="info-pop__lead">{lead}</p>}
              <ul className="info-pop__list">
                {points.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
