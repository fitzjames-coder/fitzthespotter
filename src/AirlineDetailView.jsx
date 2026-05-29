import { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient'

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

function DetailTopBar({ airline, regCount, spottingSince, onBack }) {
  const isClosed = airline.status === 'closed'
  return (
    <header className="top-bar top-bar--detail">
      <button className="top-bar__back" onClick={onBack} aria-label="Back to airlines list">
        ‹ Back
      </button>
      <div className="top-bar__detail-info">
        <FlagIcon countryCode={airline.country_code} />
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

function RegistrationCard({ reg }) {
  const manufacturer = reg.aircraft_types?.manufacturers?.name
  const model = reg.aircraft_types?.model
  const aircraftLabel = [manufacturer, model].filter(Boolean).join(' ')
  const airports = Array.isArray(reg.airport_codes) ? reg.airport_codes : []

  return (
    <div className="reg-card">
      <div className="reg-card__top">
        <span className="reg-card__reg">{reg.registration}</span>
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
    </div>
  )
}

export default function AirlineDetailView({ airline, onBack }) {
  const [registrations, setRegistrations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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
      <ul className="reg-list">
        {registrations.map((reg) => (
          <li key={reg.id}>
            <RegistrationCard reg={reg} />
          </li>
        ))}
      </ul>
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
        <p className="section-label">Registrations</p>
        {renderBody()}
      </main>
    </div>
  )
}
