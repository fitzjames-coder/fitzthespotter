import { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient'
import NewRegistrationForm from './NewRegistrationForm'
import StatusMarks from './StatusMarks'
import cameraIcon from './assets/marks/mark-camera.png'
import cameraOffIcon from './assets/marks/mark-camera-off.png'

function formatFlownInDate(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  if (!y || !m || !d) return iso
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${parseInt(d, 10)} ${months[parseInt(m, 10) - 1]} ${y}`
}

function SpotlightOverlay({ label = 'REMARK', remark, onClose }) {
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
        <p className="spotlight-label">{label}</p>
        <p className="spotlight-text">{remark}</p>
        <button className="spotlight-close" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  )
}

function RegTopBar({ reg, onBack, onEdit }) {
  const [spotlight, setSpotlight] = useState(null)
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
            <StatusMarks
              statuses={reg.statuses}
              onRemarkClick={hasRemark ? () => setSpotlight({ label: 'REMARK', text: reg.remark }) : undefined}
              onFlownInClick={reg.statuses?.flown_in ? () => {
                const dateStr = formatFlownInDate(reg.statuses?.flown_in_date)
                setSpotlight({ label: 'FLOWN IN', text: dateStr || '—' })
              } : undefined}
            />
          </div>
          <button className="top-bar__edit" onClick={onEdit} aria-label="Edit registration">
            Edit
          </button>
        </div>
      </header>
      {spotlight !== null && (
        <SpotlightOverlay
          label={spotlight.label}
          remark={spotlight.text}
          onClose={() => setSpotlight(null)}
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

function InfoSection({ reg, lastSighting }) {
  const manufacturer = reg.aircraft_types?.manufacturers?.name
  const model = reg.aircraft_types?.name
  const aircraftLabel = [manufacturer, model].filter(Boolean).join(' ')
  const airports = Array.isArray(reg.airports) ? reg.airports : []
  const firstAirport = airports[0] ?? null
  const lastDate = lastSighting?.spotted_on ?? null
  const lastAirport = lastDate ? (lastSighting?.airport ?? null) : null

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
            {airports.map((code) => {
              const isFirst = code === firstAirport
              const isLast = Boolean(lastAirport && code === lastAirport)
              let pillClass = 'airport-pill'
              if (isFirst && isLast) pillClass = 'airport-pill airport-pill--first'
              else if (isFirst) pillClass = 'airport-pill airport-pill--first'
              else if (isLast) pillClass = 'airport-pill airport-pill--last'
              return (
                <span key={code} className={pillClass}>
                  {code}
                  {isFirst && isLast && lastDate && (
                    <span className="airport-pill__recent" aria-label="most recent sighting"></span>
                  )}
                </span>
              )
            })}
          </div>
        </div>
      )}
      {reg.first_spotted && (
        <div className="info-row">
          <span className="info-row__label">First spotted</span>
          <span className="info-row__value info-date--first">{reg.first_spotted}</span>
        </div>
      )}
      {lastDate && (
        <div className="info-row">
          <span className="info-row__label">Last spotted</span>
          <span className="info-row__value"><span className="info-date--last">{lastDate}</span></span>
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
  const [currentRegId, setCurrentRegId] = useState(regId)
  const [reg, setReg] = useState(null)
  const [lastSighting, setLastSighting] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showEdit, setShowEdit] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState(null)
  const [flagged, setFlagged] = useState(false)
  const [siblingIds, setSiblingIds] = useState([])
  // incremented by onSaved so the effect re-runs without changing currentRegId
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => { setCurrentRegId(regId) }, [regId])

  useEffect(() => {
    let active = true
    async function loadReg() {
      setLoading(true)
      setError(null)
      if (!supabase) {
        setError('Supabase is not configured.')
        setLoading(false)
        return
      }
      const { data, error: fetchError } = await supabase
        .from('registrations')
        .select(`
          id,
          registration,
          airline_id,
          first_spotted,
          airports,
          remark,
          statuses,
          flagged,
          aircraft_types (
            id,
            name,
            manufacturers (
              id,
              name
            )
          )
        `)
        .eq('id', currentRegId)
        .single()

      if (!active) return

      if (fetchError) {
        setError(fetchError.message)
        setLoading(false)
        return
      }

      setReg(data)
      setFlagged(Boolean(data.flagged))

      const { data: ls } = await supabase
        .from('sightings')
        .select('airport, spotted_on')
        .eq('registration_id', currentRegId)
        .order('spotted_on', { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle()

      if (!active) return

      setLastSighting(ls ?? null)
      setLoading(false)
    }
    loadReg()
    return () => { active = false }
  }, [currentRegId, reloadKey])

  useEffect(() => {
    if (!supabase || !reg?.airline_id) return
    supabase
      .from('registrations')
      .select('id')
      .eq('airline_id', reg.airline_id)
      .order('first_spotted', { ascending: true, nullsFirst: false })
      .order('registration', { ascending: true })
      .then(({ data }) => {
        setSiblingIds((data ?? []).map((r) => r.id))
      })
  }, [reg?.airline_id])

  const index = siblingIds.indexOf(currentRegId)
  const hasPrev = index > 0
  const hasNext = index >= 0 && index < siblingIds.length - 1

  const goPrev = () => {
    const i = siblingIds.indexOf(currentRegId)
    if (i > 0) {
      setCurrentRegId(siblingIds[i - 1])
    }
  }
  const goNext = () => {
    const i = siblingIds.indexOf(currentRegId)
    if (i >= 0 && i < siblingIds.length - 1) {
      setCurrentRegId(siblingIds[i + 1])
    }
  }

  async function handleToggleFlag() {
    const next = !flagged
    setFlagged(next)
    if (supabase) {
      await supabase.from('registrations').update({ flagged: next }).eq('id', currentRegId)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    setDeleteError(null)
    const { error: err } = await supabase.from('registrations').delete().eq('id', currentRegId)
    setDeleting(false)
    if (err) {
      setDeleteError(err.message)
    } else {
      onChanged?.()
      onBack()
    }
  }

  if (loading && !reg) {
    return (
      <div className="page">
        <p className="state-message">Loading…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="page">
        <button className="top-bar__back" style={{ padding: '1rem' }} onClick={onBack}>
          ‹ Back
        </button>
        <p className="state-message state-message--error">{error}</p>
      </div>
    )
  }

  if (!reg) return null

  return (
    <>
      <div className="page reg-profile-page">
        <RegTopBar reg={reg} onBack={onBack} onEdit={() => setShowEdit(true)} />
        <GalleryPlaceholder />
        <main className="content reg-info-area" style={{ opacity: loading ? 0.6 : 1 }}>
          <div className="section-label-row">
            <p className="section-label">
              {airline?.name ?? ''}
            </p>
            <button
              type="button"
              className="camera-flag-btn"
              onClick={handleToggleFlag}
              aria-label="Toggle photo flag"
            >
              <img
                src={flagged ? cameraIcon : cameraOffIcon}
                alt=""
                aria-hidden="true"
                className="camera-flag__img"
              />
            </button>
          </div>
          <InfoSection reg={reg} lastSighting={lastSighting} />
          {deleteError && <p className="form-error" style={{ marginTop: '1rem' }}>{deleteError}</p>}
          <button
            className="btn-delete-reg"
            onClick={() => setShowDeleteConfirm(true)}
          >
            Delete registration
          </button>
        </main>

        <button
          className="reg-nav reg-nav--prev"
          onClick={goPrev}
          disabled={!hasPrev || loading}
          style={{ visibility: hasPrev ? 'visible' : 'hidden' }}
          aria-label="Previous registration"
        >
          <img src="/arrow-takeoff-prev.PNG" alt="" />
        </button>
        <button
          className="reg-nav reg-nav--next"
          onClick={goNext}
          disabled={!hasNext || loading}
          style={{ visibility: hasNext ? 'visible' : 'hidden' }}
          aria-label="Next registration"
        >
          <img src="/arrow-takeoff-next.PNG" alt="" />
        </button>
      </div>

      {showEdit && (
        <NewRegistrationForm
          existingReg={reg}
          initialAirline={airline}
          onClose={() => setShowEdit(false)}
          onSaved={() => {
            setReloadKey((k) => k + 1)
            onChanged?.()
          }}
        />
      )}

      {showDeleteConfirm && (
        <DeleteConfirmSheet
          regId={currentRegId}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
          deleting={deleting}
        />
      )}
    </>
  )
}
