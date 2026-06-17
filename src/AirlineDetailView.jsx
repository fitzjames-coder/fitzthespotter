import { useEffect, useMemo, useState } from 'react'
import { supabase } from './lib/supabaseClient'
import RegistrationProfileView from './RegistrationProfileView'
import StatusMarks from './StatusMarks'
import AirlineForm from './AirlineForm'

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

function AirlineHero({ airline, regCount, loading, onBack, onEdit }) {
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
      <div className="airline-hero__body">
        <AirlineHeroLogo airline={airline} />
        <div className="airline-hero__text">
          <div className="airline-hero__name-row">
            <h1 className="airline-hero__name">{airline.name}</h1>
            {isClosed && <span className="airline-closed-chip">CLOSED</span>}
          </div>
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

export default function AirlineDetailView({ airline, onBack, onSelectManufacturer, onUpdated, onDeleted }) {
  const [registrations, setRegistrations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedReg, setSelectedReg] = useState(null)
  const [showEdit, setShowEdit] = useState(false)

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
        <p className="section-label">Registrations</p>
        <ul className="reg-list">
          {registrations.map((reg) => (
            <li key={reg.id}>
              <RegistrationCard reg={reg} onSelect={setSelectedReg} />
            </li>
          ))}
        </ul>
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
        />
        <main className="content">
          {renderBody()}
        </main>
      </div>

      {showEdit && (
        <AirlineForm
          existing={airline}
          onCancel={() => setShowEdit(false)}
          onUpdated={(row) => { setShowEdit(false); onUpdated?.(row) }}
          onDeleted={() => { setShowEdit(false); onDeleted?.() }}
        />
      )}
    </>
  )
}
