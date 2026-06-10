import { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient'
import { FlagIcon } from './App'

export default function AirportsTab({ onSelectAirport }) {
  const [airports, setAirports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!supabase) {
      setError('Supabase is not configured.')
      setLoading(false)
      return
    }
    supabase
      .from('airports')
      .select('iata, icao, name, country, country_flag')
      .order('iata')
      .then(({ data, error: err }) => {
        if (err) setError(err.message)
        else setAirports(data ?? [])
        setLoading(false)
      })
  }, [])

  return (
    <div className="page airports-page">
      <header className="top-bar">
        <span className="top-bar__wordmark" style={{ cursor: 'default' }}>
          <span className="top-bar__title--cream">Airports</span>
        </span>
      </header>
      <main className="content">
        <p className="section-label">Airports Spotted</p>
        {loading && <p className="state-message">Loading airports…</p>}
        {error && <p className="state-message state-message--error">{error}</p>}
        {!loading && !error && airports.length === 0 && (
          <p className="state-message">No airports yet.</p>
        )}
        {!loading && !error && airports.length > 0 && (
          <ul className="airport-list">
            {airports.map((ap) => (
              <li key={ap.iata}>
                <button className="airport-row" onClick={() => onSelectAirport(ap)}>
                  <span className="airport-row__iata">{ap.iata}</span>
                  <div className="airport-row__body">
                    <span className="airport-row__name">{ap.name}</span>
                    <span className="airport-row__country">
                      <FlagIcon countryCode={ap.country_flag} />
                      {ap.country}
                    </span>
                  </div>
                  <span className="airport-row__chevron" aria-hidden="true">›</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
