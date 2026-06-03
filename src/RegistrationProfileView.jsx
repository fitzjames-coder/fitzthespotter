import { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient'
import NewRegistrationForm from './NewRegistrationForm'

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

function RegTopBar({ reg, onBack, onEdit }) {
  const [showSpotlight, setShowSpotlight] = useState(false)
  const hasRemark = Boolean(reg.remark && reg.remark.trim())

  return (
    <>
      <header className="top-bar top-bar--detail">
        <button className="top-bar__back" onClick={onBack} aria-label="Back to airline">
          ‹ Back
        </button>
        <div className="top-bar__detail-row">
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
          <button className="top-bar__edit" onClick={onEdit} aria-label="Edit registration">
            Edit
          </button>
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

function DeleteConfirmSheet({ regId, onConfirm, onCancel, deleting }) {
  return (
    <div className="entry-modal-backdrop" onClick={onCancel}>
      <div className="entry-modal delete-confirm" onClick={(e) => e.stopPropagation()}>
        <button
          className="btn-confirm-delete"
          onClick={onConfirm}
          disabled={deleting}
        >
          {deleting ? 'Deleting…' : 'Confirm Delete'}
        </button>
        <p className="delete-confirm__hint">This cannot be undone.</p>
        <button className="btn-cancel-delete" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  )
}

export default function RegistrationProfileView({ regId, airline, onBack, onChanged }) {
  const [reg, setReg] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showEdit, setShowEdit] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState(null)

  function loadReg() {
    if (!supabase) {
      setError('Supabase is not configured.')
      setLoading(false)
      return
    }
    supabase
      .from('registrations')
      .select(`
        id,
        registration,
        first_spotted,
        airports,
        remark,
        statuses,
        aircraft_types (
          id,
          name,
          manufacturers (
            id,
            name
          )
        )
      `)
      .eq('id', regId)
      .single()
      .then(({ data, error: fetchError }) => {
        if (fetchError) {
          setError(fetchError.message)
        } else {
          setReg(data)
        }
        setLoading(false)
      })
  }

  useEffect(() => {
    loadReg()
  }, [regId])

  async function handleDelete() {
    setDeleting(true)
    setDeleteError(null)
    const { error: err } = await supabase.from('registrations').delete().eq('id', regId)
    setDeleting(false)
    if (err) {
      setDeleteError(err.message)
    } else {
      onChanged?.()
      onBack()
    }
  }

  if (loading) {
    return (
      <div className="page">
        <p className="state-message">Loading…</p>
      </div>
    )
  }

  if (error || !reg) {
    return (
      <div className="page">
        <button className="top-bar__back" style={{ padding: '1rem' }} onClick={onBack}>
          ‹ Back
        </button>
        <p className="state-message state-message--error">{error ?? 'Not found.'}</p>
      </div>
    )
  }

  return (
    <>
      <div className="page">
        <RegTopBar reg={reg} onBack={onBack} onEdit={() => setShowEdit(true)} />
        <GalleryPlaceholder />
        <main className="content">
          <p className="section-label">
            {airline?.name ?? ''}
          </p>
          <InfoSection reg={reg} />
          {deleteError && <p className="form-error" style={{ marginTop: '1rem' }}>{deleteError}</p>}
          <button
            className="btn-delete-reg"
            onClick={() => setShowDeleteConfirm(true)}
          >
            Delete registration
          </button>
        </main>
      </div>

      {showEdit && (
        <NewRegistrationForm
          existingReg={reg}
          initialAirline={airline}
          onClose={() => setShowEdit(false)}
          onSaved={() => {
            loadReg()
            onChanged?.()
          }}
        />
      )}

      {showDeleteConfirm && (
        <DeleteConfirmSheet
          regId={regId}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
          deleting={deleting}
        />
      )}
    </>
  )
}
