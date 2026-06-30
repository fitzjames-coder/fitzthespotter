import { useEffect, useMemo, useState, useRef } from 'react'
import { supabase } from './lib/supabaseClient'
import RegistrationProfileView from './RegistrationProfileView'
import StatusMarks from './StatusMarks'

let regViewMode = 'list'
import AirlineForm from './AirlineForm'
import NewRegistrationForm from './NewRegistrationForm'
import markFlownIn from './assets/marks/mark-flown-in.png'

function heroInitials(name) {
  return name.split(/\s+/).map((w) => w[0]).join('').toUpperCase().slice(0, 3)
}

function thumbAbbrev(model) {
  const seg = model.split(/[-\s]/)[0]
  return seg.length <= 5 ? seg : seg.slice(0, 4)
}

function closedYear(airline) {
  if (!airline.closed_date) return null
  const y = new Date(airline.closed_date).getFullYear()
  return isNaN(y) ? null : y
}

function FlagIcon({ countryCode }) {
  if (!countryCode) return null
  return (
    <span
      className={`fi fi-${countryCode.toLowerCase()} airline-hero__flag`}
      aria-hidden="true"
    />
  )
}

function AirlineHeroLogo({ airline }) {
  if (airline.logo_url) {
    return (
      <img
        className="airline-hero__logo"
        src={airline.logo_url}
        alt=""
        aria-hidden="true"
      />
    )
  }
  return (
    <div className="airline-hero__logo-placeholder" aria-hidden="true">
      <span className="airline-hero__logo-initials">{heroInitials(airline.name)}</span>
    </div>
  )
}

function RetiredPill({ item, onLongPress }) {
  const timer = useRef(null)
  const fired = useRef(false)

  function start() {
    fired.current = false
    timer.current = setTimeout(() => {
      fired.current = true
      onLongPress(item)
    }, 1500)
  }
  function cancel() {
    if (timer.current) { clearTimeout(timer.current); timer.current = null }
  }

  return (
    <span
      className="retired-pill"
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onContextMenu={(e) => e.preventDefault()}
      title="Press and hold to un-retire"
    >
      {item.type_name}
    </span>
  )
}

function AirlineHero({ airline, regCount, loading, onBack, onEdit, onAddReg, retiredTypes, onRetireLongPress }) {
  const isClosed = airline.is_closed
  const year = closedYear(airline)

  const metaParts = []
  if (airline.country) metaParts.push(airline.country)
  if (isClosed && year) metaParts.push(`closed ${year}`)
  const meta = metaParts.join(' · ')

  return (
    <div className="airline-hero">
      <button className="top-bar__back" onClick={onBack} aria-label="Back to airlines list">
        ‹ Back
      </button>
      <button className="edit-btn" onClick={onEdit} aria-label="Edit airline">Edit</button>
      <button className="reg-add-btn" onClick={onAddReg} aria-label="Add registration">REG</button>
      <div className="airline-hero__body">
        <AirlineHeroLogo airline={airline} />
        <div className="airline-hero__text">
          <div className="airline-hero__name-row">
            <h1 className="airline-hero__name">{airline.name}</h1>
            {airline.flown_in && (
              <img className="airline-hero__flown" src={markFlownIn} alt="Flown" title="Flown this airline" />
            )}
            {isClosed && <span className="airline-closed-chip">CLOSED</span>}
          </div>
          {airline.secondary_name && (
            <p className="airline-hero__secondary">{airline.secondary_name}</p>
          )}
          {(airline.country_flag || meta) && (
            <p className="airline-hero__meta">
              <FlagIcon countryCode={airline.country_flag} />
              {meta && <span>{meta}</span>}
            </p>
          )}
          {!loading && (
            <div className="airline-hero__stats">
              <span className="airline-regs-logged__number">{regCount}</span>
              <span className="airline-regs-logged__label">REGS LOGGED</span>
            </div>
          )}
        </div>
      </div>
      {retiredTypes && retiredTypes.length > 0 && (
        <div className="airline-hero__retired">
          {retiredTypes.map((rt) => (
            <RetiredPill key={rt.id} item={rt} onLongPress={onRetireLongPress} />
          ))}
        </div>
      )}
      {isClosed && (
        <img
          className="airline-hero__closed-banner"
          src="/Closed.PNG"
          alt="Closed — ceased operations"
        />
      )}
    </div>
  )
}

function deriveManufacturerBreakdown(registrations) {
  const mfrMap = new Map()
  for (const reg of registrations) {
    const mfr = reg.aircraft_types?.manufacturers
    const model = reg.aircraft_types?.name
    if (!mfr?.name || !model) continue
    if (!mfrMap.has(mfr.id)) mfrMap.set(mfr.id, { id: mfr.id, name: mfr.name, count: 0, models: new Map() })
    const entry = mfrMap.get(mfr.id)
    entry.count++
    entry.models.set(model, (entry.models.get(model) ?? 0) + 1)
  }
  return Array.from(mfrMap.values())
    .map(({ id, name, count, models }) => ({
      id,
      name,
      count,
      models: Array.from(models.entries())
        .map(([model, count]) => ({ model, count }))
        .sort((a, b) => b.count - a.count || a.model.localeCompare(b.model)),
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
}

function ManufacturerBreakdown({ registrations, onSelectManufacturer }) {
  const [open, setOpen] = useState(false)
  const [expandedMfrs, setExpandedMfrs] = useState(new Set())

  const breakdown = useMemo(() => deriveManufacturerBreakdown(registrations), [registrations])

  if (breakdown.length === 0) return null

  function toggleMfr(id) {
    setExpandedMfrs((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="breakdown-card">
      <button
        className="breakdown-title-row"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className="breakdown-title">Manufacturer Breakdown</span>
        <span className={`breakdown-chevron${open ? ' breakdown-chevron--open' : ''}`} aria-hidden="true">
          ▾
        </span>
      </button>
      {open && (
        <div className="breakdown-body">
          {breakdown.map(({ id, name, count, models }) => {
            const isExpanded = expandedMfrs.has(id)
            return (
              <div key={id} className="mfr-group">
                <div className="mfr-row">
                  <button
                    className="mfr-row__name-area"
                    onClick={() => onSelectManufacturer?.({ id })}
                    aria-label={`View ${name} details`}
                  >
                    <span className="mfr-row__name">{name}</span>
                  </button>
                  <button
                    className="mfr-row__toggle-area"
                    onClick={() => toggleMfr(id)}
                    aria-expanded={isExpanded}
                    aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${name} models`}
                  >
                    <span className="mfr-row__count">{count}</span>
                    <span className={`mfr-row__chevron${isExpanded ? ' mfr-row__chevron--open' : ''}`} aria-hidden="true">
                      ›
                    </span>
                  </button>
                </div>
                {isExpanded && (
                  <div className="model-rows">
                    {models.map(({ model, count: mc }) => (
                      <div key={model} className="model-row">
                        <span className="model-row__name">{model}</span>
                        <span className="model-row__count">{mc}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function RegistrationCard({ reg, onSelect }) {
  const typeName = reg.aircraft_types?.name ?? null
  const abbrev = typeName ? thumbAbbrev(typeName) : ''

  return (
    <button className="reg-card" onClick={() => onSelect(reg)}>
      <div className="reg-card__thumb" aria-hidden="true">
        <span className="reg-card__thumb-text">{abbrev}</span>
      </div>
      <div className="reg-card__body">
        <span className="reg-card__reg">{reg.registration}</span>
        {typeName && <span className="reg-card__type">{typeName}</span>}
      </div>
      <StatusMarks statuses={reg.statuses} />
    </button>
  )
}

function RegistrationGridTile({ reg, onSelect }) {
  const typeName = reg.aircraft_types?.name ?? null
  return (
    <button className="reg-grid-tile" onClick={() => onSelect(reg)}>
      <span className="reg-grid-tile__reg">{reg.registration}</span>
      {typeName && <span className="reg-grid-tile__type">{typeName}</span>}
      <div className="reg-grid-tile__marks">
        <StatusMarks statuses={reg.statuses} />
      </div>
    </button>
  )
}

export default function AirlineDetailView({ airline, onBack, onSelectManufacturer, onUpdated, onDeleted }) {
  const [registrations, setRegistrations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedReg, setSelectedReg] = useState(null)
  const [showEdit, setShowEdit] = useState(false)
  const [showRegForm, setShowRegForm] = useState(false)
  const [retiredTypes, setRetiredTypes] = useState([])
  const [unretireTarget, setUnretireTarget] = useState(null)

  function loadRetiredTypes() {
    if (!supabase) return
    supabase
      .from('retired_types')
      .select('id, aircraft_types ( name )')
      .eq('airline_id', airline.id)
      .then(({ data }) => {
        const rows = (data ?? [])
          .map((r) => ({ id: r.id, type_name: r.aircraft_types?.name }))
          .filter((r) => r.type_name)
          .sort((a, b) => a.type_name.localeCompare(b.type_name))
        setRetiredTypes(rows)
      })
  }

  async function confirmUnretire() {
    if (!unretireTarget || !supabase) return
    await supabase.from('retired_types').delete().eq('id', unretireTarget.id)
    setUnretireTarget(null)
    loadRetiredTypes()
  }

  function loadRegistrations() {
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
      .eq('airline_id', airline.id)
      .order('first_spotted', { ascending: true, nullsFirst: false })
      .order('registration', { ascending: true })
      .then(({ data, error: fetchError }) => {
        if (fetchError) {
          console.error('[fitzthespotter] Failed to fetch registrations:', fetchError)
          setError(fetchError.message)
        } else {
          setRegistrations(data)
        }
        setLoading(false)
      })
  }

  useEffect(() => {
    loadRegistrations()
    loadRetiredTypes()
  }, [airline.id])

  if (selectedReg) {
    return (
      <RegistrationProfileView
        regId={selectedReg.id}
        airline={airline}
        onBack={() => setSelectedReg(null)}
        onChanged={loadRegistrations}
      />
    )
  }

  const regCount = registrations.length
  const [viewMode, setViewMode] = useState(regViewMode)
  function changeRegViewMode(mode) { regViewMode = mode; setViewMode(mode) }

  function renderBody() {
    if (loading) {
      return <p className="state-message">Loading registrations…</p>
    }
    if (error) {
      return <p className="state-message state-message--error">{error}</p>
    }
    if (registrations.length === 0) {
      return <p className="state-message">No registrations yet.</p>
    }
    return (
      <>
        <ManufacturerBreakdown registrations={registrations} onSelectManufacturer={onSelectManufacturer} />
        <div className="list-head">
          <p className="section-label">Registrations</p>
          <div className="airlines-view-toggle" role="group" aria-label="View mode">
            <button
              type="button"
              className={`airlines-view-toggle__btn${viewMode === 'list' ? ' is-on' : ''}`}
              onClick={() => changeRegViewMode('list')}
              aria-label="List view"
            >☰</button>
            <button
              type="button"
              className={`airlines-view-toggle__btn${viewMode === 'grid' ? ' is-on' : ''}`}
              onClick={() => changeRegViewMode('grid')}
              aria-label="Grid view"
            >▦</button>
          </div>
        </div>
        {viewMode === 'list' ? (
          <ul className="reg-list">
            {registrations.map((reg) => (
              <li key={reg.id}>
                <RegistrationCard reg={reg} onSelect={setSelectedReg} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="reg-grid">
            {registrations.map((reg) => (
              <RegistrationGridTile key={reg.id} reg={reg} onSelect={setSelectedReg} />
            ))}
          </div>
        )}
      </>
    )
  }

  return (
    <>
      <div className="page page--navy airline-detail-page">
        <AirlineHero
          airline={airline}
          regCount={regCount}
          loading={loading}
          onBack={onBack}
          onEdit={() => setShowEdit(true)}
          onAddReg={() => setShowRegForm(true)}
          retiredTypes={retiredTypes}
          onRetireLongPress={setUnretireTarget}
        />
        <main className="content">
          {renderBody()}
        </main>
      </div>

      {unretireTarget && (
        <div className="retire-overlay" onClick={() => setUnretireTarget(null)}>
          <div className="retire-card" onClick={(e) => e.stopPropagation()}>
            <div className="retire-card__head">
              <span className="retire-card__title">Un-retire {unretireTarget.type_name}?</span>
              <button className="retire-card__close" onClick={() => setUnretireTarget(null)} aria-label="Close">✕</button>
            </div>
            <p className="retire-card__hint">This removes the retired mark for {unretireTarget.type_name} on this airline and all its matching registrations.</p>
            <div className="retire-confirm-row">
              <button className="retire-confirm-cancel" onClick={() => setUnretireTarget(null)}>Cancel</button>
              <button className="retire-confirm-go" onClick={confirmUnretire}>Un-retire</button>
            </div>
          </div>
        </div>
      )}

      {showEdit && (
        <AirlineForm
          existing={airline}
          onCancel={() => setShowEdit(false)}
          onUpdated={(row) => { setShowEdit(false); onUpdated?.(row) }}
          onDeleted={() => { setShowEdit(false); onDeleted?.() }}
        />
      )}
      {showRegForm && (
        <NewRegistrationForm
          onClose={() => setShowRegForm(false)}
          initialAirline={{ id: airline.id, name: airline.name }}
        />
      )}
    </>
  )
}
