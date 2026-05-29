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

function DetailTopBar({ airline, onBack }) {
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
      <DetailTopBar airline={airline} onBack={onBack} />
      <main className="content">
        <p className="section-label">Registrations</p>
        {renderBody()}
      </main>
    </div>
  )
}
