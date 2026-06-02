import { useState } from 'react'

function SpotlightOverlay({ remark, onClose }) {
  return (
    <div
      className="spotlight-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Remark spotlight"
    >
      <div
        className="spotlight-card"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="spotlight-label">REMARK</p>
        <p className="spotlight-text">{remark}</p>
        <button className="spotlight-close" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  )
}

function RegTopBar({ reg, onBack }) {
  const [showSpotlight, setShowSpotlight] = useState(false)
  const hasRemark = Boolean(reg.remark && reg.remark.trim())

  return (
    <>
      <header className="top-bar top-bar--detail">
        <button className="top-bar__back" onClick={onBack} aria-label="Back to airline">
          ‹ Back
        </button>
        <div className="top-bar__detail-info">
          <h1 className="top-bar__detail-name">{reg.registration}</h1>
          {hasRemark && (
            <button
              className="remark-star"
              onClick={() => setShowSpotlight(true)}
              aria-label="View remark"
            >
              ✷
            </button>
          )}
        </div>
      </header>
      {showSpotlight && (
        <SpotlightOverlay
          remark={reg.remark}
          onClose={() => setShowSpotlight(false)}
        />
      )}
    </>
  )
}

function GalleryPlaceholder() {
  return (
    <div className="gallery-placeholder">
      <span className="gallery-placeholder__caption">Aircraft image coming soon</span>
    </div>
  )
}

function InfoSection({ reg }) {
  const manufacturer = reg.aircraft_types?.manufacturers?.name
  const model = reg.aircraft_types?.name
  const aircraftLabel = [manufacturer, model].filter(Boolean).join(' ')
  const airports = Array.isArray(reg.airports) ? reg.airports : []

  return (
    <div className="info-card">
      {aircraftLabel && (
        <div className="info-row">
          <span className="info-row__label">Aircraft</span>
          <span className="info-row__value">{aircraftLabel}</span>
        </div>
      )}
      {airports.length > 0 && (
        <div className="info-row info-row--airports">
          <span className="info-row__label">Airports</span>
          <div className="info-row__pills">
            {airports.map((code) => (
              <span key={code} className="airport-pill">{code}</span>
            ))}
          </div>
        </div>
      )}
      {reg.first_spotted && (
        <div className="info-row">
          <span className="info-row__label">First spotted</span>
          <span className="info-row__value">{reg.first_spotted}</span>
        </div>
      )}
    </div>
  )
}

export default function RegistrationProfileView({ reg, onBack }) {
  return (
    <div className="page">
      <RegTopBar reg={reg} onBack={onBack} />
      <GalleryPlaceholder />
      <main className="content">
        <p className="section-label">Details</p>
        <InfoSection reg={reg} />
      </main>
    </div>
  )
}
