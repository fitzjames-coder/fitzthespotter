import { useEffect, useMemo, useState } from 'react'
import { supabase } from './lib/supabaseClient'
import RegistrationProfileView from './RegistrationProfileView'

function FlagIcon({ countryCode }) {
  if (!countryCode) {
    return <span className="airline-card__flag-placeholder" aria-hidden="true" />
  }
  return (
    <span
      className={`fi fi-${countryCode.toLowerCase()} airline-card__flag-svg`}
      aria-hidden="true"
    />
  )
}

// Parse a free-text date string leniently. Returns a Date or null.
function parseFirstSpotted(str) {
  if (!str || !str.trim()) return null
  const d = new Date(str)
  if (!isNaN(d)) return d
  // "Mar 2018" / "March 2018"
  const monthYear = str.match(/([A-Za-z]+)\s+(\d{4})/)
  if (monthYear) {
    const attempt = new Date(`${monthYear[1]} 1 ${monthYear[2]}`)
    if (!isNaN(attempt)) return attempt
  }
  // bare year "2018"
  const yearOnly = str.match(/^(\d{4})$/)
  if (yearOnly) return new Date(`Jan 1 ${yearOnly[1]}`)
  return null
}

// Returns the original text of the registration with the earliest first_spotted.
function deriveSpottingSince(registrations) {
  let earliest = null
  let earliestText = null
  for (const reg of registrations) {
    if (!reg.first_spotted) continue
    const d = parseFirstSpotted(reg.first_spotted)
    if (!d) continue
    if (earliest === null || d < earliest) {
      earliest = d
      earliestText = reg.first_spotted.trim()
    }
  }
  return earliestText
}

// Groups registrations by manufacturer → model, returns sorted breakdown.
function deriveManufacturerBreakdown(registrations) {
  const mfrMap = new Map() // keyed by manufacturer id
  for (const reg of registrations) {
    const mfr = reg.aircraft_types?.manufacturers
    const model = reg.aircraft_types?.model
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

function DetailTopBar({ airline, regCount, spottingSince, onBack }) {
  const isClosed = airline.is_closed
  return (
    <header className="top-bar top-bar--detail">
      <button className="top-bar__back" onClick={onBack} aria-label="Back to airlines list">
        ‹ Back
      </button>
      <div className="top-bar__detail-info">
        <FlagIcon countryCode={airline.country_flag} />
        <h1 className="top-bar__detail-name">{airline.name}</h1>
        {isClosed && <span className="detail-closed-badge">CLOSED</span>}
      </div>
      {airline.country && (
        <p className="top-bar__detail-country">{airline.country}</p>
      )}
      {spottingSince && (
        <p className="detail-since">SPOTTING SINCE · {spottingSince}</p>
      )}
      <div className="detail-reg-count-pill">
        <span className="detail-reg-count-pill__number">{regCount}</span>
        <span className="detail-reg-count-pill__label">UNIQUE REGS</span>
      </div>
    </header>
  )
}

function RegistrationCard({ reg, onSelect }) {
  const manufacturer = reg.aircraft_types?.manufacturers?.name
  const model = reg.aircraft_types?.model
  const aircraftLabel = [manufacturer, model].filter(Boolean).join(' ')
  const airports = Array.isArray(reg.airport_codes) ? reg.airport_codes : []
  const hasRemark = Boolean(reg.remark && reg.remark.trim())

  return (
    <button className="reg-card" onClick={() => onSelect(reg)}>
      <div className="reg-card__top">
        <div className="reg-card__reg-row">
          <span className="reg-card__reg">{reg.registration}</span>
          {hasRemark && <span className="reg-card__remark-star" aria-label="Has remark">✷</span>}
        </div>
        {aircraftLabel && (
          <span className="reg-card__aircraft">{aircraftLabel}</span>
        )}
      </div>
      {airports.length > 0 && (
        <div className="reg-card__airports">
          {airports.map((code) => (
            <span key={code} className="airport-pill">{code}</span>
          ))}
        </div>
      )}
    </button>
  )
}

export default function AirlineDetailView({ airline, onBack, onSelectManufacturer }) {
  const [registrations, setRegistrations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedReg, setSelectedReg] = useState(null)

  useEffect(() => {
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
        airport_codes,
        first_spotted,
        remark,
        aircraft_types (
          id,
          model,
          manufacturers (
            id,
            name
          )
        )
      `)
      .eq('airline_id', airline.id)
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
  }, [airline.id])

  const regCount = registrations.length
  const spottingSince = loading ? null : deriveSpottingSince(registrations)

  if (selectedReg) {
    return (
      <RegistrationProfileView
        reg={selectedReg}
        onBack={() => setSelectedReg(null)}
      />
    )
  }

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
    <div className="page">
      <DetailTopBar
        airline={airline}
        regCount={regCount}
        spottingSince={spottingSince}
        onBack={onBack}
      />
      <main className="content">
        {renderBody()}
      </main>
    </div>
  )
}
